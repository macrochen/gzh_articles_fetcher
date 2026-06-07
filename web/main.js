import { loadSettings, saveSettings } from './config.js';
import { initGoogleAuth } from './googleAuth.js';
import { fetchArticles } from './drive.js';
import { 
  renderArticles, 
  sendToGem, 
  toggleSelectAll,
  selectNext10,
  getSelectedArticles,
  showSummary,
  showBatchSummary,
  clearSummaries,
  setOnChatRequested,
  setChatArticle,
  renderPresetPrompts,
  clearChatHistory,
  appendChatMessage,
  updateChatMessage
} from './ui.js';
import { summarizeArticles, streamChatWithArticle } from './ai.js';

let chatContexts = {}; // Maps url -> array of message objects {role, parts: [{text}]}

document.addEventListener('DOMContentLoaded', () => {
  // Input Elements
  const clientIdInput = document.getElementById('clientId');
  const gemUrlInput = document.getElementById('gemUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const summaryPromptInput = document.getElementById('summaryPrompt');
  const presetPromptsContainer = document.getElementById('preset-prompts-editor-container');
  const addPresetBtn = document.getElementById('add-preset-btn');

  // Load Initial Settings
  const settings = loadSettings();
  clientIdInput.value = settings.clientId;
  gemUrlInput.value = settings.gemUrl;
  apiKeyInput.value = settings.apiKey || '';
  summaryPromptInput.value = settings.summaryPrompt || '';
  
  // Auth view initial setup
  const authSetupSection = document.getElementById('auth-setup-section');
  const customLoginBtn = document.getElementById('custom-login-btn');
  const authSaveBtn = document.getElementById('auth-save-client-id-btn');
  const authClientIdInput = document.getElementById('auth-clientId');
  
  if (!settings.clientId) {
    authSetupSection.style.display = 'block';
    customLoginBtn.style.display = 'none';
  } else {
    authSetupSection.style.display = 'none';
    customLoginBtn.style.display = 'block';
  }

  authSaveBtn.addEventListener('click', () => {
    const cid = authClientIdInput.value.trim();
    if (!cid) {
      alert("请输入 Client ID");
      return;
    }
    settings.clientId = cid;
    saveSettings(settings);
    window.location.reload();
  });

  let currentPresets = Array.isArray(settings.presetPrompts) ? settings.presetPrompts : [];

  function renderPresetEditor() {
    presetPromptsContainer.innerHTML = '';
    currentPresets.forEach((preset, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.flexDirection = 'column';
      row.style.gap = '5px';
      row.style.padding = '10px';
      row.style.background = '#f9f9f9';
      row.style.border = '1px solid #ddd';
      row.style.borderRadius = '4px';

      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.alignItems = 'center';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = preset.name;
      nameInput.placeholder = '预设名称';
      nameInput.style.flex = '1';
      nameInput.style.marginRight = '10px';
      nameInput.onchange = (e) => currentPresets[index].name = e.target.value;

      const delBtn = document.createElement('button');
      delBtn.textContent = '删除';
      delBtn.className = 'btn';
      delBtn.style.background = '#ff4444';
      delBtn.style.color = 'white';
      delBtn.style.padding = '4px 8px';
      delBtn.style.fontSize = '12px';
      delBtn.onclick = () => {
        currentPresets.splice(index, 1);
        renderPresetEditor();
      };

      headerRow.appendChild(nameInput);
      headerRow.appendChild(delBtn);

      const promptInput = document.createElement('textarea');
      promptInput.value = preset.prompt;
      promptInput.placeholder = '预设提示词内容';
      promptInput.rows = 3;
      promptInput.onchange = (e) => currentPresets[index].prompt = e.target.value;

      row.appendChild(headerRow);
      row.appendChild(promptInput);
      presetPromptsContainer.appendChild(row);
    });
  }

  renderPresetEditor();

  addPresetBtn.addEventListener('click', () => {
    currentPresets.push({ name: '新预设', prompt: '' });
    renderPresetEditor();
  });

  // Settings Save Logic
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  saveSettingsBtn.addEventListener('click', () => {
    saveSettings({
      clientId: clientIdInput.value.trim(),
      gemUrl: gemUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      summaryPrompt: summaryPromptInput.value.trim(),
      presetPrompts: currentPresets
    });
    alert('设置已保存！');
    renderPresetPrompts(currentPresets);
    initGoogleAuth(handleLoginSuccess);
  });

  // Action Buttons
  document.getElementById('refresh-btn').addEventListener('click', loadData);
  document.getElementById('send-gem-btn').addEventListener('click', sendToGem);
  document.getElementById('select-all-btn').addEventListener('click', toggleSelectAll);
  document.getElementById('select-10-btn').addEventListener('click', selectNext10);
  
  const summarizeBtn = document.getElementById('summarize-btn');
  summarizeBtn.addEventListener('click', async () => {
    const selected = getSelectedArticles();
    if (selected.length === 0) return;
    
    if (window.switchTab) {
      window.switchTab('tab-summary');
    }
    clearSummaries();
    
    summarizeBtn.disabled = true;
    const originalText = summarizeBtn.textContent;
    summarizeBtn.textContent = '总结中...';

    try {
      showBatchSummary("正在生成批量总结，请稍候...", selected);
      const summary = await summarizeArticles(selected);
      showBatchSummary(summary, selected);
    } catch (err) {
      showBatchSummary("总结失败: " + err.message, selected);
    }

    summarizeBtn.textContent = originalText;
    summarizeBtn.disabled = false;
  });

  // Chat Panel Logic
  const chatSelect = document.getElementById('chat-article-select');
  const chatInput = document.getElementById('chat-input');
  const sendChatBtn = document.getElementById('send-chat-btn');

  chatSelect.addEventListener('change', (e) => {
    const url = e.target.value;
    if (url) {
      openChatForArticle(url);
    }
  });

  setOnChatRequested((url) => {
    openChatForArticle(url);
  });

  sendChatBtn.addEventListener('click', () => {
    handleChatSend(chatInput.value.trim());
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend(chatInput.value.trim());
    }
  });

  // Initial render of preset prompts
  renderPresetPrompts(currentPresets);

  const presetDropdown = document.getElementById('preset-prompts-dropdown');
  presetDropdown.addEventListener('change', (e) => {
    const idx = e.target.value;
    if (idx !== '') {
      chatInput.value = currentPresets[idx].prompt;
      // Option to auto-focus or wait for user to click send
      chatInput.focus();
      // Reset dropdown so same preset can be picked again later
      presetDropdown.value = '';
    }
  });

  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetId) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === targetId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.target);
    });
  });

  // Make switchTab available globally for ui.js to call if needed
  window.switchTab = switchTab;

  // Initialize Auth
  initGoogleAuth(handleLoginSuccess);
});

function openChatForArticle(url) {
  if (window.switchTab) {
    window.switchTab('tab-chat');
  }

  setChatArticle(url);
  clearChatHistory();
  
  if (!chatContexts[url]) {
    chatContexts[url] = [];
    appendChatMessage('ai', '你好！我是你的 AI 阅读助手，已经阅读完这篇文章。你可以向我提问，或者点击下方的快捷提示词进行总结。');
  } else {
    if (chatContexts[url].length === 0) {
      appendChatMessage('ai', '你好！我是你的 AI 阅读助手，已经阅读完这篇文章。你可以向我提问，或者点击下方的快捷提示词进行总结。');
    } else {
      chatContexts[url].forEach(msg => {
        appendChatMessage(msg.role === 'user' ? 'user' : 'ai', msg.parts[0].text);
      });
    }
  }
}

async function handleChatSend(text) {
  if (!text) return;
  
  const url = document.getElementById('chat-article-select').value;
  if (!url) {
    alert('请先选择一篇文章！');
    return;
  }

  import('./ui.js').then(({ getArticleByUrl }) => {
    const article = getArticleByUrl(url);
    if (!article) return;

    appendChatMessage('user', text);
    const chatInput = document.getElementById('chat-input');
    if (chatInput.value.trim() === text) {
      chatInput.value = '';
    }

    if (!chatContexts[url]) chatContexts[url] = [];
    chatContexts[url].push({ role: "user", parts: [{ text }] });

    const aiMsgDiv = appendChatMessage('ai', '思考中...');

    let fullResponse = '';
    
    streamChatWithArticle(
      article, 
      chatContexts[url], 
      (chunk) => {
        if (fullResponse === '') aiMsgDiv.innerHTML = '';
        fullResponse += chunk;
        updateChatMessage(aiMsgDiv, fullResponse);
      },
      (err) => {
        updateChatMessage(aiMsgDiv, "抱歉，发生了错误：" + err.message);
      },
      () => {
        chatContexts[url].push({ role: "model", parts: [{ text: fullResponse }] });
      }
    );
  });
}

export async function handleLoginSuccess() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-view').style.display = 'flex';
  await loadData();
}

async function loadData() {
  const spinner = document.getElementById('loading-spinner');
  const list = document.getElementById('articles-list');
  
  spinner.classList.remove('hidden');
  list.innerHTML = '';
  
  try {
    const articles = await fetchArticles();
    renderArticles(articles);
  } catch (error) {
    console.error(error);
    alert('拉取失败: ' + error.message);
  } finally {
    spinner.classList.add('hidden');
  }
}
