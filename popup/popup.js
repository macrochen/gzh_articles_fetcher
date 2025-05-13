document.getElementById('openManager').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// 显示当前状态
chrome.storage.local.get('articles', (result) => {
  const count = result.articles?.length || 0;
  document.getElementById('status').textContent = `已采集 ${count} 篇文章`;
});