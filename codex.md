# ggg Codex

开发完成后更新本文，并在末尾追加版本记录。

## 项目

- 仓库：`dagasolo138-lgtm/ggg`
- 技术：Vite + 原生 ES Modules + CSS
- 部署：GitHub Pages
- 数据：当前浏览器 `localStorage` / `sessionStorage`
- 结构：纯前端；无账号、后端、云同步或 OAuth。

## 启动与模块

```text
index.html → src/main.js → src/app/createConversationApp.js
```

- `api/deepseek.js`：流式 API。
- `features/conversations/`：对话、本地历史、顶部操作。
- `features/settings/`：设置、个性化、记忆、导出。
- `features/attachments/`：文本附件。
- `features/artifacts/`：代码块识别、本地作品库、预览与版本。
- `ui/layout.js`：页面 DOM；`ui/messages.js`：消息渲染。
- `state/settings.js`：API 设置。

## 数据与边界

- 对话：`bin-conversations-v1`
- 设置：`bin-deepseek-*`
- 偏好与记忆：`bin-app-preferences-v1`
- 用量：`bin-usage-v1`
- Artifact：`bin-artifacts-v1`
- 导出会省略 API Key。清空本地数据会删除上述数据。
- Artifact HTML/SVG 必须继续在 sandbox iframe 中预览。

## 维护约束

- 先读取当前 `main` 和文件 SHA，再修改已有文件。
- 每次改动后运行 `npm install`、`npm run build`，并确认 Pages 部署。
- 弹层 DOM 初始必须隐藏；对 `display:flex/grid` 弹层保留组件级 `[hidden]{display:none!important}`。
- 不清除用户 localStorage、对话、API Key、偏好或 Artifact，除非用户明确要求。

## 版本记录

- v0.2.1–v0.2.4：Codex、对话操作、Artifact v1。
- v0.2.5–v0.2.7：重命名弹窗组件级隐藏、恢复 Artifact 配置导出、Pages 构建恢复。
- v0.2.8：删除未接入功能入口、无效按钮、重复标题与解释性文案；压缩 README、设置、个性化、Artifact 与消息 UI。功能数据结构未改。
- v0.2.9：新增移动端发布验收清单；未改用户数据结构。
- v0.3.0：调整请求构建顺序；未改本地数据结构。
- v0.3.1：调整内置助手行为的措辞；未改本地数据结构。
