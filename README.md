# 英语复习

[打开网页](https://yhcfeel.github.io/english-review-pwa/)

React + TypeScript 静态 PWA。每轮先洗牌。点击中央文字或周围空白翻面；选择“认识 / 模糊 / 忘记”后前进。所有卡片达标后显示“重新复习”，开始全新一轮。关闭或刷新后继续本轮。

仅在设备 localStorage 中保存本轮队列、答题位置和内部巩固分数。没有账号、数据库、可见统计或云端同步。无法保存时仍能使用，但关闭后重新开始。

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
- 保留最初旧版进度时只保留位置，不把旧版“看过”当作已经掌握；新增卡片导致词头列表改变时开始新轮。

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

修改 `public/data/cards.json` 并提交到 main，GitHub Pages 自动部署。页面只从该 JSON 读取数据。词头列表改变时开始新的一轮；只修改释义或例句时继续当前进度。打开或刷新获取新词库，失败或格式无效时使用已缓存的有效版本。

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

每张最多两种用法；每种用法的 term、meaning、example 必填。pos 为词性，translation 为例句翻译；需要比喻讲解时可加 core 字符串。词头不能重复。所有文本尽量短，保证一屏可读；当前 98 张均经过 320×568、375×667、390×844 的完整背面布局检查。任意长的新内容或系统超大字体需重新检查是否超出屏幕。

仍兼容最初的 `back.meaning / explanation / example / translation` 格式。当前数据同时保留该兼容字段，供升级前的离线客户端使用；新版优先显示 senses，不重复显示兼容字段。original 仅保留输入形式，不在复习界面显示。当前例句全部为自拟，并非原文章完整句子。

词头默认 lemma；检查常见名词、动词和形容词用法，每种都有独立翻译和例句。常见分词形容词与动词在同卡分别讲解；超过两种用法时另设词性补充卡，如 thrill (n.)。单纯过去式或分词不强行编出独立形容词义。动词有必要时用短比喻连接含义；名词和形容词通常只列词性、翻译与例句。

## iPhone / iPad

Safari 打开 HTTPS 网址，分享 → 添加到主屏幕。首次联网访问待资源缓存完成后可离线使用；不保留装饰标识、标语或常驻状态文案。更新后若仍显示旧界面，联网刷新一次，必要时关闭页面后重开。

浏览器清除网站数据会同时清除离线缓存和本轮进度。普通局域网 HTTP 不能用于验证 iPhone 的 Service Worker。真实 iPhone/iPad 硬件测试尚未执行。

## 结构

- `src/main.tsx`：界面、读词库、本轮进度保存。
- `src/cards.mjs`：词库格式兼容与校验。
- `src/review.mjs`：巩固分数、重复队列、进度校验与恢复。
- `src/style.css`：无滚动的紧凑布局。
- `public/data/cards.json`：唯一词库。
- `scripts/`：构建离线 Service Worker。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署。
