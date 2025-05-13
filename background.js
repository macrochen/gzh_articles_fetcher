// 监听标签页更新事件
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('mp.weixin.qq.com')) {
    // 当检测到微信公众号文章页面时，注入内容脚本
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }
});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_ARTICLE') {
    // 处理文章保存逻辑
    saveArticle(request.data);
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
    if (!articles.some(a => a.title === article.title)) {
      // 如果有 API Key 和提示词，立即生成总结
      if (apiKey && summaryPrompt && article.textContent) {
        try {
          article.summary = ""; // todo await summarizeTextWithGemini(apiKey, article.textContent, summaryPrompt);
        } catch (error) {
          console.error('生成总结失败:', error);
          article.summary = '总结失败: ' + error.message;
        }
      } else {
        article.summary = '无总结 (请配置API Key和提示词)';
      }
      
      articles.push(article);
      await chrome.storage.local.set({ articles });
    }
  } catch (error) {
    console.error('保存文章失败:', error);
  }
}