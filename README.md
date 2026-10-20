# 英语复习

[打开网页](https://yhcfeel.github.io/english-review-pwa/)

React + TypeScript 静态 PWA。每轮先洗牌。点击中央文字或周围空白翻面；选择“认识 / 模糊 / 忘记”后前进。所有卡片达标后显示“重新复习”，开始全新一轮。关闭或刷新后继续本轮。

仅在设备 localStorage 中保存本轮队列、答题位置和内部巩固分数。没有账号、数据库、可见统计或云端同步。无法保存时仍能使用，但关闭后重新开始。

## 阅读配色

采用蓝绿分工：英文词头与例句目标词为深蓝 #2457A7，中文释义为深绿 #176B50，比喻关键短语为深橙 #9A4D0B。词头 26px，释义 18px，例句 17px，解释 15px，译文 14px；短屏使用紧凑字号，保留层级和一屏展示。

在每个 sense 中可选填 `exampleHighlights`（例句目标词或词组数组）与 `coreHighlights`（比喻关键短语数组）。填写实际出现在句中的形式，例如 `["desired"]`。没有例句高亮配置时按 term 的完整英文词匹配；比喻不配置则保持普通正文。所有文本均以纯文本显示，不执行 JSON 中的 HTML。

## 本轮巩固规则

- 首次“认识”：立即完成，不再进入本轮。
- 首次“模糊”：1 分；首次“忘记”：0 分。
- 后续“认识”：加 1 分；“模糊”：不变；“忘记”：减 1 分，最低 0。
- 达到 3 分：完成本轮。
- 未达标的“认识”或“模糊”：随机安排到约第 10～15 个后续展示位置。
- “忘记”：随机安排到约第 3～5 个后续展示位置。
- 按到期时间优先出题。多个词同时到期时逐个复习；剩余词不足时缩短间隔，只剩一个时可以直接再次出现。不用空白卡或等待计时凑间隔。
- 分数不展示、不跨轮继承。重新复习会全部归零，重新洗牌。
- 每次重现默认英文正面；按钮可在正反两面作答。
- 保留最初旧版进度时只保留位置，不把旧版“看过”当作已经掌握；新增卡片按词头迁移已有进度，仅把新增词加入待复习队列。

## 运行

需要 Node.js 22.12+。

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

开发模式不启用离线缓存；生产构建启用。GitHub Actions 自动使用仓库子路径；手动构建默认域名根目录，可通过 VITE_BASE_PATH 设置以 / 开始并结束的子路径。

## 更新词库

修改 `public/data/cards.json` 并提交到 main，GitHub Pages 自动部署。页面只从该 JSON 读取数据。新增卡片保留旧词的本轮分数、完成状态和当前位置；只修改释义或例句时继续当前进度。打开或刷新获取新词库，失败或格式无效时使用已缓存的有效版本。

推荐格式：

```json
[
  {
    "front": "thrill",
    "back": {
      "senses": [
        {
          "term": "thrill",
          "pos": "v.",
          "meaning": "使非常兴奋",
          "example": "The news thrilled her.",
          "translation": "这个消息让她非常兴奋。"
        },
        {
          "term": "thrilled",
          "pos": "adj.",
          "meaning": "非常兴奋的",
          "example": "She was thrilled with the result.",
          "translation": "她对这个结果欣喜不已。"
        }
      ]
    }
  }
]
```

每张最多 12 个用法；每种用法的 term、meaning、example 必填。pos 为词性，translation 为例句翻译；需要比喻讲解时可加 core 字符串。词头不能重复。先展示词头和核心理解，再同屏排列常见含义、例句及译文。按实际渲染高度测量：全部放得下则不分页，确实放不下才按完整用法分页；不截断例句。极小屏或超大系统字体下，单个用法过长时中央区域可滚动。

仍兼容最初的 `back.meaning / explanation / example / translation` 格式。当前数据同时保留该兼容字段，供升级前的离线客户端使用；新版优先显示 senses，不重复显示兼容字段。original 仅保留输入形式，不在复习界面显示。当前例句全部为自拟，并非原文章完整句子。

词头默认 lemma；检查常见名词、动词和形容词用法，每种都有独立翻译和例句。常见分词形容词与动词在同卡分别讲解；新版优先在同一卡片的一页内展示常见义项，不再为新增词拆补充卡；已有补充卡保留，避免破坏学习进度。单纯过去式或分词不强行编出独立形容词义。动词有必要时用短比喻连接含义；名词和形容词通常只列词性、翻译与例句。

## iPhone / iPad

Safari 打开 HTTPS 网址，分享 → 添加到主屏幕。首次联网访问待资源缓存完成后可离线使用；不保留装饰标识、标语或常驻状态文案。更新后若仍显示旧界面，联网刷新一次，必要时关闭页面后重开。

浏览器清除网站数据会同时清除离线缓存和本轮进度。普通局域网 HTTP 不能用于验证 iPhone 的 Service Worker。真实 iPhone/iPad 硬件测试尚未执行。

## 结构

- `src/main.tsx`：界面、读词库、本轮进度保存。
- `src/cards.mjs`：词库格式兼容与校验。
- `src/review.mjs`：巩固分数、重复队列、进度校验与恢复。
- `src/style.css`：紧凑布局、用法分页和中央区域溢出保护。
- `public/data/cards.json`：唯一词库。
- `scripts/`：构建离线 Service Worker。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署。

## 2026-10-15 每日队列

- 默认“最新加入”，也可选择“全部复习”；记住上次选择。最新批次取词库中最大的日期，不随零点自动清空。
- 今日输入 138 条，grocery / groceries 合并保留原始形式，得到 137 张词语卡；另加 5 张 be to do 语法卡，共 142 张。全部为 240 张。
- 本批与原有 98 张没有重复。旧词再次提交时，不新建总卡片，而是在该卡的 batches 加入 `{ "date": "YYYY-MM-DD", "repeat": true }`，该日最新队列保留它并显示黄色星标。
- 同日同词只保留一个批次记录。不同词形、词性先人工审查，不能把 anonymous / anonymity 等相关词机械合并。
- originals 保留用户输入形式；front 保持稳定，作为复习状态迁移的标识。仅同义的普通屈折形式合并，不随便删除分词形容词。
- 两个队列分别保存本轮位置和分数，切换不会清零。全部队列首次使用会迁移旧版进度。不同设备的 localStorage 仍不互通。
- 常见含义分别解释和配例句，spoil 含破坏、变质、宠坏、剧透四个用法；五类语法各含四组解释与例句，具体页数由可用空间决定。
- `src/queues.mjs` 管理队列选择与星标；`tests/queues.test.mjs` 覆盖导入完整性、重复旧词、进度迁移。

## 核心理解与同页阅读

所有多用法卡片均有 `back.core`，先说明中心概念及含义联系，再列各义项。不将记忆联想当作词源；联系不紧密的常见义项明确分支记忆。

`src/Answer.tsx` 使用与正文相同的宽度、字体测量标题和各组内容，`src/layout.mjs` 按完整用法装页。字号不为塞入更多内容而无限缩小。ResizeObserver 只观察容器和不可见的测量区域；组件卸载时清理。字体加载、横竖屏变化都会重新计算。

390×844：spoil 四义同屏，state 三义同屏；320×568：spoil 分两页。只在超过一页时显示翻页按钮。旧词库、队列、黄星和学习记录不变。

## 2026-10-16 词库追加

- 当日文件 110 条，保留每个原始词形，新增 105 张；diminished / diminish 合为一张并保留分词形容词用法。
- survey（Surveys）、worsen（worsens）、disorder 是重复旧词，进入当日队列并标黄星。
- So can... 对应今天已添加的语法卡，不创建副本，也不标作旧词。
- 最新队列 109 张，全部 346 张。之前的 10 月 15 日批次仍为 142 张。
- 新词都含核心理解、释义、例句；多义词按可用空间同屏展开，放不下再分页。
- public/data/imports/2026-10-16.json 记录输入词形、归并目标和本次统计。

## 2026-10-19 Mac 词表导入

- 使用 UTF-8、LF 换行的生词.txt；一行一个完整词或短语。world.txt 为 0 字节，跳过，不视为清空词库指令。
- 80 条输入，intimacy 在本批重复一次，归并后 79 张。新增 77 张，全部词库共 423 张。
- conducts → conduct；are coming up with other tweaks → come up with。两张旧卡加入当日队列并标黄星，分别补充传导用法和完整新例句。
- 原始词形记录在 originals 中；tinted、devoted、scheduled 等常见分词形容词保留。批次内重复不误标为重复旧词。
- public/data/imports/2026-10-19.json 保存原始条目映射、导入统计、空文件信息和术语核对来源。
- transmittance 的技术含义依据 [IUPAC Gold Book](https://goldbook.iupac.org/terms/view/T06484) 核对；其余例句均为配合学习自行编写，不冒充原文章完整句子。


## 2026-10-19 第二批：Downloads/word.txt

- 111 条输入，dub / dubbed 合并，最新队列独立为 110 张；新增 107 张，全部共 530 张。
- olfactory、resin、pigment（输入 pigments）是重复旧词，本批标黄星。前一份生词.txt 的 79 张继续保留在全部复习。
- encourag → encourage；pedestianise → pedestrianise；清除结尾句点及 catch up 的中文注释。原始内容保留在 originals 和导入报告中。
- 所有新增卡片含核心理解，常见多义分别配例句；should she ever move 解释为省略 if 的条件倒装。
- 批次可选 id 格式为日期加两位序号（2026-10-19-02），日期仍为实际导入日期。同日第二批独立存储学习进度，下一日期自动排在其后。旧批次无 id 时以 date 为键，兼容历史进度。
- public/data/imports/2026-10-19-02.json 保存逐条映射和统计。学习页显示“2026-10-19 · 第 2 批”。


## PWA 内检查更新

队列信息右侧提供“↻ 检查更新”：主动检查应用 Service Worker 和词库。词库变化通过原有进度迁移逻辑载入；无变化不重置当前卡片。应用新版本安装激活后自动重新载入。无需删除桌面图标或重新添加。

手动更新请求强制联网并验证格式，成功后写入离线缓存；失败保留现有词库和进度，并提示重试。普通打开仍支持离线缓存。检查过程有超时和重复点击保护，不清除 localStorage 或注销 Service Worker。

实现参考 [MDN ServiceWorkerRegistration.update](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update)。真实 iOS 主屏幕运行尚需设备验收。


## 2026-10-20 生词.txt

- 240 行输入归并为 235 张当日卡片；新增 233 张，全部共 763 张。
- instant、take off 为重复旧词，今日标黄星。合并 former、aquatic 的重复行，以及 optimized / optimise、scoured / scour、achievement / achievements；所有原始输入保留。
- omatose. 按疑似漏字修正为 comatose；jumble of unregulated 作为不完整片段解释，例句补名词。输入文件保持原样。
- 语法卡 be of + 名词、there is more to A than B 提供结构解释和多例句；arrest 补充骤停用法，train 保留长尾羽用法，cone 包含视锥细胞。
- 继续使用核心理解与自适应同页排版；前面所有批次保留。public/data/imports/2026-10-20.json 保存完整映射和统计。
- 术语核对参考 NEI 的视网膜／感光细胞资料、Merriam-Webster 的 conspecific / lability 词条、Cambridge 的 entropy 词条，链接记录在对应卡片 sources 中。例句为学习用途编写。
