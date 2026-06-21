const STORAGE_KEY = "bin-usage-v1";

const EMPTY_USAGE = {
  requestCount: 0,
  totalTokens: 0,
  reasoningTokens: 0,
  lastUpdatedAt: 0,
};

function normalize(value) {
  return {
    requestCount: Number.isFinite(value?.requestCount) ? value.requestCount : 0,
    totalTokens: Number.isFinite(value?.totalTokens) ? value.totalTokens : 0,
    reasoningTokens: Number.isFinite(value?.reasoningTokens) ? value.reasoningTokens : 0,
    lastUpdatedAt: Number.isFinite(value?.lastUpdatedAt) ? value.lastUpdatedAt : 0,
  };
}

export function createUsageStore() {
  let usage = { ...EMPTY_USAGE };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) usage = normalize(JSON.parse(raw));
  } catch {
    usage = { ...EMPTY_USAGE };
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  }

  return {
    get snapshot() {
      return { ...usage };
    },

    record(apiUsage) {
      const totalTokens = Number(apiUsage?.total_tokens) || 0;
      const reasoningTokens = Number(apiUsage?.completion_tokens_details?.reasoning_tokens) || 0;
      usage = {
        requestCount: usage.requestCount + 1,
        totalTokens: usage.totalTokens + totalTokens,
        reasoningTokens: usage.reasoningTokens + reasoningTokens,
        lastUpdatedAt: Date.now(),
      };
      persist();
      return this.snapshot;
    },

    clear() {
      usage = { ...EMPTY_USAGE };
      localStorage.removeItem(STORAGE_KEY);
      return this.snapshot;
    },
  };
}
