# DeepSeek V4 Playground

一个零构建步骤的纯前端聊天页，调用 DeepSeek 的 OpenAI 兼容 Chat Completions API。

## 现在已经有的功能

- DeepSeek V4 Flash / Pro 模型切换
- 三档思考模式：快速（关闭思考）、深度（`high`）、极限（`max`）
- SSE 流式输出：思考过程和最终回答分开实时展示
- 可折叠的思考过程与本次 token 用量显示
- 多轮对话、停止生成、清空对话、请求错误提示
- `Enter` 发送，`Shift + Enter` 换行
- API Key 只保留在当前浏览器会话（`sessionStorage`），不会提交到 GitHub

## DeepSeek V4 请求逻辑

页面向下面的接口发送请求：

```text
POST https://api.deepseek.com/chat/completions
```

默认模型是 `deepseek-v4-flash`，也可以切换成 `deepseek-v4-pro`。

- 快速：`thinking: { type: "disabled" }`
- 深度：`thinking: { type: "enabled" }` + `reasoning_effort: "high"`
- 极限：`thinking: { type: "enabled" }` + `reasoning_effort: "max"`

页面使用 `stream: true` 和 `stream_options: { include_usage: true }`。流式分段中的 `reasoning_content` 用于展示思考过程，`content` 用于最终回答。

普通多轮对话只回传此前的角色和最终回答，不重复塞入旧思考内容，避免上下文无意义膨胀。后续接入工具调用时，需要同步保存并回传 `reasoning_content`、`tool_calls` 和对应的工具结果。

## 直接运行

这是静态网页，没有依赖和构建步骤。直接打开 `index.html` 即可；更推荐用一个本地静态服务器打开：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 纯前端的限制

当前版本适合你自己使用。浏览器会直接请求 DeepSeek API：

- API 服务端必须允许浏览器跨域请求（CORS）；
- API Key 必须存在浏览器内存中，因此不能把这个版本当作公开产品部署给别人；
- 公开部署时应该改为后端或 Edge Function 代理，Key 放在服务端环境变量里，并加上身份验证、额度、限流和记录。

## 下一步可加

- Markdown / 代码高亮与复制按钮
- 本地聊天记录、搜索、导出
- 图片与文件输入
- 工具调用与联网搜索
- 服务端代理、登录和 Vercel 部署
