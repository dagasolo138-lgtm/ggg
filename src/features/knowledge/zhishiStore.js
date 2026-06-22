const ZHISHI_DB_NAME = "zhishi-db";
const ZHISHI_STORE_NAME = "facts";
const MAX_INJECT_FACTS = 50;
const MAX_INJECT_CHARS = 3000;
const STOP_WORDS = new Set(["的", "了", "是", "在", "和", "与", "或", "等", "也", "都", "这", "那", "有", "为", "被", "对", "从", "以", "及", "其"]);

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function normalizeFactText(fact) {
  return String(fact?.content || fact?.text || fact?.fact || fact?.body || "").trim();
}

function sourceHint(fact) {
  return String(fact?.source_hint || fact?.sourceHint || fact?.source || fact?.url || "来源：zhishi").trim();
}

export async function openZhishiDB() {
  if (typeof indexedDB === "undefined") return null;

  try {
    const request = indexedDB.open(ZHISHI_DB_NAME);
    return await new Promise((resolve) => {
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ZHISHI_STORE_NAME)) {
          db.close();
          resolve(null);
          return;
        }
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export function extractKeywords(text) {
  const cleaned = String(text || "").replace(/[\p{P}\p{S}]+/gu, " ").toLowerCase();
  const keywords = [];
  cleaned.split(/\s+/u).forEach((chunk) => {
    const word = chunk.trim();
    if (!word) return;
    if (word.length > 1 && !STOP_WORDS.has(word)) keywords.push(word);
    const hanRuns = word.match(/[\p{Script=Han}]+/gu) || [];
    hanRuns.forEach((run) => {
      Array.from(run).forEach((char, index, chars) => {
        const pair = `${char}${chars[index + 1] || ""}`;
        if (pair.length > 1 && !STOP_WORDS.has(pair)) keywords.push(pair);
      });
    });
  });
  return [...new Set(keywords)];
}

export function scoreFact(fact, keywords) {
  const haystack = `${normalizeFactText(fact)} ${sourceHint(fact)}`.toLowerCase();
  const hits = keywords.reduce((count, keyword) => {
    let index = haystack.indexOf(keyword);
    let matches = 0;
    while (index !== -1) {
      matches += 1;
      index = haystack.indexOf(keyword, index + keyword.length);
    }
    return count + matches;
  }, 0);
  const qualityScore = Number(fact?.quality_score || fact?.qualityScore || 0);
  return hits + (Number.isFinite(qualityScore) ? qualityScore : 0) * 0.1;
}

export async function searchRelevantFacts(userMessage) {
  const db = await openZhishiDB();
  if (!db) return [];

  try {
    const keywords = extractKeywords(userMessage);
    if (!keywords.length) return [];

    const transaction = db.transaction(ZHISHI_STORE_NAME, "readonly");
    const store = transaction.objectStore(ZHISHI_STORE_NAME);
    const facts = await requestToPromise(store.getAll());

    let usedChars = 0;
    return (Array.isArray(facts) ? facts : [])
      .map((fact) => ({ fact, score: scoreFact(fact, keywords) }))
      .filter(({ fact, score }) => score > 0 && normalizeFactText(fact))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_INJECT_FACTS)
      .sort((a, b) => Number(b.fact?.quality_score || b.fact?.qualityScore || 0) - Number(a.fact?.quality_score || a.fact?.qualityScore || 0))
      .map(({ fact }) => fact)
      .filter((fact) => {
        const length = normalizeFactText(fact).length;
        if (usedChars + length > MAX_INJECT_CHARS) return false;
        usedChars += length;
        return true;
      });
  } catch {
    return [];
  } finally {
    db.close();
  }
}

export function buildKnowledgeContext(facts) {
  if (!Array.isArray(facts) || !facts.length) return "";
  const lines = facts
    .map((fact) => {
      const content = normalizeFactText(fact);
      return content ? `- ${content}（${sourceHint(fact)}）` : "";
    })
    .filter(Boolean);
  if (!lines.length) return "";
  return [
    "[知识库参考]",
    "以下是用户本地知识库中与当前问题相关的事实，",
    "仅在相关时引用，不要当作绝对权威：",
    ...lines,
  ].join("\n");
}
