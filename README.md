# bin returns!

一个面向移动端的 DeepSeek API 个人对话前端。项目使用 Vite + 原生 ES Modules，部署到 GitHub Pages。

> [codex.md](./codex.md) 是本项目的长期技术档案，记录当前进度、模块关系、数据流、存储位置、接口逻辑、功能边界与版本更新记录。
>
> **不要求每次开发前阅读 README 或 Codex；但每次开发完成后，必须更新 `codex.md` 的相关章节，并在末尾追加版本更新概述。**

## 当前能力

- 本地多轮对话、历史切换、新建、删除、清空与导出。
- SSE 流式输出；思考过程与最终回答分开显示。
- 当前界面配置的 V4 Flash / Pro 模型选择，快速 / 深度 / 极限三档思考模式。
- API Key、接口地址、模型、系统提示词自动保存。
- BH 全屏设置中心：个人资料、个性化与长期记忆、本机用量、隐私、通知、导出、能力说明。
- 结构化个性化：回答语言、长度、表达风格、结论优先、案例、表达禁忌、事实与不确定性规则。
- 用户手动维护的长期记忆：新增、编辑、启用、关闭、删除与上下文预览。
- 文本附件：`.txt`、`.md`、`.csv`、`.json` 和常见代码文件可随问题发送。

完整的文件地图、连接点、存储键、请求上下文顺序、已知边界和下一步计划，请看 [codex.md](./codex.md)。

## 本地运行

```bash
npm install
npm run dev
```

构建与预览：

```bash
npm run build
npm run preview
```

## GitHub Pages 部署

仓库包含 `.github/workflows/deploy-pages.yml`。每次推送到 `main`，Actions 会安装依赖、构建 `dist/` 并部署到 GitHub Pages。

首次使用时，在仓库中设置：

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

## 当前 API 配置

默认接口：

```text
POST https://api.deepseek.com/chat/completions
```

默认值和模型标识位于：`src/config/constants.js`。

- 快速：关闭思考。
- 深度：启用思考，`reasoning_effort: "high"`。
- 极限：启用思考，`reasoning_effort: "max"`。

模型名、请求字段和账户可用权限可能随服务商更新变化。涉及 API 改动时，先核对官方文档和账户实际权限。

## 纯前端边界与安全

当前版本适合个人受信任设备使用。浏览器会直接持有 API Key：

- 勾选“在此设备记住 API Key”时，Key 保存到当前站点的 `localStorage`。
- 未勾选时，Key 只保留在当前浏览器会话。
- Key 不会提交到 GitHub，也不会包含在本地数据导出文件中。

图片理解、联网搜索、OAuth 连接器、公开分享、账户系统、真实额度、跨设备同步都需要视觉模型或后端能力；当前页面不会把这些能力伪装成已完成。

正式公开给他人使用前，应增加服务端或 Edge Function 代理，并加入登录、额度、限流和使用记录。
