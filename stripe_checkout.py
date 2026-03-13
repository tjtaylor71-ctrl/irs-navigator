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


def create_checkout_session(user_id: int, user_email: str, product: str):
    """
    Create a Stripe Checkout session and return the URL.
    Returns (url, None) or (None, error_message).
    """
    _get_stripe_key()
    price_id = PRODUCT_TO_PRICE.get(product)
    if not price_id:
        return None, f"Unknown product: {product}"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="payment",
            customer_email=user_email,
            success_url=f"{BASE_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{BASE_URL}/pricing",
            metadata={
                "user_id":  str(user_id),
                "product":  product,
            },
        )
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
            user_id = int(session["metadata"].get("user_id", 0))
            product  = session["metadata"].get("product", "")
            stripe_id = session["id"]

            if user_id and product:
                auth.grant_access(user_id, product, stripe_id)
                # If bundle, also grant individual access
                if product == "bundle":
                    auth.grant_access(user_id, "navigator", stripe_id)
                    auth.grant_access(user_id, "wizard", stripe_id)

    return True, "OK"
