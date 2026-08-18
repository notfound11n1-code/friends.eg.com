// Patch global fetch to automatically attach Authorization header when a token exists.
// This helps when individual modules have broken or missing header code during local development.
(function(){
  try {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init = {}) {
      try {
        const token = localStorage.getItem('friends_admin_token') || localStorage.getItem('friends_user_token') || '';
        if (token) {
          const headers = Object.assign({}, (init && init.headers) || {});
          if (!headers.Authorization) headers.Authorization = `Bearer ${token}`;
          init = Object.assign({}, init, { headers });
        }
      } catch (e) {
        // ignore
      }
      return originalFetch(input, init);
    };
  } catch (e) {
    console.warn('fetch auth patch failed', e);
  }
})();
