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
  const result = await chrome.storage.local.get([
    'targetSites',
    'excludedAutoFetchUrls',
    'aiChatUrl',
    'pendingAiChatPayload'
  ]);
  const targetSites = splitLines(result.targetSites);
  const excludedAutoFetchUrls = splitLines(result.excludedAutoFetchUrls);
  const isWeChatUrl = currentUrl.includes('mp.weixin.qq.com');
  const isExcluded = matchesExcludedUrl(currentUrl, excludedAutoFetchUrls);

  maybeFillAiChatInput(currentUrl, result.aiChatUrl, result.pendingAiChatPayload);

  // Restore original functionality: auto-fetch for WeChat articles
  if (isWeChatUrl && !isExcluded) {
    chrome.runtime.sendMessage({ type: 'FETCH_AND_SAVE' });
    // We can return here or let it continue, doesn't matter much.
    // If we let it continue, a user could add WeChat to the targetSites and also get a button.
    // That seems fine.
  }

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

function splitLines(value) {
  return value ? value.split('\n').map(line => line.trim()).filter(Boolean) : [];
}

function matchesExcludedUrl(currentUrl, patterns) {
  return patterns.some(pattern => {
    if (!pattern) {
      return false;
    }

    return currentUrl === pattern ||
      currentUrl.startsWith(pattern) ||
      currentUrl.includes(pattern);
  });
}

async function maybeFillAiChatInput(currentUrl, aiChatUrl, pendingPayload) {
  if (!pendingPayload?.text || !aiChatUrl) {
    return;
  }

  if (!matchesAiChatUrl(currentUrl, pendingPayload.targetUrl || aiChatUrl)) {
    return;
  }

  const input = await waitForChatInput();
  if (!input) {
    return;
  }

  const filled = fillChatInput(input, pendingPayload.text);
  if (!filled) {
    return;
  }

  const submitted = await submitChatInput(input);
  if (submitted) {
    chrome.storage.local.remove('pendingAiChatPayload');
  }
}

function matchesAiChatUrl(currentUrl, aiChatUrl) {
  const normalizedCurrent = normalizeUrlForMatch(currentUrl);
  const normalizedTarget = normalizeUrlForMatch(aiChatUrl);

  return normalizedCurrent === normalizedTarget ||
    normalizedCurrent.startsWith(normalizedTarget);
}

function normalizeUrlForMatch(url) {
  return (url || '').trim().replace(/\/+$/, '');
}

async function waitForChatInput(timeoutMs = 15000, intervalMs = 500) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const input = findChatInput();
    if (input) {
      return input;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return null;
}

function findChatInput() {
  const selectors = [
    '#prompt-textarea',
    'textarea[data-id]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="message"]',
    'textarea',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && isElementVisible(element)) {
      return element;
    }
  }

  return null;
}

function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function fillChatInput(element, text) {
  try {
    element.focus();

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    if (element.isContentEditable) {
      element.textContent = text;
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        data: text,
        inputType: 'insertText'
      }));
      return true;
    }
  } catch (error) {
    console.error('自动填充 AI Chat 输入框失败:', error);
  }

  return false;
}

async function submitChatInput(input) {
  await new Promise(resolve => setTimeout(resolve, 300));

  const sendButton = findSendButton();
  if (sendButton) {
    sendButton.click();
    return true;
  }

  return dispatchSubmitKeystroke(input);
}

function findSendButton() {
  const selectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
    'button[title*="Send"]',
    'button[type="submit"]'
  ];

  for (const selector of selectors) {
    const buttons = Array.from(document.querySelectorAll(selector));
    const button = buttons.find(candidate =>
      isElementVisible(candidate) && !candidate.disabled && candidate.getAttribute('aria-disabled') !== 'true'
    );

    if (button) {
      return button;
    }
  }

  return null;
}

function dispatchSubmitKeystroke(input) {
  const enterEventInit = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  };

  input.focus();
  const keydownHandled = input.dispatchEvent(new KeyboardEvent('keydown', enterEventInit));
  input.dispatchEvent(new KeyboardEvent('keypress', enterEventInit));
  input.dispatchEvent(new KeyboardEvent('keyup', enterEventInit));

  return keydownHandled;
}

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
