# ggg 项目 Codex

> 本文件是项目的长期技术档案，用于防止上下文丢失、辅助新对话接手项目，并保存当前实际架构、数据流、文件职责、功能边界与版本记录。
>
> **规则：不要求每次开发前阅读 README 或 Codex；但每次开发完成后，必须更新本文相关章节，并在末尾“版本更新记录”追加一条概述。**

---

## 1. 项目定位

| 项目项 | 当前值 |
|---|---|
| 仓库 | `dagasolo138-lgtm/ggg` |
| 项目名 | `bin returns!` |
| 当前包版本 | `0.2.0` |
| 形态 | Vite + 原生 ES Modules 纯前端应用 |
| 部署 | GitHub Pages |
| 核心用途 | 移动端个人 DeepSeek API 对话前端 |

设计原则：功能必须真实可用。没有后端、视觉模型、OAuth 或账户服务时，页面必须清晰标注边界，不得伪造成已完成能力。

### 当前技术边界

1. 没有后端、数据库、账号系统或服务端 API Key 代理。
2. 浏览器直接向配置的 DeepSeek 兼容接口发请求。
3. 聊天记录、设置、个性化、记忆、用量统计都只保存在当前浏览器。
4. GitHub Pages 只托管静态文件，不保存用户数据。
5. 公开分享、跨设备同步、连接器、真实账户额度、服务端限流尚未实现。

---

## 2. 运行与部署

### 本地命令

```bash
npm install
npm run dev
npm run build
npm run preview
```

- 构建工具：Vite `^6.1.0`
- Node 模块类型：ES Modules
- 构建产物：`dist/`

### GitHub Pages

工作流：`.github/workflows/deploy-pages.yml`

- 推送到 `main` 会触发构建与部署。
- 工作流使用 Node 20。
- 首次部署需在仓库设置中选择：

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

---

## 3. 启动入口与总数据流

### 启动入口

```text
index.html
  ↓
src/main.js
  ↓
src/app/createConversationApp.js
  ↓
UI / 状态 / API / 功能模块
```

- `index.html`：加载样式、提供 `#app`、加载 `src/main.js`。
- `src/main.js`：调用 `createConversationApp(root)`；启动失败时渲染错误页。
- `src/app/createConversationApp.js`：应用协调器，负责连接 UI、对话、附件、设置、个性化、用量和 API 请求。

### 一次发送消息的实际流程

```text
输入文本 / 选择文本附件
  ↓
附件模块读取文本，生成 attachmentContext
  ↓
读取本地 API 设置、个人资料、回答方式、启用记忆
  ↓
构建系统上下文
  ↓
用户消息写入本地对话历史
  ↓
POST Chat Completions（stream: true）
  ↓
解析 SSE：reasoning_content / content / usage
  ↓
实时更新消息 UI
  ↓
保存助手回答、用量、历史标题和本地状态
```

### 系统上下文层级

`buildPersonalizedSystemPrompt()` 组装：

```text
[基础助手规则]
  来自“模型与 API”的系统提示词

[用户资料]
  显示名称、希望如何称呼

[回答方式]
  语言、长度、表达风格、结论优先、案例、表达禁忌、不确定性、额外偏好

[长期记忆]
  用户手动管理且当前启用的记忆
```

请求顺序：

```text
system：完整系统上下文
↓
history：当前对话历史
↓
user：本轮用户消息（含隐藏的文本附件上下文）
```

### 个性化兼容桥接

历史请求入口早期只把 `preferences.snapshot.profile` 传入个性化函数。当前 `preferencesStore` 会在快照的 `profile` 内兼带 `responseStyle` 与 `memories`，以保证旧入口仍可读取完整个性化层。

后续重构建议统一改为：

```js
buildPersonalizedSystemPrompt(settings.systemPrompt, preferences.snapshot)
```

然后删除 profile 内嵌兼容字段。

---

## 4. 文件地图与组合逻辑

```text
.
├── index.html
├── package.json
├── README.md
├── codex.md
├── .github/
│   └── workflows/deploy-pages.yml
└── src/
    ├── main.js
    ├── api/deepseek.js
    ├── app/createConversationApp.js
    ├── config/constants.js
    ├── state/settings.js
    ├── features/
    │   ├── attachments/
    │   │   ├── attachmentStore.js
    │   │   └── attachmentView.js
    │   ├── conversations/
    │   │   ├── conversationStore.js
    │   │   └── historySidebar.js
    │   ├── settings/
    │   │   ├── dataExport.js
    │   │   ├── personalizationView.js
    │   │   ├── preferencesStore.js
    │   │   └── settingsNavigator.js
    │   └── usage/usageStore.js
    ├── ui/
    │   ├── icons.js
    │   ├── layout.js
    │   └── messages.js
    └── styles/
        ├── tokens.css
        ├── app.css
        ├── history.css
        ├── sheet.css
        ├── settings-hub.css
        └── personalization.css
```

### 模块职责

| 模块 | 责任 | 主要连接点 |
|---|---|---|
| `api/deepseek.js` | `fetch`、SSE 解析、接口错误处理 | 被应用协调器调用 |
| `app/createConversationApp.js` | 状态编排、事件绑定、发送流程 | 应用总入口 |
| `config/constants.js` | 默认接口、模型、思考模式、本地存储键 | 被设置与请求逻辑读取 |
| `state/settings.js` | API 设置的读取、保存、校验、清除 | 被应用协调器调用 |
| `features/conversations/conversationStore.js` | 对话创建、切换、删除、追加、持久化 | 协调器、历史侧栏、导出 |
| `features/conversations/historySidebar.js` | 历史抽屉渲染 | 接收选择与删除回调 |
| `features/attachments/attachmentStore.js` | 文本文件读取、限制、附件上下文生成 | 发送前生成 `attachmentContext` |
| `features/attachments/attachmentView.js` | 附件托盘与消息附件元数据 | 被协调器和消息 UI 调用 |
| `features/settings/preferencesStore.js` | 个人资料、回答方式、长期记忆、通知、系统上下文 | 请求前读取 |
| `features/settings/personalizationView.js` | 个性化与记忆页面、记忆 CRUD、上下文预览 | 被设置导航调用 |
| `features/settings/settingsNavigator.js` | BH 设置中心的多页面导航 | 从协调器创建 |
| `features/settings/dataExport.js` | JSON 导出、复制对话、文本格式化 | 设置页与协调器 |
| `features/usage/usageStore.js` | 请求数与 token 本地统计 | 从 SSE usage 更新 |
| `ui/layout.js` | 页面外壳、抽屉、输入框、设置页 DOM | 被协调器创建 |
| `ui/messages.js` | 消息、推理折叠、token、消息附件渲染 | 协调器调用 |
| `ui/icons.js` | 内联 SVG 图标 | UI 与设置导航 |

### 样式职责

| 样式文件 | 责任 |
|---|---|
| `tokens.css` | 颜色、字体、全局变量 |
| `app.css` | 聊天主界面、消息、输入框、附件托盘 |
| `history.css` | 历史抽屉与侧栏动画 |
| `sheet.css` | 模型与 API 底部抽屉 |
| `settings-hub.css` | BH 打开的全屏设置中心 |
| `personalization.css` | 个性化与长期记忆页面 |

---

## 5. DeepSeek 请求配置

默认配置位于 `src/config/constants.js`：

```text
endpoint: https://api.deepseek.com/chat/completions
model: deepseek-v4-flash
thinkingMode: high
systemPrompt: 你是一个简洁、可靠的中文助手。
```

页面当前配置的模型标识：

```text
deepseek-v4-flash
deepseek-v4-pro
```

| UI 名称 | 代码值 | 请求行为 |
|---|---|---|
| 快速 | `disabled` | `thinking: { type: "disabled" }` |
| 深度 | `high` | `thinking: { type: "enabled" }` + `reasoning_effort: "high"` |
| 极限 | `max` | `thinking: { type: "enabled" }` + `reasoning_effort: "max"` |

### SSE 处理

`deepseek.js` 解析 `data:` 行：

- `delta.reasoning_content`：可折叠思考过程。
- `delta.content`：最终回答。
- `usage`：写入本机统计。
- `[DONE]`：流结束。

### 重要风险

模型名、请求字段和账户可用权限可能变化。涉及 API、模型或能力改动时，必须先核对官方文档与账户实际权限。

---

## 6. 本地存储与数据结构

### API 设置

| 存储键 | 内容 |
|---|---|
| `bin-deepseek-api-key` | API Key |
| `bin-deepseek-remember-api-key` | 是否长期记住 Key |
| `bin-deepseek-endpoint` | 接口地址 |
| `bin-deepseek-model` | 当前模型 |
| `bin-deepseek-thinking-mode` | 当前思考模式 |
| `bin-deepseek-system-prompt` | 基础系统提示词 |

规则：

- 勾选“在此设备记住 API Key”时，Key 使用 `localStorage`。
- 未勾选时，Key 使用 `sessionStorage`。
- 其余设置使用 `localStorage`。
- 旧会话 Key 在符合条件时可迁移到长期存储。

### 业务数据

| 存储键 | 内容 |
|---|---|
| `bin-conversations-v1` | 对话、消息、标题、推理内容、附件元数据、用于 API 的隐藏文本内容 |
| `bin-app-preferences-v1` | 个人资料、回答方式、长期记忆、通知偏好 |
| `bin-usage-v1` | 请求数、累计 tokens、思考 tokens、最近调用时间 |

### 导出与清除

- 全量导出会下载 JSON，API Key 会替换为 `[已省略]`。
- 当前对话可复制或下载 JSON。
- 删除全部本地数据会清除设置、对话、个性化、记忆和用量。
- 数据只属于当前浏览器、设备和站点来源；换浏览器、无痕模式或清站点数据会丢失。

---

## 7. 已实现能力

### 聊天与推理

- 多轮对话、本地历史、新建、切换、删除、清空。
- SSE 流式输出。
- 思考过程与最终回答分开渲染。
- 停止生成、错误提示、请求中状态。
- 本机 token 用量统计。

### 模型与设置

- 接口地址、API Key、模型、思考模式、基础系统提示词可编辑。
- 设置自动保存。
- BH 打开全屏设置中心。
- 模型胶囊直达“模型与 API”。

### 个性化与长期记忆

- 显示名称、昵称。
- 结构化回答方式：语言、长度、表达风格、结论优先、案例优先、表达禁忌、不确定性规则、额外偏好。
- 记忆可新增、编辑、启用、关闭、删除。
- 分类：身份、偏好、项目、学习、工作、投资、其他。
- 最多 30 条记忆；每条最多 700 字符；注入上下文总长度上限 6,000 字符。
- 页面可预览当前会注入的系统上下文。
- 不自动从聊天中抽取记忆，避免未经确认记录私人信息。

### 附件

- 支持 `.txt`、`.md`、`.markdown`、`.csv`、`.json`、日志和常见代码文件。
- 最多 4 个附件。
- 单个文件上限 2 MB。
- 单文件最多读取约 24,000 字符；总文本附件上限约 60,000 字符。
- 文本内容仅作为该轮 API 内容发送；聊天 UI 展示文件名和状态。
- 图片可选择和预览，但会明确阻止发送，因为当前接口没有真实图片理解链路。

---

## 8. 未实现能力与禁止伪造项

以下能力需要视觉模型或后端，不得只做外观然后暗示已可用：

1. 图片理解。
2. PDF / Office 文档结构化读取。
3. 联网搜索。
4. Gmail、Google Drive、Notion 等 OAuth 连接器。
5. 公开分享链接、账号体系与权限控制。
6. 真实账户额度、账单、限额。
7. 跨设备同步。
8. 自动长期记忆抽取。

对应页面必须明确标注“待接入”“需要后端”或“需要视觉模型”。

---

## 9. 安全规则

1. API Key 不得写入源码、README、Codex、示例、截图或默认配置。
2. 浏览器直连只适合个人受信任设备。
3. 不要将勾选“记住 API Key”的版本直接作为可安全公开产品。
4. 真正公开部署前，必须增加后端或 Edge Function，服务商主 Key 只能放在环境变量。
5. 后端化时需加入登录、额度、限流、审计和滥用防护。
6. 导出数据必须继续遮蔽 API Key 和未来新增的敏感字段。

---

## 10. 开发维护规则

### 开发前

- 不强制阅读 README 或 Codex。
- 涉及不熟悉模块、数据结构、接口格式、部署或历史决策时，应按需查阅 Codex 对应章节。
- 触及纯前端边界时，必须明确说明限制，不得伪造实现。
- 新功能优先拆入对应 `features/` 模块，不要无序堆进 `createConversationApp.js`。

### 开发后（强制）

每次开发、修改、调试或结构调整完成后，必须：

1. 更新 Codex 中受影响章节：能力、数据结构、文件地图、连接点、边界、安全或部署。
2. 在本文末尾“版本更新记录”追加一条版本概述。
3. 发生请求格式、存储键、迁移逻辑、部署方式或 API Key 行为变化时，写清迁移与兼容影响。
4. 新增模块时，补充文件地图和连接点。
5. 发现代码与 Codex 不一致时，及时修正代码或文档，不能长期保留冲突描述。

### 版本记录模板

```markdown
### YYYY-MM-DD · vX.Y.Z · 简短标题
- 改动：
- 涉及文件：
- 数据/接口影响：
- 已知限制：
```

---

## 11. 下一阶段建议

1. 清理个性化兼容桥接：请求入口直接接收完整 `preferences.snapshot`。
2. 长期记忆检索：按当前问题筛选相关记忆，避免全部注入。
3. Markdown 与代码块安全渲染。
4. 确定图片理解方案：兼容视觉 API 或自建多模态服务。
5. 后端 / Edge Function：保护共享 Key、搜索、连接器、账号、跨设备数据。
6. 项目模式：投资、游戏开发、代码项目等可开关预设上下文包。

---

## 12. 版本更新记录

### 2026-06-22 · v0.2.1 · 建立项目 Codex
- 改动：新增 `codex.md`，系统化记录项目架构、功能、数据流、存储、部署、安全边界与维护规则。
- 涉及文件：`codex.md`、`README.md`。
- 数据/接口影响：无运行时数据结构变化。
- 已知限制：当前为纯前端版本，后端、视觉模型、连接器、自动记忆和跨设备同步尚未实现。

### 2026-06-22 · v0.2.2 · 调整 Codex 维护规则
- 改动：移除“每次开发前必须阅读 README 或 Codex”的强制要求；保留并明确“每次开发完成后必须更新 Codex 相关章节，并在末尾追加版本更新概述”。
- 涉及文件：`README.md`、`codex.md`。
- 数据/接口影响：无运行时数据结构变化。
- 已知限制：Codex 的准确性依赖每次开发完成后的同步维护。
