# bin returns!

移动端 DeepSeek API 对话前端。Vite + 原生 ES Modules，部署到 GitHub Pages。

开发完成后必须更新 [codex.md](./codex.md) 并追加版本记录。

## 功能

- 本地对话、历史、收藏、重命名、删除、导出与系统分享。
- 流式回答、思考过程、文本附件。
- API Key、接口、模型、思考模式、系统提示词。
- 个性化、长期记忆、本机用量、通知、Artifact。
- 接入 zhishi 本地知识库（可选开启，按需注入相关事实）。开启后，匹配到的本地事实将随对话内容发送至 DeepSeek API，请确认你接受此行为。
- Artifact 支持 HTML、SVG、Markdown、JSON 的本地预览、编辑、版本、复制与下载。

## 开发

```bash
npm install
npm run dev
npm run build
npm run preview
```

推送到 `main` 后，GitHub Actions 会构建并部署到 Pages；发布后按 [QA.md](./QA.md) 完成手机端验收。

## 安全

API Key 仅保存在当前浏览器，不会提交到 GitHub 或导出文件。公开使用前需要后端或 Edge Function 代理。
