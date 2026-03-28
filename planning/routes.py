# planning/routes.py
# IRS Pilot - Tax Planning Blueprint
# Register with: app.register_blueprint(planning_bp, url_prefix='/planning')

from flask import Blueprint, request, jsonify, g
from datetime import datetime
from .calculators import run_all
import auth

planning_bp = Blueprint('planning', __name__)


# ── Helper ────────────────────────────────────────────────────────────────────

def _serialize_session(row) -> dict:
    """Convert a DB row to a plain dict."""
    if row is None:
        return {}
    return {
        'id':                      row['id'],
        'tax_year':                row['tax_year'],
        'filing_status':           row['filing_status'],
        'income_w2':               row['income_w2'],
        'income_se':               row['income_se'],
        'income_other':            row['income_other'],
        'prior_year_tax':          row['prior_year_tax'],
        'ytd_withholding':         row['ytd_withholding'],
        'ytd_estimated_payments':  row['ytd_estimated_payments'],
        'paychecks_remaining':     row['paychecks_remaining'],
        'updated_at':              row['updated_at'],
    }


def _serialize_results(row) -> dict:
    """Convert a planning_results DB row to a plain dict."""
    if row is None:
        return {}
    keys = [
        'gross_income', 'se_tax', 'se_deduction', 'estimated_agi',
        'standard_deduction', 'estimated_taxable_income', 'income_tax',
        'estimated_total_tax', 'effective_tax_rate_pct', 'safe_harbor_amount',
        'safe_harbor_met', 'total_paid', 'balance_due', 'overpayment',
        'q1_payment', 'q2_payment', 'q3_payment', 'q4_payment',
        'q1_due', 'q2_due', 'q3_due', 'q4_due',
        'w4_additional_per_paycheck', 'calculated_at',
    ]
    return {k: row[k] for k in keys if k in row.keys()}


# ── GET /planning/session ─────────────────────────────────────────────────────

@planning_bp.route('/session', methods=['GET'])
@auth.require_login
def get_session():
    """
    Load the user's current-year planning session.
    Also returns the last cached results if available.
    If no session exists, returns defaults pulled from the
    user's resolution profile (filing_status, income, etc.)
    so the intake form pre-populates.
    """
    user_id  = g.user['id']
    tax_year = datetime.now().year

    with auth.get_db() as conn:
        session = conn.execute(
            'SELECT * FROM planning_sessions WHERE user_id = ? AND tax_year = ?',
            (user_id, tax_year)
        ).fetchone()

        results = None
        if session:
            results = conn.execute(
                'SELECT * FROM planning_results WHERE session_id = ? ORDER BY calculated_at DESC LIMIT 1',
                (session['id'],)
            ).fetchone()

        # Pre-populate from wizard_data if no session yet
        prefill = {}
        if not session:
            wizard = conn.execute(
                'SELECT data_json FROM wizard_data WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
                (user_id,)
            ).fetchone()
            if wizard:
                import json as _json
                try:
                    wd = _json.loads(wizard['data_json'])
                    if wd.get('filing_status'):
                        prefill['filing_status'] = wd['filing_status']
                    if wd.get('gross_annual_income'):
                        prefill['income_w2'] = float(wd['gross_annual_income'])
                except Exception:
                    pass

    return jsonify({
        'session':  _serialize_session(session) or prefill,
        'results':  _serialize_results(results),
        'tax_year': tax_year,
    }), 200


# ── POST /planning/session ────────────────────────────────────────────────────

@planning_bp.route('/session', methods=['POST'])
@auth.require_login
def save_session():
    """
    Upsert the user's planning session inputs.
    Does NOT run calculations — call /calculate for that.
    """
    user_id  = g.user['id']
    tax_year = datetime.now().year
    data     = request.get_json(force=True) or {}

    fields = [
        'filing_status', 'income_w2', 'income_se', 'income_other',
        'prior_year_tax', 'ytd_withholding', 'ytd_estimated_payments',
        'paychecks_remaining',
    ]
    now = datetime.utcnow().isoformat()

    with auth.get_db() as conn:
        existing = conn.execute(
            'SELECT id FROM planning_sessions WHERE user_id = ? AND tax_year = ?',
            (user_id, tax_year)
        ).fetchone()

        if existing:
            set_clause = ', '.join(f"{f} = ?" for f in fields) + ', updated_at = ?'
            values     = [data.get(f) for f in fields] + [now, existing['id']]
            conn.execute(f'UPDATE planning_sessions SET {set_clause} WHERE id = ?', values)
            session_id = existing['id']
        else:
            placeholders = ', '.join('?' for _ in fields)
            col_names    = ', '.join(fields)
            values       = [data.get(f) for f in fields] + [user_id, tax_year, now, now]
            cursor = conn.execute(
                f'INSERT INTO planning_sessions ({col_names}, user_id, tax_year, created_at, updated_at) '
                f'VALUES ({placeholders}, ?, ?, ?, ?)',
                values
            )
            session_id = cursor.lastrowid

    return jsonify({'session_id': session_id, 'saved': True}), 200


# ── POST /planning/calculate ──────────────────────────────────────────────────

@planning_bp.route('/calculate', methods=['POST'])
@auth.require_login
def calculate():
    """
    Run all Phase 1 calculators and cache results.
    Accepts either a full session payload in the request body,
    or loads the existing saved session if no body is provided.
    Returns the full results object.
    """
    user_id  = g.user['id']
    tax_year = datetime.now().year
    data     = request.get_json(force=True) or {}

    with auth.get_db() as conn:
        # Use request body if provided, otherwise load saved session
        if data:
            session_data = data
            session = conn.execute(
                'SELECT id FROM planning_sessions WHERE user_id = ? AND tax_year = ?',
                (user_id, tax_year)
            ).fetchone()
        else:
            session = conn.execute(
                'SELECT * FROM planning_sessions WHERE user_id = ? AND tax_year = ?',
                (user_id, tax_year)
            ).fetchone()
            if not session:
                return jsonify({'error': 'No planning session found. Save your inputs first.'}), 404
            session_data = dict(session)

        # Run calculations
        results = run_all(session_data)

        # Persist results if we have a session to link to
        if session:
            now           = datetime.utcnow().isoformat()
            result_fields = list(results.keys())
            placeholders  = ', '.join('?' for _ in result_fields)
            col_names     = ', '.join(result_fields)
            values        = list(results.values()) + [session['id'], now]
            conn.execute(
                f'INSERT INTO planning_results ({col_names}, session_id, calculated_at) '
                f'VALUES ({placeholders}, ?, ?)',
                values
            )

    return jsonify(results), 200


# ── GET /planning/results ─────────────────────────────────────────────────────

@planning_bp.route('/results', methods=['GET'])
@auth.require_login
def get_results():
    """
    Return the last cached results for the dashboard.
    Fast — no recalculation, just a DB read.
    """
    user_id  = g.user['id']
    tax_year = datetime.now().year

    with auth.get_db() as conn:
        session = conn.execute(
            'SELECT id FROM planning_sessions WHERE user_id = ? AND tax_year = ?',
            (user_id, tax_year)
        ).fetchone()

        if not session:
            return jsonify({'results': None, 'message': 'No planning session found.'}), 200

        results = conn.execute(
            'SELECT * FROM planning_results WHERE session_id = ? ORDER BY calculated_at DESC LIMIT 1',
            (session['id'],)
        ).fetchone()

    return jsonify({
        'results':     _serialize_results(results),
        'has_results': results is not None,
    }), 200
