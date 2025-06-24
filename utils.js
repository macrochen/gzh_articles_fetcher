/** 
 * 专用于解析公众号文章的函数 
 * @param {HTMLDocument} doc - 需要解析的文档对象，通常是 document.cloneNode(true) 
 * @returns {object | null} - 返回一个与 Readability.parse() 结构相同的文章对象，或在解析失败时返回 null 
 */ 
function parseWeChatArticle(doc) { 
  // 1. 首先，使用 Readability.js 正常解析文章 
  const readableArticle = new Readability(doc).parse(); 

  // 如果 Readability 没有解析出任何内容，直接返回 null 
  if (!readableArticle) { 
    console.error("Readability 未能解析出文章内容。"); 
    return null; 
  } 

  // 2. 接着，从文档中提取公众号特有的作者和日期信息 
  // 注意：这里我们使用传入的 doc 对象来查找元素 
  const authorElement = doc.getElementById('profileBt'); 
  const dateElement = doc.getElementById('publish_time'); 

  // 获取文本内容，并做健壮性检查，如果元素不存在则返回空字符串 
  const author = authorElement ? authorElement.textContent.trim() : ''; 
  const rawDate = dateElement ? dateElement.textContent.trim() : ''; 

  // 3. 格式化日期 
  // 原始格式: "2025年06月18日 08:00" 
  // 目标格式: "2025-06-18" 
  let formattedDate = ''; 
  if (rawDate) { 
    // 使用替换方法将中文替换为连字符，并去除时间部分 
    formattedDate = rawDate.replace(/年|月/g, '-').replace(/日.*$/, '').trim(); 
  } 

  // 4. 组合新的标题 
  // 格式: YYYY-MM-DD-作者-原标题 
  let newTitle = readableArticle.title; // 默认使用原标题 
  const titleParts = []; 

  if (formattedDate) { 
    titleParts.push(formattedDate); 
  } 
  if (author) { 
    titleParts.push(author); 
  } 

  // 只有在找到了日期或作者时，才修改标题 
  if (titleParts.length > 0) { 
    newTitle = titleParts.join('-') + '-' + readableArticle.title; 
  } 

  // 5. 更新文章对象的标题并返回 
  readableArticle.title = newTitle; 

  // 如果您也想更新 byline 字段，可以加上这句 
  if (author) { 
    readableArticle.byline = author; 
  } 
  
  return readableArticle; 
} 

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseWeChatArticle };
} else if (typeof window !== 'undefined') {
  window.parseWeChatArticle = parseWeChatArticle;
}