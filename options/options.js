// 全局变量声明 (如 currentChatArticle, chatHistory)
let currentChatArticle = null;
let chatHistory = [];

const DEFAULT_PRESET_PROMPTS = [
  {
    name: "科普[x]",
    prompt: "大白话科普一下:\n"
  },
  {
    name: "展开[x]",
    prompt: "对以下内容请用大白话展开说说:\n"
  },
  {
    name: "故事案例",
    prompt: `请你用大白话，给我讲讲文中主要有哪些有意思的故事或案例？这些故事或案例给我们带来了什么启发，或者教会了我们什么道理？ 语言要简单易懂，就像给朋友讲事情一样。`
  },
  {
    name: "数据专家",
    prompt: `请你充当数据提取专家，帮我从这篇文章中找出所有重要的数字、百分比、比例、金额、时间、数量等关键统计信息。

请以**以下规范的格式**，清晰地展示这些数据。

**输出格式规范：**

1.  **内容呈现：**
    *   每个数据点请采用**编号列表**（例如：1. 2. 3.）。
    *   每个编号点都应是**一句简洁精炼的描述**，直接包含原文中或总结出的数值信息及其紧密关联的上下文。
    *   请务必对句子中的**具体数值**进行**加粗字体**强调。

**示例格式（AI请严格按照以下格式输出）：**

1.  2023年第三季度市场调研报告显示，智能穿戴设备的季度采纳率同比增长了**25%**。

2.  根据公司2022年财报，当年研发部门在人工智能新应用上的投入达到了**5000万元**。

3.  一项针对小微企业的税收优惠政策，平均需要**3年**时间才能在当地经济中显现出显著的带动作用。`
  },
  {
    name: "金句大师",
    prompt: `我需要你从这篇文章中，找出那些让你眼前一亮、拍案叫绝的"思想火花"，也就是那些让人印象深刻的**金句和精彩观点**。

请你像一个宝藏猎人一样，找出那些文章的**"点睛之笔"**，它们可能是：
*   作者的独到见解，让人茅塞顿开。
*   一句言简意赅，却充满哲理的话。
*   对事物本质的深刻洞察。

请以**以下规范的格式**，清晰地展示这些"宝藏"。

**输出格式规范：**

1.  **内容呈现：**
    *   每个"思想火花"点请采用**编号列表**（例如：1. 2. 3.）。
    *   每个编号点都应包含以下两部分内容，并**清晰分行展示**：
        *   **第一行（核心内容）：** [此处直接是金句或概括的精彩观点。如果是**金句**，请**完整引用原文**；如果是**精彩观点**，请用**简洁大白话概括其核心思想**。请务必对该内容使用**加粗字体**强调。]
        *   **第二行（解读）：** [以"解读："开头，简要说明这个金句或观点为什么让你觉得精彩，或者它为何能成为"点睛之笔"，带来"眼前一亮"的感觉。]

**示例格式（AI请严格按照此格式输出）：**

1.  **真正的自由不是为所欲为，而是有所不为。**
    解读：这句金句颠覆了我们对自由的传统理解，指出真正的自由在于懂得取舍和自律，是更高层次的智慧，让人豁然开朗。

2.  **复杂问题的解决方案往往隐藏在被忽视的简单细节中。**
    解读：我们常倾向于寻找复杂的大方案，但这个观点提醒我们，真正的突破口可能在于那些我们习以为常、甚至觉得不重要的细节，让人觉得"原来如此"。

3.  **在信息过载的时代，学会遗忘比记忆更重要。**
    解读：这反直觉的观点强调了在海量信息中筛选和放弃的必要性，让人意识到"减法"思维在知识管理中的重要性，非常实用且具有启发性。`
  },
  {
    name: "Aha Moment",
    prompt: `请你仔细阅读这篇文章，帮我找出所有能让人产生"Aha Moment"感觉的观点或洞察。

这些观点就像是"点醒梦中人"一样，你可能以前没怎么想过，或者隐约觉得不对劲但没法清晰表达，直到文章里一语道破，让你瞬间豁然开朗、恍然大悟。它们通常具备以下特点：
出乎意料，却又在情理之中：乍听反常识，但仔细一想，逻辑严密，让人拍案叫绝。
一语道破本质：精准揭示了某个现象、问题或道理的底层逻辑，让人茅塞顿开。
提供了全新的理解框架：让你看待某个问题的方式彻底改变。
请务必用大白话来表达，就像给朋友分享一个让你醍醐灌顶的发现一样。

请以以下规范的格式，用大白话列出这些"Aha Moment"。

输出格式规范：

每个"Aha Moment"点请采用编号列表（例如：1. 2. 3.）。
每个编号点都应包含以下两部分内容，并清晰分行展示：
    核心观点： [用简洁精炼的语言概括该观点或洞察的核心内容。请直接点明主题，并使用加粗字体强调。]
    解读： [简要说明这个观点为什么能带来"Aha Moment"的感觉。具体解释它与我们通常的理解有何不同，或者它揭示了什么被忽略的真相，让你为何感到豁然开朗。这段话要通俗易懂，不冗长。]

示例格式（AI请严格按照此格式输出）：

1.  **真正的自由不是为所欲为，而是有所不为。**
    解读：我们常以为自由就是没有任何限制，想做什么就做什么。但这个观点让我意识到，真正的自由是自律和选择的艺术，是懂得放弃次要的、不健康的，从而专注于更重要的，这反而带来了更大的内心平静和自主性，而不是一味的放纵。

2.  **面对复杂问题，寻找简单答案往往是错的，而答案往往隐藏在看似简单的细节中。**
    解读：我们习惯性地追求复杂问题的"银弹"式简单解决方案。这个观点提醒我，真正的智慧在于认识到复杂性，并从那些容易被忽视的、看似不起眼的细节中，抽丝剥茧地发现解决之道，这颠覆了我们对"简单"和"复杂"的直觉认知。`
  },
  {
    name: "故事高手",
    prompt: `请你像一个绘声绘色的讲故事的人一样，用大白话给我总结这篇文章。
文章里提到了哪些具体的故事或案例？ 请你把它们讲得活灵活现、有画面感，就像你亲身经历过一样，又像是我们坐在炉边听你娓娓道来一样，而不是枯燥地罗列，要让听的人觉得这些事很有趣，忍不住想听下去。
这些故事或案例给我们带来了什么启发，或者教会了我们什么道理？ 同样用大白话，说得透彻又引人深思，不要太说教，就像朋友之间真心分享感悟一样。`
  },
  {
    name: "评论家",
    prompt: `请你扮演一位资深的时事评论员，用你最犀利但又不失理性的眼光，对这篇文章进行一番深度剖析。请你像用手术刀一样精准地剥开文章的表层，不带任何感情色彩和个人偏好，只基于事实和逻辑来评论。

你的评论将分为两大部分，但都要确保语言是最接地气的大白话，像在跟街坊邻居聊天一样，让没有专业背景的人也能听懂、听明白你的高见。

**输出格式规范：**

1.  请将评论分为两大部分，并使用以下二级标题（\`##\`）进行区分。
2.  每一部分下的具体评论点请采用**编号列表**（例如：1. 2. 3.）进行呈现。

**示例格式（AI请严格按照此格式输出）：**

1.  这篇文章的核心观点是[文章的核心论点，用大白话概括]。从逻辑上看，它在[某个方面]说得很有道理，有[具体数据/事实]支撑。但同时，它在[另一个方面]的论证可能不够充分，或者对[某个复杂问题]的看法显得有些过于简化。

2.  文章在探讨[某个现象]时，独到之处在于它从[一个新颖的视角]切入，这是很多人没想到的。但它似乎遗漏了[一个关键的社会群体/背景因素]的影响，这让它的分析显得不够全面。

3.  这篇文章的亮点在于[某个深刻的洞察或启发性观点]，它能引发读者对[某个社会问题]的深入思考。然而，不足之处在于，它在[某个结论]的推导过程中，可能存在一些逻辑跳跃，或者论据的代表性稍显不足。

4.  对于普通大众来说，这篇文章最大的意义在于它能帮助我们[理解某个现象/避免某个误区]，提醒我们在[某个方面]要保持警惕或采取行动。但也要注意，不要被文章中的[某个情绪化描述/绝对化言论]所误导，要独立思考。

## 二、对文中主要人物/观点的评论

1.  文中提到的[主要人物或观点提出者A]的观点是[其核心观点]。从其背后逻辑来看，这可能反映了[某种立场或利益考量]。该观点在[某个具体方面]是站得住脚的，但它在[另一个方面]可能存在局限性，甚至与[其他公认事实]有些许自相矛盾。

2.  [主要人物或观点提出者B]的行为[具体行为描述]，表面上看可能是[某种表象]，但深层动机可能在于[其真正的目的或考量]，并非一时兴起。这种行为对文章主题[某个事件]产生了[积极/消极]的影响，因为它[具体说明如何影响]。

3.  从[主要人物或观点提出者C]的观点/行为中，我们能得到一个重要的警示：在[某个领域]做判断或采取行动时，必须[具体警示内容]，否则可能会导致[不良后果]。同时，也启发我们思考[某个深层次的问题]。`
  },
  {
    name: "全文总结",
    prompt: `总结内容要求：
- 快速提炼核心观点
- 保留关键细节
- 口语化表达
- 根据文章类型调整侧重点
- 对疑问句标题直接回答`
  }
];


const DEFAULT_SUMMARY_PROMPT = `# 任务目标
你需要扮演一个既能高效处理信息，又能把重点讲得清楚、具体、让人记得住，同时具备基本批判性思考能力的批量总结助手。请根据我提供的 JSON 格式文档，按顺序处理其中的每篇文章。

你的核心目标有三个：
1. 让我能快速浏览，迅速抓住最重要的信息
2. 让我看完后脑子里能留下具体东西，而不是看完跟没看一样
3. 在最后帮我冷静地审视作者的观点，看看哪些地方说得好，哪些地方可能站不住

请始终优先做到：
- 少而精
- 不重复
- 有重点
- 有记忆点
- 忠于原文
- 有判断力，但不乱发挥

# 输入格式
我的文档结构是 JSON 格式，每篇文章是一个 JSON 对象，包含以下字段：
- \`title\`：文章标题
- \`url\`：文章链接
- \`content\`：文章主要内容

你需要按顺序处理 JSON 中的每篇文章。

# 主要任务：文章总结与处理

请用简体中文大白话总结给定内容。对于需要总结的文章（非软文、非内容无法总结的情况），请按下面结构输出：

## 1. 推荐指数
基于文章的信息量、启发性、论证质量和阅读价值，给出 1 到 5 星的推荐评级，用 ⭐️ 表示，并附上一句精炼、口语化的推荐语。

评分标准：
- 1 到 2 星：价值较低，信息少、废话多、启发弱，或论证明显单薄
- 3 星：中规中矩，有一些内容，但亮点有限，或观点有启发但支撑一般
- 4 星：很有价值，值得一读，有收获，重点清楚，论证基本站得住
- 5 星：非常值得读，信息密度高，启发强，论证扎实，读完能留下明显印象

## 2. 这篇最值得知道的内容
这一部分是全文最核心的总结区域，必须优先服务于“快速浏览”和“留下印象”。

请严格遵守这些要求：
1. 只输出最重要的 3 到 5 条，宁少勿滥
2. 每条只说一次，不重复，不换说法再说一遍
3. 每条先讲清“重点是什么”，再带一个最值得记住的钩子
4. 钩子只保留一个，优先从数据、例子、金句、反常识细节里选最有记忆点的那个
5. 钩子必须服务于理解重点，不能为了显得生动而塞无关细节
6. 不要导语，不要结尾，不要总分总
7. 不要解释文章结构，不要评价有没有主线
8. 不要空话，不要套话，不要把具体内容压成抽象词
9. 不要按原文顺序机械复述，要按“读者最该先知道什么”排序
10. 如果是杂谈、时评、热点评论，就按最值得看的几个话题归并，不要写成流水账
11. 每条控制在 2 到 4 句，短而有信息量
12. 如果某条没有值得保留的记忆点，宁可不要，也不要凑一个假钩子

写的时候注意：
- 每条都要让我同时获得两样东西：这条到底在说什么；我之后最可能记住什么
- 重点比钩子更重要，不能为了细节牺牲清晰度
- 没有信息量的“总结腔”直接删掉
- 目标不是完整复述原文，而是快速抓住重点，并且脑子里能留下具体东西

## 3. 关键细节
这一部分不要把上面的要点重说一遍，也不要重复展开同样的信息。

它的作用只有一个：
补充 1 到 3 个最值得单独拎出来的具体细节，让文章更有画面感、更容易记住。

请严格遵守：
1. 只写前面“这篇最值得知道的内容”里已经提到但值得展开一点点的细节
2. 不要新增一堆次要信息
3. 不要把同一重点完整再讲一遍
4. 每条细节都要具体，优先保留故事、场景、例子、数字、冲突感
5. 风格可以更口语化、更有画面感，但不能虚构
6. 如果前面的要点已经足够清楚，没必要硬写这一部分，可以只保留 1 条，甚至省略到最短

## 4. 深度解读
这一部分要同时做到两件事：
1. 用朋友聊天的大白话，说出这篇文章真正值得想一层的地方
2. 对作者的观点做适度的批判性审视，判断它哪里有价值，哪里可能有问题

请围绕下面几个方向，挑最值得写的 1 到 3 点：
- 这件事背后的逻辑是什么
- 作者真正想提醒人的地方是什么
- 哪个判断最有启发
- 哪个地方容易被忽略
- 作者的论证是否充分
- 作者有没有把“观点”说得像“事实”
- 作者依赖了哪些前提或默认假设
- 作者有没有遗漏重要反例、限制条件或另一种解释
- 这篇文章为什么值得读，或者为什么只能当作一种看法来参考

批判性思考时请严格遵守：
1. 先理解作者，再评价作者，不要歪曲原意
2. 批判的重点放在论证质量、证据强弱、假设前提、视角局限上
3. 可以指出作者说得不够完整、不够严谨、跳步太快、证据不足、以偏概全、情绪重于分析等问题
4. 如果作者的观点本来就很扎实，也要明确说清它扎实在哪里，不要硬挑刺
5. 不要为了显得聪明而过度抬杠
6. 不要擅自引入原文完全没提到的大量外部信息
7. 语气要冷静、克制、客观，像在帮我拆解观点，不像在吵架
8. 控制篇幅，不要啰嗦，不要空泛升华，不要说教
9. 如果原文主要是信息整理、新闻汇总或经验分享，没有很强的论证链条，就不要硬做高强度批判，只需提醒“哪些部分是事实，哪些部分是作者判断”即可

## 5. 最终判断
请用 1 到 2 句话，给出你对这篇文章的最终判断，格式尽量接近下面这种感觉：
- “这篇值得看，主要值在……，但要防着作者把……说得太满。”
- “这篇信息有用，但更像观点表达，结论可以参考，别全盘照收。”
- “这篇最强的是……，最弱的是……。”

要求：
1. 一句话说清这篇文章到底值不值得看
2. 一句话点出它最强和最弱的地方
3. 语气干脆，别绕

# 类型适配要求
请根据文章类型调整表达重点，但始终保持通俗、具体、易懂：

- 财经/商业：优先抓趋势、判断、利益变化、关键数字、现实影响，同时留意作者是否把趋势判断说得过满
- 健康/医学：优先抓结论、适用场景、风险提醒、科学依据，同时留意证据等级、样本范围、适用边界
- 科技/AI：优先抓核心变化、真正有用的判断、典型案例、实际影响，同时留意作者是否高估技术能力或低估落地难度
- 生活/观点文：优先抓最有共鸣的观察、最打动人的细节、最能引发思考的一点，同时留意作者是否把个人经验泛化成普遍规律
- 时评/热点/杂谈：优先抓最值得知道的话题、最刺眼的判断、最能让人记住的细节，不要写成新闻流水账，同时留意作者是否情绪先行、论证滞后

# 风格要求
1. 整体语言要像朋友聊天，口语化，有亲和力，但别油腻
2. 要讲人话，简单清楚，不堆术语
3. 允许适度生动，但不能为了好看而歪曲原文
4. 忠于原文，不能虚构、不能篡改、不能把作者没说的话硬塞进去
5. 总结的目标是帮我省时间，也帮我提高判断质量
6. 批判性思考要有分寸，重点是帮我看清文章，不是单纯挑毛病

# 软文识别与处理
如果识别出文章主要目的是推广产品、课程或服务，也就是软文，请使用以下固定格式，且无需评分、无需总结：

[软文识别] 此内容可能为推广信息，核心价值较低。

# 内容无法总结处理
如果文章 \`content\` 字段为空、内容完全是乱码、或内容过短、信息量过低，无法进行有意义的总结，请使用以下固定格式，且无需评分、无需总结：

[内容无法总结] 原文内容不足或无法有效解析。

# 编号要求
为每篇文章分配一个从 1 开始的顺序编号，方便后续提问。

# Markdown 要求
1. 生成内容前，请检查 Markdown 语法
2. 确保粗体标记前后有空格
3. 标题行必须使用 Markdown 链接格式输出，将文章标题作为可点击文本，链接地址使用对应文章的 \`url\` 字段

标题格式必须为：
[编号] [《标题》](url)

# 输出格式示例

对于普通文章：

[1] [《文章标题示例》](https://example.com/article)

**推荐指数**：⭐️⭐️⭐️⭐️☆（有料，也有判断，但个别地方说得有点满。）

**这篇最值得知道的内容**
1. ...
2. ...
3. ...

**关键细节**
- ...
- ...

**深度解读**
1. ...
2. ...

**最终判断**
这篇值得看，主要值在……，但要防着作者把……说得太满。

对于软文：

[2] [《另一篇文章标题》](https://example.com/article)
[软文识别] 此内容可能为推广信息，核心价值较低。

对于内容无法总结的文章：

[3] [《内容无法总结的文章标题》](https://example.com/article)
[内容无法总结] 原文内容不足或无法有效解析。`

// 函数定义区域
// (确保 saveSettings 和 loadSettings 在这里定义)
async function saveSettings() {
  const apiKey = document.getElementById('geminiApiKey').value;
  const aiChatUrl = document.getElementById('aiChatUrl').value;
  const prompt = document.getElementById('summaryPrompt').value;
  const targetSites = document.getElementById('targetSites').value;
  const excludedAutoFetchUrls = document.getElementById('excludedAutoFetchUrls').value;
  const exportFormat = document.getElementById('exportFormat').value;

  await chrome.storage.local.set({
    geminiApiKey: apiKey,
    aiChatUrl: aiChatUrl,
    summaryPrompt: prompt,
    targetSites: targetSites,
    excludedAutoFetchUrls: excludedAutoFetchUrls,
    exportFormat: exportFormat,
  });

  alert('设置已保存！');
}



async function loadSettings() {
  const result = await chrome.storage.local.get([
    'geminiApiKey',
    'aiChatUrl',
    'summaryPrompt',
    'targetSites',
    'excludedAutoFetchUrls',
    'exportFormat'
  ]);
  if (result.geminiApiKey) {
    document.getElementById('geminiApiKey').value = result.geminiApiKey;
  }
  if (result.aiChatUrl) {
    document.getElementById('aiChatUrl').value = result.aiChatUrl;
  }
  // 如果没有保存的提示词，使用默认值
  document.getElementById('summaryPrompt').value = result.summaryPrompt || DEFAULT_SUMMARY_PROMPT;
  if (result.targetSites) {
    document.getElementById('targetSites').value = result.targetSites;
  }
  if (result.excludedAutoFetchUrls) {
    document.getElementById('excludedAutoFetchUrls').value = result.excludedAutoFetchUrls;
  }
  if (result.exportFormat) {
    document.getElementById('exportFormat').value = result.exportFormat;
  }
}

// 添加恢复默认设置的函数
async function resetAllSettings() {
  document.getElementById('summaryPrompt').value = DEFAULT_SUMMARY_PROMPT;
  
  await chrome.storage.local.set({ 
    presetPrompts: DEFAULT_PRESET_PROMPTS,
  });
  
  loadPresetPrompts();
  
  alert('设置已恢复为默认值！');
}

// 加载文章列表
async function loadArticles() {
  const result = await chrome.storage.local.get(['articles', 'geminiApiKey', 'summaryPrompt']);
  const articles = result.articles || [];
  const apiKey = result.geminiApiKey;
  const summaryPrompt = result.summaryPrompt;
  const listElement = document.getElementById('articlesList');
  const listTitleElement = document.getElementById('articles-list-title');

  if (listTitleElement) {
    listTitleElement.textContent = `文章列表 (${articles.length})`;
  }

  if (articles.length === 0) {
    listElement.innerHTML = '<p>暂无文章，请先通过插件抓取。</p>';
    return;
  }

  const local_result = await chrome.storage.local.get('latestSummary');
  if (local_result.latestSummary) {
    // 显示最新的总结
    updateArticleSummaries(local_result.latestSummary);
  }


  listElement.innerHTML = articles.map(article => `
    <div class="article-item collapsed">
      <div class="article-header">
        <input type="checkbox" class="article-checkbox" data-title="${article.title.replaceAll('"', '&quot;')}">
        <div class="title-container">
          <h3 class="article-title">
            <a href="${article.url}" target="_blank" title="${article.title}">${article.title}</a>
          </h3>
          <button class="chat-button" data-title="${article.title.replaceAll('"', '&quot;')}">对话</button>
        </div>
      </div>
    </div>
  `).join('');

  // 更新下拉列表
  const dropdown = document.getElementById('articleDropdown');
  dropdown.innerHTML = '<option value="">-- 选择文章开始对话 --</option>' + 
  articles.map(article => 
      `<option value="${article.title.replaceAll('"', '&quot;')}">${article.title}</option>`
    ).join('');
  
  // 添加下拉列表事件监听
  dropdown.addEventListener('change', function() {
    if (this.value) {
      startChatWithArticle(this.value);
    }
  });

  // 添加对话按钮的事件监听
  document.querySelectorAll('.chat-button').forEach(button => {
    button.addEventListener('click', function() {
      const title = this.dataset.title;
      // 设置下拉框选中该文章
      const dropdown = document.getElementById('articleDropdown');
      dropdown.value = title;
      // 开始对话
      startChatWithArticle(title);
    });
  });

  
}

function clearChatArea() {
  const chatHistoryElement = document.getElementById('chatHistory');
  
  chatHistoryElement.innerHTML = '';
  
  document.getElementById('chatInput').value = '';
  currentChatArticle = null;
  chatHistory = [];
}

// 开始与文章对话
async function startChatWithArticle(title) {
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || [];
  const article = articles.find(a => a.title === title);

  if (!article) {
    alert('未找到文章！');
    return;
  }

  // 清理聊天历史
  currentChatArticle = article;
  chatHistory = [];
  
  // 清理聊天界面
  const chatHistoryElement = document.getElementById('chatHistory');
  chatHistoryElement.innerHTML = '';
  
  // 聚焦到输入框
  document.getElementById('chatInput').focus();
}

// 发送聊天消息
async function sendChatMessage() {
  const inputElement = document.getElementById('chatInput');
  const messageText = inputElement.value.trim(); 

  if (!messageText) return;

  if (!currentChatArticle) {
    alert('请先从左侧选择一篇文章开始对话。');
    return;
  }

  const settings = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = settings.geminiApiKey;

  if (!apiKey) {
    alert('请先在设置中填写 Gemini API Key！');
    return;
  }

  appendMessageToChatHistory(messageText, 'user');
  inputElement.value = ''; // 清空输入框
  
  // 新增：清除所有预设提示词tag的选择状态
  const tags = document.querySelectorAll('#presetPromptsContainer .prompt-tag');
  tags.forEach(tag => {
    tag.classList.remove('selected');
  });

  // 构建发送给 Gemini 的上下文
  // 可以包含之前的聊天记录和当前文章内容
  let conversationContext = `这是关于文章《${currentChatArticle.title}》的对话。文章URL: ${currentChatArticle.url}\n文章内容: ${currentChatArticle.textContent}\n\n`;
  
  // 添加最近的几条聊天记录到上下文中，以保持对话连贯性
  // Gemini API 对上下文长度有限制，这里简单取最后几条
  const recentHistory = chatHistory.slice(-5); // 取最近5条对话（用户+Gemini）
  recentHistory.forEach(msg => {
    conversationContext += `${msg.sender === 'user' ? '用户' : 'Gemini'}: ${msg.text}\n`;
  });
  conversationContext += `用户: ${messageText}\nGemini:`; // 提示模型继续回答


  // 3. 为 AI 的回复创建一个DOM占位符，并获取它
  // 传递一个空文本，让 appendMessageToChatHistory 创建结构
  const aiMessageElement = appendMessageToChatHistory("▌", 'gemini');
  // 初始时，让内容部分显示一个光标或者加载中的提示
  const aiMessageContentElement = aiMessageElement.querySelector('.message-content');
  if (aiMessageContentElement) {
      aiMessageContentElement.innerHTML = marked.parse("▌"); // 使用 marked.parse 来确保和后续更新一致
  }


  try {
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
    const requestBody = {
      contents: [{ parts: [{ text: conversationContext }] }],
      generationConfig: {
        "temperature": 0.3,
        "topK": 30,
        "topP": 0.7,
        // "maxOutputTokens": 50000
      }
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let accumulatedMarkdown = ""; // 用于累积AI回复的原始Markdown文本

    // 在开始接收流之前，清除占位符的初始内容 (比如光标)
    if (aiMessageContentElement) {
        aiMessageContentElement.innerHTML = '';
    }

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.substring(5));
              if (jsonData.candidates?.[0]?.content?.parts?.[0]?.text) {
                const textPart = jsonData.candidates[0].content.parts[0].text;
                accumulatedMarkdown += textPart;

                // 更新AI消息占位符的innerHTML
                if (aiMessageContentElement) {
                  aiMessageContentElement.innerHTML = marked.parse(accumulatedMarkdown + "▌"); // 添加一个闪烁的光标效果
                }
                // 滚动到底部
                const chatHistoryElement = document.getElementById('chatHistory');
                chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight;
              }
            } catch (e) {
              // console.warn('Failed to parse JSON chunk or update UI:', line, e);
            }
          }
        }
      }
    }

    // 流式结束后，移除末尾的光标，并更新最终的HTML
    if (aiMessageContentElement) {
        aiMessageContentElement.innerHTML = marked.parse(accumulatedMarkdown);
        // 更新存储的原始 Markdown 文本
        aiMessageElement.dataset.markdownContent = accumulatedMarkdown;
        // 滚动到 AI 回答的开头位置
        aiMessageElement.scrollIntoView({ behavior: 'smooth' });
    }


  } catch (error) {
    console.error('调用 Gemini API 进行流式对话失败:', error);
    // 更新AI消息占位符为错误信息
    if (aiMessageContentElement) {
      const tempDiv = document.createElement('div');
      tempDiv.textContent = `抱歉，与 Gemini 对话时发生错误: ${error.message}`;
      aiMessageContentElement.innerHTML = tempDiv.innerHTML.replace(/\n/g, '<br>');
    } else { // 如果aiMessageContentElement也找不到了，就用老方法追加错误
        appendMessageToChatHistory(`抱歉，与 Gemini 对话时发生错误: ${error.message}`, 'error');
    }
    // 存储错误信息到历史
    if (window.chatHistory) {
        window.chatHistory.push({ sender: 'error', text: `抱歉，与 Gemini 对话时发生错误: ${error.message}` });
    }
  }
}

/**
 * 将消息追加到聊天记录 (div#chatHistory) 中。
 * @param {string} text - 消息文本 (如果是AI消息，则为已转换为HTML的Markdown)
 * @param {string} sender - 发送者 ('user', 'gemini', 'system', 'error')
 */
function appendMessageToChatHistory(text, sender) {
  const chatHistoryElement = document.getElementById('chatHistory');

  // 创建消息元素
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', sender);

  const senderLabel = sender === 'user' ? '我' :
                     sender === 'gemini' ? 'AI' :
                     sender === 'system' ? '系统' : '错误';

  const senderContent = document.createElement('div');
  senderContent.classList.add('sender-content');
  senderContent.innerHTML = "<strong>" + senderLabel + "</strong>："; // 直接设置发送者标签
  
  messageElement.appendChild(senderContent);

  const messageContent = document.createElement('div');
  messageContent.classList.add('message-content');
  messageContent.innerHTML = marked.parse(text);
  messageElement.appendChild(messageContent);

  // 为用户消息添加展开/收起按钮
  if (sender === 'user' && (text.length > 100 || text.includes('\n'))) { // 消息长度超过100或包含换行符时添加按钮
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '展开';
    toggleButton.classList.add('toggle-button');
    toggleButton.addEventListener('click', () => {
      const content = messageElement.querySelector('.message-content');
      content.classList.toggle('expanded');
      toggleButton.textContent = content.classList.contains('expanded') ? '收起' : '展开';
    });
    messageElement.appendChild(toggleButton);
  }

  // 为AI消息添加复制按钮
  if (sender === 'gemini') {
    const copyMarkdownButton = document.createElement('button');
    copyMarkdownButton.innerHTML = '<img src="../assets/icons/copy.svg" alt="复制Markdown" style="vertical-align: middle;">';
    copyMarkdownButton.title = '复制Markdown';
    copyMarkdownButton.style.cssText = 'background: none; border: none; cursor: pointer; padding: 2px 8px; margin-left: 8px;';
    
    const copyPlainButton = document.createElement('button');
    copyPlainButton.innerHTML = '<img src="../assets/icons/clipboard.svg" alt="复制纯文本" style="vertical-align: middle;">';
    copyPlainButton.title = '复制纯文本';
    copyPlainButton.style.cssText = 'background: none; border: none; cursor: pointer; padding: 2px 8px; margin-left: 8px;';
    
    // 存储原始的 Markdown 文本，用于复制
    messageElement.dataset.markdownContent = text;
    
    copyMarkdownButton.addEventListener('click', () => {
      // 使用存储的原始 Markdown 文本进行复制
      navigator.clipboard.writeText(messageElement.dataset.markdownContent).then(() => {
        const originalHtml = copyMarkdownButton.innerHTML;
        copyMarkdownButton.innerHTML = '<span style="color: #008000;">已复制！</span>';
        setTimeout(() => {
          copyMarkdownButton.innerHTML = '<img src="../assets/icons/copy.svg" alt="复制Markdown" style="vertical-align: middle;">';
        }, 2000);
      });
    });

    copyPlainButton.addEventListener('click', () => {
      // 提取标题和纯文本内容
      const title = currentChatArticle ? currentChatArticle.title : '';
      const tempDiv = document.createElement('div');
      // 使用存储的原始 Markdown 文本进行解析
      tempDiv.innerHTML = marked.parse(messageElement.dataset.markdownContent);
      let plainText = title ? `${title}\n${currentChatArticle.url}\n\n${tempDiv.textContent}` : tempDiv.textContent;
      plainText = plainText.replace(/▌/g, '');
      
      navigator.clipboard.writeText(plainText).then(() => {
        const originalHtml = copyPlainButton.innerHTML;
        copyPlainButton.innerHTML = '<span style="color: #008000;">已复制！</span>';
        setTimeout(() => {
          copyPlainButton.innerHTML = '<img src="../assets/icons/clipboard.svg" alt="复制纯文本" style="vertical-align: middle;">';
        }, 2000);
      });
    });
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end'; // 将按钮容器推到右边
    buttonContainer.style.marginTop = '10px'; // 在消息内容和按钮之间添加一些间距
    buttonContainer.appendChild(copyMarkdownButton);
    buttonContainer.appendChild(copyPlainButton);
    messageElement.appendChild(buttonContainer); // 将按钮容器添加到消息元素的末尾
  }
  
  chatHistoryElement.appendChild(messageElement);
  
  if (sender === 'gemini') {
    // AI 回答完成后，自动滚动到该消息的开头位置
    messageElement.scrollIntoView({ behavior: 'smooth' });
  } else {
    // 其他消息保持原有的滚动到底部行为
    chatHistoryElement.scrollTop = chatHistoryElement.scrollHeight;
  }

  return messageElement;
}

// 导出到本地文件
async function exportSelectedToLocal() {
  const selectedArticles = await getSelectedArticlesFromSelection();
  if (!selectedArticles) {
    return;
  }

  const result = await chrome.storage.local.get(['articles', 'exportFormat']);
  const exportFormat = result.exportFormat || 'json';

  if (selectedArticles.length === 0) {
    alert('没有可导出的文章！');
    return;
  }

  let fileContent = '';
  let mimeType = 'application/json';
  let extension = 'json';

  if (exportFormat === 'txt') {
    fileContent = selectedArticles.map(article => 
      `标题: ${article.title}\n链接: ${article.url}\n\n${article.textContent}\n\n` + 
      `--------------------------------------------------\n\n`
    ).join('');
    mimeType = 'text/plain';
    extension = 'txt';
  } else if (exportFormat === 'md') {
    fileContent = selectedArticles.map(article => 
      `# ${article.title}\n\n原文链接: [${article.title}](${article.url})\n\n${article.textContent}\n\n` + 
      `---\n\n`
    ).join('');
    mimeType = 'text/plain'; // Markdown is text/plain or text/markdown
    extension = 'md';
  } else {
    // Default to JSON
    const jsonArticles = selectedArticles.map(article => ({
      title: article.title,
      url: article.url,
      content: article.content || article.textContent
    }));
    fileContent = JSON.stringify(jsonArticles, null, 2);
    mimeType = 'application/json';
    extension = 'json';
  }

  // 确定文件名
  let filename = `articles_${new Date().toISOString().split('T')[0]}`;
  if (selectedArticles.length > 0 && selectedArticles[0].title) {
    // 使用第一篇文章的标题，并去除非法字符
    filename = selectedArticles[0].title.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
    // 限制长度
    if (filename.length > 100) {
      filename = filename.substring(0, 100);
    }
  }

  // 创建Blob对象
  const blob = new Blob([fileContent], { type: mimeType });

  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;

  // 触发下载
  document.body.appendChild(a);
  a.click();

  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function getSelectedArticlesFromSelection() {
  const checkboxes = document.querySelectorAll('.article-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请至少选择一篇文章');
    return null;
  }

  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || [];

  return articles.filter(article =>
    Array.from(checkboxes).some(cb => cb.dataset.title === article.title)
  );
}

function buildSelectedArticlesPayload(selectedArticles) {
  return JSON.stringify({
    articles: selectedArticles.map(article => ({
      title: article.title,
      url: article.url,
      content: article.textContent,
    }))
  }, null, 2);
}

async function sendSelectedToAiChat() {
  const aiChatUrl = document.getElementById('aiChatUrl').value.trim();
  if (!aiChatUrl) {
    alert('请先在设置中填写 AI Chat URL');
    return;
  }

  const selectedArticles = await getSelectedArticlesFromSelection();
  if (!selectedArticles) {
    return;
  }

  const payload = buildSelectedArticlesPayload(selectedArticles);

  try {
    await navigator.clipboard.writeText(payload);
    await chrome.storage.local.set({
      pendingAiChatPayload: {
        text: payload,
        targetUrl: aiChatUrl,
        createdAt: Date.now(),
      }
    });
    await chrome.tabs.create({ url: aiChatUrl });
    alert('已复制文章内容并打开 AI Chat 页面。如未自动填入，可直接粘贴。');
  } catch (error) {
    console.error('发送到 AI Chat 失败:', error);
    alert('发送到 AI Chat 失败：' + error.message);
  }
}

// 导出到 Google Drive (保持大部分不变，但确保文章数据是最新的)
async function exportToDrive() {
  try {
    // 创建并显示加载指示器
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
    loadingElement.innerHTML = '<p>正在导出文章到Google Drive...</p><div class="loading-spinner"></div>';
    document.body.appendChild(loadingElement);

    const tokenObject = await chrome.identity.getAuthToken({ interactive: true });
    let accessToken = tokenObject?.token;
    if (!accessToken) {
      alert("获取 Access Token 失败，请重试。"); 
      loadingElement.remove();
      return;
    }

    const settings = await chrome.storage.local.get(['geminiApiKey', 'summaryPrompt']);
    const apiKey = settings.geminiApiKey;
    const summaryPrompt = settings.summaryPrompt;

    if (!apiKey || !summaryPrompt) {
      alert('请先在设置中填写 Gemini API Key 和总结提示词！');
      return;
    }

    const result = await chrome.storage.local.get('articles');
    const articles = result.articles || [];
    
    if (articles.length === 0) {
      alert('没有可导出的文章');
      return;
    }
    
    const folderId = await getOrCreateFolder(accessToken, 'gzh');
    
    const today = new Date();
    const formattedDate = `${(today.getMonth()+1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}${today.getHours().toString().padStart(2, '0')}${today.getMinutes().toString().padStart(2, '0')}${today.getSeconds().toString().padStart(2, '0')}`;
    const jsonData = articles.map(article => ({
      title: article.title,
      url: article.url,
      content: article.content,
    }));

    const fileContent = JSON.stringify(jsonData, null, 2);
    const metadata = {
        name: `文章汇总_${formattedDate}.json`,
        parents: [folderId],
        mimeType: 'application/json'
      };
    
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: createMultipartBodyWithFormData(metadata, fileContent)
    });
    
    if (response.ok) {
        alert('导出成功！');
      } else {
        let errorMessage = `上传失败: ${response.status} ${response.statusText}`;
        try {
          const errorJson = await response.json();
          errorMessage += ` - ${JSON.stringify(errorJson)}`;
        } catch (e) {
          const errorText = await response.text();
          errorMessage += ` - ${errorText}`;
        }
        throw new Error(errorMessage);
      }
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败：' + (error.message || error));
  } finally {
    // 无论成功或失败，都移除加载指示器
    const loadingElement = document.getElementById('exportLoading');
    if (loadingElement) loadingElement.remove();
  }
}


// 获取或创建文件夹
async function getOrCreateFolder(token, folderName) {
  // 首先查找是否已存在同名文件夹
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  const searchResult = await searchResponse.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }
  
  // 如果不存在，创建新文件夹
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  const folder = await createResponse.json();
  return folder.id;
}

function createMultipartBodyWithFormData(metadata, content) {
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' }));
    formData.append('file', new Blob([content], { type: 'text/plain' }), 'content.txt'); // 文件名可以随意
    return formData;
  }
  

// 创建多部分请求体
function createMultipartBody(metadata, content) {
  const boundary = 'foo_bar_baz';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelimiter = '\r\n--' + boundary + '--';
  
  const body = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: text/plain\r\n\r\n',
    content,
    closeDelimiter
  ].join('');
  
  return body;
}

// 绑定保存设置按钮事件
// document.getElementById('saveSettings').addEventListener('click', saveSettings);
// 绑定导出按钮事件
// document.getElementById('exportToDrive').addEventListener('click', exportToDrive);


function toggleSettings(header) {
  const section = header.closest('.settings-section');
  section.classList.toggle('collapsed');
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings(); // 先加载设置
  loadArticles(); // 然后加载文章，这样可以立即尝试生成总结
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  // document.getElementById('exportToDrive').addEventListener('click', exportToDrive);
  document.getElementById('exportSelectedToLocal').addEventListener('click', exportSelectedToLocal);
  document.getElementById('importFromLocal').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', importFromLocal);
  document.getElementById('sendChatMessage').addEventListener('click', sendChatMessage);
  
  document.getElementById('scrollToOperation').addEventListener('click', () => {
    const settingsSection = document.querySelector('.actions');
    if (settingsSection) {
      const elementRect = settingsSection.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.scrollY;
      const viewportCenter = window.innerHeight / 2;
      const offset = viewportCenter - (elementRect.height / 2) - (window.innerHeight * 0.25); // Increased adjustment for more visible "above center"
      const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          const offset = (sidebar.clientHeight - elementRect.height) / 2;
          const targetScrollTop = elementRect.top - sidebar.getBoundingClientRect().top + sidebar.scrollTop - offset;
            sidebar.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
        }
    }
  });

  // 监听选中文本事件
  document.addEventListener('mouseup', function() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      // 如果有选中的文本，就复制到剪贴板
      navigator.clipboard.writeText(selectedText).then(() => {
        // 可以添加一个临时的提示，显示复制成功
        const notification = document.createElement('div');
        notification.textContent = '已复制';
        notification.style.position = 'fixed';
        notification.style.left = '50%';
        notification.style.top = '50%';
        notification.style.transform = 'translate(-50%, -50%)';
        notification.style.padding = '8px 12px';
        notification.style.background = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = 'white';
        notification.style.borderRadius = '4px';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '9999';
        
        document.body.appendChild(notification);
        
        // 1秒后移除提示
        setTimeout(() => {
          notification.remove();
        }, 1000);
      });
    }
  });
  
  // 添加选择最近N篇文章的功能
  document.getElementById('selectLastNButton').addEventListener('click', function() {
    // 先取消所有选中状态
    document.querySelectorAll('.article-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });

    // 获取所有文章的复选框
    const checkboxes = Array.from(document.querySelectorAll('.article-checkbox'));

    // 获取用户输入的数量
    const n = parseInt(document.getElementById('selectLastNInput').value, 10) || 0;

    // 选中最后N篇文章
    if (n > 0) {
      checkboxes.slice(-n).forEach(checkbox => {
        checkbox.checked = true;
      });
    }
  });

  document.getElementById('copyToClipboard').addEventListener('click', async function() {
    const selectedArticles = await getSelectedArticlesFromSelection();
    if (!selectedArticles) {
      return;
    }

    try {
      await navigator.clipboard.writeText(buildSelectedArticlesPayload(selectedArticles));
      alert('已成功将选中的文章以JSON格式复制到剪贴板');
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      alert('复制到剪贴板失败，请重试');
    }
  });
  

  // 允许按 Enter 键发送消息
  document.getElementById('chatInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter 用于换行
      e.preventDefault(); // 阻止默认的 Enter 行为 (如换行)
      sendChatMessage();
    }
  });

  // 添加设置区域的折叠/展开功能
  const settingsHeader = document.querySelector('.settings-header');
  if (settingsHeader) {
    settingsHeader.addEventListener('click', function() {
      const section = this.closest('.settings-section');
      section.classList.toggle('collapsed');
    });
  }

  document.getElementById('summarizeSelected').addEventListener('click', summarizeSelectedArticles);
  document.getElementById('sendToAiChat').addEventListener('click', sendSelectedToAiChat);


  // 绑定全选功能
  // 全选按钮状态
  let isAllSelected = false;
  document.getElementById('selectAll').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.article-checkbox');
    isAllSelected = !isAllSelected;
    checkboxes.forEach(cb => cb.checked = isAllSelected);
  });

  // 绑定删除选中按钮
  document.getElementById('deleteSelected').addEventListener('click', deleteSelectedArticles);

  const presetContainer = document.getElementById('presetPromptsContainer');
  presetContainer.addEventListener('click', async function(event) {
    if (event.target.classList.contains('prompt-tag')) {
      const clickedTag = event.target;
      
      // Toggle selection
      clickedTag.classList.toggle('selected');
      
      const chatInput = document.getElementById('chatInput');
      const selectedTags = this.querySelectorAll('.prompt-tag.selected');
      
      const prompts = Array.from(selectedTags).map(tag => tag.dataset.prompt);
      
      // Special handling for "[x]" prompts
      if (selectedTags.length === 1 && clickedTag.textContent.includes('[x]')) {
        try {
          const clipboardText = await navigator.clipboard.readText();
          chatInput.value = `${clickedTag.dataset.prompt}${clipboardText}`;
        } catch (err) {
          chatInput.value = clickedTag.dataset.prompt;
        }
      } else {
        chatInput.value = prompts.join('\n');
      }
      
      chatInput.focus();
    }
  });


  // 添加恢复默认设置按钮的事件监听
  document.getElementById('resetAllSettings').addEventListener('click', resetAllSettings);


  // 加载预设提示词
  loadPresetPrompts();

  // 添加编辑预设提示词按钮事件监听
  document.getElementById('editPresetPrompts').addEventListener('click', editPresetPrompts);
  
  // 添加预设提示词选择事件
  document.querySelectorAll('#presetPrompts').forEach(selector => {
    selector.addEventListener('change', function() {
      if (this.value) {
        // 根据所在区域决定填充到哪个输入框
        if (this.closest('.chat-input')) {
          document.getElementById('chatInput').value = this.value;
        } else {
          document.getElementById('summaryPrompt').value = this.value;
        }
        this.value = ''; // 重置选择
      }
    });
  });
  
});

function scrollToActionsCenter() {
  const actionsSection = document.querySelector('.actions');
  const sidebar = document.querySelector('.sidebar');
  if (actionsSection && sidebar) {
    const offset = (sidebar.clientHeight - actionsSection.clientHeight) / 2;
    
    sidebar.scrollTo({
      top: actionsSection.offsetTop - sidebar.offsetTop - offset,
      behavior: 'smooth'
    });
  }
}

async function deleteSelectedArticles() {
  const checkboxes = document.querySelectorAll('.article-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请至少选择一篇文章');
    return;
  }

  if (!confirm('确定要删除选中的文章吗？')) {
    return;
  }

  const result = await chrome.storage.local.get('articles');
  let articles = result.articles || [];
  
  // 获取要删除的文章标题
  const titlesToDelete = Array.from(checkboxes).map(cb => cb.dataset.title);
  
  // 过滤掉要删除的文章
  articles = articles.filter(article => !titlesToDelete.includes(article.title));
  
  // 保存更新后的文章列表
  await chrome.storage.local.set({ articles });
  
  // 更新文章对话下拉列表
  const dropdown = document.getElementById('articleDropdown');
  dropdown.innerHTML = '<option value="">-- 选择文章开始对话 --</option>' + 
    articles.map(article => 
      `<option value="${article.title.replaceAll('"', '&quot;')}">${article.title}</option>`
    ).join('');
  
  // 如果当前正在对话的文章被删除，清理对话区域
  if (currentChatArticle && titlesToDelete.includes(currentChatArticle.title)) {
    clearChatArea();
  }
  
  // 重新加载文章列表
  await loadArticles();

  // After reloading, scroll the actions area to the center
  setTimeout(scrollToActionsCenter, 100);
}

// 创建加载提示
function createLoadingIndicator() {
  const loadingElement = document.createElement('div');
  loadingElement.id = 'summaryLoading';
  loadingElement.style.position = 'fixed';
  loadingElement.style.top = '50%';
  loadingElement.style.left = '50%';
  loadingElement.style.transform = 'translate(-50%, -50%)';
  loadingElement.style.padding = '20px';
  loadingElement.style.background = 'white';
  loadingElement.style.borderRadius = '5px';
  loadingElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  loadingElement.style.zIndex = '1000';
  loadingElement.innerHTML = '<p>正在批量总结中，请稍候...</p><div class="loading-spinner"></div>';
  document.body.appendChild(loadingElement);
  return loadingElement;
}

// 准备要总结的文章数据
function prepareSelectedArticles(checkboxes, articles) {
  return Array.from(checkboxes).map(checkbox => {
    const title = checkbox.dataset.title;
    const article = articles.find(a => a.title === title);
    return article ? { title: article.title, textContent: article.textContent } : null;
  }).filter(Boolean);
}

// 调用批量总结API
async function callBatchSummaryAPI(apiKey, summaryPrompt, selectedArticles) {
  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const requestBody = {
    contents: [{
      parts: [{
        text: `请以Markdown格式返回以下内容的总结:\n\n${JSON.stringify(selectedArticles)}\n\n总结要求:${summaryPrompt}`
      }]
    }],
    // 可以添加 generationConfig 等参数控制输出
    generationConfig: {
      "temperature": 0.3,
      "topK": 30,
      "topP": 0.7,
      // "maxOutputTokens": 500000
    }
  
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/plain' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status}`);
  }

  const data = await response.json();
  // 直接返回 API 响应的文本内容
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}


// 更新文章总结
async function updateArticleSummaries(summaries) {
  // 先移除旧的总结结果
  const oldSummary = document.querySelector('.summary-results');
  if (oldSummary) {
    oldSummary.remove();
  }

  // 创建总结结果显示区域
  const summaryResults = document.createElement('div');
  summaryResults.className = 'summary-results';
  summaryResults.innerHTML = '<h3>批量总结结果</h3>';

  // 预处理：提取真正的Markdown内容（处理有代码块和无代码块两种情况）
  let markdownContent = summaries;
  
  // 尝试匹配代码块格式
  const codeBlockMatch = summaries.match(/```markdown\n([\s\S]*?)\n```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    markdownContent = codeBlockMatch[1];
  }

  // 将 Markdown 转换为 HTML 并添加到结果区域
  const summaryContent = document.createElement('div');
  summaryContent.className = 'summary-content';
  
  // 先转换Markdown为HTML
  let processedHTML = marked.parse(markdownContent);
  
  // 获取当前选中的文章标题列表
  const result = await chrome.storage.local.get('articles');
  const articles = result.articles || [];
  
  // 遍历选中的文章标题，在总结内容中查找并添加链接和对话按钮
  for (const article of articles) {
    const fullTitle = article.title;
    const url = article.url;
    // 兼容总结服务可能只返回核心标题的情况，提取最后一个'-'之后的部分作为核心标题
    const coreTitle = fullTitle.substring(fullTitle.lastIndexOf('-') + 1).trim();

    // 优先尝试匹配完整标题，如果找不到，再尝试匹配核心标题
    let titleToSearch = fullTitle;
    let titleLength = fullTitle.length;
    let titleIndex = processedHTML.indexOf(fullTitle);

    if (titleIndex === -1 && coreTitle) {
      titleToSearch = coreTitle;
      titleLength = coreTitle.length;
      titleIndex = processedHTML.indexOf(coreTitle);
    }

    if (titleIndex !== -1) {
      // 添加链接和对话按钮（如果还没有添加过）
      // 增加检查范围，防止误判
      if (!processedHTML.slice(Math.max(0, titleIndex - 150), titleIndex).includes('chat-button')) {
        const buttonHTML = `<button class="chat-button" style="font-size: 10px; padding: 1px 6px; margin-left: 4px;" data-title="${fullTitle.replaceAll('"', '&quot;')}">对话</button>`;
        
        // 检查标题后面是否有书名号
        const endBracketIndex = processedHTML.indexOf('》', titleIndex + titleLength);
        const insertButtonIndex = endBracketIndex !== -1 ? endBracketIndex + 1 : titleIndex + titleLength;
        
        // 保持原有内容的顺序，用完整标题创建链接，替换掉原文中的标题（无论是完整版还是核心版）
        processedHTML = processedHTML.slice(0, titleIndex) + 
                       `<a href="${url}" target="_blank" title="${fullTitle}">${fullTitle}</a>` + 
                       processedHTML.slice(titleIndex + titleLength, insertButtonIndex) + 
                       buttonHTML + 
                       processedHTML.slice(insertButtonIndex);
      }
    }
  }
  
  summaryContent.innerHTML = processedHTML;
  
  // 为新添加的对话按钮绑定事件监听器
  summaryContent.querySelectorAll('.chat-button').forEach(button => {
    button.addEventListener('click', function() {
      const title = this.dataset.title;
      // 设置下拉框选中该文章
      const dropdown = document.getElementById('articleDropdown');
      dropdown.value = title;
      // 开始对话
      startChatWithArticle(title);
    });
  });
  
  summaryResults.appendChild(summaryContent);

  // 将总结结果插入到操作按钮区域下方
  const buttonArea = document.querySelector('.actions'); // 修改为匹配实际的类名
  if (buttonArea) {
    buttonArea.insertAdjacentElement('afterend', summaryResults);
  } else {
    document.body.appendChild(summaryResults);
  }

  // 将总结内容保存到本地存储
  await chrome.storage.local.set({ latestSummary: summaries });
}

// 添加批量总结函数
async function summarizeSelectedArticles() {
  const checkboxes = document.querySelectorAll('.article-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('请先选择要总结的文章');
    return;
  }

  const loadingElement = createLoadingIndicator();

  try {
    const settings = await chrome.storage.local.get(['geminiApiKey', 'summaryPrompt']);
    const apiKey = settings.geminiApiKey;
    const summaryPrompt = settings.summaryPrompt;
    // const summaryPrompt = `
    // 您将收到一个JSON数组，每个元素包含 "title" 和 "textContent" 字段。请为每篇文章生成总结，并返回一个严格符合以下格式的JSON数组，除了总结内容外，不要包含任何额外的文本或解释。

    // 要求：
    // 1.  输出必须是严格有效的JSON格式，结构与输入完全一致。
    // 2.  每篇文章的总结必须包含在 "content" 字段中。
    // 3.  总结语言为简体中文，使用口语化表达。
    // 4.  保留关键细节，总结长度控制在原文の 30% 以内。
    // 5.  对于软文，直接在 "content" 字段中标记为 "软文"。

    // 示例输入格式：
    // [{"title": "文章标题", "textContent": "文章内容..."}]

    // 示例输出格式：
    // [
    //   {"title": "文章标题1", "content": "总结内容1"},
    //   {"title": "文章标题2", "content": "总结内容2"},
    //   ...
    // ]

    // 总结内容要求：
    // -   快速提炼核心观点。
    // -   保留关键细节。
    // -   使用口语化表达。
    // -   根据文章类型调整总结侧重点。
    // -   对于疑问句标题，直接从文章内容中回答问题。
    // -   明确标注软文。
    // `;

    if (!apiKey || !summaryPrompt) {
      alert('请先在设置中填写 Gemini API Key 和总结提示词！');
      return;
    }

    const result = await chrome.storage.local.get('articles');
    const articles = result.articles || [];
    
    // 准备要总结的文章数据
    const selectedArticles = prepareSelectedArticles(checkboxes, articles);
    const summaries = await callBatchSummaryAPI(settings.geminiApiKey, settings.summaryPrompt, selectedArticles);
    
    await updateArticleSummaries(summaries);
    alert('批量总结完成！');
  } catch (error) {
    console.error('批量总结失败:', error);
    alert(`批量总结失败: ${error.message}`);
  } finally {
    document.body.removeChild(loadingElement);
  }
}

// 加载预设提示词到下拉菜单
async function loadPresetPrompts() {
  const result = await chrome.storage.local.get('presetPrompts');
  let presetPrompts = result.presetPrompts || DEFAULT_PRESET_PROMPTS;
  
  // 更新预设提示词容器
  const presetContainer = document.getElementById('presetPromptsContainer');
  presetContainer.innerHTML = ''; // 清空容器

  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'prompt-tags-container';
  presetContainer.appendChild(tagsContainer);

  presetPrompts.forEach(preset => {
    const tag = document.createElement('div');
    tag.className = 'prompt-tag';
    tag.textContent = preset.name;
    tag.dataset.prompt = preset.prompt;
    tagsContainer.appendChild(tag);
  });
}

// 编辑预设提示词功能
function editPresetPrompts() {
  // 获取当前预设提示词
  chrome.storage.local.get('presetPrompts', async (result) => {
    let presetPrompts = result.presetPrompts || DEFAULT_PRESET_PROMPTS;
    
    // 创建编辑对话框
    const dialog = document.createElement('div');
    dialog.className = 'preset-dialog';
    dialog.innerHTML = `
      <div class="preset-dialog-content">
        <h2>编辑预设提示词</h2>
        <div id="presetEntries"></div>
        <div class="preset-actions">
          <button id="addPreset">添加预设</button>
          <div class="preset-dialog-buttons">
            <button id="savePresets">保存</button>
            <button id="cancelEdit">取消</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    // 添加ESC键监听
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        closeDialog();
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // 关闭对话框函数
    function closeDialog() {
      document.removeEventListener('keydown', handleEsc);
      dialog.remove();
      style.remove();
    }
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .preset-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .preset-dialog-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .preset-entry {
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 15px;
      }
      .preset-entry input, .preset-entry textarea {
        width: 100%;
        margin-top: 5px;
        padding: 8px;
        box-sizing: border-box;
      }
      .preset-entry textarea {
        height: 100px;
      }
      .preset-actions {
        margin-top: 20px;
        display: flex;
        justify-content: space-between;
      }
      .preset-dialog-buttons {
        display: flex;
        gap: 10px;
      }
      .preset-entry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .delete-preset {
        color: red;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
    
    // 渲染预设条目
    const presetEntriesContainer = document.getElementById('presetEntries');
    function renderPresetEntries() {
      presetEntriesContainer.innerHTML = '';
      
      // 使用数组的forEach来保持顺序
      presetPrompts.forEach(preset => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'preset-entry';
        entryDiv.innerHTML = `
          <div class="preset-entry-header">
            <label>预设名称:</label>
            <span class="delete-preset" data-name="${preset.name}">删除</span>
          </div>
          <input type="text" class="preset-name" value="${preset.name}">
          <label>提示词内容:</label>
          <textarea class="preset-content">${preset.prompt}</textarea>
        `;
        presetEntriesContainer.appendChild(entryDiv);
      });
      
      // 添加删除事件监听
      document.querySelectorAll('.delete-preset').forEach(btn => {
        btn.addEventListener('click', function() {
          const nameToDelete = btn.getAttribute('data-name');
          presetPrompts = presetPrompts.filter(preset => preset.name !== nameToDelete);
          renderPresetEntries();
        });
      });
    }
    
    renderPresetEntries();
    
    // 添加新预设
    document.getElementById('addPreset').addEventListener('click', () => {
      const newName = `预设 ${presetPrompts.length + 1}`;
      // 添加到数组末尾
      presetPrompts.push({
        name: newName,
        prompt: "请输入提示词内容"
      });
      renderPresetEntries();
    });
    
    // 保存预设
    document.getElementById('savePresets').addEventListener('click', () => {
      const entries = document.querySelectorAll('.preset-entry');
      const newPresets = [];
      
      // 保持DOM中的顺序
      entries.forEach(entry => {
        const name = entry.querySelector('.preset-name').value.trim();
        const content = entry.querySelector('.preset-content').value.trim();
        
        if (name && content) {
          newPresets.push({
            name: name,
            prompt: content
          });
        }
      });
      
      chrome.storage.local.set({ presetPrompts: newPresets }, () => {
        loadPresetPrompts(); // 重新加载预设
        closeDialog();
        alert('预设提示词已保存！');
      });
    });
    
    // 取消编辑
    document.getElementById('cancelEdit').addEventListener('click', closeDialog);
  });
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ARTICLES_UPDATED') {
    loadArticles();
  }
});

// 导入本地文件
async function importFromLocal(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      const importedArticles = importedData.articles || importedData;

      if (!Array.isArray(importedArticles)) {
        throw new Error("无效的文件格式：JSON不是一个数组。");
      }

      const result = await chrome.storage.local.get('articles');
      let existingArticles = result.articles || [];
      const existingTitles = new Set(existingArticles.map(a => a.title));

      const newArticles = importedArticles.filter(importedArticle =>
        importedArticle.title && !existingTitles.has(importedArticle.title)
      );

      if (newArticles.length > 0) {
        const updatedArticles = [...existingArticles, ...newArticles];
        await chrome.storage.local.set({ articles: updatedArticles });
        loadArticles();
        alert(`${newArticles.length}篇文章导入成功！`);
      } else {
        alert('没有新文章可导入，可能文章已存在或文件格式不正确。');
      }
    } catch (error) {
      alert(`导入失败: ${error.message}`);
      console.error('导入错误:', error);
    } finally {
        event.target.value = '';
    }
  };
  reader.readAsText(file);
}
