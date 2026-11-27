/**
 * csrf.js — Shared CSRF token utility (IR-03).
 *
 * Loaded before every page's compiled JS so window.csrfFetch is available
 * to all components.  The token is fetched once from /api/csrf-token and
 * cached in memory for the lifetime of the page.  Any state-changing request
 * (POST, PUT, PATCH, DELETE) automatically receives the X-CSRF-Token header.
 *
 * Usage:
 *   const res = await csrfFetch('/api/some-endpoint', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload)
 *   });
 */
(function () {
  'use strict';

  var _csrfToken = null;
  var _csrfFetching = null;  // in-flight promise, deduplicated

  var STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  /**
   * Fetch (and cache) the CSRF token from the server.
   * Returns a Promise<string>.
   */
  function getCSRFToken() {
    if (_csrfToken) return Promise.resolve(_csrfToken);
    if (_csrfFetching) return _csrfFetching;
    _csrfFetching = fetch('/api/csrf-token', { method: 'GET', credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _csrfToken = data.csrf_token || data.token || '';
        _csrfFetching = null;
        return _csrfToken;
      })
      .catch(function (err) {
        _csrfFetching = null;
        console.error('[csrf] Failed to fetch CSRF token:', err);
        return '';
      });
    return _csrfFetching;
  }

  /**
   * Drop-in replacement for fetch() that automatically injects X-CSRF-Token
   * on state-changing requests.  All other options are passed through unchanged.
   */
  function csrfFetch(url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();

    if (!STATE_CHANGING.has(method)) {
      return fetch(url, options);
    }

    return getCSRFToken().then(function (token) {
      var headers = Object.assign({}, options.headers || {});
      if (token) headers['X-CSRF-Token'] = token;
      return fetch(url, Object.assign({}, options, { headers: headers }));
    });
  }

  /** Invalidate the cached token (call after a 403 to force a re-fetch). */
  function invalidateCSRFToken() {
    _csrfToken = null;
    _csrfFetching = null;
  }

  // Expose on window so all compiled JS files can call csrfFetch(...)
  window.csrfFetch = csrfFetch;
  window.getCSRFToken = getCSRFToken;
  window.invalidateCSRFToken = invalidateCSRFToken;
})();
