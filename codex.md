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

- `api/deepseek.js`：流式 API 与请求消息组装。
- `config/assistantCore.js`：内置助手行为层；不进入设置、个性化、记忆或导出数据。
- `features/conversations/`：对话、本地历史、顶部操作。
- `features/settings/`：设置、个性化、记忆、导出。
- `features/knowledge/zhishiStore.js`：zhishi 本地知识库检索与相关事实上下文构建。
- `features/attachments/`：文本附件。
- `features/artifacts/`：代码块识别、本地作品库、预览与版本。
- `features/qa/`：仅在 `?qa=1` 挂载的真实对话验收；不会写入聊天、记忆或设置。
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
- 中断请求必须将已有内容保存回原对话；不得因切换对话、创建新对话或手动停止丢失部分回答。
- QA 面板只使用当前浏览器的 API 配置，运行前需人工点击；结果仅存在当前页面，可复制或下载。

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
- v0.3.2：修复中断回复丢失、历史误删无确认、启动兜底二次报错、复制降级失败与 Artifact 存储失败后的状态漂移。
- v0.3.3：新增 `?qa=1` 真实对话验收面板；默认界面不显示，验收请求不写入用户数据。
- v0.3.4：新增 zhishi 知识库接入功能（`src/features/knowledge/zhishiStore.js`）；修复发送锁在知识库检索前未生效的问题；将知识上下文作为低优先级独立 system message 插入固定规则之前，避免知识文本覆盖助手规则。
- v0.3.5：修复 zhishi 检索阶段停止与历史切换竞态；删除未使用 zhishiEnabled 存储 key；补充本地事实会发送至 DeepSeek API 的隐私提示。
- v0.3.6：修复 zhishi 检索提前返回时未清空 abortController 与 activeRequest 的残留脏状态。
