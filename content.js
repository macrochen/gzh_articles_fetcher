/**
 * content.js
 * 
 * This script is injected into every page.
 * It checks if the current site is in the user-configured list of target sites.
 * If it is, it injects a "Fetch" button onto the page.
 * Clicking the button sends a message to the background script to initiate the article fetching process.
 */

(async () => {
  // Ensure the script doesn't run in an iframe
  if (window.self !== window.top) {
    return;
  }

  const currentUrl = window.location.href;

  // Restore original functionality: auto-fetch for WeChat articles
  if (currentUrl.includes('mp.weixin.qq.com')) {
    chrome.runtime.sendMessage({ type: 'FETCH_AND_SAVE' });
    // We can return here or let it continue, doesn't matter much.
    // If we let it continue, a user could add WeChat to the targetSites and also get a button.
    // That seems fine.
  }

  const result = await chrome.storage.local.get('targetSites');
  const targetSites = result.targetSites ? result.targetSites.split('\n').filter(site => site.trim() !== '') : [];

  if (targetSites.length === 0) {
    return; // No sites configured for the button
  }

  const shouldInject = targetSites.some(site => {
    try {
      // Use a simple startsWith check for broader matching (e.g., matches all pages on a domain)
      return currentUrl.startsWith(site.trim());
    } catch (e) {
      console.error('Invalid site URL in options:', site, e);
      return false;
    }
  });

  if (shouldInject) {
    createFetchButton();
  }
})();


function createFetchButton() {
  const button = document.createElement('button');
  button.textContent = '抓取当前页面';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 99999;
    background-color: #07C160;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 10px 15px;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;

  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'FETCH_AND_SAVE' });
    button.remove(); // or button.style.display = 'none';
  });

  document.body.appendChild(button);
}
