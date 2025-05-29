document.getElementById('openManager').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// 显示当前状态
chrome.storage.local.get('articles', (result) => {
  const count = result.articles?.length || 0;
  document.getElementById('status').textContent = `已采集 ${count} 篇文章`;
});

// 抓取当前页面内容
document.getElementById('fetchCurrent').addEventListener('click', async () => {
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // 先注入 Readability.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['Readability.js']
    });
    
    // 注入并执行内容抓取函数
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          // 克隆文档以供 Readability 处理
          const documentClone = document.cloneNode(true);
          
          // 使用 Readability 解析内容
          const article = new Readability(documentClone).parse();
          
          if (!article) {
            throw new Error('无法提取页面内容');
          }
          
          // 发送消息到 background script
          chrome.runtime.sendMessage({
            type: 'SAVE_ARTICLE',
            data: {
              title: article.title.trim(),
              textContent: article.textContent.trim(),
              url: window.location.href,
              timestamp: new Date().toISOString()
            }
          });
          
          // 显示复制成功提示
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
    
    // 更新状态显示
    const articles = await chrome.storage.local.get('articles');
    const count = articles.articles?.length || 0;
    document.getElementById('status').textContent = `已采集 ${count} 篇文章`;
    
    // 显示成功消息
    // alert('页面内容已添加到文章列表');
  } catch (error) {
    alert('抓取失败：' + error.message);
  }
});