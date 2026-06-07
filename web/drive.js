import { getAccessToken } from './googleAuth.js';
import { loadSettings } from './config.js';

async function getFileContentGlobally(token, fileName) {
  // Search for the file anywhere in Drive
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchResult = await searchResponse.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    const fileId = searchResult.files[0].id;
    const contentResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    try {
      const content = await contentResponse.json();
      return content;
    } catch (e) {
      console.error("Failed to parse JSON", e);
      return [];
    }
  }
  return null;
}

export async function fetchArticles() {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Fetch the file directly without caring about folders
  const articles = await getFileContentGlobally(token, 'articles_sync.json');
  if (!articles) {
    throw new Error('未在 Google Drive 中找到 articles_sync.json 文件');
  }

  return articles;
}
