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

PRODUCT_AMOUNTS = {"navigator": 12900, "wizard": 12900, "bundle": 12900}

PRODUCT_REDIRECT = {
    "navigator": "/navigator",
    "wizard":    "/wizard",
    "bundle":    "/navigator",
}

# ── Pro subscription price IDs ─────────────────────────────────────────────────
# Standard two-phase pricing: intro price for 3 months, then standard forever.
PRO_PRICE_INTRO_LIVE    = "price_1TB3phKCmkbEhj2E9Hq0w2rm"   # $49/month
PRO_PRICE_STANDARD_LIVE = "price_1TB3phKCmkbEhj2ELLF6CG6t"   # $79/month
PRO_PRICE_INTRO_TEST    = os.environ.get("STRIPE_PRO_PRICE_INTRO_TEST", "")
PRO_PRICE_STANDARD_TEST = os.environ.get("STRIPE_PRO_PRICE_STANDARD_TEST", "")

# Phase 2 — Black Friday promotional price (set env var to enable)
# Separate IDs for test and live to avoid cross-contamination.
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


# ── Phase 2: Promotional window ────────────────────────────────────────────────
# Enrollment window in US Central Time per approval document.
_CT = ZoneInfo("America/Chicago")
PROMO_START_CT = datetime(2026, 11, 27, 0, 0, 0, tzinfo=_CT)
PROMO_END_CT   = datetime(2026, 11, 30, 23, 59, 59, tzinfo=_CT)


def _get_active_intro_price() -> str:
    """
    Return the correct intro price for a new subscriber at the moment of Checkout
    creation. This is the ONLY place that inspects the current date/time for
    promotional eligibility. The returned price ID is stored in Checkout metadata
    and used by the webhook — the webhook never re-evaluates the date.
    """
    promo = _pro_price_promo()
    if promo:
        now_ct = datetime.now(tz=_CT)
        if PROMO_START_CT <= now_ct <= PROMO_END_CT:
            return promo
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
        # Get or create Stripe customer
        customers = stripe.Customer.list(email=user_email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(
                email=user_email,
                name=firm_name,
                metadata={
                    "user_id":       str(user_id),
                    "subscriber_id": str(subscriber_id),
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
        # Idempotency: check whether a schedule already exists for this sub
        existing = stripe.SubscriptionSchedule.list(limit=5)
        for sched in existing.auto_paging_iter():
            if getattr(sched, "subscription", None) == stripe_subscription_id:
                log.info("schedule_price_upgrade: schedule already exists for %s",
                         stripe_subscription_id)
                return sched.id, None

        # Create from the live subscription so Stripe uses the existing billing anchor
        schedule = stripe.SubscriptionSchedule.create(
            from_subscription=stripe_subscription_id,
            idempotency_key=f"schedule-create-{stripe_subscription_id}",
        )

        # Phase 2 requirement: schedule must use the PURCHASED intro price,
        # and must end_behavior='release' so billing continues after the schedule ends.
        stripe.SubscriptionSchedule.modify(
            schedule.id,
            end_behavior="release",
            phases=[
                {
                    "items":      [{"price": intro_price_id, "quantity": 1}],
                    "iterations": PRO_INTRO_MONTHS,
                },
                {
                    "items": [{"price": _pro_price_standard(), "quantity": 1}],
                    # No iterations → runs indefinitely
                },
            ],
        )

        return schedule.id, None
    except stripe.error.StripeError as e:
        return None, str(e)


# ── Overage billing ────────────────────────────────────────────────────────────

def charge_pro_overage(subscriber_id: int, user_email: str,
                        extra_sessions: int, stripe_customer_id: str = None,
                        billing_period_key: str = None):
    """
    Charge a pro subscriber for overage sessions ($5 each).
    billing_period_key is used as a Stripe idempotency key to prevent
    duplicate charges for the same billing period.
    Returns (payment_intent_id, None) or (None, error).
    """
    _get_stripe_key()
    amount = PRO_OVERAGE_AMOUNT * extra_sessions
    idempotency_key = (
        f"overage-{subscriber_id}-{billing_period_key}"
        if billing_period_key else None
    )

    try:
        if stripe_customer_id:
            kwargs = dict(
                amount=amount,
                currency="usd",
                customer=stripe_customer_id,
                description=f"IRS Pilot Pro — {extra_sessions} overage session(s) @ $5",
                confirm=True,
                off_session=True,
            )
            if idempotency_key:
                kwargs["idempotency_key"] = idempotency_key
            intent = stripe.PaymentIntent.create(**kwargs)
            return intent.id, None
        else:
            customers = stripe.Customer.list(email=user_email, limit=1)
            if not customers.data:
                return None, "No Stripe customer found for this subscriber."
            customer = customers.data[0]
            stripe.InvoiceItem.create(
                customer=customer.id,
                amount=amount,
                currency="usd",
                description=f"IRS Pilot Pro — {extra_sessions} overage session(s) @ $5 each",
            )
            invoice_kwargs = dict(customer=customer.id, auto_advance=True)
            if idempotency_key:
                invoice_kwargs["idempotency_key"] = f"inv-{idempotency_key}"
            invoice = stripe.Invoice.create(**invoice_kwargs)
            invoice.finalize_invoice()
            return invoice.id, None
    except stripe.error.StripeError as e:
        return None, str(e)


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
        # Requirement B: confirm payment before activating
        if payment_status not in ("paid",):
            # Subscription mode sessions may show 'no_payment_required' or 'unpaid'
            # for free trials — we don't offer those, but guard anyway.
            sub_status = ""
            stripe_sub_id = session.get("subscription")
            if stripe_sub_id:
                try:
                    sub = stripe.Subscription.retrieve(stripe_sub_id)
                    sub_status = sub.status
                except Exception:
                    pass
            if sub_status not in ("active", "trialing"):
                log.warning("Pro subscription checkout not paid: payment_status=%s sub_status=%s",
                            payment_status, sub_status)
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

    if sub.status not in ("active", "trialing", "past_due"):
        log.warning("Subscription %s status %s — not activating", stripe_sub_id, sub.status)
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
    """Create the upgrade schedule, logging but not raising on failure."""
    try:
        sched_id, err = schedule_price_upgrade(stripe_sub_id, intro_price_id)
        if err:
            log.error("schedule_price_upgrade failed for %s: %s", stripe_sub_id, err)
        else:
            log.info("Price schedule %s created for subscription %s", sched_id, stripe_sub_id)
    except Exception as e:
        log.error("schedule_price_upgrade exception for %s: %s", stripe_sub_id, e)
        # Do NOT re-raise — activation must still complete even if schedule fails.
        # An admin can create the schedule manually if needed.


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

    if sub.status not in ("active", "trialing", "past_due"):
        log.warning("invoice.payment_succeeded: sub %s status %s, not activating",
                    stripe_sub_id, sub.status)
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
    """Log failed invoice payments; email notification handled separately."""
    stripe_sub_id = invoice.get("subscription", "")
    customer_id   = invoice.get("customer", "")
    amount        = invoice.get("amount_due", 0)
    log.warning("Invoice payment failed: sub=%s customer=%s amount=%d",
                stripe_sub_id, customer_id, amount)
    # TODO Phase 6: look up subscriber, set overage_payment_failed=1, send email


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
    """Log refund; block future redemption of unredeemed purchases."""
    stripe_session = charge.get("payment_intent", "")
    log.info("Charge refunded: payment_intent=%s", stripe_session)
    # TODO Phase 7: mark purchase as refunded to block redemption


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

    # Idempotent grant
    purchase_id, is_new = auth.grant_access_idempotent(user_id, product, stripe_id)
    if is_new and product == "bundle":
        auth.grant_access_idempotent(user_id, "navigator", stripe_id + "-nav")
        auth.grant_access_idempotent(user_id, "wizard",    stripe_id + "-wiz")

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

        # Record referral conversion
        if referral_code:
            try:
                partner = auth.get_referral_partner_by_code(referral_code)
                if partner:
                    auth.record_referral_conversion(
                        partner["id"], user_id, purchase_id,
                        product, amount_paid, partner["commission_pct"], stripe_id
                    )
            except Exception:
                pass


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


# ── Connect webhook handler (Phase 4) ─────────────────────────────────────────

def handle_connect_webhook(payload: bytes, sig_header: str) -> tuple:
    """
    Process Stripe Connect webhook events (connected account events).
    Separate signing secret from the platform webhook.
    Returns (True, "OK") or (False, error_message).
    Phase 4 placeholder — routes implemented in Phase 4.
    """
    secret = _get_connect_webhook_secret()
    if not secret:
        log.error("STRIPE_CONNECT_WEBHOOK_SECRET not set")
        return False, "Connect webhook secret not configured"

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, secret)
    except stripe.error.SignatureVerificationError:
        return False, "Invalid signature"
    except Exception as e:
        return False, f"Connect webhook parse error: {e}"

    event_id   = event["id"]
    event_type = event["type"]
    _get_stripe_key()

    # Idempotency for connect events
    claimed = auth.claim_webhook_event(f"connect-{event_id}", event_type)
    if not claimed:
        return True, "OK (duplicate)"

    try:
        # Phase 4 handlers will be added here
        log.info("Connect webhook %s type=%s — Phase 4 not yet implemented", event_id, event_type)
        auth.complete_webhook_event(f"connect-{event_id}")
        return True, "OK"
    except Exception as e:
        auth.fail_webhook_event(f"connect-{event_id}", str(e))
        raise


# ── Activation status (for success page polling) ───────────────────────────────

def get_activation_status(subscriber_id: int) -> dict:
    """
    Return activation status for the success page polling endpoint.
    The success page is informational only — it polls this until active=True.
    """
    return auth.get_subscriber_activation_status(subscriber_id)
