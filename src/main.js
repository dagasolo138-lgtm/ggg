import { createConversationApp } from "./app/createConversationApp.js";

const root = document.querySelector("#app");

try {
  if (!root) throw new Error("找不到应用根节点 #app。");
  createConversationApp(root);
} catch (error) {
  console.error("应用启动失败：", error);
  const message = error instanceof Error ? error.message : "未知错误";
  const fallback = `
    <main style="min-height:100vh;padding:32px;background:#dceaff;color:#284762;font-family:system-ui,sans-serif">
      <h1 style="margin:0 0 12px;font-size:22px">页面启动失败</h1>
      <p style="margin:0;line-height:1.6"></p>
    </main>
  `;

  if (root) {
    root.innerHTML = fallback;
    root.querySelector("p").textContent = message;
  } else {
    document.body.innerHTML = fallback;
    document.body.querySelector("p").textContent = message;
  }
}
