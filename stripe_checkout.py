"""
IRS Navigator — Stripe Checkout Integration
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
    "navigator": "IRS Navigator — 7-Day Access",
    "wizard":    "Financial Intake Wizard — 7-Day Access",
    "bundle":    "IRS Navigator Complete Bundle — 7-Day Access",
}

PRODUCT_REDIRECT = {
    "navigator": "/navigator",
    "wizard":    "/wizard",
    "bundle":    "/navigator",  # bundle gets both; start with navigator
}


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
