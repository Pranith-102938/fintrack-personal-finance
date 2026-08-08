// HTTP API Client — wraps fetch() with auth token injection and error handling
window.API = (function () {
  // Support dynamic API host for decoupled frontend (Vercel) <-> backend (Render) deployment
  const getBaseUrl = () => {
    if (window.API_BASE_URL) {
      return window.API_BASE_URL.endsWith('/') ? window.API_BASE_URL.slice(0, -1) : window.API_BASE_URL;
    }
    return '/api/v1';
  };

  // Get stored JWT token
  function getToken() {
    return localStorage.getItem('finance_tracker_token');
  }

  // Build headers with optional auth token
  function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Core request method with unified error handling
  async function request(method, endpoint, data = null) {
    const config = {
      method,
      headers: buildHeaders()
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const baseUrl = getBaseUrl();
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        // If token is expired or invalid, force logout
        if (response.status === 401) {
          window.Auth.logout(true); // silent logout — redirect to login
        }

        throw { status: response.status, ...result };
      }

      return result;
    } catch (error) {
      // Re-throw API errors, handle network failures
      if (error.status) {
        throw error;
      }

      throw {
        status: 0,
        message: 'Network error. Please check your connection and try again.'
      };
    }
  }

  return {
    get: (endpoint) => request('GET', endpoint),
    post: (endpoint, data) => request('POST', endpoint, data),
    put: (endpoint, data) => request('PUT', endpoint, data),
    delete: (endpoint) => request('DELETE', endpoint),
    getToken
  };
})();
