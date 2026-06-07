import { loadSettings } from './config.js';

export async function summarizeArticles(articles) {
  const settings = loadSettings();
  const apiKey = settings.apiKey;
  const prompt = settings.summaryPrompt;

  if (!apiKey) {
    throw new Error('未配置 API Key');
  }

  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { text: JSON.stringify(articles, null, 2) }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
    }
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API 错误: ${response.status} ${errText}`);
  }

  const result = await response.json();
  if (result.candidates && result.candidates.length > 0) {
    return result.candidates[0].content.parts[0].text;
  }
  return "无总结结果";
}

export async function streamChatWithArticle(article, messages, onChunk, onError, onComplete) {
  const settings = loadSettings();
  const apiKey = settings.apiKey;

  if (!apiKey) {
    onError(new Error('未配置 API Key'));
    return;
  }

  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;

  // Provide the article as context using the top-level system_instruction field supported by Gemini API
  const systemInstruction = {
    parts: [
      { text: `请作为阅读助手回答问题。以下是当前文章的上下文内容：\n\n标题: ${article.title}\n链接: ${article.url}\n内容: ${article.content || article.textContent || '无内容'}` }
    ]
  };

  const payload = {
    system_instruction: systemInstruction,
    contents: messages,
    generationConfig: {
      temperature: 0.7,
    }
  };

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(new Error(`API 错误: ${response.status} ${errText}`));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let eventBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split('\\n');
      buffer = lines.pop(); // Keep the last incomplete line

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        if (line.endsWith('\\r')) {
          line = line.slice(0, -1);
        }

        if (line.startsWith('data: ')) {
          let dataContent = line.substring(6);
          if (dataContent === '[DONE]') {
            onComplete();
            return;
          }
          eventBuffer += dataContent;
        } else if (line.startsWith('data:')) {
          let dataContent = line.substring(5);
          if (dataContent === '[DONE]') {
            onComplete();
            return;
          }
          eventBuffer += dataContent;
        } else if (line.trim() === '') {
          // Empty line separates SSE events. 
          continue;
        } else {
          // If the line doesn't start with data: and is not empty, 
          // it is a continuation of a JSON string that contained a literal newline.
          eventBuffer += (eventBuffer ? '\\n' : '') + line;
        }

        if (eventBuffer.trim() !== '') {
          try {
            const data = JSON.parse(eventBuffer);
            // Parsed successfully, clear the buffer
            eventBuffer = '';

            if (data.error) {
              onError(new Error(`API返回错误: ${data.error.message}`));
              return;
            }
            
            if (data.candidates && data.candidates.length > 0) {
              const textChunk = data.candidates[0].content?.parts?.[0]?.text;
              if (textChunk) {
                onChunk(textChunk);
              }
            }
          } catch (e) {
            // Incomplete JSON, wait for the next chunk/line to accumulate
          }
        }
      }
    }
    
    // Process any remaining valid data
    if (eventBuffer.trim() !== '' && eventBuffer.trim() !== '[DONE]') {
      try {
        const data = JSON.parse(eventBuffer);
        if (data.error) {
          onError(new Error(`API返回错误: ${data.error.message}`));
          return;
        }
        if (data.candidates && data.candidates.length > 0) {
          const textChunk = data.candidates[0].content?.parts?.[0]?.text;
          if (textChunk) {
            onChunk(textChunk);
          }
        }
      } catch (e) {
        // Ignore final incomplete chunk
      }
    }
    onComplete();
  } catch (error) {
    onError(error);
  }
}
