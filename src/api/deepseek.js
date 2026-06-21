function apiError(data, fallback) {
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

function parseSseEvent(rawEvent, onDelta) {
  const payload = rawEvent.trim();
  if (!payload || payload === "[DONE]") return;

  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    throw new Error("接口返回了无法解析的流式数据。");
  }

  const choice = data?.choices?.[0];
  const delta = choice?.delta || {};
  onDelta({
    content: typeof delta.content === "string" ? delta.content : "",
    reasoningContent: typeof delta.reasoning_content === "string" ? delta.reasoning_content : "",
    finishReason: choice?.finish_reason || null,
    usage: data?.usage || null,
  });
}

export async function streamCompletion({ settings, history, signal, onDelta }) {
  const messages = [
    ...(settings.systemPrompt.trim() ? [{ role: "system", content: settings.systemPrompt.trim() }] : []),
    ...history.map(({ role, content, apiContent }) => ({ role, content: apiContent || content })),
  ];

  const body = {
    model: settings.model,
    messages,
    thinking: { type: settings.thinkingMode === "disabled" ? "disabled" : "enabled" },
    stream: true,
    stream_options: { include_usage: true },
  };
  if (settings.thinkingMode !== "disabled") body.reasoning_effort = settings.thinkingMode;

  let response;
  try {
    response = await fetch(settings.endpoint.trim(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("浏览器无法连接到接口。检查网络、接口地址，或确认服务商是否允许跨域请求。");
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      // Gateway errors may be HTML instead of JSON.
    }
    throw new Error(apiError(data, `接口请求失败（HTTP ${response.status}）。`));
  }

  if (!response.body) throw new Error("浏览器不支持读取流式响应。");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lines = [];

  const consumeLine = (line) => {
    if (line === "") {
      if (lines.length) {
        parseSseEvent(lines.join("\n"), onDelta);
        lines = [];
      }
      return;
    }
    if (line.startsWith("data:")) lines.push(line.slice(5).trimStart());
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const nextLines = buffer.split(/\r?\n/);
    buffer = nextLines.pop() || "";
    nextLines.forEach(consumeLine);
  }

  buffer += decoder.decode();
  if (buffer) consumeLine(buffer);
  if (lines.length) parseSseEvent(lines.join("\n"), onDelta);
}
