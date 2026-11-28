"""
IRS Pilot — Stripe Checkout Integration
Handles payment session creation and webhook processing.

Phase 1: Reliable webhook-driven subscription activation with idempotency.
Phase 2: Black Friday promotional pricing (Nov 27-30 CT, persisted at Checkout).
"""
import os
import stripe
import logging
from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from flask import request, jsonify, redirect, Response
import auth

log = logging.getLogger(__name__)

# ── Key management ─────────────────────────────────────────────────────────────
# Keys are read fresh on each call so Railway env updates take effect immediately.
def _get_stripe_key() -> str:
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    stripe.api_key = key
    return key

def _get_webhook_secret() -> str:
    return os.environ.get("STRIPE_WEBHOOK_SECRET", "")

def _get_connect_webhook_secret() -> str:
    return os.environ.get("STRIPE_CONNECT_WEBHOOK_SECRET", "")

# ── Mode detection ─────────────────────────────────────────────────────────────
def _is_test_mode() -> bool:
    return os.environ.get("STRIPE_SECRET_KEY", "").startswith("sk_test_")

# ── Base URL ───────────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "localhost:8080")
if not BASE_URL.startswith("http"):
    BASE_URL = f"https://{BASE_URL}"

# ── Consumer product price IDs ─────────────────────────────────────────────────
PRICE_TO_PRODUCT = {
    # Live mode
    "price_1TAbugKCmkbEhj2E2HnuoIDO": "navigator",
    "price_1TAbvGKCmkbEhj2ESSoCVxJ2": "wizard",
    "price_1TAbvtKCmkbEhj2ET7xDLRkz": "bundle",
    # Test mode
    "price_1TAcdgKCmkbEhj2E3PlNJPO0": "navigator",
    "price_1TAceNKCmkbEhj2EhmP8CqlG": "wizard",
    "price_1TAcexKCmkbEhj2EymIqdcm9": "bundle",
}

PRODUCT_TO_PRICE_LIVE = {
    "navigator": "price_1TAbugKCmkbEhj2E2HnuoIDO",
    "wizard":    "price_1TAbvGKCmkbEhj2ESSoCVxJ2",
    "bundle":    "price_1TAbvtKCmkbEhj2ET7xDLRkz",
}
PRODUCT_TO_PRICE_TEST = {
    "navigator": "price_1TAcdgKCmkbEhj2E3PlNJPO0",
    "wizard":    "price_1TAceNKCmkbEhj2EhmP8CqlG",
    "bundle":    "price_1TAcexKCmkbEhj2EymIqdcm9",
}

def _product_to_price(product: str) -> str:
    if _is_test_mode():
        return PRODUCT_TO_PRICE_TEST.get(product, "")
    return PRODUCT_TO_PRICE_LIVE.get(product, "")

PRODUCT_NAMES = {
    "navigator": "IRS Pilot — 7-Day Access",
    "wizard":    "Financial Intake Wizard — 7-Day Access",
    "bundle":    "IRS Pilot Complete Access — 7-Day Access",
}

PRODUCT_AMOUNTS = {"navigator": 5900, "wizard": 9900, "bundle": 12900}

PRODUCT_REDIRECT = {
    "navigator": "/navigator",
    "wizard":    "/wizard",
    "bundle":    "/navigator",
}

# ── Pro subscription price IDs ─────────────────────────────────────────────────
# Regular intro pricing: $49/month for 3 months, then $79/month.
# Promotional intro pricing ($29/month) is a separate Stripe price active only
# during the promotional window (Nov 30 – Dec 6, 2026 CT); see PROMO constants below.
PRO_PRICE_INTRO_LIVE    = os.environ.get("STRIPE_PRO_PRICE_INTRO_LIVE",
                                          "price_1TB3phKCmkbEhj2E9Hq0w2rm")  # $49/month intro
PRO_PRICE_STANDARD_LIVE = "price_1TB3phKCmkbEhj2ELLF6CG6t"   # $79/month (unchanged)
PRO_PRICE_INTRO_TEST    = os.environ.get("STRIPE_PRO_PRICE_INTRO_TEST", "")
PRO_PRICE_STANDARD_TEST = os.environ.get("STRIPE_PRO_PRICE_STANDARD_TEST", "")

# Promotional override (overrides intro price during a date window; leave unset
# unless running a separate promotional Stripe price, e.g. a coupon-based price).
PRO_PRICE_PROMO_LIVE = os.environ.get("STRIPE_PRO_PRICE_PROMO_LIVE", "")
PRO_PRICE_PROMO_TEST = os.environ.get("STRIPE_PRO_PRICE_PROMO_TEST", "")

PRO_INTRO_MONTHS   = 3
PRO_OVERAGE_AMOUNT = 500  # $5.00 per extra session

def _pro_price_intro() -> str:
    return PRO_PRICE_INTRO_TEST if _is_test_mode() else PRO_PRICE_INTRO_LIVE

def _pro_price_standard() -> str:
    return PRO_PRICE_STANDARD_TEST if _is_test_mode() else PRO_PRICE_STANDARD_LIVE

def _pro_price_promo() -> str:
    return PRO_PRICE_PROMO_TEST if _is_test_mode() else PRO_PRICE_PROMO_LIVE


# ── Promotional window ─────────────────────────────────────────────────────────
# Cyber Monday promotional period: Nov 30 – Dec 6, 2026 CT.
# During this window, STRIPE_PRO_PRICE_PROMO_* (the $29/month price) is used
# instead of the regular $49/month intro price.
_CT = ZoneInfo("America/Chicago")
PROMO_START_CT = datetime(2026, 11, 30, 0, 0, 0, tzinfo=_CT)
PROMO_END_CT   = datetime(2026, 12, 6, 23, 59, 59, tzinfo=_CT)

# Set STAGING_PROMO_OVERRIDE=1 in Railway staging to test promotional pricing
# before Nov 30 without changing the promo date window.
STAGING_PROMO_OVERRIDE = bool(os.environ.get("STAGING_PROMO_OVERRIDE"))


def _is_promo_active() -> bool:
    """Return True if promotional pricing should apply right now."""
    if not _pro_price_promo():
        return False
    if STAGING_PROMO_OVERRIDE:
        return True
    now_ct = datetime.now(tz=_CT)
    return PROMO_START_CT <= now_ct <= PROMO_END_CT


def _get_active_intro_price() -> str:
    """
    Return the correct intro price for a new subscriber at the moment of Checkout
    creation. This is the ONLY place that inspects the current date/time for
    promotional eligibility. The returned price ID is stored in Checkout metadata
    and used by the webhook — the webhook never re-evaluates the date.
    """
    if _is_promo_active():
        return _pro_price_promo()
    return _pro_price_intro()


# ── Consumer checkout ──────────────────────────────────────────────────────────

def create_checkout_session(user_id: int, user_email: str, product: str,
                             discount_pct: int = 0, discount_code_id: int = None,
                             referral_code: str = None):
    """
    Create a Stripe Checkout session for a consumer 7-day access purchase.
    Returns (url, None) or (None, error_message).
    """
    _get_stripe_key()
    price_id = _product_to_price(product)
    if not price_id:
        return None, f"Unknown product: {product}"

    base_amount = PRODUCT_AMOUNTS.get(product, 12900)

    kwargs = dict(
        payment_method_types=["card"],
        mode="payment",
        customer_email=user_email,
        success_url=f"{BASE_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{BASE_URL}/pricing",
        metadata={
            "user_id":          str(user_id),
            "product":          product,
            "type":             "consumer_purchase",
            "discount_code_id": str(discount_code_id) if discount_code_id else "",
            "referral_code":    referral_code or "",
        },
    )

    if discount_pct > 0:
        discounted = int(base_amount * (100 - discount_pct) / 100)
        product_name = PRODUCT_NAMES.get(product, product)
        kwargs["line_items"] = [{
            "price_data": {
                "currency": "usd",
                "unit_amount": discounted,
                "product_data": {"name": f"{product_name} ({discount_pct}% off)"},
            },
            "quantity": 1,
        }]
    else:
        kwargs["line_items"] = [{"price": price_id, "quantity": 1}]

    try:
        session = stripe.checkout.Session.create(**kwargs)
        return session.url, None
    except stripe.error.StripeError as e:
        return None, str(e)


# ── Pro subscription checkout (live path) ──────────────────────────────────────

def create_pro_signup_checkout(user_id: int, user_email: str,
                                subscriber_id: int, firm_name: str,
                                signup_token: str):
    """
    Create a Stripe Checkout session for a new pro subscriber.

    Phase 1: Stores subscriber_id and signup_token in metadata for reliable
             webhook-driven activation.
    Phase 2: Evaluates promotional eligibility NOW and stores the selected
             intro price ID in metadata. The webhook uses that stored value —
             never re-reads the date.

    Returns (checkout_url, None) or (None, error).
    """
    _get_stripe_key()

    # Determine intro price at Checkout creation time (Phase 2 requirement C).
    intro_price_id = _get_active_intro_price()

    try:
        # PAY-08: Prevent duplicate subscriptions — if this subscriber already
        # has a stripe_customer_id stored, reuse it and block a second checkout.
        with auth.get_db() as conn:
            existing_sub = conn.execute(
                "SELECT stripe_customer_id, stripe_sub_id FROM pro_subscribers WHERE id=?",
                (subscriber_id,)
            ).fetchone()

        if existing_sub and existing_sub["stripe_sub_id"]:
            # Active subscription already exists — do not create a second checkout.
            log.warning(
                "PAY-08: Subscriber %d already has subscription %s — refusing duplicate checkout",
                subscriber_id, existing_sub["stripe_sub_id"]
            )
            return None, (
                "A subscription already exists for this account. "
                "Please contact support if you believe this is an error."
            )

        # PAY-08: Reuse a known IRS Pilot customer; never search by email alone
        # (email-only search would match Taylor Tax customers in the same Stripe account).
        customer = None
        if existing_sub and existing_sub["stripe_customer_id"]:
            try:
                customer = stripe.Customer.retrieve(existing_sub["stripe_customer_id"])
                if getattr(customer, "deleted", False):
                    customer = None   # deleted — fall through to create
            except stripe.error.StripeError:
                customer = None

        if customer is None:
            # Create a new IRS Pilot–tagged customer. Do NOT use Customer.list(email=...)
            # because the same email may belong to a Taylor Tax customer in this account.
            customer = stripe.Customer.create(
                email=user_email,
                name=firm_name,
                metadata={
                    "user_id":       str(user_id),
                    "subscriber_id": str(subscriber_id),
                    "app":           "irs_pilot",   # PAY-08: tag for auditing
                },
                idempotency_key=f"customer-create-{subscriber_id}",
            )

        meta = {
            "user_id":               str(user_id),
            "subscriber_id":         str(subscriber_id),
            "signup_token":          signup_token,
            "type":                  "pro_subscription",
            # Phase 2: persist the price selected at Checkout time
            "intro_price_id":        intro_price_id,
        }

        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=["card"],
            mode="subscription",
            line_items=[{"price": intro_price_id, "quantity": 1}],
            subscription_data={"metadata": meta},
            success_url=(
                f"{BASE_URL}/pro-signup/success"
                f"?session_id={{CHECKOUT_SESSION_ID}}&token={signup_token}"
            ),
            cancel_url=f"{BASE_URL}/pro-signup/cancelled",
            metadata=meta,
        )

        # Best-effort: store customer_id now so it's available even if webhook lags
        try:
            with auth.get_db() as conn:
                conn.execute(
                    "UPDATE pro_subscribers SET stripe_customer_id=? WHERE id=?",
                    (customer.id, subscriber_id)
                )
        except Exception:
            pass

        return session.url, None
    except stripe.error.StripeError as e:
        return None, str(e)
    except Exception as e:
        return None, str(e)


# ── Schedule the intro→standard price transition ───────────────────────────────

def schedule_price_upgrade(stripe_subscription_id: str,
                            intro_price_id: str = None) -> tuple:
    """
    Create a SubscriptionSchedule that transitions from the intro price
    (3 months) to the standard $79/month price indefinitely.

    Phase 1: Called only from the webhook handler after confirmed payment,
             never from the success page.
    Phase 2: Uses the intro_price_id that was stored in Checkout metadata —
             the one the customer actually purchased — not the current date.
             Falls back to the standard intro price if not provided.

    Returns (schedule_id, None) or (None, error_string).
    """
    _get_stripe_key()
    if not intro_price_id:
        intro_price_id = _pro_price_intro()

    try:
        # Idempotency: check whether a schedule already exists for this sub.
        # Verify it has the correct number of phases before accepting it —
        # a schedule created in a broken state (create succeeded, modify failed)
        # would have < 2 phases and must be corrected, not silently reused.
        try:
            existing_schedules = stripe.SubscriptionSchedule.list(
                limit=10
            )
            for sched in existing_schedules.auto_paging_iter():
                if getattr(sched, "subscription", None) == stripe_subscription_id:
                    phases = getattr(sched, "phases", [])
                    if len(phases) >= 2:
                        log.info("schedule_price_upgrade: valid 2-phase schedule %s already exists for %s",
                                 sched.id, stripe_subscription_id)
                        return sched.id, None
                    # Broken/partial schedule — release and recreate
                    log.warning(
                        "schedule_price_upgrade: existing schedule %s for %s has only %d phase(s); "
                        "releasing and recreating", sched.id, stripe_subscription_id, len(phases)
                    )
                    try:
                        stripe.SubscriptionSchedule.release(sched.id)
                    except stripe.error.StripeError as rel_err:
                        log.error("Failed to release broken schedule %s: %s", sched.id, rel_err)
                    break
        except stripe.error.StripeError as list_err:
            log.warning("schedule_price_upgrade: could not list schedules: %s — proceeding", list_err)

        # PAY-01 fix: Use the supported two-step approach.
        # Step 1: Create schedule FROM the existing subscription (no phases override).
        #         This creates a 1-phase schedule mirroring the current sub.
        # Step 2: Amend the schedule to add the standard phase.
        # This is the only supported combination per Stripe API documentation.
        schedule = stripe.SubscriptionSchedule.create(
            from_subscription=stripe_subscription_id,
            idempotency_key=f"schedule-create-{stripe_subscription_id}",
        )
        schedule_id = schedule.id
        log.info("schedule_price_upgrade: created schedule %s for sub %s (step 1)",
                 schedule_id, stripe_subscription_id)

        # Step 2: Amend to add the standard-price phase after the intro period.
        # We use the schedule's current phases as the basis and append our
        # standard-price phase. The first phase should already reflect the
        # intro period from the subscription.
        current_phases = getattr(schedule, "phases", [])
        if not current_phases:
            return None, "schedule_price_upgrade: step 1 produced no phases — cannot amend"

        # Build the intro phase (mirror from current, enforce iterations=PRO_INTRO_MONTHS)
        intro_phase = {
            "items": [{"price": intro_price_id, "quantity": 1}],
            "iterations": PRO_INTRO_MONTHS,
        }
        standard_phase = {
            "items": [{"price": _pro_price_standard(), "quantity": 1}],
            # No iterations — runs indefinitely after intro period
        }

        amended = stripe.SubscriptionSchedule.modify(
            schedule_id,
            end_behavior="release",
            phases=[intro_phase, standard_phase],
            idempotency_key=f"schedule-amend-{stripe_subscription_id}",
        )
        actual_phases = len(getattr(amended, "phases", []))
        if actual_phases < 2:
            return None, (
                f"schedule_price_upgrade: amended schedule {schedule_id} has only "
                f"{actual_phases} phase(s) — expected 2"
            )
        log.info("schedule_price_upgrade: schedule %s amended to %d phases for sub %s",
                 schedule_id, actual_phases, stripe_subscription_id)
        return schedule_id, None

    except stripe.error.StripeError as e:
        log.error("schedule_price_upgrade failed for sub %s: %s", stripe_subscription_id, e)
        return None, str(e)


# ── Overage billing ────────────────────────────────────────────────────────────

PRO_SESSION_HARD_LIMIT = 10  # sessions per billing period when overage billing is disabled

def charge_pro_overage(subscriber_id: int, user_email: str,
                        extra_sessions: int, stripe_customer_id: str = None,
                        billing_period_key: str = None):
    """
    Item 8: Overage billing is DISABLED pending owner approval of the billing-period
    implementation using actual Stripe current_period_start/current_period_end.

    The current implementation used calendar months as a billing period proxy,
    which does not match Stripe's actual billing cycles and could mis-charge
    subscribers. Rather than charge on an incorrect schedule, overage billing is
    disabled and a hard session limit (PRO_SESSION_HARD_LIMIT) is enforced instead.

    When the owner approves a corrected implementation that reads billing periods
    from the Stripe Subscription object, this function should:
      1. Retrieve the subscription via stripe.Subscription.retrieve(stripe_sub_id)
      2. Use sub.current_period_start and sub.current_period_end as the idempotency
         key period to prevent double-charging across the correct billing window.
      3. Remove the DISABLED return below.

    Returns (None, "OVERAGE_BILLING_DISABLED") always while disabled.
    Caller (server.py) must enforce PRO_SESSION_HARD_LIMIT (10 sessions) instead.
    """
    log.warning(
        "charge_pro_overage called for subscriber %d but overage billing is DISABLED. "
        "Enforcing hard session limit of %d instead. "
        "Owner approval required before enabling Stripe-period-based overage billing.",
        subscriber_id, PRO_SESSION_HARD_LIMIT
    )
    return None, "OVERAGE_BILLING_DISABLED"


# ── Billing portal ─────────────────────────────────────────────────────────────

def create_billing_portal_session(customer_id: str, return_url: str):
    """Stripe billing portal — subscriber manages card/subscription themselves."""
    _get_stripe_key()
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id, return_url=return_url
        )
        return session.url, None
    except Exception as e:
        return None, str(e)


def get_or_create_stripe_customer(user_email: str, firm_name: str,
                                   user_id: int, subscriber_id: int):
    """Get existing or create new Stripe customer. Returns (customer_id, error)."""
    _get_stripe_key()
    try:
        customers = stripe.Customer.list(email=user_email, limit=1)
        if customers.data:
            return customers.data[0].id, None
        customer = stripe.Customer.create(
            email=user_email, name=firm_name,
            metadata={"user_id": str(user_id), "subscriber_id": str(subscriber_id)},
        )
        return customer.id, None
    except Exception as e:
        return None, str(e)


# ── Legacy subscription functions (kept for backward compatibility) ─────────────
# These are not the live signup path. create_pro_signup_checkout() is the live path.

def create_pro_subscription(user_id: int, user_email: str, subscriber_id: int):
    """Legacy: direct subscription creation without Checkout. Not the live path."""
    _get_stripe_key()
    intro_price = _pro_price_intro()
    try:
        customers = stripe.Customer.list(email=user_email, limit=1)
        customer = customers.data[0] if customers.data else stripe.Customer.create(email=user_email)
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": intro_price}],
            metadata={"user_id": str(user_id), "subscriber_id": str(subscriber_id), "type": "pro_subscription"},
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )
        return subscription.id, subscription.latest_invoice.payment_intent.client_secret, None
    except stripe.error.StripeError as e:
        return None, None, str(e)


def create_pro_subscription_checkout(user_id: int, user_email: str, subscriber_id: int):
    """Legacy Checkout path. Not the live signup path."""
    _get_stripe_key()
    intro_price = _pro_price_intro()
    try:
        meta = {"user_id": str(user_id), "subscriber_id": str(subscriber_id), "type": "pro_subscription"}
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user_email,
            line_items=[{"price": intro_price, "quantity": 1}],
            subscription_data={"metadata": meta},
            success_url=f"{BASE_URL}/pro-subscribe/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{BASE_URL}/pricing",
            metadata=meta,
        )
        return session.url, None
    except stripe.error.StripeError as e:
        return None, str(e)


def create_pro_subscription_direct(user_id: int, user_email: str,
                                    subscriber_id: int, firm_name: str):
    """Legacy direct subscription + payment link creation. Not the live signup path."""
    _get_stripe_key()
    intro_price = _pro_price_intro()
    try:
        customers = stripe.Customer.list(email=user_email, limit=1)
        customer = customers.data[0] if customers.data else stripe.Customer.create(
            email=user_email, name=firm_name,
            metadata={"user_id": str(user_id), "subscriber_id": str(subscriber_id)},
        )
        meta = {"user_id": str(user_id), "subscriber_id": str(subscriber_id), "type": "pro_subscription"}
        schedule = stripe.SubscriptionSchedule.create(
            customer=customer.id, start_date="now", end_behavior="release",
            phases=[
                {"items": [{"price": intro_price, "quantity": 1}], "iterations": PRO_INTRO_MONTHS, "metadata": meta},
                {"items": [{"price": _pro_price_standard(), "quantity": 1}], "metadata": meta},
            ],
            metadata=meta,
        )
        payment_link = stripe.PaymentLink.create(
            line_items=[{"price": intro_price, "quantity": 1}],
            subscription_data={"metadata": meta},
            after_completion={"type": "redirect", "redirect": {"url": f"{BASE_URL}/pro-subscribe/success"}},
            metadata=meta,
        )
        return schedule.subscription, payment_link.url, customer.id, None
    except Exception as e:
        return None, None, None, str(e)


# ── Webhook handler ────────────────────────────────────────────────────────────

def handle_webhook(payload: bytes, sig_header: str) -> tuple:
    """
    Process a Stripe platform webhook event.

    Phase 1 design:
    - Verify signature first; return 400 on failure (Stripe will not retry 400s).
    - Claim the event via the stripe_webhook_events table (idempotency).
      If already claimed-and-completed, return 200 immediately.
      If claimed-and-failed (previous crash), allow re-processing.
    - Process business logic.
    - On success: mark event completed.
    - On error: delete the claim row so Stripe's next retry can re-process.
    - Return (True, "OK") for 200, (False, msg) for 400.
      5xx errors are signalled by raising an exception which server.py catches.

    Phase 2: Never re-derives promotional eligibility from the current date.
             Uses intro_price_id from Checkout metadata.

    Activation rule (Requirement B):
    - checkout.session.completed with payment_status == 'paid' → activate.
    - customer.subscription.created alone → do NOT activate (payment not confirmed).
    - invoice.payment_succeeded on first invoice → activate as belt-and-suspenders.
    """
    # Step 1: Verify signature
    secret = _get_webhook_secret()
    if not secret:
        log.error("STRIPE_WEBHOOK_SECRET not set")
        return False, "Webhook secret not configured"

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except stripe.error.SignatureVerificationError:
        return False, "Invalid signature"
    except Exception as e:
        return False, f"Webhook parse error: {e}"

    event_id   = event["id"]
    event_type = event["type"]
    _get_stripe_key()

    # Step 2: Idempotency — claim the event
    claimed = auth.claim_webhook_event(event_id, event_type)
    if not claimed:
        # Already processed successfully — safe to return 200
        log.info("Webhook %s already processed, skipping", event_id)
        return True, "OK (duplicate)"

    # Step 3: Process
    try:
        _dispatch_event(event_id, event_type, event)
        auth.complete_webhook_event(event_id)
        return True, "OK"
    except Exception as e:
        log.exception("Webhook %s processing failed: %s", event_id, e)
        # Delete the claim row so Stripe can retry and we re-process cleanly
        auth.fail_webhook_event(event_id, str(e))
        # Raise so server.py returns 500 and Stripe retries
        raise


def _dispatch_event(event_id: str, event_type: str, event: dict):
    """Route a webhook event to the appropriate handler."""

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(event["data"]["object"])

    elif event_type == "invoice.payment_succeeded":
        _handle_invoice_payment_succeeded(event["data"]["object"])

    elif event_type == "invoice.payment_failed":
        _handle_invoice_payment_failed(event["data"]["object"])

    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(event["data"]["object"])

    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(event["data"]["object"])

    elif event_type == "charge.refunded":
        _handle_charge_refunded(event["data"]["object"])

    elif event_type == "charge.dispute.created":
        _handle_dispute_created(event["data"]["object"])

    # customer.subscription.created: intentionally NOT handled for activation.
    # Subscription creation alone does not confirm payment.
    # Activation happens on checkout.session.completed or invoice.payment_succeeded.


def _handle_checkout_completed(session: dict):
    """
    Handle checkout.session.completed.
    Consumer purchases: grant 7-day access.
    Pro subscriptions: activate subscriber after confirming payment.
    """
    payment_status = session.get("payment_status", "")
    metadata       = session.get("metadata") or {}
    event_type     = metadata.get("type", "")

    if event_type == "pro_subscription":
        # Item 6: Require confirmed payment before activating.
        # Only activate when payment_status == "paid" — never for trialing,
        # unpaid, or no_payment_required sessions. We do not offer free trials.
        if payment_status != "paid":
            log.warning(
                "Pro subscription checkout not paid — blocking activation: "
                "payment_status=%s event_id=%s",
                payment_status, session.get("id", "")
            )
            return
        _activate_pro_from_checkout(session, metadata)

    elif event_type == "consumer_purchase" or metadata.get("product"):
        if payment_status != "paid":
            return
        _grant_consumer_access(session, metadata)


def _activate_pro_from_checkout(session: dict, metadata: dict):
    """Activate a pro subscriber from a completed Checkout session."""
    subscriber_id = int(metadata.get("subscriber_id", 0))
    user_id       = int(metadata.get("user_id", 0))
    signup_token  = metadata.get("signup_token", "")
    stripe_sub_id = session.get("subscription")
    # Phase 2: use the intro price that was selected at Checkout time
    intro_price_id = metadata.get("intro_price_id", "")

    if not subscriber_id or not stripe_sub_id:
        log.error("Pro activation missing subscriber_id or subscription ID in metadata")
        return

    # Retrieve subscription to get customer ID and confirm status
    try:
        sub = stripe.Subscription.retrieve(stripe_sub_id)
    except stripe.error.StripeError as e:
        log.error("Failed to retrieve subscription %s: %s", stripe_sub_id, e)
        raise

    # Item 6: Only activate on 'active' subscription status.
    # Removed: 'trialing' (no trials offered) and 'past_due' (payment not confirmed).
    if sub.status != "active":
        log.warning(
            "Subscription %s status '%s' — not activating (requires 'active')",
            stripe_sub_id, sub.status
        )
        return

    stripe_customer_id = sub.customer if isinstance(sub.customer, str) else sub.customer.id

    # Business-object idempotency: check if already activated
    current = auth.get_subscriber_activation_status(subscriber_id)
    already_active = current.get("active") and current.get("stripe_sub_id") == stripe_sub_id

    if not already_active:
        changed = auth.activate_pro_subscriber(
            subscriber_id=subscriber_id,
            stripe_customer_id=stripe_customer_id,
            stripe_sub_id=stripe_sub_id,
            purchased_intro_price_id=intro_price_id or None,
        )
        if changed:
            log.info("Pro subscriber %d activated via checkout session", subscriber_id)

    # Mark signup token used (idempotent)
    if signup_token:
        try:
            auth.mark_pro_signup_token_used(signup_token)
        except Exception:
            pass

    # Create price upgrade schedule (idempotent — schedule_price_upgrade checks for existing)
    _create_schedule_safe(stripe_sub_id, intro_price_id)

    # Send activation email
    _send_activation_email(subscriber_id)


def _create_schedule_safe(stripe_sub_id: str, intro_price_id: str):
    """
    Create the upgrade schedule, logging but not raising on failure.

    Item 5: On failure, persist the failure to the DB and notify admin by email
    so the operator can manually create the schedule or trigger a retry.
    Activation is not blocked — the subscriber gets access even if the schedule
    creation fails; the admin notification ensures the issue is not silently lost.
    """
    try:
        sched_id, err = schedule_price_upgrade(stripe_sub_id, intro_price_id)
        if err:
            log.error("schedule_price_upgrade failed for %s: %s", stripe_sub_id, err)
            _persist_schedule_failure(stripe_sub_id, intro_price_id, err)
            _notify_admin_schedule_failure(stripe_sub_id, intro_price_id, err)
        else:
            log.info("Price schedule %s created for subscription %s", sched_id, stripe_sub_id)
            _clear_schedule_failure(stripe_sub_id)
    except Exception as e:
        log.error("schedule_price_upgrade exception for %s: %s", stripe_sub_id, e)
        _persist_schedule_failure(stripe_sub_id, intro_price_id, str(e))
        _notify_admin_schedule_failure(stripe_sub_id, intro_price_id, str(e))
        # Do NOT re-raise — activation must still complete even if schedule fails.


def _persist_schedule_failure(stripe_sub_id: str, intro_price_id: str, error: str):
    """
    Persist a schedule creation failure to the DB for operator-triggered retry.
    Uses the failed_schedule_jobs table (created by migration below).
    """
    try:
        with auth.get_db() as conn:
            conn.execute(
                """INSERT INTO failed_schedule_jobs
                   (stripe_sub_id, intro_price_id, error, created_at)
                   VALUES (?, ?, ?, datetime('now'))
                   ON CONFLICT(stripe_sub_id) DO UPDATE SET
                       error = excluded.error,
                       retry_count = retry_count + 1,
                       last_attempted_at = datetime('now')""",
                (stripe_sub_id, intro_price_id, error[:500])
            )
    except Exception as db_err:
        log.error("Failed to persist schedule failure for %s: %s", stripe_sub_id, db_err)


def _clear_schedule_failure(stripe_sub_id: str):
    """Remove a previously-failed schedule job once it succeeds."""
    try:
        with auth.get_db() as conn:
            conn.execute(
                "DELETE FROM failed_schedule_jobs WHERE stripe_sub_id = ?",
                (stripe_sub_id,)
            )
    except Exception:
        pass  # Best-effort cleanup


def _notify_admin_schedule_failure(stripe_sub_id: str, intro_price_id: str, error: str):
    """Email admin when a price schedule creation fails (item 5)."""
    try:
        import email_service
        email_service.notify_admin_schedule_failure(stripe_sub_id, intro_price_id, error)
    except Exception as e:
        log.error("Failed to send schedule failure alert for %s: %s", stripe_sub_id, e)


def _handle_invoice_payment_succeeded(invoice: dict):
    """
    Belt-and-suspenders activation path.
    If checkout.session.completed failed or was missed, the first successful
    invoice payment activates the subscription.
    Only acts on the FIRST invoice (billing_reason == 'subscription_create').
    """
    if invoice.get("billing_reason") != "subscription_create":
        return  # Renewal invoice — not an activation event

    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return

    # Get subscription metadata to find subscriber_id
    try:
        sub = stripe.Subscription.retrieve(stripe_sub_id)
    except stripe.error.StripeError as e:
        log.error("invoice.payment_succeeded: failed to retrieve sub %s: %s", stripe_sub_id, e)
        raise

    meta = dict(sub.metadata or {})
    subscriber_id = int(meta.get("subscriber_id", 0))
    intro_price_id = meta.get("intro_price_id", "")

    if not subscriber_id:
        return  # Not a pro subscription we manage

    # Business-object idempotency
    current = auth.get_subscriber_activation_status(subscriber_id)
    if current.get("active") and current.get("stripe_sub_id") == stripe_sub_id:
        log.info("invoice.payment_succeeded: subscriber %d already active, skipping", subscriber_id)
        return

    stripe_customer_id = sub.customer if isinstance(sub.customer, str) else sub.customer.id

    # Item 6: Only activate on confirmed 'active' subscription status.
    if sub.status != "active":
        log.warning(
            "invoice.payment_succeeded: sub %s status '%s' — not activating (requires 'active')",
            stripe_sub_id, sub.status
        )
        return

    changed = auth.activate_pro_subscriber(
        subscriber_id=subscriber_id,
        stripe_customer_id=stripe_customer_id,
        stripe_sub_id=stripe_sub_id,
        purchased_intro_price_id=intro_price_id or None,
    )
    if changed:
        log.info("Pro subscriber %d activated via invoice.payment_succeeded", subscriber_id)
        _create_schedule_safe(stripe_sub_id, intro_price_id)
        _send_activation_email(subscriber_id)


def _handle_invoice_payment_failed(invoice: dict):
    """
    Item 7: Handle failed invoice payments.
    - Look up the subscriber by stripe_sub_id.
    - Set overage_payment_failed=1 to block further overage charging.
    - Send admin notification email.
    """
    stripe_sub_id = invoice.get("subscription", "")
    customer_id   = invoice.get("customer", "")
    amount        = invoice.get("amount_due", 0)
    billing_reason = invoice.get("billing_reason", "")
    log.warning(
        "Invoice payment failed: sub=%s customer=%s amount=%d reason=%s",
        stripe_sub_id, customer_id, amount, billing_reason
    )

    if not stripe_sub_id:
        return

    # Look up subscriber and set overage_payment_failed flag
    try:
        with auth.get_db() as conn:
            row = conn.execute(
                "SELECT id, user_id FROM pro_subscribers WHERE stripe_sub_id = ?",
                (stripe_sub_id,)
            ).fetchone()
        if not row:
            log.info("invoice.payment_failed: no subscriber found for sub %s", stripe_sub_id)
            return

        subscriber_id = row["id"]
        user_id = row["user_id"]

        with auth.get_db() as conn:
            conn.execute(
                "UPDATE pro_subscribers SET overage_payment_failed = 1 WHERE id = ?",
                (subscriber_id,)
            )
        log.warning(
            "Marked overage_payment_failed=1 for subscriber %d (sub=%s)",
            subscriber_id, stripe_sub_id
        )

        # Notify admin
        try:
            import email_service
            with auth.get_db() as conn:
                u = conn.execute(
                    "SELECT email FROM users WHERE id = ?", (user_id,)
                ).fetchone()
            user_email = u["email"] if u else "(unknown)"
            email_service.notify_admin_payment_failed(
                subscriber_id=subscriber_id,
                user_email=user_email,
                stripe_sub_id=stripe_sub_id,
                amount_cents=amount,
                billing_reason=billing_reason,
            )
        except Exception as e:
            log.error("Failed to send payment-failed admin alert for sub %s: %s",
                      stripe_sub_id, e)

    except Exception as e:
        log.error("invoice.payment_failed handler error for sub %s: %s", stripe_sub_id, e)
        raise


def _handle_subscription_deleted(sub: dict):
    """Deactivate subscriber when their subscription is cancelled."""
    stripe_sub_id = sub.get("id", "")
    meta = dict(sub.metadata or {})
    subscriber_id = int(meta.get("subscriber_id", 0))
    if not subscriber_id:
        return
    with auth.get_db() as conn:
        conn.execute(
            "UPDATE pro_subscribers SET active=0 WHERE id=? AND stripe_sub_id=?",
            (subscriber_id, stripe_sub_id)
        )
    log.info("Pro subscriber %d deactivated: subscription %s deleted", subscriber_id, stripe_sub_id)


def _handle_subscription_updated(sub: dict):
    """
    Handle price schedule transitions and other subscription changes.
    Currently just logs; Phase 6 will add billing period tracking.
    """
    stripe_sub_id = sub.get("id", "")
    status        = sub.get("status", "")
    log.info("Subscription updated: %s status=%s", stripe_sub_id, status)


def _handle_charge_refunded(charge: dict):
    """
    IR-01: Handle charge refunds using payment_intent_id.

    charge.refunded supplies a PaymentIntent ID (pi_...).  Purchases are stored
    with both stripe_session_id (cs_...) and payment_intent_id (pi_...).  This
    handler resolves the checkout session ID from the purchases table so it can
    also expire bundle child rows (cs_...-nav, cs_...-wiz) and pass the correct
    session ID to commission voiding.

    Partial refunds reduce commission proportionally; already-paid commissions
    produce an audit record in commission_adjustments instead of being modified.
    """
    payment_intent  = charge.get("payment_intent", "")
    amount_refunded = charge.get("amount_refunded", 0)
    amount_total    = charge.get("amount", 0)        # total charge amount
    charge_id       = charge.get("id", "")
    log.info(
        "Charge refunded: charge=%s payment_intent=%s amount_refunded=%d amount_total=%d",
        charge_id, payment_intent, amount_refunded, amount_total
    )

    if not payment_intent:
        return

    # --- Step 1: Resolve the checkout session ID from the purchases table ----------
    # Purchases store payment_intent_id; from there we get stripe_session_id (cs_...)
    # which is needed to expire bundle children and look up commission rows.
    stripe_session_id = None
    try:
        with auth.get_db() as conn:
            row = conn.execute(
                "SELECT stripe_session_id FROM purchases "
                "WHERE payment_intent_id = ? LIMIT 1",
                (payment_intent,)
            ).fetchone()
        if row:
            stripe_session_id = row["stripe_session_id"]
    except Exception as e:
        log.error("Refund: failed to resolve session for %s: %s", payment_intent, e)

    # --- Step 2: Expire purchase rows -----------------------------------------------
    # Expire the main purchase(s) matched by payment_intent_id.
    # Also expire bundle child synthetic rows (cs_...-nav, cs_...-wiz) matched by
    # the checkout session prefix.
    try:
        with auth.get_db() as conn:
            # Expire by payment_intent_id (the primary/most reliable join)
            result = conn.execute(
                """UPDATE purchases
                   SET expires_at = datetime('now'),
                       wizard_locked = 1,
                       wizard_lock_reason = 'refunded'
                   WHERE payment_intent_id = ?
                     AND (expires_at IS NULL OR expires_at > datetime('now'))""",
                (payment_intent,)
            )
            expired_count = result.rowcount

            # Also expire bundle child rows (synthetic session IDs like cs_...-nav)
            # These have no payment_intent_id; match by stripe_session_id prefix.
            if stripe_session_id:
                child_result = conn.execute(
                    """UPDATE purchases
                       SET expires_at = datetime('now'),
                           wizard_locked = 1,
                           wizard_lock_reason = 'refunded'
                       WHERE stripe_session_id LIKE ? || '-%'
                         AND (expires_at IS NULL OR expires_at > datetime('now'))""",
                    (stripe_session_id,)
                )
                expired_count += child_result.rowcount

        if expired_count > 0:
            log.warning(
                "Refund: expired %d purchase row(s) for payment_intent=%s session=%s",
                expired_count, payment_intent, stripe_session_id
            )
        else:
            log.info(
                "Refund: no active purchases found for payment_intent=%s session=%s "
                "(may already be expired)",
                payment_intent, stripe_session_id
            )
    except Exception as e:
        log.error("Failed to expire purchases on refund for %s: %s", payment_intent, e)
        raise

    # --- Step 3: Adjust commissions -------------------------------------------------
    # Commissions are keyed by stripe_session_id (cs_...), not payment_intent.
    # Compute refund fraction for proportional partial-refund handling.
    if stripe_session_id:
        try:
            refund_fraction = 1.0
            if amount_total and amount_total > 0:
                refund_fraction = min(amount_refunded / amount_total, 1.0)
            affected = auth.void_commissions_for_refund(stripe_session_id, refund_fraction)
            if affected > 0:
                log.info(
                    "Refund: adjusted %d commission row(s) for session=%s "
                    "(fraction=%.4f)",
                    affected, stripe_session_id, refund_fraction
                )
        except Exception as e:
            log.error(
                "Failed to adjust commissions on refund for session=%s pi=%s: %s",
                stripe_session_id, payment_intent, e
            )
            # Non-fatal — access is already revoked; commission adjustment is best-effort
    else:
        log.warning(
            "Refund: could not resolve stripe_session_id for payment_intent=%s; "
            "commission adjustment skipped",
            payment_intent
        )


def _handle_dispute_created(dispute: dict):
    """Log dispute; send admin notification."""
    amount = dispute.get("amount", 0)
    reason = dispute.get("reason", "")
    charge = dispute.get("charge", "")
    log.warning("DISPUTE CREATED: charge=%s amount=%d reason=%s", charge, amount, reason)
    _send_admin_dispute_alert(charge, amount, reason)


def _grant_consumer_access(session: dict, metadata: dict):
    """Grant 7-day consumer access after a successful one-time purchase."""
    user_id          = int(metadata.get("user_id", 0))
    product          = metadata.get("product", "")
    stripe_id        = session.get("id", "")
    discount_code_id = metadata.get("discount_code_id", "")
    referral_code    = metadata.get("referral_code", "")
    amount_paid      = session.get("amount_total", 0)

    if not user_id or not product:
        return

    # PAY-06: pass the actual amount paid so revenue records are accurate.
    # For bundles, distribute proportionally: nav=$59, wiz=$99, bundle=$129.
    # The parent bundle row gets the full amount; sub-items use the
    # sub-product list prices (not the bundle discount) purely for reference.
    NAV_PRICE  = 5900   # cents
    WIZ_PRICE  = 9900   # cents
    # IR-01: also store payment_intent_id (pi_...) alongside the checkout session
    # ID (cs_...) so charge.refunded can resolve purchase rows by pi_.
    payment_intent_id = session.get("payment_intent") or None
    # Idempotent grant
    purchase_id, is_new = auth.grant_access_idempotent(
        user_id, product, stripe_id, amount_paid=amount_paid,
        payment_intent_id=payment_intent_id
    )
    if is_new and product == "bundle":
        # Bundle child rows use synthetic session IDs; payment_intent_id is not
        # stored on children because _handle_charge_refunded finds them via the
        # cs_...-nav / cs_...-wiz prefix pattern.
        auth.grant_access_idempotent(user_id, "navigator", stripe_id + "-nav",
                                     amount_paid=NAV_PRICE)
        auth.grant_access_idempotent(user_id, "wizard",    stripe_id + "-wiz",
                                     amount_paid=WIZ_PRICE)

    if is_new:
        # Send purchase notification
        try:
            import email_service
            with auth.get_db() as conn:
                u = conn.execute("SELECT email FROM users WHERE id=?", (user_id,)).fetchone()
            if u:
                email_service.notify_new_purchase(u["email"], product, amount_paid)
        except Exception:
            pass

        # Record discount code use
        if discount_code_id:
            try:
                auth.record_discount_use(int(discount_code_id), user_id, product)
            except Exception:
                pass

        # Record referral conversion and Foundation override
        # IR-02: Commission failures are logged and re-raised so callers receive a
        # durable error.  Override failures are logged but non-fatal (purchase access
        # is already granted; the override is a secondary accounting step).
        if referral_code:
            try:
                partner = auth.get_referral_partner_by_code(referral_code)
                if partner:
                    auth.record_referral_conversion(
                        partner["id"], user_id, purchase_id,
                        product, amount_paid, partner["commission_pct"], stripe_id
                    )
                    # If this partner was recruited by a Foundation member, record
                    # the 5% override commission for that Foundation member.
                    try:
                        sponsor = auth.get_foundation_sponsor(partner["id"])
                        if sponsor:
                            auth.record_foundation_override(
                                foundation_member_id=sponsor["id"],
                                sale_amount=amount_paid,
                                override_pct=sponsor["override_pct"],
                                source_partner_id=partner["id"],
                                purchase_id=purchase_id,
                                stripe_session_id=stripe_id,
                            )
                    except Exception as _ov_err:
                        log.error(
                            "Foundation override recording failed for session=%s "
                            "partner=%s: %s — override skipped; purchase fulfilled",
                            stripe_id, partner.get("id"), _ov_err
                        )
            except Exception as _comm_err:
                log.error(
                    "Referral commission recording failed for session=%s code=%s: %s",
                    stripe_id, referral_code, _comm_err
                )
                raise  # Propagate so the webhook event is not marked complete


# ── Notification helpers ───────────────────────────────────────────────────────

def _send_activation_email(subscriber_id: int):
    """Send activation confirmation to a newly activated pro subscriber."""
    try:
        import email_service
        sub = auth.get_pro_subscriber_by_id(subscriber_id)
        if not sub:
            return
        with auth.get_db() as conn:
            u = conn.execute(
                "SELECT email FROM users WHERE id=?", (sub["user_id"],)
            ).fetchone()
        if u:
            email_service.notify_pro_activation(
                u["email"], sub["firm_name"], sub["contact_name"]
            )
    except Exception as e:
        log.error("Failed to send activation email for subscriber %d: %s", subscriber_id, e)


def _send_admin_dispute_alert(charge_id: str, amount: int, reason: str):
    """Notify admin of a dispute."""
    try:
        import email_service
        email_service.notify_admin_dispute(charge_id, amount, reason)
    except Exception as e:
        log.error("Failed to send dispute alert: %s", e)


# ── Connect webhook handler (Phase 4 — DISABLED) ──────────────────────────────

def handle_connect_webhook(payload: bytes, sig_header: str) -> tuple:
    """
    PAY-07: Stripe Connect webhook is NOT implemented.
    This function is explicitly disabled until Phase 4 is approved, tested,
    and ready for production. It returns (False, 503) so the caller can
    respond with HTTP 503, causing Stripe to retry later (and alerting the
    team that the endpoint is receiving traffic it cannot process).

    DO NOT silently accept and discard Connect events — that hides problems.
    DO NOT remove this function without enabling a real implementation.
    """
    log.warning(
        "PAY-07: Stripe Connect webhook received but feature is disabled — "
        "returning 503 so Stripe will retry. Remove this gate when Phase 4 is implemented."
    )
    return False, "SERVICE_UNAVAILABLE"


# ── Activation status (for success page polling) ───────────────────────────────

def get_activation_status(subscriber_id: int) -> dict:
    """
    Return activation status for the success page polling endpoint.
    The success page is informational only — it polls this until active=True.
    """
    return auth.get_subscriber_activation_status(subscriber_id)
