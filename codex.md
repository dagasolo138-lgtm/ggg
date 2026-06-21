# ggg 项目 Codex

> `ggg` 的长期技术档案。用于让新的开发对话快速了解当前架构、数据、功能边界和已完成工作。
>
> **规则：开发前不强制阅读 README 或 Codex；每次开发、修改、调试或结构调整完成后，必须更新本文，并在末尾追加版本概述。**

---

## 1. 项目现状

| 项目项 | 当前值 |
|---|---|
| 仓库 | `dagasolo138-lgtm/ggg` |
| 项目名 | `bin returns!` |
| 技术栈 | Vite + 原生 ES Modules + 原生 CSS |
| 部署 | GitHub Pages |
| 定位 | 移动端个人 DeepSeek 对话前端，带本地个性化、记忆、对话库和 Artifact 工作区 |
| 数据存储 | 当前浏览器的 `localStorage` / `sessionStorage` |

项目是纯前端。没有后端、账号、数据库、OAuth、云同步或服务端 API Key 代理。

---

## 2. 启动与主流程

```text
index.html
  ↓
src/main.js
  ↓
src/app/createConversationApp.js
  ↓
对话 / 设置 / 个性化 / 记忆 / 附件 / Artifact / DeepSeek API
```

一次聊天请求：

```text
输入文本与文本附件
  ↓
生成附件上下文
  ↓
读取 API 设置与 preferences.snapshot
  ↓
buildPersonalizedSystemPrompt(...)
  ↓
写入用户消息到本地历史
  ↓
流式请求 DeepSeek Chat Completions
  ↓
SSE 解析 reasoning_content / content / usage
  ↓
写入助手回答、本机用量
  ↓
扫描 HTML / SVG / Markdown / JSON 代码块
  ↓
可选创建 Artifact
```

系统上下文顺序：基础系统提示词 → 个人资料 → 回答偏好 → 已启用长期记忆 → 当前对话历史 → 本轮消息与文本附件。

---

## 3. 文件结构与职责

```text
src/
├── app/createConversationApp.js          # 总协调器
├── api/deepseek.js                       # API 请求与 SSE 解析
├── config/constants.js                   # 默认模型、接口、思考模式
├── state/settings.js                     # API Key 与连接设置
├── ui/
│   ├── layout.js                          # 页面壳、抽屉、弹窗、工作区 DOM
│   ├── messages.js                        # 聊天消息、思考块、Artifact 入口
│   └── icons.js                           # SVG 图标
├── features/
│   ├── conversations/
│   │   ├── conversationStore.js           # 对话 CRUD、标题、收藏、持久化
│   │   ├── conversationActions.js         # 顶部菜单、重命名弹窗
│   │   └── historySidebar.js              # 对话历史抽屉
│   ├── artifacts/
│   │   ├── artifactParser.js              # 识别可创建 Artifact 的代码块
│   │   ├── artifactStore.js               # Artifact 与版本本地存储
│   │   ├── artifactView.js                # Artifact 卡片、预览与作品库渲染
│   │   └── artifactWorkspace.js           # 工作区打开、编辑、复制、下载、删除
│   ├── attachments/
│   │   ├── attachmentStore.js             # 文本附件读取与上下文拼接
│   │   └── attachmentView.js              # 附件托盘与消息附件 UI
│   ├── settings/
│   │   ├── preferencesStore.js            # 个人资料、回答偏好、记忆、提示词拼装
│   │   ├── personalizationView.js         # 个性化设置页面
│   │   ├── settingsNavigator.js           # BH 设置中心导航
│   │   └── dataExport.js                  # 导出、复制、对话文本
│   └── usage/usageStore.js                # 本机 token / 请求统计
└── styles/
    ├── app.css
    ├── history.css
    ├── sheet.css
    ├── settings-hub.css
    ├── personalization.css
    ├── conversation-actions.css
    └── artifacts.css
```

`createConversationApp.js` 是唯一总协调器。新功能优先继续拆入 `features/`，不要把具体业务逻辑继续堆进这个文件。

---

## 4. 现有能力

### 对话

- 多轮聊天、本地历史、新建、切换、删除。
- SSE 流式输出。
- 思考过程与最终回答分开显示。
- 停止生成、错误提示、本机 token 统计。
- 第一条用户消息自动生成标题；手动重命名最多 80 字符。
- 收藏对话后，侧栏会出现“已收藏”分组。

### 当前对话顶部操作

- 空对话：右上操作完全隐藏。
- 有消息：显示右上“新对话 + 更多”胶囊。
- 更多菜单：分享、收藏/取消收藏、重命名、删除。
- 分享优先调用 Web Share API；不支持时复制文本。
- 项目系统尚不存在，因此没有“加入项目”伪入口。

### 模型与个性化

- 可修改 API Key、接口地址、模型、思考模式、基础系统提示词。
- UI 目前显示 `deepseek-v4-flash` / `deepseek-v4-pro`，以及快速 / 深度 / 极限三档思考模式。
- 模型名和请求字段必须以官方文档与账户权限为准，不能假设始终可用。
- BH 设置页支持个人资料、回答偏好、长期记忆、通知、隐私、导出和本机用量。
- 记忆不自动从聊天抽取，必须由用户主动创建、编辑、启用或关闭。

### 附件

- 支持文本、Markdown、JSON、CSV、日志和常见代码文件。
- 最多 4 个附件；单文件上限 2 MB；文本读取与总上下文都有长度限制。
- 图片可以选择，但当前会阻止发送，因为没有真实视觉模型链路。

### Artifact v1

触发条件：助手回答中出现完整代码块：

```text
```html
```svg
```md 或 ```markdown
```json
```

用户点击消息下方“可创建 Artifact”后：

- 保存为本地 Artifact。
- 侧栏顶部 Artifact 图标可打开作品库。
- 支持 HTML、SVG、Markdown、JSON。
- 支持版本切换、手动编辑并保存为新版本、复制、下载、删除。
- HTML 使用 `iframe sandbox="allow-scripts"` 预览，没有 `allow-same-origin`。
- SVG 使用无脚本 sandbox。
- Markdown / JSON 使用文本预览；JSON 会尝试格式化。

Artifact 不支持：自动 AI 改稿、云同步、公开链接、多文件项目、多人协作、Artifact 内部模型调用。

---

## 5. 本地存储

| Key | 内容 |
|---|---|
| `bin-deepseek-api-key` | API Key |
| `bin-deepseek-remember-api-key` | 是否长期记住 Key |
| `bin-deepseek-endpoint` | 接口地址 |
| `bin-deepseek-model` | 当前模型 |
| `bin-deepseek-thinking-mode` | 当前思考模式 |
| `bin-deepseek-system-prompt` | 基础系统提示词 |
| `bin-conversations-v1` | 对话、消息、标题、收藏、推理、附件元数据 |
| `bin-app-preferences-v1` | 个人资料、回答偏好、长期记忆、通知 |
| `bin-usage-v1` | 本机请求与 token 统计 |
| `bin-artifacts-v1` | Artifact、版本、活动版本、来源对话 |

关键对象：

```js
// Conversation
{ id, title, starred, createdAt, updatedAt, messages: [] }

// Artifact
{
  id,
  title,
  type, // html | svg | markdown | json
  sourceKey,
  conversationId,
  activeVersionId,
  versions: [{ id, label, content, createdAt }]
}
```

限制：最多 36 个 Artifact；每个最多 24 个版本；单版本最多 160,000 字符。

全量数据导出会遮蔽 API Key，并包含 Artifact。清除全部本地数据会删除对话、个性化、记忆、用量和 Artifact。

---

## 6. 安全与 UI 约束

1. API Key 不能写进源码、README、Codex、示例或截图。
2. 纯前端直连 API 仅适合个人受信任设备。
3. 公开给其他人使用前，需要后端或 Edge Function 代理、登录、额度、限流和审计。
4. 模型生成的内容不能通过不受控 `innerHTML` 注入聊天主页面。
5. Artifact HTML / SVG 必须保留隔离预览，不允许直接插入主应用 DOM。
6. 全局保留以下规则，防止移动端 Safari 中 `display:grid` 等样式覆盖隐藏状态：

```css
[hidden] { display: none !important; }
```

7. 所有抽屉、菜单、弹窗、Artifact 工作区初始状态都应显式关闭；不能仅依赖浏览器默认 `hidden` 行为。

---

## 7. 已知边界与下一步

当前没有：

- 图片理解、PDF/Office 结构化读取、联网搜索。
- Gmail / Drive / Notion 等 OAuth 连接器。
- 账号、公开分享、跨设备同步、真实额度与账单。
- 项目管理、多文件 Artifact、协作。

建议下一步顺序：

1. 修复并稳定当前 UI，再做 Markdown / 代码块安全渲染。
2. Artifact AI 迭代：把当前作品源码附带到下一轮请求，模型返回完整同类代码后保存为新版本。
3. Artifact 输出协议：减少普通代码块误识别。
4. 长期记忆按当前问题检索，只注入相关记忆。
5. 后端 / Edge Function：保护共享 Key、支持联网、连接器、账号与同步。

---

## 8. 版本更新记录

### 2026-06-22 · v0.2.1 · 建立 Codex
- 新增项目长期技术档案，记录架构、数据流、边界和维护规则。

### 2026-06-22 · v0.2.2 · 调整维护规则
- 开发前不再强制阅读 README 或 Codex。
- 每次开发完成后必须更新 Codex 与版本记录。

### 2026-06-22 · v0.2.3 · 当前对话操作菜单
- 新增右上条件式“新对话 + 更多”。
- 实现分享、收藏、重命名、删除。
- 对话对象新增 `starred`。

### 2026-06-22 · v0.2.4 · Artifact v1 本地作品工作区
- 新增 Artifact 解析、作品库、版本记录、HTML/SVG/Markdown/JSON 预览、手动编辑、复制、下载与删除。
- 新增 `bin-artifacts-v1`。
- Artifact HTML 通过 sandbox iframe 隔离运行。

### 2026-06-22 · v0.2.5 · 修复移动端重命名弹窗初始可见
- 问题：iPhone Safari 下，`.rename-dialog` 的 `display:grid` 可能覆盖浏览器对 `hidden` 的默认隐藏表现，页面初始化会错误显示重命名弹窗。
- 修复：`app.css` 新增全局 `[hidden]{display:none!important}`；`conversationActions` 初始化时显式执行 `closeMenu()` 与 `closeRenameDialog()`。
- 涉及文件：`src/styles/app.css`、`src/features/conversations/conversationActions.js`、`codex.md`。
- 数据/接口影响：无。
