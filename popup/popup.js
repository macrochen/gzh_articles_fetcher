function updateStatus() {
  chrome.storage.local.get('articles', (result) => {
    const count = result.articles?.length || 0;
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `已采集 ${count} 篇文章`;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateStatus();

  document.getElementById('openManager').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 抓取当前页面内容
  document.getElementById('fetchCurrent').addEventListener('click', async () => {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab) {
        throw new Error('无法获取当前标签页');
      }

      // 发送消息给 background script 进行处理
      chrome.runtime.sendMessage({
        type: 'FETCH_AND_SAVE',
        tab: tab
      });
      
      // 可以在这里给个简单的 UI 反馈，比如按钮变色，
      // 但实际的成功状态更新会通过 runtime 消息回来。
      
    } catch (error) {
      alert('发起抓取请求失败：' + error.message);
    }
  });
});

// 监听来自 background 的更新消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ARTICLES_UPDATED') {
    updateStatus();
  }
});
