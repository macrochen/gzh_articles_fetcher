import re

with open('/Users/shi/workspace/gzh_articles_fetcher/options/options.js', 'r') as f:
    content = f.read()

# 1. Update saveSettings
save_settings_old = """  const exportFormat = document.getElementById('exportFormat').value;

  await chrome.storage.local.set({
    geminiApiKey: apiKey,
    aiChatUrl: aiChatUrl,
    summaryPrompt: prompt,
    targetSites: targetSites,
    excludedAutoFetchUrls: excludedAutoFetchUrls,
    exportFormat: exportFormat,
  });"""

save_settings_new = """  const exportFormat = document.getElementById('exportFormat').value;
  const driveFolderName = document.getElementById('driveFolderName') ? document.getElementById('driveFolderName').value : 'gzh_articles';

  await chrome.storage.local.set({
    geminiApiKey: apiKey,
    aiChatUrl: aiChatUrl,
    summaryPrompt: prompt,
    targetSites: targetSites,
    excludedAutoFetchUrls: excludedAutoFetchUrls,
    exportFormat: exportFormat,
    driveFolderName: driveFolderName,
  });"""
content = content.replace(save_settings_old, save_settings_new)

# 2. Update loadSettings
load_settings_old = """    'excludedAutoFetchUrls',
    'exportFormat'
  ]);
  if (result.geminiApiKey) {"""

load_settings_new = """    'excludedAutoFetchUrls',
    'exportFormat',
    'driveFolderName'
  ]);
  if (result.geminiApiKey) {"""
content = content.replace(load_settings_old, load_settings_new)

load_settings_old_2 = """  if (result.exportFormat) {
    document.getElementById('exportFormat').value = result.exportFormat;
  }
}"""

load_settings_new_2 = """  if (result.exportFormat) {
    document.getElementById('exportFormat').value = result.exportFormat;
  }
  if (result.driveFolderName && document.getElementById('driveFolderName')) {
    document.getElementById('driveFolderName').value = result.driveFolderName;
  }
}"""
content = content.replace(load_settings_old_2, load_settings_new_2)

# 3. Replace exportToDrive completely with syncWithDrive
sync_with_drive_code = """// 与 Google Drive 同步文章
async function syncWithDrive() {
  try {
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
    loadingElement.innerHTML = '<p>正在与 Google Drive 同步文章，请稍候...</p><div class="loading-spinner"></div>';
    document.body.appendChild(loadingElement);

    const tokenObject = await chrome.identity.getAuthToken({ interactive: true });
    let accessToken = tokenObject?.token;
    if (!accessToken) {
      alert("获取 Access Token 失败，请重试。"); 
      loadingElement.remove();
      return;
    }

    const settings = await chrome.storage.local.get(['driveFolderName']);
    const folderName = settings.driveFolderName || 'gzh_articles';

    // 1. 获取本地文章
    const result = await chrome.storage.local.get('articles');
    let localArticles = result.articles || [];
    
    // 2. 获取远端文章
    const folderId = await getOrCreateFolder(accessToken, folderName);
    const remoteFile = await getFileFromFolder(accessToken, folderId, 'articles_sync.json');
    
    let remoteArticlesMap = new Map();
    let remoteFileId = null;
    
    if (remoteFile) {
      remoteFileId = remoteFile.id;
      if (remoteFile.content && Array.isArray(remoteFile.content)) {
        remoteFile.content.forEach(article => {
          remoteArticlesMap.set(article.url, article);
        });
      }
    }

    // 3. 执行合并逻辑
    let mergedArticles = [];
    let hasChanges = false;
    
    for (let localArticle of localArticles) {
      const url = localArticle.url;
      const remoteArticle = remoteArticlesMap.get(url);
      
      if (remoteArticle) {
        // 在远端也存在：以远端为准（保留外部应用的修改和新增的 AI 总结），更新本地文章内容
        mergedArticles.push({ ...localArticle, ...remoteArticle, driveSynced: true });
        hasChanges = true;
        remoteArticlesMap.delete(url); // 从 map 中移除，剩下的就是本地没有的
      } else {
        // 在远端不存在
        if (localArticle.driveSynced === true) {
          // 曾同步过但远端没了：外部应用删除了它。本地也删除（不加入 mergedArticles）
          hasChanges = true;
        } else {
          // driveSynced 为 false 或是新文章：本地刚抓取的新文章，追加
          mergedArticles.push({ ...localArticle, driveSynced: true });
          hasChanges = true;
        }
      }
    }
    
    // 对于远端存在，但本地不存在的文章 (还在 remoteArticlesMap 中的)
    // 意味着你在扩展中删除了它，直接丢弃（不加入 mergedArticles），下次同步就会从 Drive 删掉
    if (remoteArticlesMap.size > 0) {
        hasChanges = true;
    }

    // 4. 双向更新
    const fileContent = JSON.stringify(mergedArticles, null, 2);
    const metadata = {
        name: 'articles_sync.json',
        mimeType: 'application/json'
    };
    if (!remoteFileId) {
        metadata.parents = [folderId];
    }
    
    await uploadOrUpdateFile(accessToken, metadata, fileContent, remoteFileId);
    
    // 保存回本地
    await chrome.storage.local.set({ articles: mergedArticles });
    
    // 刷新页面文章列表
    loadArticles();
    
    alert('同步成功！');
  } catch (error) {
    console.error('同步失败:', error);
    alert('同步失败：' + (error.message || error));
  } finally {
    const loadingElement = document.getElementById('exportLoading');
    if (loadingElement) loadingElement.remove();
  }
}

// 获取指定文件夹内的文件内容
async function getFileFromFolder(token, folderId, fileName) {
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchResult = await searchResponse.json();
  if (searchResult.files && searchResult.files.length > 0) {
    const fileId = searchResult.files[0].id;
    // 获取文件内容
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    try {
      const content = await contentResponse.json();
      return { id: fileId, content: content };
    } catch (e) {
      return { id: fileId, content: [] };
    }
  }
  return null;
}

// 创建或更新文件
async function uploadOrUpdateFile(token, metadata, content, fileId) {
  const boundary = 'foo_bar_baz';
  const delimiter = '\\r\\n--' + boundary + '\\r\\n';
  const closeDelimiter = '\\r\\n--' + boundary + '--';
  
  const body = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\\r\\n\\r\\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: application/json; charset=UTF-8\\r\\n\\r\\n',
    content,
    closeDelimiter
  ].join('');

  const method = fileId ? 'PATCH' : 'POST';
  const url = fileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const response = await fetch(url, {
    method: method,
    headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: body
  });
  
  if (!response.ok) {
    let errorMessage = `上传失败: ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage += ` - ${JSON.stringify(errorJson)}`;
    } catch (e) {
      errorMessage += ` - ${await response.text()}`;
    }
    throw new Error(errorMessage);
  }
}
"""

content = re.sub(r'// 导出到 Google Drive.*?function createMultipartBody[^\}]+}', sync_with_drive_code, content, flags=re.DOTALL)

# Also remove old commented event listeners and add new one
content = re.sub(r"//\s*document\.getElementById\('exportToDrive'\)\.addEventListener\('click', exportToDrive\);", "", content)
content = re.sub(r"//\s*document\.getElementById\('saveSettings'\)\.addEventListener\('click', saveSettings\);", "", content)

# 4. Add the syncWithDrive event listener near exportSelectedToLocal
content = content.replace("document.getElementById('exportSelectedToLocal').addEventListener('click', exportSelectedToLocal);", "document.getElementById('syncToDrive').addEventListener('click', syncWithDrive);\n  document.getElementById('exportSelectedToLocal').addEventListener('click', exportSelectedToLocal);")

with open('/Users/shi/workspace/gzh_articles_fetcher/options/options.js', 'w') as f:
    f.write(content)
print("Updated options.js successfully.")
