async function fetchAndSaveTab(tab) {
  try {
    if (!tab?.url) {
      return;
    }

    if (await shouldSkipAutoFetch(tab.url)) {
      return;
    }

    // 注入 Readability.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['Readability.js']
    });

    // 注入 utils.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['utils.js']
    });

    // 注入 turndown.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['turndown.js']
    });

    // 注入并执行内容抓取函数
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          // 克隆文档以供解析处理
          const documentClone = document.cloneNode(true);

          // 使用专用的公众号文章解析函数
          const article = parseWeChatArticle(documentClone);

          if (!article) {
            throw new Error('无法提取页面内容');
          }

          // 初始化 Turndown
          const turndownService = new TurndownService({
            headingStyle: 'atx',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced'
          });

          // 添加自定义规则：识别带有加粗样式的标签（如微信公众号常用的方式）
          turndownService.addRule('inlineBold', {
            filter: function (node) {
              return node.nodeType === 1 && node.style && 
                     (node.style.fontWeight === 'bold' || node.style.fontWeight === 'bolder' || parseInt(node.style.fontWeight) >= 600) &&
                     node.nodeName !== 'STRONG' && node.nodeName !== 'B' && !/^H[1-6]$/.test(node.nodeName);
            },
            replacement: function (content, node) {
              if (!content.trim()) return content;
              // 如果是块级元素，不要破坏原有的换行
              const isBlock = node.nodeName === 'P' || node.nodeName === 'SECTION' || node.nodeName === 'DIV';
              let formatted = '**' + content.trim() + '**';
              return isBlock ? '\n\n' + formatted + '\n\n' : formatted;
            }
          });
          
          // 移除图片相关容器
          turndownService.addRule('removeImages', {
            filter: ['img', 'picture', 'figure', 'figcaption'],
            replacement: function () {
              return '';
            }
          });
          
          // 移除链接，但保留链接文本
          turndownService.addRule('removeLinks', {
            filter: 'a',
            replacement: function (content) {
              return content;
            }
          });

          // 将 HTML 内容转换为 Markdown
          const markdownContent = turndownService.turndown(article.content);

          // 发送消息到 background script
          chrome.runtime.sendMessage({
            type: 'SAVE_ARTICLE',
            data: {
              title: article.title.trim(),
              textContent: markdownContent.trim(),
              content: markdownContent.trim(),
              url: window.location.href,
            }
          });

          // 显示成功提示
          const notification = document.createElement('div');
          notification.textContent = '已自动复制文章内容';
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #07C160;
            color: white;
            border-radius: 4px;
            z-index: 9999;
          `;
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });
  } catch (error) {
    console.error('抓取失败：', error);
  }
}

async function shouldSkipAutoFetch(url) {
  if (!url || !url.includes('mp.weixin.qq.com')) {
    return false;
  }

  const result = await chrome.storage.local.get('excludedAutoFetchUrls');
  const patterns = splitLines(result.excludedAutoFetchUrls);
  return matchesExcludedUrl(url, patterns);
}

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

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // content.js is now injected declaratively via manifest.json
    // No need to programmatically inject it here.
  }
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_ARTICLE') {
    // 处理文章保存逻辑
    saveArticle(request.data);
  } else if (request.type === 'FETCH_AND_SAVE') {
    const targetTab = request.tab || sender.tab;
    if (targetTab) {
      fetchAndSaveTab(targetTab);
    }
  }
});

// 保存文章到本地存储
async function saveArticle(article) {
  try {
    // 获取现有文章列表和设置
    const result = await chrome.storage.local.get(['articles', 'geminiApiKey', 'summaryPrompt']);
    const articles = result.articles || [];
    const apiKey = result.geminiApiKey;
    const summaryPrompt = result.summaryPrompt;
    
    // 检查文章是否已存在（基于标题去重）
    const existingIndex = articles.findIndex(a => a.title === article.title);
    if (existingIndex !== -1) {
      // 如果已存在，更新其内容（以便抓取到最新格式）
      articles[existingIndex] = { ...articles[existingIndex], ...article };
    } else {
      // 不存在则新增
      articles.push(article);
    }
    
    await chrome.storage.local.set({ articles });
    
    // 广播更新消息
    chrome.runtime.sendMessage({ type: 'ARTICLES_UPDATED' }).catch(() => {
      // 忽略没有接收者的错误 (例如 popup 未打开时)
    });
  } catch (error) {
    console.error('保存文章失败:', error);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fetch-current-page') {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    fetchAndSaveTab(tab);
  }
});
