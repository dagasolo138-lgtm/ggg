# DeepSeek V4 Playground

一个零构建步骤的纯前端聊天页，用于调用兼容 OpenAI Chat Completions 格式的 API。

## 现在已经有的功能

- API Key、接口地址、模型名与系统提示词配置
- 多轮对话
- 发送状态与接口错误提示
- `Enter` 发送、`Shift + Enter` 换行
- 清空对话
- API Key 只保留在当前浏览器会话（`sessionStorage`），不会提交到 GitHub

## 直接运行

这是静态网页，没有依赖和构建步骤。直接打开 `index.html` 即可；更推荐用一个本地静态服务器打开，例如：

```bash
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 默认配置

- Endpoint：`https://api.deepseek.com/chat/completions`
- Model：`deepseek-v4`

模型标识必须以你的 API 服务商账户实际开放的名称为准。页面中可以直接修改接口地址和模型名。

## 安全边界

当前版本适合你自己在本机使用。浏览器发请求时必须能拿到 API Key，因此**不适合直接公开部署给其他人使用**。后续要做成可公开访问的产品，需要增加后端或 Edge Function：

1. Key 存在服务端环境变量里；
2. 前端只请求你自己的 `/api/chat`；
3. 服务端再转发到 DeepSeek API；
4. 再加额度、登录、限流和使用记录。

## 下一步可加

- 流式输出
- Markdown / 代码高亮
- 聊天记录导出与本地保存
- 多模型切换
- 联网搜索、文件上传、图片输入
- 后端代理与 Vercel 部署
