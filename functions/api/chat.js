import { generate, llmStatus } from "../_lib/llm.js";
import {
  validateState,
  validateMessages,
  rejectUnknownFields,
  grandmaSystemPrompt,
  dandanSystemPrompt
} from "../_lib/state.js";

const MAX_REPLY_CHARS = 120;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const badField = rejectUnknownFields(body, ["speaker", "messages", "state"]);
    if (badField) return json({ error: badField }, 400);
    if (body.speaker !== "grandma" && body.speaker !== "dandan") {
      return json({ error: "speaker 只能是 grandma 或 dandan" }, 400);
    }
    const msgCheck = validateMessages(body.messages);
    if (!msgCheck.ok) return json({ error: msgCheck.error }, 400);
    const stateCheck = validateState(body.state);
    if (!stateCheck.ok) return json({ error: stateCheck.error }, 400);

    const env = context.env || {};
    const system = body.speaker === "grandma"
      ? grandmaSystemPrompt(stateCheck.state)
      : dandanSystemPrompt(stateCheck.state);
    const out = await generate(env, [{ role: "system", content: system }, ...msgCheck.history]);
    if (out.ok) {
      // 服务端截断：再短的模型回复也不超过 120 字。
      const reply = out.text.slice(0, MAX_REPLY_CHARS);
      return json({ reply, speaker: body.speaker, model: out.model });
    }
    if (out.code === "MODEL_NOT_CONNECTED") {
      return json(
        { error: "对话服务还没接好", code: "MODEL_NOT_CONNECTED", offline: true, status: llmStatus(env) },
        503
      );
    }
    return json({ error: "对方一时接不上话", code: "MODEL_ERROR", offline: true }, 502);
  } catch (e) {
    return json({ error: "请求有误，请再试一次" }, 400);
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ error: "只接受POST" }, 405);
}
