# ggg 项目 Codex

> 项目的长期技术档案：记录当前进度、架构、模块连接、数据流、存储、功能边界与版本更新，供后续对话或开发快速接手。
>
> **规则：开发前不强制阅读 README 或 Codex；每次开发、修改、调试或结构调整完成后，必须更新本文相关章节，并在末尾“版本更新记录”追加一条概述。**

---

## 1. 项目定位

| 项目项 | 当前值 |
|---|---|
| 仓库 | `dagasolo138-lgtm/ggg` |
| 项目名 | `bin returns!` |
| 当前包版本 | `0.2.0` |
| 技术形态 | Vite + 原生 ES Modules 纯前端 |
| 部署 | GitHub Pages |
| 核心用途 | 移动端个人 DeepSeek API 对话前端 + 本地 Artifact 工作区 |

设计原则：功能必须真实可用。没有后端、视觉模型、OAuth、账号系统或云端存储时，页面必须明确边界，不能用好看的界面伪造成已完成能力。

### 当前技术边界

1. 没有后端、数据库、账号系统或服务端 API Key 代理。
2. 浏览器直接请求配置的 DeepSeek 兼容接口。
3. 对话、设置、个性化、长期记忆、用量、收藏和 Artifact 都只保存在当前浏览器。
4. GitHub Pages 只托管静态资源，不保存用户数据。
5. 公开分享链接、跨设备同步、连接器、真实账户额度、服务端限流未实现。

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
- 模块类型：ES Modules
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
UI / 对话 / 设置 / API / Artifact / 本地状态模块
```

- `index.html`：加载样式、提供 `#app`、加载 `src/main.js`。
- `src/main.js`：调用 `createConversationApp(root)`；启动失败时显示错误页。
- `src/app/createConversationApp.js`：应用协调器。负责把 UI、聊天、附件、Artifact、设置、个性化、用量和 API 连接起来。

### 一次消息发送的实际流程

```text
输入文本 / 选择文本附件
  ↓
附件模块读取文本，生成 attachmentContext
  ↓
读取 API 设置与完整 preferences 快照
  ↓
构建系统上下文
  ↓
用户消息写入本地历史
  ↓
POST Chat Completions（stream: true）
  ↓
解析 SSE：reasoning_content / content / usage
  ↓
实时更新助手消息
  ↓
最终回答保存到本地历史
  ↓
扫描回答中的 HTML / SVG / Markdown / JSON 代码块
  ↓
显示“创建 Artifact”入口
```

### 系统上下文层级

请求入口统一使用：

```js
buildPersonalizedSystemPrompt(settings.systemPrompt, preferences.snapshot)
```

注入顺序：

```text
[基础助手规则]
  模型与 API 页面中的系统提示词

[用户资料]
  显示名称、希望如何称呼

[回答方式]
  语言、长度、表达风格、结论优先、案例、表达禁忌、不确定性、额外偏好

[长期记忆]
  用户手动管理且启用的记忆

↓
当前对话历史
↓
本轮用户消息（含隐藏的文本附件上下文）
```

---

## 4. 文件地图与模块连接

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
    │   ├── artifacts/
    │   │   ├── artifactParser.js
    │   │   ├── artifactStore.js
    │   │   ├── artifactView.js
    │   │   └── artifactWorkspace.js
    │   ├── attachments/
    │   │   ├── attachmentStore.js
    │   │   └── attachmentView.js
    │   ├── conversations/
    │   │   ├── conversationActions.js
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
        ├── personalization.css
        ├── conversation-actions.css
        └── artifacts.css
```

### 关键模块

| 模块 | 责任 | 连接点 |
|---|---|---|
| `api/deepseek.js` | `fetch`、SSE 解析、接口错误处理 | `createConversationApp.js` 调用 |
| `app/createConversationApp.js` | 应用状态编排、事件绑定、发送流程 | 项目总协调器 |
| `config/constants.js` | 默认接口、模型、思考模式、本地存储键 | 设置与请求逻辑读取 |
| `state/settings.js` | API 设置读取、保存、校验、清除 | 应用协调器 |
| `features/conversations/conversationStore.js` | 对话创建、切换、删除、追加、重命名、收藏、持久化 | 协调器、历史侧栏、导出 |
| `features/conversations/conversationActions.js` | 右上新对话/更多菜单/重命名弹窗 | 通过回调调用协调器 |
| `features/conversations/historySidebar.js` | 历史抽屉、收藏分组与星标 | 接收选择/删除回调 |
| `features/attachments/attachmentStore.js` | 文本文件读取、限制、附件上下文 | 发送前生成 `attachmentContext` |
| `features/attachments/attachmentView.js` | 附件托盘与消息附件元数据 | 协调器、消息 UI |
| `features/artifacts/artifactParser.js` | 从回答代码块识别可创建 Artifact | 消息 UI 和发送完成阶段 |
| `features/artifacts/artifactStore.js` | Artifact、版本、来源对话的本地持久化 | 工作区控制器 |
| `features/artifacts/artifactView.js` | 消息下方 Artifact 入口、作品库渲染、安全预览 | 工作区控制器调用 |
| `features/artifacts/artifactWorkspace.js` | 作品库打开、选中、编辑版本、复制、下载、删除 | 应用协调器创建 |
| `features/settings/preferencesStore.js` | 用户资料、回答方式、长期记忆、通知、上下文构建 | 请求前读取 |
| `features/settings/personalizationView.js` | 个性化与记忆页、记忆 CRUD、上下文预览 | 设置导航调用 |
| `features/settings/settingsNavigator.js` | BH 设置中心多页面导航 | 协调器创建 |
| `features/settings/dataExport.js` | JSON 导出、复制对话、文本格式化 | 设置页、协调器、Artifact 工作区 |
| `features/usage/usageStore.js` | 请求数与 token 本机统计 | SSE `usage` 更新 |
| `ui/layout.js` | 主壳、历史抽屉、Artifact 工作区、输入框、设置页 DOM | 协调器创建 |
| `ui/messages.js` | 消息、推理折叠、token、附件、Artifact 创建入口 | 协调器调用 |
| `ui/icons.js` | 内联 SVG 图标 | 所有 UI 模块 |

### 样式职责

| 样式文件 | 责任 |
|---|---|
| `tokens.css` | 颜色、字体、基础变量 |
| `app.css` | 聊天主界面、消息、输入框、附件 |
| `history.css` | 历史抽屉、收藏星标、侧栏动画 |
| `sheet.css` | 模型与 API 底部抽屉 |
| `settings-hub.css` | BH 全屏设置中心 |
| `personalization.css` | 个性化与长期记忆页面 |
| `conversation-actions.css` | 顶部对话操作胶囊、菜单、重命名弹窗 |
| `artifacts.css` | Artifact 入口、作品库、版本编辑器、预览沙盒 |

---

## 5. DeepSeek 请求配置

默认配置在 `src/config/constants.js`：

```text
endpoint: https://api.deepseek.com/chat/completions
model: deepseek-v4-flash
thinkingMode: high
systemPrompt: 你是一个简洁、可靠的中文助手。
```

当前页面配置模型标识：

```text
deepseek-v4-flash
deepseek-v4-pro
```

| UI 名称 | 代码值 | 请求行为 |
|---|---|---|
| 快速 | `disabled` | `thinking: { type: "disabled" }` |
| 深度 | `high` | `thinking: { type: "enabled" }` + `reasoning_effort: "high"` |
| 极限 | `max` | `thinking: { type: "enabled" }` + `reasoning_effort: "max"` |

### SSE 返回处理

- `delta.reasoning_content`：可折叠思考过程。
- `delta.content`：最终回答。
- `usage`：写入本机统计。
- `[DONE]`：流结束。

模型名、请求字段和账户权限可能变化。改 API、模型或能力前，先核对官方文档与账户实际权限。

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

规则：勾选“记住 API Key”时使用 `localStorage`；未勾选时使用 `sessionStorage`；其余设置使用 `localStorage`。

### 业务数据

| 存储键 | 内容 |
|---|---|
| `bin-conversations-v1` | 对话、消息、标题、收藏、推理、附件元数据、隐藏 API 文本 |
| `bin-app-preferences-v1` | 用户资料、回答方式、长期记忆、通知偏好 |
| `bin-usage-v1` | 请求数、累计 tokens、思考 tokens、最近调用时间 |
| `bin-artifacts-v1` | Artifact、版本内容、活动版本、来源对话 |

### 对话对象关键字段

```js
{
  id,
  title,
  starred,
  createdAt,
  updatedAt,
  messages: []
}
```

- `starred` 为布尔值；收藏对话在侧栏“已收藏”分组优先展示。
- 手动重命名最多 80 个字符。
- 自动标题仅在标题仍为“新对话”时生成。

### Artifact 对象关键字段

```js
{
  id,
  title,
  type,                 // html | svg | markdown | json
  sourceKey,            // 相同回答块重复打开时复用作品
  conversationId,
  createdAt,
  updatedAt,
  activeVersionId,
  versions: [
    { id, label, content, createdAt }
  ]
}
```

限制：

- 最多 36 个 Artifact。
- 每个 Artifact 最多 24 个版本。
- 单个版本内容最大 160,000 字符。
- 同一对话的同一代码块再次打开会复用已有 Artifact，不重复创建。

### 导出与清除

- 全量导出 JSON 包含对话、Artifact、个性化、用量和脱敏后的设置。
- 当前对话可复制、下载 JSON、调用浏览器原生分享。
- 删除全部本地数据会清除设置、对话、Artifact、个性化、记忆和用量。
- 所有数据只属于当前浏览器、设备和站点来源；换设备、无痕模式或清站点数据会丢失。

---

## 7. 已实现能力

### 聊天与推理

- 多轮对话、本地历史、新建、切换、删除、清空。
- SSE 流式输出。
- 思考过程与最终回答分开渲染。
- 停止生成、错误提示、请求中状态。
- 本机 token 用量统计。

### 当前对话操作

- 当前对话有消息后，右上显示“新对话 + 更多”；空对话隐藏右侧操作。
- 分享：优先 Web Share API；不可用时复制对话文本。
- 收藏：本地持久化，侧栏出现“已收藏”分组。
- 重命名：自定义弹窗，本地保存。
- 删除：二次确认后删除。
- 项目系统不存在，因此不显示“加入项目”。

### 模型与设置

- API Key、接口地址、模型、思考模式、基础系统提示词可编辑。
- 设置自动保存。
- BH 打开全屏设置中心。
- 模型胶囊直达“模型与 API”。

### 个性化与长期记忆

- 显示名称、昵称。
- 回答方式：语言、长度、表达风格、结论优先、案例优先、表达禁忌、不确定性、额外偏好。
- 记忆可新增、编辑、启用、关闭、删除。
- 分类：身份、偏好、项目、学习、工作、投资、其他。
- 最多 30 条记忆；每条最多 700 字符；上下文注入总上限 6,000 字符。
- 可预览当前会注入的系统上下文。
- 不自动从聊天中抽取记忆。

### 附件

- 支持 `.txt`、`.md`、`.markdown`、`.csv`、`.json`、日志和常见代码文件。
- 最多 4 个；单个不超过 2 MB。
- 单文件最多读取约 24,000 字符；总文本附件上限约 60,000 字符。
- 文本内容仅作为该轮 API 内容发送；UI 展示文件名和状态。
- 图片可选择和预览，但会明确阻止发送：当前接口没有真实图片理解链路。

### Artifact v1

触发方式：助手最终回答中出现以下代码块之一时，消息下方显示“可创建 Artifact”：

```text
```html
```svg
```markdown / ```md
```json
```

支持能力：

- 创建本地 Artifact，来源关联当前对话。
- 侧栏顶部入口打开作品库。
- HTML 在 `iframe sandbox="allow-scripts"` 中运行；没有 `allow-same-origin`，不能访问主聊天页面与本地数据。
- SVG 使用无脚本 sandbox 预览。
- Markdown、JSON 使用安全文本预览；JSON 会尝试格式化。
- 本地作品库、作品切换、版本切换。
- 手动编辑源码后保存为新版本，旧版本可回看。
- 复制源码、下载相应扩展名、删除作品。

当前不做：自动创建所有代码块、AI 自动修改版本、云端同步、公开链接、多文件项目、协作和 Artifact 内部模型调用。

---

## 8. 未实现能力与禁止伪造项

以下能力需要视觉模型或后端，不得只做外观就暗示可用：

1. 图片理解。
2. PDF / Office 文档结构化读取。
3. 联网搜索。
4. Gmail、Google Drive、Notion 等 OAuth 连接器。
5. 公开分享链接、账号体系与权限控制。
6. 真实账户额度、账单、限额。
7. 跨设备同步。
8. 自动长期记忆抽取。
9. 项目管理系统。
10. Artifact 的云端共享、多文件构建、多人协作、内部模型调用。

对应页面必须标注“待接入”“需要后端”或“需要视觉模型”。

---

## 9. 安全规则

1. API Key 不得写入源码、README、Codex、示例、截图或默认配置。
2. 浏览器直连只适合个人受信任设备。
3. 不要将勾选“记住 API Key”的版本直接当作可安全公开产品。
4. 真正公开部署前，必须增加后端或 Edge Function，服务商主 Key 只能放在环境变量。
5. 后端化时需加入登录、额度、限流、审计和滥用防护。
6. 导出数据必须遮蔽 API Key 和未来新增的敏感字段。
7. Artifact 预览必须保留 iframe sandbox；禁止将模型生成的 HTML / SVG 直接插入聊天主页面。
8. Artifact 标题、内容和模型返回的文本必须以 `textContent` 或 sandbox 方式渲染，不能拼接进主页面不受控 HTML。

---

## 10. 开发维护规则

### 开发前

- 不强制阅读 README 或 Codex。
- 涉及不熟悉模块、数据结构、接口格式、部署或历史决策时，按需查阅 Codex。
- 触及纯前端边界时，必须明确限制，不得伪造实现。
- 新功能优先拆入对应 `features/` 模块，不要无序堆进 `createConversationApp.js`。

### 开发后（强制）

每次开发、修改、调试或结构调整完成后，必须：

1. 更新 Codex 中受影响章节：能力、数据结构、文件地图、连接点、边界、安全或部署。
2. 在本文末尾“版本更新记录”追加版本概述。
3. 请求格式、存储键、迁移逻辑、部署方式或 API Key 行为变化时，写清迁移与兼容影响。
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

1. **Artifact AI 迭代**：用户在作品库点击“让 DeepSeek 修改”，下一条消息自动带入当前版本源码；模型返回同类型完整代码块后创建新版本。
2. **Artifact 结构化指令**：为模型增加可选 Artifact 输出协议，减少普通代码块误识别。
3. **Markdown / 代码块渲染**：聊天内容安全渲染，提高 Artifact 源回答可读性。
4. **长期记忆检索**：按当前问题筛选相关记忆，而非全部启用记忆都注入。
5. **图片理解方案**：确定兼容视觉 API 或自建多模态服务。
6. **后端 / Edge Function**：保护共享 Key、搜索、连接器、账号与跨设备数据。
7. **项目系统**：多 Artifact、多文件、版本树与项目级上下文。

---

## 12. 版本更新记录

### 2026-06-22 · v0.2.1 · 建立项目 Codex
- 改动：新增 `codex.md`，系统化记录项目架构、功能、数据流、存储、部署、安全边界与维护规则。
- 涉及文件：`codex.md`、`README.md`。
- 数据/接口影响：无运行时数据结构变化。
- 已知限制：当前为纯前端版本，后端、视觉模型、连接器、自动记忆和跨设备同步尚未实现。

### 2026-06-22 · v0.2.2 · 调整 Codex 维护规则
- 改动：移除开发前强制阅读要求；保留开发完成后必须更新 Codex 与版本记录的规则。
- 涉及文件：`README.md`、`codex.md`。
- 数据/接口影响：无运行时数据结构变化。
- 已知限制：Codex 准确性依赖每次开发完成后的同步维护。

### 2026-06-22 · v0.2.3 · 当前对话操作菜单
- 改动：新增右上条件式“新对话 + 更多”胶囊；更多菜单提供分享、收藏、重命名、删除。
- 涉及文件：对话操作、历史侧栏、布局、样式、协调器和 Codex。
- 数据/接口影响：`bin-conversations-v1` 对话对象新增 `starred`；旧对话默认 `false`。请求入口改为直接传完整 `preferences.snapshot`。
- 已知限制：分享仅调用浏览器原生分享或复制文本；没有公开 URL；项目系统尚不存在。

### 2026-06-22 · v0.2.4 · Artifact v1 本地作品工作区
- 改动：新增 Artifact 解析、作品库、版本历史、HTML/SVG/Markdown/JSON 预览、手动编辑、复制、下载和删除；回答中出现支持类型代码块时可手动创建 Artifact。
- 涉及文件：`features/artifacts/*`、`ui/layout.js`、`ui/messages.js`、`ui/icons.js`、`app/createConversationApp.js`、`styles/artifacts.css`、`index.html`、`README.md`、`codex.md`。
- 数据/接口影响：新增本地存储键 `bin-artifacts-v1`；全量本地数据导出新增 `artifacts`；清除全部本地数据会删除 Artifact。
- 已知限制：当前只支持单文件 Artifact 和手动编辑；不支持 AI 自动修改版本、云同步、公开链接、多文件项目或 Artifact 内部模型调用。HTML 仅在 sandbox iframe 中执行。
