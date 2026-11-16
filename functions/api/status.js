import { llmStatus } from "../_lib/llm.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

// GET /api/status：只读环境变量判断模型是否接好，不发起任何模型调用。
// 返回 { available, mode, provider }，mode 为 minimax / workers-ai / offline。
export async function onRequest(context) {
  if (context.request.method !== "GET") return json({ error: "只接受GET" }, 405);
  const env = context.env || {};
  const s = llmStatus(env);
  return json({ available: s.available, mode: s.mode, provider: s.provider });
}
