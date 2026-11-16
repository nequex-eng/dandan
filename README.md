# 丹丹的院子·春天（v2）

治愈系生活模拟网页小游戏：春天7天，一座院子加半条胡同。扮演刚搬来的小女孩，也可以随时切换成北京犬丹丹，用狗的鼻子闻出院子的秘密。

## 怎么玩

本地运行（无构建步骤，静态文件在 `public/`，大模型接口走 Cloudflare Pages Functions，本地静态服务器下聊天自动离线回落）：

```bash
cd dandan/public
python3 -m http.server 8901
```

浏览器打开 http://localhost:8901/ 即可。

## 名字规则

- 狗叫丹丹，是一只北京犬；奶奶只叫奶奶，没有别的名字。
- 小女孩没有固定名字。开始画面会请玩家输入名字；留空就叫小女孩。名字存在变量里，所有对话与界面都用这个变量显示。

## 玩法（v2）

- 8个地点：石榴树下、厨房与灶台、正房与炕头、花坛与菜畦、水缸与墙角、门槛与院门、屋顶与晾衣绳、半条胡同，每个都能互动。
- 7天，每天2-3个任务；每天只有6点时光，做一件正事花1点，点数用完就只能吃晚饭——选了这个就错过那个。时段光线随点数推进（清晨→夜晚），天气按天固定（晴、微风、小雨、多云、花瓣雨）。
- 双视角：默认扮演小女孩，按Q或点「切换」变成丹丹。丹丹视角压低、颜色变淡，闻出8秒内衰减的金色气味轨迹，要实时跟着轨迹走才能找到藏点；丹丹有闻、听、钻、叼四种本事，至少3个隐藏事件（旧弹珠、时间胶囊、炕头下的旧照片）只有丹丹能发现。信任≥5时丹丹会跑在前面带路。
- 人物是画出来的：小女孩、奶奶、丹丹（短腿、狮子鬃、摇尾巴）、橘猫都有走路/待机动画，丹丹有闻、刨土动画，奶奶做饭时有搅拌动画。
- 走路：网格寻路绕开房子、厨房和院墙，只从院门进出；轴向碰撞，不穿墙、不贴边滑行。
- 种花是成长模拟：向日葵分阶段长，浇水加水、晴天加阳光、杂草每天长，不除草长得慢；第7天开花要水够、草少。
- 做饭是火候计时：火候条红标来回跑，在绿区里点下一步才算好火候，奶奶心情好时绿区更宽；连续两次烧糊要重做。收齐2道菜谱（西红柿炒鸡蛋、凉拌黄瓜）。
- 捉迷藏（第3天起，每天一次）：丹丹藏进8个地点之一，3次机会，靠气味和声音提示找。
- 记忆拼图：找到碎片后，三张记忆卡要按先后顺序点对，才能看到完整往事。
- 奶奶心情与丹丹信任：陪奶奶、做饭涨心情，心情高时做饭绿区更宽；喂丹丹、玩捉迷藏涨信任。
- 聊天：点「和奶奶聊聊」可以和奶奶或丹丹的心声自由聊，每天最多8句，走后端大模型（见下），离线时自动用手写台词，不挡玩。
- 收集：相册面板看记忆碎片与照片；喂丹丹、陪丹丹玩会涨丹丹信任。

## 操作

- WASD/方向键走路，E或点按互动，Q切换角色；丹丹模式下Z闻、X听、C钻、V叼。
- 手机：屏幕方向键加互动、切换按钮，丹丹模式下出现闻、听、钻、叼按钮。
- 点地点名字，角色会自己走过去再互动。

## 性能开关（旧手机友好）

- 单canvas 2D绘制，零外部图片、音频与CDN，devicePixelRatio上限为1；音效全部是程序化WebAudio（脚步、鸟鸣、滋滋声、汪汪、哼唱、五声音阶循环），无音频文件。
- 开始画面与游戏内设置都有「低画质」（关粒子与阴影）与「30帧」（锁30fps）开关；另有声音开关。
- 切到后台（visibilitychange）与任何对话框打开时暂停渲染。

## 存档

只用localStorage保存（开始画面「继续游戏」读档，「保存」手动存档，设置里「重新开始」清空重开）。

## 测试

```bash
node test/test.js
```

本地Playwright脚本（55项，2026-11-16全过）：加载页面、检查控制台无报错、输入名字开始游戏、走路、完成第1天任务、时光点扣减、切换丹丹并用闻（气味轨迹出现）、逐天完成全部7天任务到结局、做饭计时得分、捉迷藏、种花成长、离线聊天回落、声音开关、切换低画质、验证留空名字显示为小女孩，逐项输出通过或失败。本地静态服务器不支持POST，/api/*的501报错已在测试里过滤（线上走Pages Functions，不存在）。

## LLM 后端（v2，Cloudflare Pages Functions）

后端在 `functions/`，部署配置见 `wrangler.toml` 与 `deploy.sh`（部署命令：`bash deploy.sh`，默认项目 `dandandog`）。模型主路是 MiniMax-M3（`https://api.minimaxi.com/v1/text/chatcompletion_v2`），备用是 Workers AI Llama（`[ai]` 绑定，依次试 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`、`@cf/meta/llama-3.1-8b-instruct`、`@cf/mistral/mistral-7b-instruct-v0.1`）。密钥只读 Pages 环境变量 `MINIMAX_API_KEY`，绝不写进代码、日志或前端。

### 端点

- `GET /api/status`：只读环境变量，不调模型。返回 `{available, mode, provider}`，`mode` 为 `minimax` / `workers-ai` / `offline`。
- `POST /api/chat`：`{speaker: "grandma"|"dandan", messages: [{role, content}]（取最后 6 条，每条 ≤300 字）, state}`。奶奶是 78 岁北京胡同奶奶，跟 7 岁女孩说话，≤80 字；丹丹是北京犬的内心独白（汪汪翻译），≤60 字。服务端截断回复到 120 字。无模型返回 503 `{code: "MODEL_NOT_CONNECTED", offline: true}`，模型调用失败返回 502 `{offline: true}`，前端用手写台词兜底。
- `POST /api/task`：`{state}`。LLM 只提议一个小支线任务，返回严格 JSON `{task: {label ≤20 字, area, kind}}`；`area` 限 8 个地点 ID（tree、kitchen、house、garden、jar、gate、roof、hutong），`kind` 限 water、tidy、find、greet、cook、play。标签含白名单外的地点/物品/人物、JSON 非法或模型失败时，一律返回 200 `{task: null, offline: true, fallback: {label: "给丹丹梳梳毛", area: "tree", kind: "play"}}`。LLM 只提议、不改游戏状态，接不接由前端决定。
- `POST /api/summary`：`{kind: "dinner"|"letter", state, actionsToday: string[]（≤12 条，每条 ≤40 字）}`。晚饭总结 ≤120 字，结局信 ≤200 字，只写 `actionsToday` 里真实发生过的事，不编新情节。失败返回 502 `{offline: true}`，前端用手写总结兜底。

### 哪些调 LLM，哪些不调

- 调 LLM：奶奶对话、丹丹内心独白、晚饭总结/结局信、动态支线任务提议。
- 绝不调 LLM：移动/碰撞/渲染、种花生长、做饭计时、存档、主线剧情与结局结构、隐藏点触发。LLM 只负责台词与提议，游戏逻辑全在前端本地。

### 校验与兜底

所有端点服务端校验：未知字段、未知 `speaker`/`kind`、越界数值（`day` 1–7、`trust` 0–20、`plantStage` 0–4、`grandmaMood` 0–10）、白名单外的碎片（marble、capsule、photo_old、kite、fish、story、sunflower、family）与菜谱（tomato、cucumber）一律 400。奶奶只叫奶奶，小女孩名字只来自开始画面输入（留空为“小女孩”）。模型离线时前端显示离线标记、用手写台词与任务，游戏永不因 LLM 卡住。

### 接入模型（还需手动做的一步）

在 Cloudflare Dashboard → Pages → 项目 `dandandog` → Settings → Environment variables 里加一条 Production Secret：变量名 `MINIMAX_API_KEY`，值填 MiniMax 的 API Key。不设这个密钥时，备用路 Workers AI（`[ai]` 绑定，已写进 `wrangler.toml`）仍可工作；两路都没有时端点返回离线状态，前端走手写兜底。

### 成本控制

短提示词、短回复（MiniMax `temperature 0.7`、`max_tokens 512`，回复服务端截断到 120 字；总结/信分别截断到 120/200 字）、无流式输出；每人每天对话次数上限由前端执行；`GET /api/status` 不调模型。
