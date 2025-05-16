// 提取文章信息
function extractArticleInfo() {
  // 等待文章内容加载完成
  const checkContent = setInterval(() => {
    const articleNode = document.querySelector('#js_content');
    
    if (articleNode) {
      clearInterval(checkContent);
      
      try {
        // 克隆文档以供 Readability 处理
        const documentClone = document.cloneNode(true);
        
        // 使用 Readability 解析内容
        const article = new Readability(documentClone).parse();
        
        if (!article) {
          throw new Error('无法提取页面内容');
        }
        
        // 准备要复制的文本
        const textToCopy = `标题：${article.title.trim()}\n来源：${window.location.href}\n\n${article.textContent.trim()}`;
        
        // 自动复制到剪贴板
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
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
          })
          .catch(error => {
            console.error('复制失败 - 文章标题:', article.title);
            console.error('错误详情:', error.name, error.message);
          });
        
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
      } catch (error) {
        console.error('提取文章失败:', error);
      }
    }
  }, 1000); // 每秒检查一次
  
  // 30秒后停止检查
  setTimeout(() => clearInterval(checkContent), 30000);
}

// 当页面加载完成后执行提取
window.addEventListener('load', extractArticleInfo);

// 添加消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchCurrentPage') {
    try {
      extractArticleInfo();
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true; // 保持消息通道开放以支持异步响应
  }
});