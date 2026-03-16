"""
IRS Pilot — Stripe Checkout Integration
Handles payment session creation and webhook processing.
"""
import os, stripe
from flask import request, jsonify, redirect, Response
import auth

# Keys are read fresh on each call so Railway env updates take effect immediately
def _get_stripe_key():
    key = os.environ.get("STRIPE_SECRET_KEY", "")
    stripe.api_key = key
    return key

WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

def _get_webhook_secret():
    return os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# Your site's base URL
BASE_URL = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "localhost:8080")
if not BASE_URL.startswith("http"):
    BASE_URL = f"https://{BASE_URL}"

# Price ID → product key mapping
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

# Use test prices when in test mode
import os as _os
_test_mode = _os.environ.get("STRIPE_SECRET_KEY", "").startswith("sk_test_")
PRODUCT_TO_PRICE = {
    "navigator": "price_1TAcdgKCmkbEhj2E3PlNJPO0" if _test_mode else "price_1TAbugKCmkbEhj2E2HnuoIDO",
    "wizard":    "price_1TAceNKCmkbEhj2EhmP8CqlG" if _test_mode else "price_1TAbvGKCmkbEhj2ESSoCVxJ2",
    "bundle":    "price_1TAcexKCmkbEhj2EymIqdcm9" if _test_mode else "price_1TAbvtKCmkbEhj2ET7xDLRkz",
}


PRODUCT_NAMES = {
    "navigator": "IRS Pilot — 7-Day Access",
    "wizard":    "Financial Intake Wizard — 7-Day Access",
    "bundle":    "IRS Pilot Complete Bundle — 7-Day Access",
}

# Pro subscription price IDs
PRO_PRICE_INTRO    = "price_1TB3phKCmkbEhj2E9Hq0w2rm"  # $49/month intro
PRO_PRICE_STANDARD = "price_1TB3phKCmkbEhj2ELLF6CG6t"  # $79/month standard
PRO_INTRO_MONTHS   = 3
PRO_OVERAGE_AMOUNT = 500  # $5.00 in cents per extra session


def create_pro_subscription(user_id: int, user_email: str, subscriber_id: int):
    """
    Create a Stripe subscription for a pro subscriber.
    Uses $49/month for first 3 months, then $79/month automatically.
    Returns (subscription_id, checkout_url, None) or (None, None, error).
    """
    _get_stripe_key()
    try:
        # Create or retrieve Stripe customer
        customers = stripe.Customer.list(email=user_email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(email=user_email)

        # Create subscription with intro phase then standard phase
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": PRO_PRICE_INTRO}],
            metadata={
                "user_id":       str(user_id),
                "subscriber_id": str(subscriber_id),
                "type":          "pro_subscription",
            },
            payment_behavior="default_incomplete",
            payment_settings={"save_default_payment_method": "on_subscription"},
            expand=["latest_invoice.payment_intent"],
        )
        return subscription.id, subscription.latest_invoice.payment_intent.client_secret, None
    except stripe.error.StripeError as e:
        return None, None, str(e)


def create_pro_subscription_checkout(user_id: int, user_email: str,
                                      subscriber_id: int):
    """
    Create a Stripe Checkout session for pro subscription.
    Uses subscription mode with 3-month intro price then auto-upgrades.
    Returns (url, None) or (None, error).
    """
    _get_stripe_key()
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user_email,
            line_items=[{
                "price": PRO_PRICE_INTRO,
                "quantity": 1,
            }],
            subscription_data={
                "metadata": {
                    "user_id":       str(user_id),
                    "subscriber_id": str(subscriber_id),
                    "type":          "pro_subscription",
                },
                # After 3 months switch to standard price via schedule
                "trial_period_days": None,
            },
            success_url=f"{BASE_URL}/pro-subscribe/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{BASE_URL}/pricing",
            metadata={
                "user_id":       str(user_id),
                "subscriber_id": str(subscriber_id),
                "type":          "pro_subscription",
            },
        )
        return session.url, None
    except stripe.error.StripeError as e:
        return None, str(e)


def charge_pro_overage(subscriber_id: int, user_email: str,
                        extra_sessions: int, stripe_customer_id: str = None):
    """
    Charge a pro subscriber for overage sessions ($5 each).
    Returns (payment_intent_id, None) or (None, error).
    """
    _get_stripe_key()
    amount = PRO_OVERAGE_AMOUNT * extra_sessions
    try:
        if stripe_customer_id:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency="usd",
                customer=stripe_customer_id,
                description=f"IRS Pilot Pro — {extra_sessions} overage session(s)",
                confirm=True,
                off_session=True,
            )
        else:
            # Can't charge without saved payment — create invoice instead
            customers = stripe.Customer.list(email=user_email, limit=1)
            if not customers.data:
                return None, "No Stripe customer found for this subscriber."
            customer = customers.data[0]
            invoice_item = stripe.InvoiceItem.create(
                customer=customer.id,
                amount=amount,
                currency="usd",
                description=f"IRS Pilot Pro — {extra_sessions} overage session(s) @ $5 each",
            )
            invoice = stripe.Invoice.create(
                customer=customer.id,
                auto_advance=True,
            )
            invoice.finalize_invoice()
            return invoice.id, None
        return intent.id, None
    except stripe.error.StripeError as e:
        return None, str(e)


def schedule_price_upgrade(stripe_subscription_id: str):
    """
    Schedule a subscription price upgrade from intro to standard after 3 months.
    Call this when a pro subscription is first activated.
    """
    _get_stripe_key()
    try:
        sub = stripe.Subscription.retrieve(stripe_subscription_id)
        # Create a subscription schedule to switch price after intro period
        schedule = stripe.SubscriptionSchedule.create(
            from_subscription=stripe_subscription_id,
        )
        # Calculate end of intro period
        from datetime import datetime, timezone
        import time
        current_period_start = sub.current_period_start
        # Set phases: 3 months at intro, then standard indefinitely
        stripe.SubscriptionSchedule.modify(
            schedule.id,
            phases=[
                {
                    "items": [{"price": PRO_PRICE_INTRO, "quantity": 1}],
                    "iterations": PRO_INTRO_MONTHS,
                },
                {
                    "items": [{"price": PRO_PRICE_STANDARD, "quantity": 1}],
                },
            ],
        )
        return schedule.id, None
    except stripe.error.StripeError as e:
        return None, str(e)


PRODUCT_REDIRECT = {
    "navigator": "/navigator",
    "wizard":    "/wizard",
    "bundle":    "/navigator",  # bundle gets both; start with navigator
}



def create_pro_subscription_direct(user_id: int, user_email: str,
                                    subscriber_id: int, firm_name: str):
    """
    Create a Stripe Customer + Subscription Schedule directly.
    3 months at $49/mo then auto-switches to $79/mo.
    Returns (subscription_id, payment_url, customer_id, error).
    """
    _get_stripe_key()
    try:
        # Get or create Stripe customer
        customers = stripe.Customer.list(email=user_email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(
                email=user_email,
                name=firm_name,
                metadata={"user_id": str(user_id), "subscriber_id": str(subscriber_id)}
            )

        meta = {"user_id": str(user_id), "subscriber_id": str(subscriber_id), "type": "pro_subscription"}

        # Create subscription schedule: 3 months intro then standard
        schedule = stripe.SubscriptionSchedule.create(
            customer=customer.id,
            start_date="now",
            end_behavior="release",
            phases=[
                {"items": [{"price": PRO_PRICE_INTRO, "quantity": 1}],
                 "iterations": PRO_INTRO_MONTHS, "metadata": meta},
                {"items": [{"price": PRO_PRICE_STANDARD, "quantity": 1}],
                 "metadata": meta},
            ],
            metadata=meta,
        )

        # Create payment link for first payment + card collection
        payment_link = stripe.PaymentLink.create(
            line_items=[{"price": PRO_PRICE_INTRO, "quantity": 1}],
            subscription_data={"metadata": meta},
            after_completion={"type": "redirect",
                              "redirect": {"url": f"{BASE_URL}/pro-subscribe/success"}},
            metadata=meta,
        )

        return schedule.subscription, payment_link.url, customer.id, None
    except Exception as e:
        return None, None, None, str(e)


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
            metadata={"user_id": str(user_id), "subscriber_id": str(subscriber_id)}
        )
        return customer.id, None
    except Exception as e:
        return None, str(e)


def create_billing_portal_session(customer_id: str, return_url: str):
    """Stripe billing portal — subscriber manages card/subscription themselves."""
    _get_stripe_key()
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id, return_url=return_url)
        return session.url, None
    except Exception as e:
        return None, str(e)


def create_checkout_session(user_id: int, user_email: str, product: str,
                             discount_pct: int = 0, discount_code_id: int = None,
                             referral_code: str = None):
    """
    Create a Stripe Checkout session and return the URL.
    Returns (url, None) or (None, error_message).
    """
    _get_stripe_key()
    price_id = PRODUCT_TO_PRICE.get(product)
    if not price_id:
        return None, f"Unknown product: {product}"

    PRODUCT_AMOUNTS = {"navigator": 5900, "wizard": 9900, "bundle": 12900}
    base_amount = PRODUCT_AMOUNTS.get(product, 5900)

    kwargs = dict(
        payment_method_types=["card"],
        mode="payment",
        customer_email=user_email,
        success_url=f"{BASE_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{BASE_URL}/pricing",
        metadata={
            "user_id":          str(user_id),
            "product":          product,
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
                "product_data": {
                    "name": f"{product_name} ({discount_pct}% off)",
                },
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


def handle_webhook(payload: bytes, sig_header: str):
    """
    Process a Stripe webhook event.
    Returns (success: bool, message: str).
    """
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, _get_webhook_secret())
    except stripe.error.SignatureVerificationError:
        return False, "Invalid signature"
    except Exception as e:
        return False, str(e)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        if session.get("payment_status") == "paid":
            user_id          = int(session["metadata"].get("user_id", 0))
            product          = session["metadata"].get("product", "")
            stripe_id        = session["id"]
            discount_code_id = session["metadata"].get("discount_code_id", "")
            referral_code    = session["metadata"].get("referral_code", "")
            amount_paid      = session.get("amount_total", 0)

            if user_id and product:
                purchase_id = auth.grant_access(user_id, product, stripe_id)
                # If bundle, also grant individual access
                if product == "bundle":
                    auth.grant_access(user_id, "navigator", stripe_id)
                    auth.grant_access(user_id, "wizard", stripe_id)

                # Send purchase notification email
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

    return True, "OK"
