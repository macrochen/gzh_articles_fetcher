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

  const local_result = await chrome.storage.local.get('latestSummary');
  if (local_result.latestSummary) {
    // 显示最新的总结
    updateArticleSummaries(local_result.latestSummary);
  }

  // 倒序排列文章
  const sortedArticles = [...articles].reverse();

  listElement.innerHTML = sortedArticles.map(article => `
    <div class="article-item collapsed">
      <div class="article-header">
        <input type="checkbox" class="article-checkbox" data-title="${article.title.replace(/"/g, '&quot;')}">
        <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
      </div>
    </div>
  `).join('');

  // 更新下拉列表
  const dropdown = document.getElementById('articleDropdown');
  dropdown.innerHTML = '<option value="">-- 选择文章开始对话 --</option>' + 
    sortedArticles.map(article => 
      `<option value="${article.title.replace(/"/g, '&quot;')}">${article.title}</option>`
    ).join('');
  
  // 添加下拉列表事件监听
  dropdown.addEventListener('change', function() {
    if (this.value) {
      startChatWithArticle(this.value);
    }
  });

  
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
  appendMessageToChatHistory(`正在与关于《${article.title}》的内容进行对话。`, 'system');
  
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
  let conversationContext = `这是关于文章《${currentChatArticle.title}》的对话。文章URL: ${currentChatArticle.url}\n文章内容: ${currentChatArticle.textContent}\n\n`;
  
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
      generationConfig: {
        "temperature": 0.3,
        "topK": 30,
        "topP": 0.7,
        "maxOutputTokens": 500
      }
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
  
  // 创建发送者标签
  // const senderLabel = document.createElement('div');
  // senderLabel.classList.add('sender-label');
  senderLabel = sender === 'user' ? '我' : 
                           sender === 'gemini' ? 'AI' : 
                           sender === 'system' ? '系统' : '错误';
  // messageElement.appendChild(senderLabel);
  
  // 创建消息内容容器
  const messageContent = document.createElement('div');
  messageContent.classList.add('message-content');
  messageContent.innerHTML = "<strong>" + senderLabel + "</strong>：" + marked.parse(text); // 使用 innerHTML 来显示解析后的 markdown
  messageElement.appendChild(messageContent);
  
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
    // 创建并显示加载指示器
    const loadingElement = document.createElement('div');
    loadingElement.id = 'exportLoading';
    loadingElement.style.position = 'fixed';
    loadingElement.style.top = '50%';
    loadingElement.style.left = '50%';
    loadingElement.style.transform = 'translate(-50%, -50%)';
    loadingElement.style.padding = '20px';
    loadingElement.style.background = 'white';
    loadingElement.style.borderRadius = '5px';
    loadingElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
    loadingElement.style.zIndex = '1000';
    loadingElement.innerHTML = '<p>正在导出文章到Google Drive...</p><div class="loading-spinner"></div>';
    document.body.appendChild(loadingElement);

    const tokenObject = await chrome.identity.getAuthToken({ interactive: true });
    let accessToken = tokenObject?.token;
    if (!accessToken) {
      alert("获取 Access Token 失败，请重试。"); 
      loadingElement.remove();
      return;
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

    const today = new Date();
    const formattedDate = `${(today.getMonth()+1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}${today.getHours().toString().padStart(2, '0')}${today.getMinutes().toString().padStart(2, '0')}${today.getSeconds().toString().padStart(2, '0')}`;
    const jsonData = articlesToExport.map(article => ({
      title: article.title,
      url: article.url,
      content: article.content,
      // summary: article.summary
    }));

    const fileContent = JSON.stringify(jsonData, null, 2);
    const metadata = {
        name: `文章汇总_${formattedDate}.json`,
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
  } finally {
    // 无论成功或失败，都移除加载指示器
    const loadingElement = document.querySelector('.loading-indicator');
    if (loadingElement) loadingElement.remove();
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
    }],
    // 可以添加 generationConfig 等参数控制输出
    generationConfig: {
      "temperature": 0.3,
      "topK": 30,
      "topP": 0.7,
      "maxOutputTokens": 500
    }
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

  document.getElementById('summarizeSelected').addEventListener('click', summarizeSelectedArticles);


  // 绑定全选功能
  document.getElementById('selectAll').addEventListener('change', function(e) {
    const checkboxes = document.querySelectorAll('.article-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
  });

  // 绑定删除选中按钮
  document.getElementById('deleteSelected').addEventListener('click', deleteSelectedArticles);

  // 在DOMContentLoaded事件监听器中添加
  const presetSelect = document.getElementById('presetPrompts');
  presetSelect.addEventListener('change', function() {
    if (this.value) {
      document.getElementById('chatInput').value = this.value;
      this.selectedIndex = 0; // 重置选择
    }
  });

});

async function deleteSelectedArticles() {
  const checkboxes = document.querySelectorAll('.article-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请至少选择一篇文章');
    return;
  }

  const titles = Array.from(checkboxes).map(cb => cb.dataset.title);
  if (confirm(`确定要删除选中的${titles.length}篇文章吗？`)) {
    const result = await chrome.storage.local.get('articles');
    let articles = result.articles || [];
    articles = articles.filter(a => !titles.includes(a.title));
    await chrome.storage.local.set({ articles });
    loadArticles();
    
    // 如果删除的是当前正在聊天的文章，则清空聊天区域
    if (currentChatArticle && titles.includes(currentChatArticle.title)) {
      clearChatArea();
    }
  }
}

// 创建加载提示
function createLoadingIndicator() {
  const loadingElement = document.createElement('div');
  loadingElement.id = 'summaryLoading';
  loadingElement.style.position = 'fixed';
  loadingElement.style.top = '50%';
  loadingElement.style.left = '50%';
  loadingElement.style.transform = 'translate(-50%, -50%)';
  loadingElement.style.padding = '20px';
  loadingElement.style.background = 'white';
  loadingElement.style.borderRadius = '5px';
  loadingElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  loadingElement.style.zIndex = '1000';
  loadingElement.innerHTML = '<p>正在批量总结中，请稍候...</p><div class="loading-spinner"></div>';
  document.body.appendChild(loadingElement);
  return loadingElement;
}

// 准备要总结的文章数据
function prepareSelectedArticles(checkboxes, articles) {
  return Array.from(checkboxes).map(checkbox => {
    const title = checkbox.dataset.title;
    const article = articles.find(a => a.title === title);
    return article ? { title: article.title, textContent: article.textContent } : null;
  }).filter(Boolean);
}

// 调用批量总结API
async function callBatchSummaryAPI(apiKey, summaryPrompt, selectedArticles) {
  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{
      parts: [{
        text: `请以Markdown格式返回以下内容的总结:\n\n${JSON.stringify(selectedArticles)}\n\n总结要求:${summaryPrompt}`
      }]
    }],
    // 可以添加 generationConfig 等参数控制输出
    generationConfig: {
      "temperature": 0.3,
      "topK": 30,
      "topP": 0.7,
      "maxOutputTokens": 50000
    }
  
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/plain' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status}`);
  }

  const data = await response.json();
  // 直接返回 API 响应的文本内容
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}


// 更新文章总结
async function updateArticleSummaries(summaries) {
  // 先移除旧的总结结果
  const oldSummary = document.querySelector('.summary-results');
  if (oldSummary) {
    oldSummary.remove();
  }

  // 创建总结结果显示区域
  const summaryResults = document.createElement('div');
  summaryResults.className = 'summary-results';
  summaryResults.innerHTML = '<h3>批量总结结果</h3>';

  // 将 Markdown 转换为 HTML 并添加到结果区域
  const summaryContent = document.createElement('div');
  summaryContent.className = 'summary-content';
  summaryContent.innerHTML = marked.parse(summaries);
  summaryResults.appendChild(summaryContent);

  // 将总结结果插入到操作按钮区域下方
  const buttonArea = document.querySelector('.actions'); // 修改为匹配实际的类名
  if (buttonArea) {
    buttonArea.insertAdjacentElement('afterend', summaryResults);
  } else {
    document.body.appendChild(summaryResults);
  }

  // 将总结内容保存到本地存储
  await chrome.storage.local.set({ latestSummary: summaries });
}

// 添加批量总结函数
async function summarizeSelectedArticles() {
  const checkboxes = document.querySelectorAll('.article-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请先选择要总结的文章');
    return;
  }

  const loadingElement = createLoadingIndicator();

  try {
    const settings = await chrome.storage.local.get(['geminiApiKey', 'summaryPrompt']);
    const apiKey = settings.geminiApiKey;
    const summaryPrompt = settings.summaryPrompt;
    // const summaryPrompt = `
    // 您将收到一个JSON数组，每个元素包含 "title" 和 "textContent" 字段。请为每篇文章生成总结，并返回一个严格符合以下格式的JSON数组，除了总结内容外，不要包含任何额外的文本或解释。

    // 要求：
    // 1.  输出必须是严格有效的JSON格式，结构与输入完全一致。
    // 2.  每篇文章的总结必须包含在 "content" 字段中。
    // 3.  总结语言为简体中文，使用口语化表达。
    // 4.  保留关键细节，总结长度控制在原文的 30% 以内。
    // 5.  对于软文，直接在 "content" 字段中标记为 "软文"。

    // 示例输入格式：
    // [{"title": "文章标题", "textContent": "文章内容..."}]

    // 示例输出格式：
    // [
    //   {"title": "文章标题1", "content": "总结内容1"},
    //   {"title": "文章标题2", "content": "总结内容2"},
    //   ...
    // ]

    // 总结内容要求：
    // -   快速提炼核心观点。
    // -   保留关键细节。
    // -   使用口语化表达。
    // -   根据文章类型调整总结侧重点。
    // -   对于疑问句标题，直接从文章内容中回答问题。
    // -   明确标注软文。
    // `;

    if (!apiKey || !summaryPrompt) {
      alert('请先在设置中填写 Gemini API Key 和总结提示词！');
      return;
    }

    const result = await chrome.storage.local.get('articles');
    const articles = result.articles || [];
    
    // 准备要总结的文章数据
    const selectedArticles = prepareSelectedArticles(checkboxes, articles);
    const summaries = await callBatchSummaryAPI(settings.geminiApiKey, settings.summaryPrompt, selectedArticles);
    
    await updateArticleSummaries(summaries);
    alert('批量总结完成！');
  } catch (error) {
    console.error('批量总结失败:', error);
    alert(`批量总结失败: ${error.message}`);
  } finally {
    document.body.removeChild(loadingElement);
  }
}
