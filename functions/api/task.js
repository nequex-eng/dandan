import { generate } from "../_lib/llm.js";
import {
  validateState,
  rejectUnknownFields,
  AREAS,
  AREA_NAMES,
  TASK_KINDS
} from "../_lib/state.js";

const FALLBACK_TASK = { label: "给丹丹梳梳毛", area: "tree", kind: "play" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

// 任务标签白名单词：地点、物品、人物。标签里出现的实义词必须出自这里，
// 否则视为模型编了新地点/物品/人物，丢弃并用手写任务兜底。
const ALLOWED_LABEL_WORDS = [
  "丹丹", "奶奶", "小女孩",
  "向日葵", "弹珠", "时间胶囊", "旧照片", "照片", "风筝", "鱼", "故事", "全家福",
  "石榴树", "石榴", "厨房", "灶台", "正房", "炕头", "花坛", "菜畦", "菜",
  "水缸", "墙角", "门槛", "院门", "屋顶", "晾衣绳", "胡同", "院子",
  "水", "花", "饭", "毛", "碗", "桌子", "椅子", "被子", "衣服", "绳子",
  "树", "草", "叶子", "鸡蛋", "西红柿", "黄瓜", "种子", "土"
];
// 只起连接/动作作用的单字，标签里出现不算新内容。
const GENERIC_CHARS = new Set("给帮陪浇扫擦喂梳找看玩做种收拾捡拾起放摆叠晾晒的和跟一起去来再下上中边里外后前天今小".split(""));

function labelInScope(label, girlName) {
  let rest = label;
  const words = [...ALLOWED_LABEL_WORDS, girlName].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const w of words) rest = rest.split(w).join("");
  rest = [...rest].filter((ch) => !GENERIC_CHARS.has(ch) && !/[\s，。、！？,.!?]/.test(ch)).join("");
  return rest.length === 0;
}

function validateTask(t, girlName) {
  if (!t || typeof t !== "object" || Array.isArray(t)) return null;
  const keys = Object.keys(t);
  if (keys.length !== 3 || !keys.includes("label") || !keys.includes("area") || !keys.includes("kind")) return null;
  if (typeof t.label !== "string") return null;
  const label = t.label.trim();
  if (!label || label.length > 20) return null;
  if (!AREAS.includes(t.area)) return null;
  if (!TASK_KINDS.includes(t.kind)) return null;
  if (!labelInScope(label, girlName)) return null;
  return { label, area: t.area, kind: t.kind };
}

function fallback() {
  return json({ task: null, offline: true, fallback: { ...FALLBACK_TASK } });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const badField = rejectUnknownFields(body, ["state"]);
    if (badField) return json({ error: badField }, 400);
    const stateCheck = validateState(body.state);
    if (!stateCheck.ok) return json({ error: stateCheck.error }, 400);
    const state = stateCheck.state;

    const system =
      "你给一款春天 7 天治愈小游戏出一个小支线任务。只输出严格 JSON，不要任何其他文字：" +
      '{"task":{"label":"任务短名","area":"地点ID","kind":"类型"}}。' +
      "label 不超过 20 个汉字，必须是院子里已经有的东西或人做的事，" +
      "绝不编新的地点、物品、人物；area 只能是 " + AREAS.map((a) => `${a}(${AREA_NAMES[a]})`).join("、") +
      "；kind 只能是 " + TASK_KINDS.join("、") + "（water 浇水、tidy 收拾、find 找东西、greet 打招呼、cook 做饭、play 玩）。" +
      `当前是第 ${state.day} 天，小女孩叫${state.girlName}，向日葵生长阶段 ${state.plantStage}/4，` +
      `今天已完成：${state.tasksDoneToday.length ? state.tasksDoneToday.join("、") : "无"}。`;
    const out = await generate(context.env || {}, [
      { role: "system", content: system },
      { role: "user", content: "请出一个今天能做的小任务。" }
    ]);
    if (!out.ok) return fallback();
    let parsed = null;
    try {
      const start = out.text.indexOf("{");
      const end = out.text.lastIndexOf("}");
      if (start === -1 || end === -1 || end <= start) return fallback();
      parsed = JSON.parse(out.text.slice(start, end + 1));
    } catch (e) {
      return fallback();
    }
    const task = validateTask(parsed && parsed.task, state.girlName);
    if (!task) return fallback();
    // LLM 只提议任务，不改游戏状态：前端收到 task 后自己决定接不接、怎么记。
    return json({ task, model: out.model });
  } catch (e) {
    return json({ error: "请求有误，请再试一次" }, 400);
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json({ error: "只接受POST" }, 405);
}
