import { loadSettings } from './config.js';
import { marked } from 'marked';

let allArticles = [];
let currentChatArticleUrl = null;

// Callbacks that main.js will set
export let onChatRequested = (url) => {};

export function setOnChatRequested(cb) {
  onChatRequested = cb;
}

export function renderArticles(articles) {
  allArticles = articles;
  const listEl = document.getElementById('articles-list');
  listEl.innerHTML = '';

  if (!articles || articles.length === 0) {
    listEl.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted)">空空如也，云端没有任何文章。</p>';
    updateActionButtons();
    return;
  }

  // Render newest first (assuming they are appended in extension)
  const reversed = [...articles].reverse();

  reversed.forEach((article, index) => {
    const card = document.createElement('div');
    card.className = 'article-item collapsed';
    card.dataset.url = article.url;
    card.id = `card-${index}`; // Give it an ID to append summary later

    card.innerHTML = `
      <div class="article-header">
        <input type="checkbox" class="custom-checkbox" data-url="${article.url}">
        <div class="title-container">
          <h3 class="article-title">
            <a href="${article.url}" target="_blank" title="${article.title}">${article.title}</a>
          </h3>
          <button class="chat-button start-chat-btn" data-url="${article.url}">对话</button>
        </div>
      </div>
      <div class="article-summary" id="summary-${index}"></div>
    `;

    // Click card to toggle checkbox
    card.addEventListener('click', (e) => {
      // Don't toggle if clicking the chat button
      if (e.target.closest('.start-chat-btn')) return;
      
      const cb = card.querySelector('.custom-checkbox');
      cb.checked = !cb.checked;
      card.classList.toggle('selected', cb.checked);
      updateActionButtons();
    });

    // Handle checkbox click directly to prevent double toggle
    const checkbox = card.querySelector('.custom-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('selected', checkbox.checked);
      updateActionButtons();
    });

    // Handle Chat button
    const chatBtn = card.querySelector('.start-chat-btn');
    chatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onChatRequested(article.url);
    });

    listEl.appendChild(card);
  });
  
  updateActionButtons();
  populateChatDropdown(reversed);
}

export function updateActionButtons() {
  const selected = document.querySelectorAll('.custom-checkbox:checked');
  const sendBtn = document.getElementById('send-gem-btn');
  const summarizeBtn = document.getElementById('summarize-btn');
  
  sendBtn.textContent = `发送到 Gem (${selected.length})`;
  sendBtn.disabled = selected.length === 0;
  summarizeBtn.disabled = selected.length === 0;
}

export function toggleSelectAll() {
  const checkboxes = document.querySelectorAll('.custom-checkbox');
  const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
  
  checkboxes.forEach(cb => {
    cb.checked = anyUnchecked;
    const card = cb.closest('.article-item');
    card.classList.toggle('selected', anyUnchecked);
  });
  updateActionButtons();
}

export function selectNext10() {
  const checkboxes = document.querySelectorAll('.custom-checkbox');
  let count = 0;
  
  for (const cb of checkboxes) {
    if (!cb.checked) {
      cb.checked = true;
      const card = cb.closest('.article-item');
      card.classList.add('selected');
      count++;
      if (count === 10) break;
    }
  }
  
  updateActionButtons();
}

export function getSelectedArticles() {
  const selectedUrls = Array.from(document.querySelectorAll('.custom-checkbox:checked')).map(cb => cb.dataset.url);
  return allArticles.filter(a => selectedUrls.includes(a.url));
}

export function getArticleByUrl(url) {
  return allArticles.find(a => a.url === url);
}

export function clearSummaries() {
  const container = document.getElementById('batch-summary-container');
  container.innerHTML = '';
}

export function showSummary(url, summaryText) {
  const article = getArticleByUrl(url);
  const container = document.getElementById('batch-summary-container');

  // Find if a summary item already exists for this URL
  let summaryItem = container.querySelector(`[data-url="${url}"]`);
  
  if (!summaryItem) {
    summaryItem = document.createElement('div');
    summaryItem.className = 'summary-item';
    summaryItem.dataset.url = url;
    summaryItem.innerHTML = `
      <h3 style="margin-top: 0; font-size: 16px; margin-bottom: 10px;">${article ? article.title : url}</h3>
      <div class="summary-content" style="line-height: 1.6; font-size: 14px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50;"></div>
    `;
    container.appendChild(summaryItem);
  }

  const contentDiv = summaryItem.querySelector('.summary-content');
  // Use marked to parse markdown content
  contentDiv.innerHTML = marked.parse(summaryText);
}

export function showBatchSummary(markdownText, selectedArticles) {
  const container = document.getElementById('batch-summary-container');
  container.innerHTML = ''; // clear

  const summaryItem = document.createElement('div');
  summaryItem.className = 'summary-item';
  summaryItem.innerHTML = `
    <h3 style="margin-top: 0; font-size: 16px; margin-bottom: 10px;">批量总结结果</h3>
    <div class="summary-content" style="line-height: 1.6; font-size: 14px; background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50;"></div>
  `;
  container.appendChild(summaryItem);

  const contentDiv = summaryItem.querySelector('.summary-content');

  // Parse markdown
  let actualMarkdown = markdownText;
  const codeBlockMatch = markdownText.match(/```(?:json|markdown)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    actualMarkdown = codeBlockMatch[1];
  }

  // If the prompt returns JSON array, parse and format it beautifully
  try {
    const jsonArr = JSON.parse(actualMarkdown);
    if (Array.isArray(jsonArr)) {
      let html = '';
      for (const item of jsonArr) {
        let title = item.title || "未知文章";
        let content = item.content || item.summary || JSON.stringify(item);
        
        // Find matching article for URL and chat
        const article = selectedArticles.find(a => a.title.includes(title) || title.includes(a.title)) || { url: '#' };
        
        html += `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; font-size: 15px;">
              <a href="${article.url}" target="_blank" style="color: #333; text-decoration: none; border-bottom: 1px dashed #ccc;">${title}</a>
              <button class="chat-button start-chat-btn" data-url="${article.url}" style="font-size: 11px; padding: 2px 6px; margin-left: 8px;">对话</button>
            </h4>
            <div style="color: #555;">${marked.parse(content)}</div>
          </div>
        `;
      }
      contentDiv.innerHTML = html;
      
      // Bind chat buttons
      contentDiv.querySelectorAll('.start-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (onChatRequested) onChatRequested(e.target.dataset.url);
        });
      });
      return;
    }
  } catch (e) {
    // Not valid JSON, fallback to raw markdown processing
  }

  // Process raw markdown
  let processedHTML = marked.parse(actualMarkdown);
  
  // Try to inject links and buttons for each article title
  for (const article of selectedArticles) {
    const fullTitle = article.title;
    const url = article.url;
    const coreTitle = fullTitle.substring(fullTitle.lastIndexOf('-') + 1).trim();

    let titleToSearch = fullTitle;
    let titleLength = fullTitle.length;
    let titleIndex = processedHTML.indexOf(fullTitle);

    if (titleIndex === -1 && coreTitle) {
      titleToSearch = coreTitle;
      titleLength = coreTitle.length;
      titleIndex = processedHTML.indexOf(coreTitle);
    }

    if (titleIndex !== -1) {
      if (!processedHTML.slice(Math.max(0, titleIndex - 150), titleIndex).includes('chat-button')) {
        const buttonHTML = `<button class="chat-button start-chat-btn" style="font-size: 11px; padding: 2px 6px; margin-left: 8px;" data-url="${url}">对话</button>`;
        const endBracketIndex = processedHTML.indexOf('》', titleIndex + titleLength);
        const insertButtonIndex = endBracketIndex !== -1 ? endBracketIndex + 1 : titleIndex + titleLength;
        
        processedHTML = processedHTML.slice(0, titleIndex) + 
                       `<a href="${url}" target="_blank" style="color: #333; text-decoration: none; border-bottom: 1px dashed #ccc;" title="${fullTitle.replaceAll('"', '&quot;')}">${titleToSearch}</a>` + 
                       processedHTML.slice(titleIndex + titleLength, insertButtonIndex) + 
                       buttonHTML + 
                       processedHTML.slice(insertButtonIndex);
      }
    }
  }

  contentDiv.innerHTML = processedHTML;
  
  // Bind chat buttons
  contentDiv.querySelectorAll('.start-chat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (onChatRequested) onChatRequested(e.target.dataset.url);
    });
  });
}

// ==========================================
// Chat UI Logic
// ==========================================

export function populateChatDropdown(articles) {
  const select = document.getElementById('chat-article-select');
  select.innerHTML = '<option value="">-- 选择文章开始对话 --</option>';
  articles.forEach(article => {
    const opt = document.createElement('option');
    opt.value = article.url;
    opt.textContent = article.title;
    select.appendChild(opt);
  });
}

export function setChatArticle(url) {
  const select = document.getElementById('chat-article-select');
  select.value = url;
  currentChatArticleUrl = url;
}

export function renderPresetPrompts(presetsArray) {
  const dropdown = document.getElementById('preset-prompts-dropdown');
  dropdown.innerHTML = '<option value="">-- 选择预设提示词 --</option>';
  
  if (!presetsArray || !Array.isArray(presetsArray)) return;
  
  presetsArray.forEach((preset, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = preset.name;
    dropdown.appendChild(opt);
  });
}

export function appendChatMessage(role, text) {
  const container = document.getElementById('chat-history');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role}`;
  msgDiv.innerHTML = marked.parse(text);
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  return msgDiv;
}

export function updateChatMessage(msgDiv, newText) {
  msgDiv.innerHTML = marked.parse(newText);
  const container = document.getElementById('chat-history');
  container.scrollTop = container.scrollHeight;
}

export function clearChatHistory() {
  document.getElementById('chat-history').innerHTML = '';
}

export async function sendToGem() {
  const settings = loadSettings();
  if (!settings.gemUrl) {
    alert('请先在右上角设置中配置 Gem URL');
    return;
  }

  const selectedArticles = getSelectedArticles();
  if (selectedArticles.length === 0) return;

  // Format the text to copy as JSON
  const payload = JSON.stringify({
    articles: selectedArticles.map(a => ({
      title: a.title,
      url: a.url,
      content: a.content || a.textContent || '无正文'
    }))
  }, null, 2);

  const textToCopy = payload;

  try {
    await navigator.clipboard.writeText(textToCopy);
    alert('文章内容已复制到剪贴板！即将在新标签页打开 Gem...');
    
    setTimeout(() => {
      window.open(settings.gemUrl, '_blank');
    }, 1000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
    alert('无法访问剪贴板，请检查浏览器权限。');
  }
}
