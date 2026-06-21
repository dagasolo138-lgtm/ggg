export function createChatState() {
  const messages = [];

  return {
    get history() {
      return messages.map((message) => ({ ...message }));
    },
    add(role, content, extras = {}) {
      messages.push({ role, content, ...extras });
    },
    removeLast() {
      messages.pop();
    },
    clear() {
      messages.length = 0;
    },
    get size() {
      return messages.length;
    },
  };
}
