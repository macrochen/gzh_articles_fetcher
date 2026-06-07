import { loadSettings } from './config.js';

let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function initGoogleAuth(onLoginSuccess) {
  const settings = loadSettings();
  const clientId = settings.clientId;
  
  if (typeof google === 'undefined') {
    console.error("Google Identity Services script failed to load. Please check your network connection or proxy settings.");
    alert("无法加载 Google 服务，请检查您的网络连接或代理设置（确保能访问 Google）。");
    return false;
  }

  const loginBtn = document.getElementById('custom-login-btn');
  if (loginBtn) {
    // Prevent multiple bindings
    const newBtn = loginBtn.cloneNode(true);
    loginBtn.parentNode.replaceChild(newBtn, loginBtn);
    
    newBtn.addEventListener('click', () => {
    const currentSettings = loadSettings();
    if (!currentSettings.clientId) {
      alert("请先点击右上角设置按钮配置 Client ID");
      return;
    }
    
    // Always initialize fresh to catch updated clientId
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: currentSettings.clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (response) => {
        if (response.error !== undefined) {
          throw (response);
        }
        accessToken = response.access_token;
        onLoginSuccess();
      },
    });
    
    tokenClient.requestAccessToken();
    });
  }

  return true;
}
