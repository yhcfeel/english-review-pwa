# 英语复习

React + TypeScript + Vite 静态 PWA。打开即随机抽卡，轻点卡片翻面，下一张重新随机抽取并避免紧邻重复。只有一张卡时仍可正常复习。无账号、数据库、统计或学习状态保存。

## 本地运行

需要 Node.js 22.12+（或 20.19+）。

```sh
npm install
npm run dev
```

## 构建和离线预览

```sh
npm run test
npm run build
npm run preview
```

`dist/` 是完整静态网站。Service Worker 只在生产构建中启用。默认部署到域名根目录；GitHub Actions 自动使用仓库子路径。手动构建子路径版本时设置 VITE_BASE_PATH=/english-review-pwa/。不支持直接双击 HTML。

## 更新词库

GitHub Pages 更新方式：编辑仓库中的 `public/data/cards.json` 并提交到 main，Actions 自动部署；无需修改其他代码。网址：https://yhcfeel.github.io/english-review-pwa/ 。GitHub Pages 上词库地址为 /english-review-pwa/data/cards.json。源码与词库均公开。

开发时替换 `public/data/cards.json`；已部署时直接替换站点的 `/data/cards.json`（对应 `dist/data/cards.json`），不需要重新打包 JavaScript。所有卡片只来自这个 JSON。

```json
[
  {
    "front": "gain access to care",
    "back": {
      "meaning": "获得医疗服务的机会",
      "explanation": "access 强调获得某种资源的渠道，而不是简单进入。",
      "example": "Many people struggle to gain access to healthcare."
    }
  }
]
```

四个必填字段均为非空字符串，至少一张卡；不要写 JSON 注释或尾随逗号。可选 `back.translation` 和 `back.note` 分别显示例句翻译和补充。自带 94 张既有词库卡片，例句全部为自拟，已在补充中标明。

页面每次打开或刷新都联网请求最新版词库；已打开的复习会话保持稳定，不中途换卡。成功校验后更新离线缓存，网络失败、超时或新版 JSON 无效时继续使用上次有效版本。若替换后没更新，检查静态托管商的 CDN 缓存并刷新页面；建议 `/data/cards.json` 设置 `Cache-Control: no-cache`，`/sw.js` 设置 `Cache-Control: no-cache`。

## iPhone / iPad

在 Safari 打开已部署的 HTTPS 地址，分享 → 添加到主屏幕 → 添加，然后从图标启动。首次联网打开并等待底部出现“词库已备好，离线也能读”后，可断网重新打开。普通局域网 HTTP 地址可预览页面，但不能在 iPhone 上验证 Service Worker；localhost 安全例外仅适用于该设备自身。

离线缓存由浏览器管理，清除网站数据或系统回收缓存后需要重新联网。应用不上传任何学习记录；静态文件托管只负责提供网页与词库，不涉及云端保存用户数据。尚未进行真实 iPhone/iPad 硬件测试。

## 文件结构

- `src/main.tsx`：复习界面和读取词库。
- `src/cards.mjs`：数据校验与随机抽取。
- `src/style.css`：移动端样式、安全区域与大字体。
- `public/data/cards.json`：唯一词库。
- `public/manifest.webmanifest`、`public/icons/`：安装信息和图标。
- `scripts/`：构建时生成带版本的离线 Service Worker。

参考：[Vite 静态部署](https://vite.dev/guide/static-deploy.html)、[Apple WebKit 主屏幕 Web App](https://webkit.org/blog/13878/)。
