# IRS Pilot — Consolidated Audit Fix Deliverables
## PAY-01 through PAY-08 / SEC-01 through SEC-06 / AUDIT-013

**Date:** 2026-11-25  
**Branch:** staging (DO NOT merge to main until reviewer approves)  
**Files changed:** auth.py, server.py, stripe_checkout.py, email_service.py, requirements.txt

> **2026-11-25 update:** Foundation program business logic corrected — Foundation is a free referral-partner program with no paid enrollment. See Section 8 for full description of changes.

---

## 1. Complete Revised Repository ZIP

File: `irs-navigator-staging.zip` (attached — 2.8 MB, no secrets, no customer data, no .db files)

### What changed

| File | Changes |
|------|---------|
| `requirements.txt` | Added `argon2-cffi==23.1.0` |
| `auth.py` | SEC-02 Argon2id required on Railway (RuntimeError on missing); PAY-02 claim_token + claimed_at stale recovery; PAY-06 amount_paid; SEC-04 entitlement_type (admin-only backfill scoped to tjtaylor@irspilot.com); SEC-05 migration errors; PAY-05 failed_schedule_jobs table |
| `server.py` | SEC-01 CSP unpkg.com; SEC-03 session revocation on password rotation (DELETE FROM sessions); SEC-06 SECRET_KEY validation; PAY-03 Foundation webhook corrected (no-op — Foundation is a free program); PAY-07 Connect 503 response; Item 10 CSRF double-submit + login rate limiting |
| `stripe_checkout.py` | PAY-01 two-step schedule with durable failure recovery; PAY-06 caller amount_paid; PAY-07 Connect disabled; PAY-08 customer cross-association fix + duplicate-subscription guard; Item 6 payment_status=="paid" required; Item 7 invoice failure + charge refund handling + commission voiding on refund; Item 8 overage billing disabled + hard session limit; Foundation override recorded at checkout |
| `auth.py` | (previous changes) + `record_referral_conversion` idempotency; `record_foundation_override` idempotency + stripe_session_id parameter; new `get_foundation_sponsor`; new `void_commissions_for_refund` |
| `email_service.py` | Added `notify_admin_schedule_failure`, `notify_admin_payment_failed` |

---

## 2. Database Migration and Rollback Plan

### Migrations applied automatically at startup (`auth.init_db()`)

All migrations are idempotent — safe on repeated startup and already-migrated databases.

```sql
-- SEC-04: Explicit admin entitlement marker
ALTER TABLE purchases ADD COLUMN entitlement_type TEXT DEFAULT NULL;

-- SEC-04: Back-fill admin rows — scoped to known admin email only
-- (preserves legitimate complimentary purchases for other users)
UPDATE purchases
   SET entitlement_type = 'admin'
 WHERE stripe_session_id IS NULL
   AND amount_paid = 0
   AND entitlement_type IS NULL
   AND user_id = (SELECT id FROM users WHERE email = 'tjtaylor@irspilot.com' LIMIT 1);

-- PAY-02: Webhook claim_token + claimed_at columns
ALTER TABLE stripe_webhook_events ADD COLUMN claim_token TEXT;
ALTER TABLE stripe_webhook_events ADD COLUMN claimed_at TEXT;

-- PAY-05: Durable schedule failure recovery
CREATE TABLE IF NOT EXISTS failed_schedule_jobs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_sub_id     TEXT UNIQUE NOT NULL,
    intro_price_id    TEXT NOT NULL,
    error             TEXT,
    retry_count       INTEGER DEFAULT 0,
    created_at        TEXT DEFAULT (datetime('now')),
    last_attempted_at TEXT DEFAULT (datetime('now')),
    resolved_at       TEXT
);
```

Expected errors (suppressed as non-critical):
- `duplicate column name: entitlement_type` — already migrated
- `duplicate column name: claim_token` — already migrated
- `duplicate column name: claimed_at` — already migrated
- `table failed_schedule_jobs already exists` — already migrated

Critical failures (raise RuntimeError, block startup):
- Any failure on `stripe_webhook_events` CREATE TABLE
- Any failure on `idx_purchases_stripe` index

### Legacy migration (AUDIT-013)

`grant_admin_entitlements()` now also sets `entitlement_type='admin'` when clearing `stripe_session_id='admin_permanent'` rows — previously these would cause duplicate inserts after migration.

### Rollback plan

SQLite has no native `DROP COLUMN`. To roll back:

```bash
# 1. Stop the Railway service: set replicas=0 in the Railway dashboard or via CLI
railway service update --replicas 0

# 2. Back up the SQLite database from the Railway Volume.
#    The Railway CLI 'run' command cannot copy files out of a persistent volume directly.
#    Use one of these approaches instead:
#
#    Option A — Railway shell (interactive, requires railway CLI ≥ 3.x):
railway shell
# inside the shell:
cp /app/data/irs_navigator.db /tmp/backup_$(date +%Y%m%d).db
exit
#
#    Option B — Temporary HTTP download endpoint (safer for large files):
#    Add a one-time GET /admin/db-backup route that streams the file, download it,
#    then remove the route before redeployment.
#
#    Option C — Railway Volume browser in the dashboard (if available for your plan):
#    Dashboard → Service → Volumes → Browse → Download irs_navigator.db

# 3. Redeploy the previous commit from the Railway dashboard (Deployments → Rollback)
# 4. The old code ignores unknown columns — no data loss from the new columns
```

> **Argon2id rollback warning:** If you roll back to a commit that used SHA-256 password hashing,
> existing users whose passwords were upgraded to Argon2id format (`$argon2id$...`) **will not be
> able to log in** with the old code. The old SHA-256 verifier does not recognize Argon2id hashes.
> Do not roll back past the Argon2id migration without a plan to reset affected passwords.

The `entitlement_type` column defaults to NULL; old code that doesn't know about it will simply
ignore it. The `claim_token` and `claimed_at` columns in `stripe_webhook_events` default to NULL;
old claim logic still works (though without exclusivity or stale recovery). All new columns are
safe to leave in place during a rollback.

---

## 3. Railway Environment Variable Checklist

### Required (server will not start without these)

| Variable | Description | How to set |
|----------|-------------|------------|
| `SECRET_KEY` | Flask session signing key. **Must be ≥ 32 bytes, high entropy.** | `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `STRIPE_SECRET_KEY` | Live Stripe secret key (`sk_live_...`) | From Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Platform webhook signing secret (`whsec_...`) | From Stripe Dashboard → Webhooks → platform endpoint |

### Required for specific features

| Variable | Feature | Notes |
|----------|---------|-------|
| `STRIPE_FOUNDATION_WEBHOOK_SECRET` | Foundation webhook signature verification (optional) | If set, verifies Stripe-Signature on incoming events. Foundation webhook is a no-op regardless; this is optional and may be omitted. |
| `STRIPE_PRO_PRICE_INTRO_TEST` | Pro introductory price — **test mode only** | Stripe test-mode price ID (`price_test_...`) |
| `STRIPE_PRO_PRICE_STANDARD_TEST` | Pro standard price — **test mode only** | Stripe test-mode price ID (`price_test_...`) |
| `STRIPE_PRO_PRICE_PROMO_LIVE` | Pro promotional price — live mode | Stripe live-mode price ID (`price_...`) |
| `STRIPE_PRO_PRICE_PROMO_TEST` | Pro promotional price — test mode | Stripe test-mode price ID (`price_test_...`) |

> **Note:** Live introductory ($29/mo) and standard ($79/mo) prices are hardcoded Python constants
> (`PRO_PRICE_INTRO_LIVE`, `PRO_PRICE_STANDARD_LIVE`) in `stripe_checkout.py` and are **not**
> environment variables. Update those constants in code if the live prices change.

### Password rotation (SEC-03)

| Variable | Usage | Action after use |
|----------|-------|-----------------|
| `ADMIN_SEED_PASSWORD` | First-time admin account creation OR explicit rotation | **Clear immediately after calling `/api/admin/rotate-password`** |

### Not required (feature disabled)

| Variable | Feature | Status |
|----------|---------|--------|
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe Connect (Phase 4) | PAY-07: returns 503 until implemented |

### SEC-06 validation at startup

The server now validates `SECRET_KEY` at startup:
- Raises `RuntimeError` if key is < 32 bytes
- Raises `RuntimeError` if key has < 8 unique byte values (low entropy)

---

## 4. Stripe Products / Prices / Webhook Configuration

### Webhook endpoints to configure in Stripe Dashboard

| URL | Secret variable | Events to subscribe |
|-----|----------------|---------------------|
| `https://[your-domain]/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` | `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created` |
| `https://[your-domain]/stripe/webhook/foundation` | `STRIPE_FOUNDATION_WEBHOOK_SECRET` (optional) | Any — endpoint is a no-op (Foundation is a free program with no Stripe subscription). Can be pointed at any events; all return 200 without acting. |
| `https://[your-domain]/stripe/webhook/connect` | *(disabled — PAY-07)* | None — returns 503 until Phase 4 |

### Consumer products (one-time purchases)

Consumer checkout does **not** use environment variables for price IDs.
Price IDs are hardcoded constants in `stripe_checkout.py` (lines 53-60):

| Product | Price | Live price ID | Test price ID |
|---------|-------|---------------|---------------|
| Navigator | $59 | `price_1TAbugKCmkbEhj2E2HnuoIDO` | `price_1TAcdgKCmkbEhj2E3PlNJPO0` |
| Wizard | $99 | `price_1TAbvGKCmkbEhj2ESSoCVxJ2` | `price_1TAceNKCmkbEhj2EhmP8CqlG` |
| Bundle | $129 | `price_1TAbvtKCmkbEhj2ET7xDLRkz` | `price_1TAcexKCmkbEhj2EymIqdcm9` |

**How checkout works:**
- **Full-price purchases**: Stripe session uses the hardcoded `price_id` above with `line_items = [{"price": price_id, "quantity": 1}]`.
- **Discounted purchases** (referral / promo code): Stripe session uses `price_data` with a computed `unit_amount` — no price ID; Stripe creates a one-off price on the fly.

There are no `STRIPE_NAVIGATOR_PRICE`, `STRIPE_WIZARD_PRICE`, or `STRIPE_BUNDLE_PRICE` environment variables. Any previously documented env vars under those names were incorrect and have been removed.

### Pro subscription prices

| Price | Monthly | How referenced |
|-------|---------|---------------|
| Intro — live | $29/mo | Hardcoded constant `PRO_PRICE_INTRO_LIVE` in `stripe_checkout.py` |
| Standard — live | $79/mo | Hardcoded constant `PRO_PRICE_STANDARD_LIVE` in `stripe_checkout.py` |
| Intro — test | varies | Env var `STRIPE_PRO_PRICE_INTRO_TEST` |
| Standard — test | varies | Env var `STRIPE_PRO_PRICE_STANDARD_TEST` |
| Promotional — live | varies | Env var `STRIPE_PRO_PRICE_PROMO_LIVE` |
| Promotional — test | varies | Env var `STRIPE_PRO_PRICE_PROMO_TEST` |

> Live intro and standard prices are constants, not env vars. Test-mode prices and promotional prices
> are configured via environment variables so they can differ between environments.

### PAY-08 — customer metadata

All new IRS Pilot customers are now tagged with `metadata.app = "irs_pilot"` at creation. This allows future auditing to distinguish IRS Pilot customers from Taylor Tax customers in a shared Stripe account.

---

## 5. Automated Test Results

### AUDIT-013 test suite (admin entitlements)

```
Results: 24 passed, 0 failed out of 24 checks
```

Covers: fresh grant, idempotent restarts, concurrent workers (5 threads), legacy `admin_permanent` migration, multiple admins, complimentary-purchase isolation, unauthorized user guard, revenue isolation (2 filters), 10× repeated restarts.

### Consolidated audit fix test suite

```
Results: 29 passed, 0 failed out of 29 checks
```

Covers:

| Test area | Checks | Description |
|-----------|--------|-------------|
| SEC-02 Argon2id | 9 | Hash format, correct/wrong verify, legacy sha256:salt:hash, old salt:hash, login upgrade |
| PAY-02 Webhook exclusivity | 5 | 10 concurrent workers → exactly 1 wins; completed events blocked; different events independent |
| PAY-06 amount_paid | 5 | Persisted on grant, unchanged on duplicate |
| SEC-04 entitlement_type | 3 | Admin rows marked 'admin'; regular purchases NULL; complimentary purchase for other user unaffected |
| SEC-05 Migration errors | 2 | Idempotent init_db |
| SEC-06 SECRET_KEY | 4 | Short/low-entropy rejected, good key accepted |
| PAY-07 Connect disabled | 2 | Returns (False, "SERVICE_UNAVAILABLE") |

### Batch-2 / Foundation test suite

```
Results: 79 passed, 0 failed out of 79 checks
```

Covers:

| Test area | Checks | Description |
|-----------|--------|-------------|
| Item 1 Argon2 required on Railway | 2 | RuntimeError when argon2 missing on Railway; normal import succeeds |
| Item 4 Stale claim recovery | 3 | Stale processing row (>300s) can be reclaimed; fresh row cannot; completed row cannot |
| Item 5 failed_schedule_jobs table | 9 | Table created; all 8 required columns present |
| Item 6 Payment required | 4 | Unpaid checkout blocked; trialing blocked; active+paid allowed; past_due blocked |
| Item 8 Overage disabled | 3 | OVERAGE_BILLING_DISABLED sentinel; PRO_SESSION_HARD_LIMIT defined and == 10 |
| Item 9 Session revocation | 4 | Sessions deleted on rotate; rowcount logged; zero sessions → no error |
| Item 10 CSRF / rate limit source | 12 | All CSRF and rate-limiter identifiers present in source |
| Item 10 Rate limiter logic | 5 | Initially allowed; locked after max failures; wait_secs > 0; different IPs independent; reset clears |
| Foundation get_foundation_sponsor | 4 | Returns sponsor for recruited partner; returns None for non-sponsored |
| Foundation referral idempotency | 2 | Only 1 conversion row on duplicate stripe_session_id; same commission returned |
| Foundation override recording | 3 | 5% of 5900 = 295; 1 override row; correct commission_amount |
| Foundation override idempotency | 2 | Still 1 row on duplicate call; same amount returned |
| Foundation void on refund | 2 | void_commissions_for_refund voids both rows; all zeroed |
| Foundation void skips paid_out | 2 | paid_out=1 rows not touched; commission_amount unchanged |
| Foundation void no-op on empty | 2 | None and empty string return 0 |

### Syntax compilation

```
auth.py OK
stripe_checkout.py OK
server.py OK
email_service.py OK
```

### Total: 24 + 29 + 79 = 132 checks, 0 failures

---

## 6. Staging Deployment Instructions

### Option A — New Railway service (recommended for staging)

1. Fork or branch `tjtaylor71-ctrl/irs-navigator` to a staging branch (do NOT use `main`).
2. Create a new Railway service pointing at the staging branch.
3. Set all Required environment variables (Section 3) with **test-mode** Stripe keys:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from test-mode webhook endpoint)
   - `SECRET_KEY=` (generate fresh 32-byte random value)
4. Attach a Railway Volume at `/app/data` for the SQLite database.
5. Set `ADMIN_SEED_PASSWORD` temporarily, deploy once to create the admin account, then clear it.
6. Configure Stripe CLI for local webhook forwarding during testing:
   ```bash
   stripe listen --forward-to https://staging.yourapp.railway.app/stripe/webhook
   # Foundation webhook is optional (no-op); no need to forward unless testing the endpoint itself.
   ```
7. Run the end-to-end test scenarios in Section 7.

### Option B — Local (Railway CLI)

```bash
git checkout -b staging-audit-fixes
# Apply the three file changes from the ZIP
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))") \
STRIPE_SECRET_KEY=sk_test_... \
STRIPE_WEBHOOK_SECRET=whsec_test_... \
ADMIN_SEED_PASSWORD=TempAdminPass123! \
python3 server.py
```

### Verifying SEC-03 (password rotation)

1. Set `ADMIN_SEED_PASSWORD=NewPassword123!` in env.
2. Log in as admin.
3. `POST /api/admin/rotate-password` — expect 200 with rotation confirmation.
4. Clear `ADMIN_SEED_PASSWORD` from env.
5. Log out and log back in with the new password — should succeed.
6. Log in with the old password — should fail.

---

## 7. End-to-End Stripe Test-Mode Results

*These are the scenarios to run in staging before requesting production approval. Results must be recorded and provided to the independent reviewer.*

### PAY-01 — Subscription schedule

- [ ] Create a test Pro subscriber and complete checkout with `sk_test_` key.
- [ ] Confirm `schedule_price_upgrade` creates a Stripe schedule with 2 phases.
- [ ] Advance Stripe Test Clock 3 months — confirm transition to $79/mo.
- [ ] Confirm failed Step 2 (modify) scenario: schedule is released and recreated.

### PAY-02 — Webhook concurrency

- [ ] Use `stripe trigger checkout.session.completed` and confirm single grant in DB.
- [ ] Manually insert a duplicate delivery — confirm second delivery returns 200 without double-grant.

### PAY-03 — Foundation webhook

- [ ] POST any event to `/stripe/webhook/foundation` with `STRIPE_FOUNDATION_WEBHOOK_SECRET` set — expect 200, no DB changes.
- [ ] POST without `STRIPE_FOUNDATION_WEBHOOK_SECRET` set — expect 200 (no secret = no verification, still a no-op).
- [ ] Confirm that no `foundation_members.active` rows are modified by any webhook event (Foundation membership is never modified by Stripe events).

### Foundation referral commissions

- [ ] Complete a consumer checkout using a referral code belonging to a partner recruited by a Foundation member — confirm two rows in `referral_conversions`: one for the referring partner (20%) and one for the Foundation member (5% override).
- [ ] Replay the same `checkout.session.completed` event (duplicate delivery) — confirm no additional `referral_conversions` rows inserted (idempotency).
- [ ] Issue a full refund via Stripe for the same purchase — confirm both `commission_amount` rows are set to 0 (voided) and `paid_out = 0` rows are not duplicated.

### PAY-06 — amount_paid

- [ ] Complete consumer checkout for Navigator ($59) — confirm `amount_paid=5900` in `purchases`.
- [ ] Complete bundle checkout ($129) — confirm parent row $129, sub-items $59/$99.

### PAY-07 — Connect webhook

- [ ] POST to `/stripe/webhook/connect` — confirm HTTP 503 response.
- [ ] Confirm Stripe will retry the event (503 is retryable).

### PAY-08 — Customer cross-association

- [ ] Attempt Pro signup for email that exists in Taylor Tax Stripe account — confirm new IRS Pilot customer created with `metadata.app=irs_pilot`, not Taylor Tax customer reused.
- [ ] Attempt second Pro signup for subscriber that already has `stripe_sub_id` set — confirm 400 error "subscription already exists".

### SEC-01 — CSP

- [ ] Load app in browser with CSP reporting — confirm no violations for `unpkg.com`.
- [ ] Confirm React/ReactDOM load without console errors.

### SEC-02 — Password hashing

- [ ] Create account, verify login works.
- [ ] Inspect DB — confirm `password_hash` starts with `$argon2`.
- [ ] Create account with legacy SHA-256 hash manually, log in — confirm hash upgraded.

### SEC-03 — Password rotation

- [ ] Run rotation endpoint workflow (see Section 6).
- [ ] Confirm warning logged when `ADMIN_SEED_PASSWORD` set on subsequent startups.

### SEC-06 — SECRET_KEY validation

- [ ] Deploy with `SECRET_KEY=abc` — confirm server refuses to start with RuntimeError.
- [ ] Deploy with `SECRET_KEY=` (empty) — confirm same.
- [ ] Deploy with valid 64-char hex key — confirm startup succeeds.

---

## 8. Unfinished Features and Known Limitations

### PAY-03 — Foundation program (corrected)

**Foundation is a free referral-partner program. There is no paid enrollment, no Stripe subscription, and no recurring fee.** Foundation members are never deactivated due to nonpayment.

What Foundation members receive:
- 20% commission on their own qualifying referral sales (same as standard referral partners)
- 5% override commission on qualifying sales made by tax professionals they recruited as referral partners

Changes made in this batch:
- **Webhook corrected:** `/stripe/webhook/foundation` now returns 200 for all events without modifying any `foundation_members` rows. Subscription-based deactivation logic removed entirely.
- **Override recording wired up:** `stripe_checkout.py` now calls `auth.get_foundation_sponsor(partner_id)` after recording a referral conversion, then calls `auth.record_foundation_override()` if a Foundation sponsor exists.
- **Idempotency added:** Both `record_referral_conversion` and `record_foundation_override` now check for an existing row with the same `stripe_session_id` before inserting, preventing duplicate commission records on webhook retries.
- **Refund voiding wired up:** `_handle_charge_refunded` now calls `auth.void_commissions_for_refund(payment_intent)` to zero out all unpaid commission rows for the refunded session. Paid-out rows are not modified.
- **Env vars removed:** `STRIPE_FOUNDATION_PRICE` is no longer required (Foundation has no paid price). `STRIPE_FOUNDATION_WEBHOOK_SECRET` is now optional.
- **Dead code:** `email_service.send_foundation_payment_link()` (line ~1027) is dead code — no code path calls it since Foundation enrollment is free. It is not removed (safe to leave) but should not be called by any new code.

### PAY-04 — Subscription lifecycle (complete for launch blockers)

`_handle_invoice_payment_failed` now:
- Sets `overage_payment_failed = 1` on the subscriber record
- Sends admin notification email via `email_service.notify_admin_payment_failed`

`_handle_charge_refunded` now:
- Sets `expires_at = datetime('now')` on the matching purchase
- Sets `wizard_locked = 1` and `wizard_lock_reason = 'refunded'`
- Calls `auth.void_commissions_for_refund(payment_intent)` to zero out all unpaid referral commissions and Foundation override commissions for the refunded session

**Known limitation:** Failed payment does not automatically downgrade the subscriber after a grace period — this is logged and requires Phase 6 implementation.

### PAY-05 — Overage billing (deliberately disabled)

`charge_pro_overage` has been replaced with a stub that returns `OVERAGE_BILLING_DISABLED`.
A hard session limit of `PRO_SESSION_HARD_LIMIT = 10` is defined for callers to enforce.
Overage billing based on actual Stripe billing periods is deferred to Phase 6, pending owner approval of the billing model. **Action required from owner before enabling.**

### PAY-07 — Stripe Connect (disabled)

The Connect webhook explicitly returns 503. The direct-charge Connect model is not implemented. Any traffic to `/stripe/webhook/connect` will be retried by Stripe indefinitely until Phase 4 is implemented and the route is re-enabled.

### PAY-08 — Trialing subscriptions (resolved)

`_handle_checkout_completed` now explicitly checks `payment_status == "paid"` and returns
early if not met. `_activate_pro_from_checkout` and `_handle_invoice_payment_succeeded` now
only activate subscriptions with `sub.status == "active"` (removed `trialing` and `past_due`).

### SEC-03 — Session invalidation (resolved)

The `/api/admin/rotate-password` endpoint now deletes all sessions for the rotating admin
via `DELETE FROM sessions WHERE user_id = ?`, using the existing `sessions` table. This
immediately invalidates all active sessions on password rotation.

### SEC-06 — CSRF and rate limiting (resolved for launch blockers)

CSRF double-submit token protection is implemented via `@app.before_request` hook:
- Token stored in Flask session, checked via `X-CSRF-Token` header
- Webhook paths (`/stripe/webhook*`) are exempt
- State-changing methods (POST, PUT, PATCH, DELETE) require valid token

Login rate limiting is implemented in-memory per (IP, email):
- 5 failures → 300-second lockout
- Returns HTTP 429 with wait time remaining

**Remaining for Phase 6:** Comprehensive input validation and sanitization, rate limiting
on signup and webhook endpoints, and full cross-account penetration testing.

### React/ReactDOM (SEC-01)

The CSP now permits `unpkg.com`, resolving the immediate regression. The reviewer recommended preferring **locally hosted, pinned React assets** to eliminate the CDN dependency. This is not yet implemented — the app still loads React from `unpkg.com` at runtime.

### PAY-01 — Intro price verification

The two-step schedule creation is implemented. The reviewer also asked to **verify the actual purchased introductory price and three-month duration** using Stripe Test Clocks. This end-to-end test must be run in staging (Section 7) before production approval.

---

*Production deployment requires explicit approval from the independent reviewer after successful staging tests. Do not merge to main or deploy to the production Railway service without that approval.*

---

## Independent Review — Batch Corrections (IR-01 through IR-05)

### IR-01 — Refund identifier mismatch (resolved)

`charge.refunded` events supply a `payment_intent` ID (`pi_...`).  Purchases were
previously stored only with the checkout session ID (`cs_...`), causing the refund
handler to look up the wrong column and never expire the correct rows.

**Changes:**
- `auth.py` migration: adds `payment_intent_id TEXT DEFAULT NULL` column to `purchases`
  and an index (`idx_purchases_payment_intent`).
- `auth.grant_access_idempotent()`: new `payment_intent_id` parameter; stored on INSERT.
- `stripe_checkout._grant_consumer_access()`: passes `session.get("payment_intent")` as
  `payment_intent_id` when granting consumer access.
- `stripe_checkout._handle_charge_refunded()`: now resolves the checkout session ID from
  `purchases.payment_intent_id`, expires rows matched by `payment_intent_id`, and also
  expires bundle child rows via `stripe_session_id LIKE cs_... || '-%'`.
- **Partial refunds**: refund fraction (`amount_refunded / amount`) is computed and
  passed to `auth.void_commissions_for_refund()` for proportional commission adjustment.
- **Already-paid commissions**: creates an audit record in the new `commission_adjustments`
  table (with negative `adjustment_amount`) instead of silently ignoring the refund.

### IR-02 — Commission integrity (resolved)

- `auth.py` migration: adds `commission_type TEXT DEFAULT 'direct'` column to
  `referral_conversions` and a UNIQUE index on `(partner_id, stripe_session_id,
  commission_type) WHERE stripe_session_id IS NOT NULL`.
- `record_referral_conversion()`: inserts with `commission_type = 'direct'`; relies on
  the DB UNIQUE index for idempotency (catches `IntegrityError`); re-raises other failures
  instead of swallowing them.
- `record_foundation_override()`: inserts with `commission_type = 'foundation_override'`;
  same idempotency/propagation pattern.
- `_grant_consumer_access()`: commission failures are now logged and re-raised so the
  webhook event is not marked complete on a recording failure.  Override failures remain
  non-fatal (purchase access is already granted) but are durably logged.

### IR-03 — CSRF frontend integration (resolved)

- Added `csrf.js`: a shared IIFE utility that fetches and caches the CSRF token from
  `/api/csrf-token` and exposes `window.csrfFetch()` — a drop-in `fetch()` replacement
  that injects `X-CSRF-Token` on all state-changing requests and passes GET requests
  through unchanged.
- Server page template (`PAGE_MID_TPL` in `server.py`): loads `/js/csrf.js` before each
  page's compiled JS so `csrfFetch` is available globally.
- All 17 JS files with POST calls updated to use `csrfFetch` instead of `fetch`.
- Stale `admin_page.js` button calling the removed
  `/api/admin/foundation/approve-and-invoice` endpoint has been replaced with a comment.

### IR-04 — Clean deployment package (resolved)

See Section 7 — ZIP is built from the repo root with no nested/duplicate structures.

### IR-05 — Consumer pricing documentation (resolved)

Consumer checkout does not use environment variables for price IDs.  Documentation
corrected above (Section 4, "Consumer products").  References to
`STRIPE_NAVIGATOR_PRICE`, `STRIPE_WIZARD_PRICE`, and `STRIPE_BUNDLE_PRICE` env vars
removed.
