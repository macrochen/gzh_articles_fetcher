// 全局变量声明 (如 currentChatArticle, chatHistory)
let currentChatArticle = null;
let chatHistory = [];

// 函数定义区域
// (确保 saveSettings 和 loadSettings 在这里定义)
async function saveSettings() {
  const apiKey = document.getElementById('geminiApiKey').value;
  const prompt = document.getElementById('summaryPrompt').value;

  if (apiKey) {
    await chrome.storage.local.set({ geminiApiKey: apiKey });
  }
  if (prompt) {
    await chrome.storage.local.set({ summaryPrompt: prompt });
  }
  alert('设置已保存！');
}

async function loadSettings() {
  const result = await chrome.storage.local.get(['geminiApiKey', 'summaryPrompt']);
  if (result.geminiApiKey) {
    document.getElementById('geminiApiKey').value = result.geminiApiKey;
  }
  if (result.summaryPrompt) {
    document.getElementById('summaryPrompt').value = result.summaryPrompt;
  }
}

// 加载文章列表
async function loadArticles() {
  const result = await chrome.storage.local.get(['articles', 'geminiApiKey', 'summaryPrompt']);
  const articles = result.articles || [];
  const apiKey = result.geminiApiKey;
  const summaryPrompt = result.summaryPrompt;
  const listElement = document.getElementById('articlesList');

  if (articles.length === 0) {
    listElement.innerHTML = '<p>暂无文章，请先通过插件抓取。</p>';
    return;
  }

  // 如果有API Key和提示词，则为没有总结的文章生成总结
  if (apiKey && summaryPrompt) {
    let articlesUpdated = false;
    for (let article of articles) {
      if (typeof article.summary === 'undefined') {
        console.log(`为文章 "${article.title}" 生成总结...`);
        article.summary = await summarizeTextWithGemini(apiKey, article.textContent, summaryPrompt);
        articlesUpdated = true;
      }
    }
    if (articlesUpdated) {
      await chrome.storage.local.set({ articles });
      console.log('部分文章总结已更新并保存。');
    }
  }

  // 倒序排列文章
  const sortedArticles = [...articles].reverse();

  listElement.innerHTML = sortedArticles.map(article => `
    <div class="article-item collapsed">
      <div class="article-header">
        <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
        <span class="toggle-icon">▼</span>
      </div>
      <div class="article-content">
        ${article.summary ? 
          `<div class="summary">${marked.parse(article.summary)}</div>` : 
          '<div class="summary"><em>无总结 (请配置API Key和提示词后重新加载)</em></div>'
        }
        <div class="actions">
          <button class="chat" data-article-title="${article.title.replace(/'/g, "&#39;")}">
            开始对话
          </button>
          <button class="delete" data-article-title="${article.title.replace(/'/g, "&#39;")}">
            删除文章
          </button>
        </div>
      </div>
    </div>
  `).join('');

}

// 添加切换文章折叠状态的函数
function toggleArticle(articleItem) {
    const articleContent = articleItem.querySelector('.article-content');
    const toggleIcon = articleItem.querySelector('.toggle-icon');

    if (articleContent) {
      if (articleItem.classList.contains('collapsed')) {
        articleItem.classList.remove('collapsed');
        if (toggleIcon) {
          toggleIcon.textContent = '▼'; // 展开时显示向下箭头
        }
      } else {
        articleItem.classList.add('collapsed');
        if (toggleIcon) {
          toggleIcon.textContent = '▶'; // 折叠时显示向右箭头
        }
      }
    }
  }

// 编辑文章标题
async function editArticle(title) {
  const newTitle = prompt('请输入新的标题', title);
  if (newTitle && newTitle !== title) {
    const result = await chrome.storage.local.get('articles');
    const articles = result.articles || [];
    const index = articles.findIndex(a => a.title === title);
    
    if (index !== -1) {
      articles[index].title = newTitle;
      await chrome.storage.local.set({ articles });
      loadArticles();
    }
  }
}

// 删除文章
async function deleteArticle(title) {
  if (confirm(`确定要删除文章《${title}》吗？`)) {
    const result = await chrome.storage.local.get('articles');
    let articles = result.articles || [];
    articles = articles.filter(a => a.title !== title);
    await chrome.storage.local.set({ articles });
    loadArticles(); // 重新加载列表
    // 如果删除的是当前正在聊天的文章，则清空聊天区域
    if (currentChatArticle && currentChatArticle.title === title) {
      clearChatArea();
    }
  }
}

function clearChatArea() {
  document.getElementById('chatWindowTitle').textContent = '与 Gemini 对话';
  document.getElementById('chatHistory').innerHTML = '';
  document.getElementById('chatInput').value = '';
  currentChatArticle = null;
  chatHistory = [];
}

// 开始与文章对话
async function startChatWithArticle(title) {
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || [];
  const article = articles.find(a => a.title === title);

  if (!article) {
    alert('未找到文章！');
    return;
  }

  currentChatArticle = article;
  chatHistory = []; // 开始新的对话时清空历史

  document.getElementById('chatWindowTitle').textContent = `与《${article.title}》对话`;
  const chatHistoryElement = document.getElementById('chatHistory');
  chatHistoryElement.innerHTML = ''; // 清空之前的聊天记录

  // 添加一条初始消息，包含文章内容作为上下文
  appendMessageToChatHistory(`**正在与关于《${article.title}》的内容进行对话。**\n以下是文章内容概要，您可以基于此提问：\n${article.summary || article.textContent.substring(0, 500) + '...'}`, 'system');
  
  document.getElementById('chatInput').focus();
}

// 发送聊天消息
async function sendChatMessage() {
  const inputElement = document.getElementById('chatInput');
  const messageText = inputElement.value.trim();

  if (!messageText) return;

  if (!currentChatArticle) {
    alert('请先从左侧选择一篇文章开始对话。');
    return;
  }

  const settings = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    alert('请先在设置中填写 Gemini API Key！');
    return;
  }

  appendMessageToChatHistory(messageText, 'user');
  inputElement.value = ''; // 清空输入框

  // 构建发送给 Gemini 的上下文
  // 可以包含之前的聊天记录和当前文章内容
  let conversationContext = `这是关于文章《${currentChatArticle.title}》的对话。文章URL: ${currentChatArticle.url}\n文章内容概要: ${currentChatArticle.summary || currentChatArticle.textContent.substring(0,1000)}\n\n`;
  
  // 添加最近的几条聊天记录到上下文中，以保持对话连贯性
  // Gemini API 对上下文长度有限制，这里简单取最后几条
  const recentHistory = chatHistory.slice(-5); // 取最近5条对话（用户+Gemini）
  recentHistory.forEach(msg => {
    conversationContext += `${msg.sender === 'user' ? '用户' : 'Gemini'}: ${msg.text}\n`;
  });
  conversationContext += `用户: ${messageText}\nGemini:`; // 提示模型继续回答

  try {
    // 调用 Gemini API (使用一个更通用的函数，因为不再只是总结)
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [{
        parts: [{
          text: conversationContext
        }]
      }],
      // 可以添加 generationConfig 等参数控制输出
      // generationConfig: {
      //   temperature: 0.7,
      //   topK: 1,
      //   topP: 1,
      //   maxOutputTokens: 2048,
      // }
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    let geminiResponse = '未能获取回复。';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      geminiResponse = data.candidates[0].content.parts[0].text;
    }
    appendMessageToChatHistory(geminiResponse, 'gemini');
  } catch (error) {
    console.error('调用 Gemini API 进行对话失败:', error);
    appendMessageToChatHistory(`抱歉，与 Gemini 对话时发生错误: ${error.message}`, 'error');
  }
}

// 将消息添加到聊天记录中
function appendMessageToChatHistory(text, sender) { // sender可以是 'user', 'gemini', 'system', 'error'
  const chatHistoryElement = document.getElementById('chatHistory');
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', sender);
  messageElement.textContent = text; // 使用 textContent 防止 XSS
  chatHistoryElement.appendChild(messageElement);
  chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight; // 自动滚动到底部

  // 将用户和 Gemini 的消息存入 chatHistory 数组
  if (sender === 'user' || sender === 'gemini') {
    chatHistory.push({ sender, text });
  }
}

// 导出到 Google Drive (保持大部分不变，但确保文章数据是最新的)
async function exportToDrive() {
  try {
    // 获取 token, apiKey, summaryPrompt 的逻辑不变
    const tokenObject = await chrome.identity.getAuthToken({ interactive: true });
    let accessToken = tokenObject?.token;
    if (!accessToken) {
      alert("获取 Access Token 失败，请重试。"); return;
    }

    const settings = await chrome.storage.local.get(['geminiApiKey', 'summaryPrompt']);
    const apiKey = settings.geminiApiKey;
    const summaryPrompt = settings.summaryPrompt;

    if (!apiKey || !summaryPrompt) {
      alert('请先在设置中填写 Gemini API Key 和总结提示词！');
      return;
    }

    const result = await chrome.storage.local.get('articles');
    const articles = result.articles || [];
    
    if (articles.length === 0) {
      alert('没有可导出的文章');
      return;
    }
    
    const folderId = await getOrCreateFolder(accessToken, 'gzh');
    
    // 确保所有文章都有总结，如果之前加载时未生成，这里再次尝试
    const articlesToExport = await Promise.all(
      articles.map(async (article) => {
        let currentSummary = article.summary;
        if (typeof currentSummary === 'undefined' || currentSummary.startsWith('总结失败') || currentSummary === '无总结') {
            console.log(`为文章 "${article.title}" 在导出前生成总结...`);
            currentSummary = await summarizeTextWithGemini(apiKey, article.textContent, summaryPrompt);
        }
        return {
          title: article.title,
          url: article.url,
          content: article.textContent,
          summary: currentSummary,
        };
      })
    );

    const today = new Date().toISOString().split('T')[0];
    const jsonData = articlesToExport.map(article => ({
      title: article.title,
      url: article.url,
      content: article.content,
      summary: article.summary
    }));

    const fileContent = JSON.stringify(jsonData, null, 2);
    const metadata = {
        name: `文章汇总_${today}.json`,
        parents: [folderId],
        mimeType: 'application/json'
      };
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: createMultipartBodyWithFormData(metadata, fileContent)
    });
    
    if (response.ok) {
        alert('导出成功！');
      } else {
        let errorMessage = `上传失败: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorMessage += ` - ${JSON.stringify(errorJson)}`;
        } catch (e) {
          const errorText = await response.text();
          errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
      }
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败：' + (error.message || error));
  }
}

// 使用 Gemini API 总结文本
async function summarizeTextWithGemini(apiKey, textToSummarize, userPrompt) {
  // 注意：这里需要替换为实际的 Gemini API endpoint 和请求格式
  // 以下是一个假设的 Gemini API 调用示例，您需要根据官方文档进行调整
  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  if (!textToSummarize || textToSummarize.trim() === '') {
    console.warn('文本内容为空，跳过总结');
    return ''; // 如果文本为空，返回空字符串
  }

  const requestBody = {
    contents: [{
      parts: [{
        text: `${userPrompt}\n\n${textToSummarize}`
      }]
    }]
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API 请求失败: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    // 根据 Gemini API 的实际响应结构提取总结文本
    // 假设总结在 data.candidates[0].content.parts[0].text
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    }
    return '总结内容提取失败';
  } catch (error) {
    console.error('调用 Gemini API 失败:', error);
    // 在生产环境中，您可能希望更优雅地处理这个错误，例如返回原始文本或一个错误标记
    return `总结失败: ${error.message}`;
  }
}

// 获取或创建文件夹
async function getOrCreateFolder(token, folderName) {
  // 首先查找是否已存在同名文件夹
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const searchResult = await searchResponse.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }
  
  // 如果不存在，创建新文件夹
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  const folder = await createResponse.json();
  return folder.id;
}

function createMultipartBodyWithFormData(metadata, content) {
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }));
    formData.append('file', new Blob([content], { type: 'text/plain' }), 'content.txt'); // 文件名可以随意
    return formData;
  }
  

// 创建多部分请求体
function createMultipartBody(metadata, content) {
  const boundary = 'foo_bar_baz';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelimiter = '\r\n--' + boundary + '--';
  
  const body = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: text/plain\r\n\r\n',
    content,
    closeDelimiter
  ].join('');
  
  return body;
}

// 绑定保存设置按钮事件
document.getElementById('saveSettings').addEventListener('click', saveSettings);
// 绑定导出按钮事件
document.getElementById('exportToDrive').addEventListener('click', exportToDrive);


function toggleSettings(header) {
  const section = header.closest('.settings-section');
  section.classList.toggle('collapsed');
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings(); // 先加载设置
  loadArticles(); // 然后加载文章，这样可以立即尝试生成总结
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('exportToDrive').addEventListener('click', exportToDrive);
  document.getElementById('sendChatMessage').addEventListener('click', sendChatMessage);
  // 允许按 Enter 键发送消息
  document.getElementById('chatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter 用于换行
      e.preventDefault(); // 阻止默认的 Enter 行为 (如换行)
      sendChatMessage();
    }
  });
  // 添加设置区域的折叠/展开功能
  const settingsHeader = document.querySelector('.settings-header');
  if (settingsHeader) {
    settingsHeader.addEventListener('click', function() {
      const section = this.closest('.settings-section');
      section.classList.toggle('collapsed');
    });
  }

  // 为文章列表中的每个文章项添加事件监听器
  if (articlesList) {  // 确保 articlesList 存在
    articlesList.addEventListener('click', (event) => {
      const target = event.target;
        // 找到最近的 article-header
      const articleHeader = target.closest('.article-header');
      if (articleHeader) {
        const articleItem = articleHeader.parentNode;
        const articleContent = articleItem.querySelector('.article-content');
        const toggleIcon = articleHeader.querySelector('.toggle-icon');

        if (articleContent) {
          if (articleItem.classList.contains('collapsed')) {
            articleItem.classList.remove('collapsed');
             if (toggleIcon) {
                toggleIcon.textContent = '▼';
              }
          } else {
            articleItem.classList.add('collapsed');
             if (toggleIcon) {
                  toggleIcon.textContent = '▶';
              }
          }
        }
      }
    });

    // 为所有聊天按钮添加事件监听器
    document.querySelectorAll('.chat').forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          startChatWithArticle(button.dataset.articleTitle);
        });
      });
      
      // 为所有删除按钮添加事件监听器
      document.querySelectorAll('.delete').forEach(button => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteArticle(button.dataset.articleTitle);
        });
      });
  }
});