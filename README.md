# 英语复习

[打开网页](https://yhcfeel.github.io/english-review-pwa/)

React + TypeScript 静态 PWA。每轮把全部卡片洗牌，每张只出现一次；点击翻面，下一张前进；最后一张点击“完成本轮”，再用“重新复习”开启新的一轮。关闭或刷新后继续本轮，完成状态也会保留。

仅在设备 localStorage 中保存本轮顺序和当前位置。无账号、数据库、学习统计、熟悉度或云端同步。无法保存时仍能使用，但关闭后重新开始。

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

每张最多两种用法；每种用法的 term、meaning、example 必填。pos 为词性，translation 为例句翻译；需要比喻讲解时可加 core 字符串。词头不能重复。所有文本尽量短，保证一屏可读；当前 94 张均经过 320×568、375×667、390×844 的完整背面布局检查。任意长的新内容或系统超大字体需重新检查是否超出屏幕。

仍兼容最初的 `back.meaning / explanation / example / translation` 格式。当前数据同时保留该兼容字段，供升级前的离线客户端使用；新版优先显示 senses，不重复显示兼容字段。original 仅保留输入形式，不在复习界面显示。当前例句全部为自拟，并非原文章完整句子。

词头默认 lemma；常见分词形容词与动词在同卡分别讲解。单纯过去式或分词不强行编出独立形容词义。动词有必要时用短比喻连接含义；名词和形容词通常只列词性、翻译与例句。

## iPhone / iPad

Safari 打开 HTTPS 网址，分享 → 添加到主屏幕。首次联网访问待资源缓存完成后可离线使用；不保留装饰标识、标语或常驻状态文案。更新后若仍显示旧界面，联网刷新一次，必要时关闭页面后重开。

浏览器清除网站数据会同时清除离线缓存和本轮进度。普通局域网 HTTP 不能用于验证 iPhone 的 Service Worker。真实 iPhone/iPad 硬件测试尚未执行。

## 结构

- `src/main.tsx`：界面、读词库、本轮进度保存。
- `src/cards.mjs`：格式兼容、洗牌、进度校验与恢复。
- `src/style.css`：无滚动的紧凑布局。
- `public/data/cards.json`：唯一词库。
- `scripts/`：构建离线 Service Worker。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署。
