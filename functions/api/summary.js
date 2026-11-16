import { generate } from "../_lib/llm.js";
import {
  validateState,
  validateActionsToday,
  rejectUnknownFields
} from "../_lib/state.js";

const LIMITS = { dinner: 120, letter: 200 };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const badField = rejectUnknownFields(body, ["kind", "state", "actionsToday"]);
    if (badField) return json({ error: badField }, 400);
    if (body.kind !== "dinner" && body.kind !== "letter") {
      return json({ error: "kind 只能是 dinner 或 letter" }, 400);
    }
    const stateCheck = validateState(body.state);
    if (!stateCheck.ok) return json({ error: stateCheck.error }, 400);
    const actCheck = validateActionsToday(body.actionsToday);
    if (!actCheck.ok) return json({ error: actCheck.error }, 400);
    const state = stateCheck.state;
    const actions = actCheck.actions;
    const limit = LIMITS[body.kind];

    const taskText = body.kind === "dinner"
      ? `写今天的晚饭总结，不超过 ${limit} 个汉字，温暖、简短，像奶奶在饭桌上说的话。`
      : `写春天第 7 天结束时奶奶给${state.girlName}的信，不超过 ${limit} 个汉字，温暖、简短。`;
    const system =
      "你是《丹丹的院子》里奶奶的声音。" + taskText +
      "只能写下面列出的今天真实发生过的事，绝不编新的事件、地点、物品、人物；" +
      "没有发生的事不要写成发生过；绝不提自己是 AI、模型或程序；只输出正文，不要标题。" +
      `今天是春天第 ${state.day} 天（共 7 天），小女孩叫${state.girlName}。` +
      `今天真实发生的行动：${actions.length ? actions.join("、") : "无（今天没有特别的行动）"}。`;
    const out = await generate(context.env || {}, [
      { role: "system", content: system },
      { role: "user", content: body.kind === "dinner" ? "请写今天的晚饭总结。" : "请写这封信。" }
    ]);
    if (!out.ok) {
      // 失败时前端用手写总结兜底，游戏不卡住。
      return json({ error: "总结服务暂时不可用", code: out.code || "MODEL_ERROR", offline: true }, 502);
    }
    const text = out.text.slice(0, limit);
    return json({ kind: body.kind, text, model: out.model });
  } catch (e) {
    return json({ error: "请求有误，请再试一次" }, 400);
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ error: "只接受POST" }, 405);
}
