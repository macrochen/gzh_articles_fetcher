import { loadSettings } from './config.js';

let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function initGoogleAuth(onLoginSuccess) {
  const settings = loadSettings();
  
  // 1. Check if we just returned from an OAuth redirect
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  if (hashParams.has('access_token')) {
    accessToken = hashParams.get('access_token');
    
    // Clean up the URL hash so the token doesn't stay in the address bar
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    
    // Trigger success callback
    setTimeout(() => {
      onLoginSuccess();
    }, 0);
    return true; // We are logged in
  }

  // 2. Setup Login Button
  const loginBtn = document.getElementById('custom-login-btn');
  if (loginBtn) {
    // Prevent multiple bindings
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    newBtn.addEventListener('click', () => {
      const currentSettings = loadSettings();
      if (!currentSettings.clientId) {
        alert("请先在页面上设置 Google Client ID");
        return;
      }
      
      // Use standard OAuth 2.0 Implicit Grant Flow (Redirect)
      // This is 100% immune to popup blockers on mobile devices
      const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
      const form = document.createElement('form');
      form.setAttribute('method', 'GET');
      form.setAttribute('action', oauth2Endpoint);

      const redirectUri = window.location.origin + window.location.pathname;

      const params = {
        client_id: currentSettings.clientId,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'https://www.googleapis.com/auth/drive.file',
        include_granted_scopes: 'true',
        state: 'auth_redirect'
      };

      for (let p in params) {
        const input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    });
  }
  
  return false;
}

