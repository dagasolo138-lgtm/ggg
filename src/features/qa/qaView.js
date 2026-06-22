import { copyText, downloadJson } from "../settings/dataExport.js";
import { runQaSuite, summarizeQaRun } from "./qaRunner.js";

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function resultLabel(status) {
  return { pass: "通过", review: "待人工检查", error: "请求失败" }[status] || "未完成";
}

function renderResults(container, report) {
  container.replaceChildren();
  if (!report) return;

  report.results.forEach((result) => {
    const card = element("article", `qa-result qa-${result.status}`);
    const head = element("div", "qa-result-head");
    head.append(element("strong", "", result.title), element("span", "qa-result-status", resultLabel(result.status)));
    const expectation = element("p", "qa-result-expectation", result.expectation);
    const note = element("p", "qa-result-note", result.note || "");
    const answer = document.createElement("pre");
    answer.className = "qa-result-answer";
    answer.textContent = result.content || "未返回文本。";
    card.append(head, expectation, note, answer);
    container.append(card);
  });
}

export function mountQaPanel({ getSettings, onOpenConnection }) {
  let controller = null;
  let report = null;

  const overlay = element("section", "qa-overlay");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "真实对话验收");

  const panel = element("div", "qa-panel");
  const header = element("header", "qa-header");
  const title = element("div", "");
  title.append(element("h1", "", "真实对话验收"), element("p", "", "仅在 ?qa=1 打开。不会写入对话、记忆或本地设置。"));
  const leave = element("button", "qa-close", "关闭");
  leave.type = "button";
  header.append(title, leave);

  const description = element("p", "qa-description", "将使用当前浏览器里的 API 配置，顺序发送 6 组场景、共 7 次请求。点击运行前不会调用接口。测试结果只存在当前页面，可复制或下载。建议使用临时、限额 Key。" );
  const controls = element("div", "qa-controls");
  const run = element("button", "qa-button primary", "运行验收");
  const stop = element("button", "qa-button", "停止");
  const copy = element("button", "qa-button", "复制结果");
  const download = element("button", "qa-button", "下载 JSON");
  const openSettings = element("button", "qa-button", "打开 API 设置");
  [run, stop, copy, download, openSettings].forEach((button) => { button.type = "button"; });
  stop.disabled = true;
  copy.disabled = true;
  download.disabled = true;
  controls.append(run, stop, copy, download, openSettings);

  const status = element("p", "qa-status", "准备就绪。");
  const summary = element("p", "qa-summary");
  const results = element("div", "qa-results");
  panel.append(header, description, controls, status, summary, results);
  overlay.append(panel);
  document.body.append(overlay);

  function setRunning(running) {
    run.disabled = running;
    stop.disabled = !running;
    openSettings.disabled = running;
  }

  function close() {
    controller?.abort();
    overlay.remove();
    const url = new URL(window.location.href);
    url.searchParams.delete("qa");
    window.history.replaceState({}, "", url);
  }

  leave.addEventListener("click", close);
  openSettings.addEventListener("click", () => onOpenConnection?.());
  stop.addEventListener("click", () => controller?.abort());

  run.addEventListener("click", async () => {
    const settings = getSettings?.();
    if (!settings?.apiKey?.trim()) {
      status.textContent = "缺少 API Key，请先填写。";
      onOpenConnection?.();
      return;
    }

    report = null;
    results.replaceChildren();
    summary.textContent = "";
    copy.disabled = true;
    download.disabled = true;
    controller = new AbortController();
    setRunning(true);
    status.textContent = "正在准备测试…";

    try {
      report = await runQaSuite({
        settings,
        signal: controller.signal,
        onCaseStart(testCase, index, total) {
          status.textContent = `正在运行 ${index + 1}/${total}：${testCase.title}`;
        },
        onCaseComplete(_result, index, total) {
          status.textContent = `已完成 ${index}/${total} 组。`;
        },
      });
      const totals = summarizeQaRun(report);
      status.textContent = "验收完成。";
      summary.textContent = `通过 ${totals.pass} 项；待人工检查 ${totals.review} 项；请求失败 ${totals.error} 项。`;
      renderResults(results, report);
      copy.disabled = !totals.hasOutput;
      download.disabled = false;
    } catch (error) {
      status.textContent = error?.name === "AbortError" ? "验收已停止。" : (error instanceof Error ? error.message : "验收运行失败。");
    } finally {
      controller = null;
      setRunning(false);
    }
  });

  copy.addEventListener("click", async () => {
    if (!report) return;
    try {
      await copyText(JSON.stringify(report, null, 2));
      status.textContent = "验收结果已复制。";
    } catch {
      status.textContent = "复制失败，请下载 JSON。";
    }
  });

  download.addEventListener("click", () => {
    if (!report) return;
    downloadJson(`bin-qa-${new Date().toISOString().slice(0, 10)}.json`, report);
    status.textContent = "验收结果已下载。";
  });

  return { close };
}
