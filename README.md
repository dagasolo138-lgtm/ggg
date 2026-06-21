# bin returns!

一个纯前端的 DeepSeek API 对话实验台。现在使用 Vite + 原生 ES Modules，页面、状态、接口、渲染和样式已经拆开。

## 当前能力

- DeepSeek V4 Flash / Pro 模型切换
- 快速、深度、极限三档思考模式
- SSE 流式回复，思考过程和最终回答分开显示
- 停止生成、清空对话、错误提示
- API Key 只存在当前浏览器会话，不提交进 GitHub
- 淡蓝色移动端聊天布局，设置位于底部抽屉

## 项目结构

```text
src/
  api/
    deepseek.js          # DeepSeek 请求与 SSE 解析
  app/
    createApp.js         # 应用编排、事件绑定
  config/
    constants.js         # 默认配置、模型与思考模式文案
  state/
    chat.js              # 对话状态
    settings.js          # Key 与设置的本地保存
  ui/
    icons.js             # SVG 图标
    layout.js            # 页面骨架与设置抽屉
    messages.js          # 消息与思考过程渲染
  styles/
    tokens.css           # 色彩与全局变量
    app.css              # 移动端聊天布局
    sheet.css            # 设置抽屉
  main.js                # 前端入口

index.html               # 只保留 #app 与入口脚本
```

## 本地运行

```bash
npm install
npm run dev
```

构建静态产物：

```bash
npm run build
```

产物会生成到 `dist/`，适合发布到 GitHub Pages 或其他静态托管。

## DeepSeek 调用逻辑

接口默认是：

```text
POST https://api.deepseek.com/chat/completions
```

- 快速：`thinking: { type: "disabled" }`
- 深度：`thinking: { type: "enabled" }` + `reasoning_effort: "high"`
- 极限：`thinking: { type: "enabled" }` + `reasoning_effort: "max"`

页面使用 `stream: true` 接收 SSE 流。`reasoning_content` 展示为可折叠思考过程，`content` 展示为最终回答。

## 纯前端边界

当前架构适合你自己使用。浏览器会直接持有 API Key，因此不适合把 Key 版公开给别人。正式公开部署时，应增加服务端或 Edge Function 代理，并加入登录、额度、限流和使用记录。
