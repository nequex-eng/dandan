// 《丹丹的院子》v2：游戏状态白名单校验 + 角色系统提示词。
// 所有 LLM 端点共用同一份校验：未知字段、越界数值、白名单外的值一律 400。
// 名字规则：狗叫丹丹；奶奶只叫奶奶，绝不编名字；小女孩的名字只来自开始画面输入，留空就是“小女孩”。

export const FRAGMENTS = ["marble", "capsule", "photo_old", "kite", "fish", "story", "sunflower", "family"];
export const RECIPES = ["tomato", "cucumber"];
export const AREAS = ["tree", "kitchen", "house", "garden", "jar", "gate", "roof", "hutong"];
export const TASK_KINDS = ["water", "tidy", "find", "greet", "cook", "play"];

export const AREA_NAMES = {
  tree: "石榴树下",
  kitchen: "厨房与灶台",
  house: "正房与炕头",
  garden: "花坛与菜畦",
  jar: "水缸与墙角",
  gate: "门槛与院门",
  roof: "屋顶与晾衣绳",
  hutong: "半条胡同"
};

export const FRAGMENT_NAMES = {
  marble: "旧弹珠",
  capsule: "时间胶囊",
  photo_old: "炕头下的旧照片",
  kite: "风筝",
  fish: "鱼",
  story: "故事",
  sunflower: "向日葵",
  family: "家人合影"
};

export const RECIPE_NAMES = {
  tomato: "西红柿炒鸡蛋",
  cucumber: "凉拌黄瓜"
};

const DEFAULT_STATE = {
  day: 1,
  girlName: "小女孩",
  fragments: [],
  recipes: [],
  trust: 0,
  plantStage: 0,
  tasksDoneToday: [],
  grandmaMood: 5,
  actionsToday: []
};

function isIntInRange(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

function validateStringArray(v, maxItems, maxLen) {
  if (!Array.isArray(v) || v.length > maxItems) return null;
  const out = [];
  for (const s of v) {
    if (typeof s !== "string") return null;
    const t = s.trim();
    if (!t || t.length > maxLen) return null;
    out.push(t);
  }
  return out;
}

// 校验 compact state。缺字段用默认值补齐；未知字段、越界值、白名单外的值返回错误。
export function validateState(raw) {
  if (raw === undefined || raw === null) return { ok: true, state: { ...DEFAULT_STATE } };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "state 格式不对" };
  const allowed = new Set(Object.keys(DEFAULT_STATE));
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k)) return { ok: false, error: "state 里有不认识的字段：" + k };
  }
  const state = { ...DEFAULT_STATE };
  if (raw.day !== undefined) {
    if (!isIntInRange(raw.day, 1, 7)) return { ok: false, error: "day 只能是 1 到 7" };
    state.day = raw.day;
  }
  if (raw.girlName !== undefined) {
    if (typeof raw.girlName !== "string") return { ok: false, error: "girlName 只能是字符串" };
    const name = raw.girlName.trim();
    if (name.length > 8) return { ok: false, error: "girlName 最多 8 个字" };
    state.girlName = name || "小女孩";
  }
  if (raw.fragments !== undefined) {
    if (!Array.isArray(raw.fragments) || raw.fragments.some((f) => !FRAGMENTS.includes(f))) {
      return { ok: false, error: "fragments 里有不认识的碎片" };
    }
    state.fragments = [...new Set(raw.fragments)];
  }
  if (raw.recipes !== undefined) {
    if (!Array.isArray(raw.recipes) || raw.recipes.some((r) => !RECIPES.includes(r))) {
      return { ok: false, error: "recipes 里有不认识的菜谱" };
    }
    state.recipes = [...new Set(raw.recipes)];
  }
  if (raw.trust !== undefined) {
    if (!isIntInRange(raw.trust, 0, 20)) return { ok: false, error: "trust 只能是 0 到 20" };
    state.trust = raw.trust;
  }
  if (raw.plantStage !== undefined) {
    if (!isIntInRange(raw.plantStage, 0, 4)) return { ok: false, error: "plantStage 只能是 0 到 4" };
    state.plantStage = raw.plantStage;
  }
  if (raw.tasksDoneToday !== undefined) {
    const v = validateStringArray(raw.tasksDoneToday, 12, 40);
    if (v === null) return { ok: false, error: "tasksDoneToday 格式不对" };
    state.tasksDoneToday = v;
  }
  if (raw.grandmaMood !== undefined) {
    if (!isIntInRange(raw.grandmaMood, 0, 10)) return { ok: false, error: "grandmaMood 只能是 0 到 10" };
    state.grandmaMood = raw.grandmaMood;
  }
  if (raw.actionsToday !== undefined) {
    const v = validateStringArray(raw.actionsToday, 12, 40);
    if (v === null) return { ok: false, error: "actionsToday 格式不对" };
    state.actionsToday = v;
  }
  return { ok: true, state };
}

// 校验 actionsToday 顶层字段（summary 端点用）：最多 12 条，每条最多 40 字。
export function validateActionsToday(raw) {
  if (raw === undefined || raw === null) return { ok: true, actions: [] };
  const v = validateStringArray(raw, 12, 40);
  if (v === null) return { ok: false, error: "actionsToday 格式不对" };
  return { ok: true, actions: v };
}

// 校验对话历史：只取最后 6 条，每条 role 是 user/assistant，内容最多 300 字，末条必须是 user。
export function validateMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "请先说一句话" };
  const history = [];
  for (const m of raw.slice(-6)) {
    if (!m || typeof m !== "object") return { ok: false, error: "messages 格式不对" };
    if (m.role !== "user" && m.role !== "assistant") return { ok: false, error: "messages 里 role 只能是 user 或 assistant" };
    if (typeof m.content !== "string") return { ok: false, error: "messages 里 content 只能是字符串" };
    const content = m.content.trim();
    if (!content || content.length > 300) return { ok: false, error: "每句话最多 300 个字" };
    history.push({ role: m.role, content });
  }
  if (history[history.length - 1].role !== "user") return { ok: false, error: "请先说一句话" };
  return { ok: true, history };
}

// 顶层 body 只允许白名单字段，多一个也 400。
export function rejectUnknownFields(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "请求体格式不对";
  for (const k of Object.keys(body)) {
    if (!allowed.includes(k)) return "请求里有不认识的字段：" + k;
  }
  return null;
}

function stateSummary(state) {
  return [
    `今天是春天第 ${state.day} 天（共 7 天）`,
    `小女孩叫${state.girlName}`,
    `已收集的记忆碎片：${state.fragments.length ? state.fragments.map((f) => FRAGMENT_NAMES[f]).join("、") : "无"}`,
    `已学会的菜：${state.recipes.length ? state.recipes.map((r) => RECIPE_NAMES[r]).join("、") : "无"}`,
    `丹丹信任：${state.trust}/20`,
    `向日葵生长阶段：${state.plantStage}/4`,
    `今天已完成的任务：${state.tasksDoneToday.length ? state.tasksDoneToday.join("、") : "无"}`,
    `奶奶心情：${state.grandmaMood}/10`,
    `今天的行动：${state.actionsToday.length ? state.actionsToday.join("、") : "无"}`
  ].join("；") + "。"
}

const PLACES_LINE = "院子里只有这 8 个地方：" + AREAS.map((a) => AREA_NAMES[a]).join("、") + "。";

export function grandmaSystemPrompt(state) {
  return (
    "你是奶奶，一位 78 岁的北京胡同奶奶，住在一个春天的小院里，说话温暖、慢、像跟 7 岁孙女聊天。" +
    "只说中文短句，一次回答不超过 80 个汉字，内容要适合 7 岁孩子。" +
    "只能根据下面给的真实游戏状态说话，绝不编新的地点、物品、人物或过去的事；" +
    "没发生过的事不要说成发生过；绝不提自己是 AI、模型或程序。" +
    PLACES_LINE +
    "当前状态：" + stateSummary(state)
  );
}

export function dandanSystemPrompt(state) {
  return (
    "你是丹丹，一只北京犬。把你的汪汪叫翻译成一句简短的人话，是狗的内心独白，调皮、可爱。" +
    "一次回答不超过 60 个汉字。" +
    "只能根据下面给的真实游戏状态说话：你现在的行为、你闻到的气味、附近已经藏着的东西；" +
    "绝不编新的地点、物品、人物；绝不提自己是 AI、模型或程序。" +
    PLACES_LINE +
    "当前状态：" + stateSummary(state)
  );
}
