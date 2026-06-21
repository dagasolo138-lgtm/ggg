# ggg 项目 Codex

> **强制规则：每次开发、修改、调试或交接本项目之前，必须先完整阅读本文件。**
>
> 本文件是项目的长期技术档案，用于防止上下文丢失，并让新的对话或新的开发者快速接手。每次代码、架构、数据结构、部署方式、功能边界发生变化后，必须同步更新相关章节，且必须在本文末尾的“版本更新记录”追加一条概述。

---

## 1. 项目定位

- **仓库**：`dagasolo138-lgtm/ggg`
- **项目名**：`bin returns!`
- **当前包版本**：`0.2.0`
- **形态**：Vite + 原生 ES Modules 的纯前端 DeepSeek 对话应用。
- **部署方式**：GitHub Pages。
- **核心目标**：做一个以移动端为主、偏 Claude 风格交互的个人 DeepSeek API 对话前端；功能优先保证真实可用，不伪造后端、账户额度、图片识别、连接器等能力。

### 1.1 当前技术边界

1. 当前没有后端、数据库、账号系统或服务端密钥代理。
2. API 请求从浏览器直接发送到配置的接口地址。
3. 聊天记录、设置、个人资料、长期记忆、用量统计都只保存在当前浏览器本地存储中。
4. GitHub Pages 只负责托管静态页面，不负责保存用户数据。
5. 因为没有后端，公开分享、OAuth 连接器、真实账户额度、跨设备同步、服务端限流都尚未实现。

---

## 2. 启动与部署

### 2.1 本地运行

```bash
npm install
npm run dev
```

其他命令：

```bash
npm run build
npm run preview
```

- `package.json` 使用 Vite `^6.1.0`。
- 构建产物在 `dist/`。
- 项目启用 ES Modules：`"type": "module"`。

### 2.2 GitHub Pages

部署工作流：`.github/workflows/deploy-pages.yml`

触发规则：

- 推送到 `main`。
- GitHub Actions 安装依赖、执行 `npm run build`、上传 `dist/` 并部署。
- Node 版本：20。

首次启用时，GitHub 仓库设置中应选择：

```text
Settings → Pages → Build and deployment → GitHub Actions
```

---

## 3. 应用入口与总数据流

### 3.1 启动入口

```text
index.html
  ↓
src/main.js
  ↓
src/app/createConversationApp.js
  ↓
UI / 状态 / API / 功能模块
```

- `index.html` 只负责加载样式、`#app` 根节点和 `src/main.js`。
- `src/main.js` 获取 `#app` 并调用 `createConversationApp(root)`；启动失败时渲染可见错误页。
- `src/app/createConversationApp.js` 是**应用协调器**，负责把 UI、对话、附件、设置、个性化、用量、API 请求绑定在一起。不要把大量新业务逻辑继续堆入这里；新能力优先拆到 `features/` 或独立模块。

### 3.2 一次发送消息的真实流程

```text
用户输入 / 文本附件
  ↓
附件模块读取文本并生成 attachmentContext
  ↓
读取本地设置、个人资料、回答方式、启用记忆
  ↓
拼接系统上下文
  ↓
将当前用户消息写入本地对话历史
  ↓
POST 到 DeepSeek 兼容 Chat Completions 接口（stream: true）
  ↓
解析 SSE 流：reasoning_content / content / usage
  ↓
实时更新 UI
  ↓
保存助手最终回答、用量数据、对话标题与本地历史
```

### 3.3 系统上下文的拼接顺序

`buildPersonalizedSystemPrompt()` 输出以下层级：

```text
[基础助手规则]
  来自“模型与 API”中的系统提示词

[用户资料]
  显示名称、希望称呼

[回答方式]
  语言、长度、直接程度、结论优先、案例、表达禁忌、不确定性规则、额外偏好

[长期记忆]
  只包含用户手动添加且已启用的记忆
```

之后 API 层按以下顺序发送：

```text
system 消息：上述完整系统上下文
↓
历史消息：当前对话中已保存的 user / assistant 消息
↓
当前 user 消息：已经写入历史后，随同本轮请求发送
```

### 3.4 重要兼容说明

历史请求入口早期只向个性化函数传 `preferences.snapshot.profile`。为了避免大范围重构，当前 `preferencesStore` 在快照中的 `profile` 内部兼带 `responseStyle` 与 `memories`，使旧入口仍能读取完整个性化层。

这是一层**兼容桥接**，功能可用，但后续若重构 `createConversationApp.js`，应将调用统一为：

```js
buildPersonalizedSystemPrompt(settings.systemPrompt, preferences.snapshot)
```

这样可以删除 profile 内嵌兼容数据，结构会更干净。

---

## 4. 目录与文件地图

```text
.
├── index.html
├── package.json
├── README.md
├── codex.md
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
└── src/
    ├── main.js
    ├── api/
    │   └── deepseek.js
    ├── app/
    │   └── createConversationApp.js
    ├── config/
    │   └── constants.js
    ├── state/
    │   └── settings.js
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
    │   └── usage/
    │       └── usageStore.js
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

### 4.1 API 与配置

| 文件 | 责任 | 连接点 |
|---|---|---|
| `src/config/constants.js` | 默认接口、模型、思考模式文案、本地存储键名 | 被设置、UI、请求逻辑读取 |
| `src/api/deepseek.js` | `fetch` 请求、SSE 解析、错误处理 | 被 `createConversationApp.js` 调用 |
| `src/state/settings.js` | 读取、保存、校验、清除 API 设置 | 被应用协调器调用 |

### 4.2 对话与附件

| 文件 | 责任 | 连接点 |
|---|---|---|
| `features/conversations/conversationStore.js` | 本地对话创建、选择、删除、追加消息、历史持久化 | 被应用协调器和导出模块使用 |
| `features/conversations/historySidebar.js` | 左侧对话历史抽屉渲染 | 接收对话列表与选择/删除回调 |
| `features/attachments/attachmentStore.js` | 读取、限制、缓存待发送附件文本 | 生成 `attachmentContext`；图片只预览不发送 |
| `features/attachments/attachmentView.js` | 输入框附件托盘、消息中的附件元数据展示 | 由协调器和消息 UI 调用 |

### 4.3 设置、个性化与用量

| 文件 | 责任 | 连接点 |
|---|---|---|
| `features/settings/settingsNavigator.js` | BH 设置中心的多页面导航 | 从 `createConversationApp.js` 创建 |
| `features/settings/preferencesStore.js` | 个人资料、回答方式、长期记忆、通知偏好、系统上下文构建 | 请求前由协调器读取 |
| `features/settings/personalizationView.js` | “个性化与记忆”页面：回答方式、记忆 CRUD、上下文预览 | 被设置导航调用 |
| `features/settings/dataExport.js` | JSON 下载、复制对话、文本格式化 | 被设置中心和协调器调用 |
| `features/usage/usageStore.js` | 本机请求数与 token 统计 | 从 SSE `usage` 更新 |

### 4.4 UI 与样式

| 文件 | 责任 |
|---|---|
| `ui/layout.js` | 页面外壳、抽屉、输入框、模型/API 抽屉、全屏设置页 DOM |
| `ui/messages.js` | 用户消息、助手消息、推理折叠区、token 元数据、消息附件渲染 |
| `ui/icons.js` | 内联 SVG 图标集合 |
| `styles/tokens.css` | 颜色、字体、基础变量 |
| `styles/app.css` | 聊天主界面、输入框、附件托盘、消息样式 |
| `styles/history.css` | 历史抽屉与侧栏动画 |
| `styles/sheet.css` | 模型与 API 底部抽屉 |
| `styles/settings-hub.css` | BH 打开的全屏设置中心 |
| `styles/personalization.css` | 个性化与长期记忆页面 |

---

## 5. DeepSeek 请求配置

默认值在 `src/config/constants.js`：

```text
endpoint: https://api.deepseek.com/chat/completions
model: deepseek-v4-flash
thinkingMode: high
systemPrompt: 你是一个简洁、可靠的中文助手。
```

界面中可选模型标识：

```text
deepseek-v4-flash
deepseek-v4-pro
```

思考模式映射：

| UI 名称 | 代码值 | 请求行为 |
|---|---:|---|
| 快速 | `disabled` | `thinking: { type: "disabled" }` |
| 深度 | `high` | `thinking: { type: "enabled" }` + `reasoning_effort: "high"` |
| 极限 | `max` | `thinking: { type: "enabled" }` + `reasoning_effort: "max"` |

### 5.1 SSE 返回处理

`deepseek.js` 解析 `data:` 行，并关注：

- `delta.reasoning_content`：显示为折叠的思考过程。
- `delta.content`：显示为最终回答。
- `usage`：写入本机用量统计。
- `[DONE]`：流结束。

### 5.2 模型标识风险

代码中的模型名和请求字段是当前前端配置，并不保证所有账户、地区或未来接口版本都可用。更换模型、增加能力或遇到接口错误时，应先核对 DeepSeek 官方文档和账户实际权限，再修改配置。

---

## 6. 本地数据与存储键

### 6.1 API 设置

来自 `constants.js`：

| 存储键 | 用途 |
|---|---|
| `bin-deepseek-api-key` | API Key |
| `bin-deepseek-remember-api-key` | 是否长期记住 Key |
| `bin-deepseek-endpoint` | 接口地址 |
| `bin-deepseek-model` | 当前模型 |
| `bin-deepseek-thinking-mode` | 当前思考模式 |
| `bin-deepseek-system-prompt` | 基础系统提示词 |

规则：

- 勾选“在此设备记住 API Key”时，Key 放入 `localStorage`。
- 未勾选时，Key 只放入 `sessionStorage`。
- 其余设置保存到 `localStorage`。
- 旧会话 Key 在符合条件时会迁移到长期存储。

### 6.2 业务数据

| 存储键 | 内容 |
|---|---|
| `bin-conversations-v1` | 对话列表、消息、标题、推理内容、附件元数据、用于 API 的隐藏文本内容 |
| `bin-app-preferences-v1` | 个人资料、回答方式、长期记忆、通知偏好 |
| `bin-usage-v1` | 本机请求数、累计 tokens、思考 tokens、最近调用时间 |

### 6.3 数据导出与清除

- “导出全部本地数据”会下载 JSON，并把 API Key 替换成 `[已省略]`。
- 当前对话可以复制或下载 JSON。
- “删除这台设备上的全部应用数据”会清除设置、对话、个人偏好、记忆和本机用量。
- 所有数据只属于当前浏览器、当前设备、当前站点来源；更换浏览器、无痕模式或清理站点数据会丢失。

---

## 7. 已实现能力

### 7.1 聊天与推理

- 多轮对话与本地历史。
- 左上菜单打开历史抽屉。
- 新建对话、切换对话、删除对话、清空当前对话。
- SSE 流式输出。
- 思考过程与最终回答分开渲染。
- 停止生成。
- 错误提示与请求中状态。
- 本机 token 用量统计。

### 7.2 模型与设置

- 模型选择。
- 三档思考模式。
- 接口地址、系统提示词、API Key 可编辑。
- 设置自动保存。
- BH 打开全屏设置中心。
- 模型胶囊直达“模型与 API”抽屉。

### 7.3 个性化与记忆

- 显示名称、昵称。
- 结构化回答方式：语言、长度、表达方式、结论优先、案例优先、表达禁忌、不确定性规则、额外偏好。
- 手动管理长期记忆：新增、编辑、启用、关闭、删除。
- 记忆分类：身份、偏好、项目、学习、工作、投资、其他。
- 最多 30 条记忆；每条内容最多 700 字符；注入上下文总长度上限 6,000 字符。
- 个性化页面可预览本轮会注入的系统上下文。
- 当前版本**不会自动从聊天内容提取记忆**，避免未经确认地记录私人信息。

### 7.4 附件

- 支持文本文件：`.txt`、`.md`、`.markdown`、`.csv`、`.json`、日志及常见代码文件。
- 最多 4 个附件。
- 单个文件上限 2 MB。
- 单文件最多读取约 24,000 字符；全部文本附件总上限约 60,000 字符。
- 文本文件会附加到本轮用户消息的 API 内容中，聊天界面只显示文件名与状态。
- 图片可以选择和预览，但当前会被明确阻止发送：现有文本接口没有真实图片理解链路。

---

## 8. 未实现能力与禁止伪造项

下列能力不能仅靠当前 GitHub Pages 纯前端可靠完成：

1. **图片理解**：需要视觉模型或独立多模态服务。
2. **PDF / Office 文档结构化读取**：需要解析链路或后端处理。
3. **联网搜索**：需要搜索服务与密钥代理。
4. **Gmail、Google Drive、Notion 等连接器**：需要 OAuth、回调地址、服务器端令牌保存。
5. **公开分享链接与账号体系**：需要数据库、身份认证和权限控制。
6. **真实账户额度、账单、限额**：需要服务商账户接口或服务端安全代理。
7. **跨设备同步**：需要后端存储。
8. **自动长期记忆抽取**：需要明确的提取、审阅、删除机制。

开发时不得把这些能力仅做成好看的开关或页面并暗示其已工作；页面必须标识“待接入”“需要后端”或“需要视觉模型”。

---

## 9. 安全规则

1. API Key 不得写入代码、README、Codex、Git 历史示例、截图或前端默认配置。
2. 当前浏览器直连模式只适合个人受信任设备。
3. 不要把勾选“记住 API Key”的版本直接当作可安全公开给他人的产品。
4. 真正公开部署前必须引入后端或 Edge Function：Key 放在环境变量，不由浏览器持有服务商主密钥。
5. 后端化时还应加入登录、额度、速率限制、审计和滥用防护。
6. 导出数据时继续遮蔽 API Key；任何新增敏感字段也必须默认遮蔽。

---

## 10. 开发规范

### 10.1 每次开始前

1. 阅读本文件全部内容。
2. 确认本次需求属于：UI、状态、API、存储、个性化、附件、部署或后端能力中的哪一类。
3. 判断是否触及“纯前端边界”。触及后端边界时，必须明确说明，不得伪造完成。
4. 优先复用现有模块，不要把逻辑无序堆进 `createConversationApp.js`。

### 10.2 每次修改后

1. 更新受影响章节：能力、数据结构、文件地图、边界或安全规则。
2. 在“版本更新记录”末尾追加一条，包含日期、版本号或阶段名、改动摘要、涉及文件、已知限制。
3. 若更改请求格式、存储键、数据迁移逻辑、部署方式或 API Key 行为，必须写清楚迁移与兼容影响。
4. 若项目增加新模块，必须写入第 4 节文件地图和对应连接点。
5. 若发现代码与本文不一致，优先修正文档或代码，不能长期保留冲突描述。

### 10.3 建议的版本记录模板

```markdown
### YYYY-MM-DD · vX.Y.Z · 简短标题
- 改动：
- 涉及文件：
- 数据/接口影响：
- 已知限制：
```

---

## 11. 下一阶段建议

按价值与架构成本排序：

1. **清理个性化兼容桥接**：让请求入口直接接收完整 `preferences.snapshot`。
2. **给长期记忆增加检索规则**：先按当前问题关键词筛选，而不是将全部启用记忆注入。
3. **Markdown / 代码块渲染**：提升回答可读性，但要注意 XSS 安全。
4. **图片理解方案选择**：确认是接第三方视觉 API，还是部署自有多模态服务；再做真实上传链路。
5. **后端 / Edge Function**：用于保护共享 Key、提供外部搜索、连接器、账户和跨端数据。
6. **项目模式**：为“投资”“游戏开发”“代码项目”等建立可启用的预设上下文包，但仍应允许用户查看与关闭。

---

## 12. 版本更新记录

### 2026-06-22 · v0.2.1 · 建立项目 Codex
- 改动：新增 `codex.md`，系统化记录当前项目架构、真实功能、数据流、存储键、请求上下文、文件组合逻辑、部署方式、安全边界与维护规则。
- 涉及文件：`codex.md`、`README.md`。
- 数据/接口影响：无运行时数据结构变化；文档明确了当前本地存储和个性化注入逻辑。
- 已知限制：本文反映当前纯前端版本；未来增加后端、视觉模型、连接器、自动记忆或跨设备同步时，必须同步更新。
