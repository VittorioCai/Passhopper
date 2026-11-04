# Passhopper 开发文档

版本 v0.2 · 2026-11-04 · 状态：待评审

> v0.2：产品面向国际市场，界面以英文为主，简体中文作为第二语言（第一版之后加入）。

---

## 1. 产品概述

### 1.1 一句话定位
**Plan your Interrail trip. Make the pass pay off.**
帮旅行者把 Interrail 通票用到回本的规划工具：排路线、算旅行日、管订座、比价格，一个地方搞定。面向国际市场，界面以英文为主，之后提供简体中文。

### 1.2 要解决的问题
| 痛点 | 现状 |
|---|---|
| 买通票到底值不值 | 通票价格加上订座费，和点对点票比较，需要手动查几十个价格 |
| Flexi 通票的旅行日怎么分配 | 夜车跨午夜、本国出入境次数、最后一天不能坐夜车等规则容易踩坑 |
| 订座混乱 | 哪些车必须订座、多少钱、去哪订、名额会不会抢光，各国都不一样 |
| 官方 Rail Planner App 不好用 | App Store 评分约 2.7。几乎没有规划功能，网站订的座位不同步到 App，有些车次搜不到也不能手动添加，离线时刻表不准 |
| 规则信息分散 | 规则散落在官方 FAQ、论坛和博客里，说法经常互相矛盾，很多还是过时的 |

### 1.3 不做什么
- **不卖票，不出二维码。** 出票、验票继续用官方 Rail Planner App。我们只做它上面的规划层。
- **不做通用旅行规划。** 酒店、景点、餐厅只用备注记录，不做专门功能。
- **不承诺价格和规则绝对准确。** 所有数字都标明来源和可信度，关键信息给出官方链接让用户核实。

### 1.4 目标用户
| 用户 | 特点 | 规则差异 |
|---|---|---|
| **欧洲居民**：在欧洲生活的学生和上班族（包括国际学生） | 熟悉当地，常做短途周末游或暑期长线 | Global Pass 在居住国只能用于 1 次出境行程和 1 次入境行程 |
| **非欧洲居民**：从美洲、亚洲、大洋洲等地来欧洲旅行的游客 | 第一次去欧洲，签证和规则不熟，行程集中在 2 到 4 周 | 不受居住国限制 |

> 2026 年 9 月起 Eurail 品牌并入 Interrail，全球用户买的都是 Interrail 通票，产品内统一使用 "Interrail" 这个称呼。详见 RULES-AND-SOURCES.md R1。

### 1.5 差异化
1. **规则引擎**：把旅行日、本国出入境、夜车等规则写成代码，自动计算，不靠用户自己理解。
2. **回本优化**：自动选出哪几天用旅行日最划算、买几天的通票，并和"不买通票"直接比较。
3. **AI 改计划**：用一句话修改行程，AI 给出改动对比，用户确认后才生效。
4. **可信度透明**：每个数字都标明来源（官方、实时、估算、AI、用户填写）。
5. **移动优先、多语言**：先做英文，之后加简体中文；旅途中离线也能看。

---

## 2. 功能需求（第一版 MVP）

优先级：P0 = 第一版必须有，P1 = 第一版尽量有，P2 = 以后再做。

### F0 行程与用户档案
| ID | 需求 | 优先级 |
|---|---|---|
| F0.1 | 创建、复制、删除多个行程；行程列表按出发日期排序 | P0 |
| F0.2 | 新建行程时填写旅客档案：居住地（欧洲国家 / 非欧洲）、年龄段（青年 / 成人 / 老人）、舱等（一等 / 二等）、人数 | P0 |
| F0.3 | 所有数据保存在浏览器本地（IndexedDB），不需要注册 | P0 |
| F0.4 | 导出和导入行程 JSON 文件，用于备份和换设备 | P0 |
| F0.5 | 通过链接分享只读行程（数据编码在链接里，不经过服务器） | P2 |

### F1 路线规划
| ID | 需求 | 优先级 |
|---|---|---|
| F1.1 | 按顺序添加城市（站点），每个城市设置到达日期和停留晚数；拖拽调整顺序 | P0 |
| F1.2 | 相邻城市之间自动生成一段"火车段"，可以展开成多次换乘 | P0 |
| F1.3 | 火车段查询真实时刻表（Transitous），列出候选车次，选中后填入车次、时间、换乘 | P0 |
| F1.4 | 查不到或不想查时可以手动填写车次信息 | P0 |
| F1.5 | 每段火车标出：是否通票覆盖、是否必须订座、预计订座费、预计点对点票价 | P0 |
| F1.6 | 每段附上核实链接（各国铁路官网、DB 德铁查询、Seat61 等） | P0 |
| F1.7 | 地图显示整条路线 | P1 |
| F1.8 | 日期冲突和不合理安排提示，例如到达晚于下一段出发、某天换乘超过 3 次 | P1 |
| F1.9 | 城市里的每日备注（住宿、要做的事） | P1 |

### F2 旅行日规划
| ID | 需求 | 优先级 |
|---|---|---|
| F2.1 | 选择通票类型：Flexi（N 天 / 有效期 1 个月或 2 个月）或 Continuous（连续 N 天） | P0 |
| F2.2 | 日历视图显示整个行程。每天标出：用旅行日、单独买票、无火车 | P0 |
| F2.3 | 规则引擎自动给出最优旅行日分配（算法见 §3） | P0 |
| F2.4 | 用户可以手动改某一天的选择，系统重新计算费用并提示违反的规则 | P0 |
| F2.5 | 欧洲居民自动识别出境行程和入境行程，并检查各只用 1 次 | P0 |
| F2.6 | 夜车规则：跨午夜不换车只算出发当天；午夜后换车要算第二个旅行日；有效期最后一天不能坐夜车 | P0 |
| F2.7 | 显示通票有效期窗口和剩余旅行日 | P0 |

### F3 订座清单
| ID | 需求 | 优先级 |
|---|---|---|
| F3.1 | 自动从路线生成订座清单，列出所有必须订座和建议订座的火车段 | P0 |
| F3.2 | 每项显示：车型、订座类型（必须 / 建议 / 不需要）、预计费用、订座渠道、是否有通票名额限制 | P0 |
| F3.3 | 状态：未订、已订（可填订座号和座位号）、不需要、改为买票 | P0 |
| F3.4 | 名额紧张的车（如法国 TGV）显示"建议尽早订"及原因 | P0 |
| F3.5 | 订座截止和建议预订时间提醒（PWA 通知） | P2 |
| F3.6 | 上传订座确认截图，AI 识别后自动填写 | P2 |

### F4 回本计算
| ID | 需求 | 优先级 |
|---|---|---|
| F4.1 | 比较三种方案：全部买点对点票、最优 Flexi 通票、最优 Continuous 通票 | P0 |
| F4.2 | 自动遍历所有通票规格（天数、有效期），找出总花费最低的 | P0 |
| F4.3 | 费用明细：通票价格、订座费合计、单独买票合计，每项可展开到具体火车段 | P0 |
| F4.4 | 点对点票价支持三种来源：用户填写、AI 估算、AI 联网搜索。显示价格区间，给出"最坏情况"下的结论 | P0 |
| F4.5 | 一句话结论，例如"买 7 天 Flexi 比全部买票省约 €120" | P0 |
| F4.6 | 敏感度提示，例如"如果巴黎到里昂提前买到 €29 的特价票，结论会反过来" | P1 |

### F5 AI 助手（贯穿各模块）
| ID | 需求 | 优先级 |
|---|---|---|
| F5.1 | 一句话生成初版路线，例如"7 月从柏林出发玩 3 周，想去意大利和瑞士，预算有限" | P0 |
| F5.2 | 一句话修改现有计划。AI 输出结构化改动（§4.4），用对比视图展示，用户确认后才应用，支持撤销 | P0 |
| F5.3 | 解释规则和计算结果，例如"为什么第 5 天建议单独买票" | P0 |
| F5.4 | 联网搜索最新信息（罢工、停运、订座规则变化），回答附来源链接 | P0 |
| F5.5 | 估算点对点票价，结果标记为"AI 估算" | P0 |
| F5.6 | 未配置 API key 时，除 AI 功能外的所有功能都能正常使用 | P0 |

### F6 设置
| ID | 需求 | 优先级 |
|---|---|---|
| F6.1 | 选择 AI 服务商，填写 API key、模型名和接口地址（自定义服务商） | P0 |
| F6.2 | "测试连接"按钮 | P0 |
| F6.3 | 清除所有 key；可选用密码加密保存 key | P0 / P1 |
| F6.4 | 语言：English（第一版）；简体中文（P1，第一版之后尽快加上）。所有文案从第一天起走 i18n | P0 |
| F6.5 | 货币显示：EUR 为主，可附带用户本国货币的参考价（如 USD、GBP、CNY；汇率定期更新） | P1 |

---

## 3. 规则引擎

规则引擎是本产品的核心，必须是**纯函数**、**有完整单元测试**、**和 UI、AI 完全解耦**。规则本身的来源和核实状态见 RULES-AND-SOURCES.md。

### 3.1 基本概念
- **旅行日**：一个日历日 00:00 至 23:59。时区按出发站当地时间计算。
- **段（Segment）**：一次乘车，从上车到下车，不含换乘。
- **行程段组（Journey）**：两个城市之间的一组段，可以包含换乘。
- **日期归属**：每个段归属到它的"计费日"。普通段的计费日就是出发日期；夜车按 §3.2 处理。

### 3.2 夜车规则（R5）
1. 夜车跨过午夜，只要一直在同一趟车上，只算出发当天的旅行日。
2. 午夜后下车换乘别的车，或当天之后还要坐车，换乘后的段算到到达日，需要第二个旅行日。
3. 夜车出发日是通票有效期的最后一天时，不能用通票（有效期到 23:59 结束）。

### 3.3 居住国规则（R4，只适用于欧洲居民）
1. 在居住国内，通票只能用于 1 次出境行程和 1 次入境行程。
2. 出境行程：从居住国任意地点到边境、机场或港口。入境行程反之。
3. 同一天内的多次乘车算作 1 次出境或入境行程。
4. 出境和入境的先后顺序不限。
5. 其他完全在居住国内的段，只能单独买票。
6. 非欧洲居民没有这些限制。

### 3.4 通票覆盖判断
每个段根据运营商和车型判断覆盖情况：`covered`（通票有效）、`covered_with_reservation`（有效，但必须另付订座费）、`not_covered`（不适用，例如部分私营或廉价高铁）、`unknown`（数据里没有，提示用户核实）。数据来自 `data/reservations.json`（§6.3）。

### 3.5 回本优化算法

**输入：**
- 所有段的计费日、通票覆盖情况、订座费 `r`、点对点估价 `p`（区间 `[p_min, p_max]`）
- 通票价格表（按年龄段、舱等）
- 旅客居住地

**每日价值：**
```
对每个日期 d：
  covered_d   = d 当天所有通票能覆盖的段
  value(d)    = Σ p(seg) - Σ r(seg)        (seg ∈ covered_d)
  // value(d) 表示"这天用一个旅行日能省多少钱"
  // 当天还有通票不覆盖的段，这些段无论如何都要买票，不影响 value(d)
```

**Flexi（N 天，有效期 W）：**
```
对每个可能的起始日 s（行程第一天到最后一天）：
  window      = [s, s + W)
  candidates  = window 内 value(d) > 0 的日期
  chosen      = candidates 中 value 最大的前 N 个（满足 §3.2、§3.3 的约束）
  savings(s)  = Σ value(chosen)
最优 Flexi(N, W) = max over s of savings(s)
总花费 = 通票价 + Σ 被选日期的订座费 + Σ 其余所有段的点对点票价
```
每天的价值互相独立，所以在固定窗口内贪心选前 N 个就是最优解。窗口最多几十个、规格十几种，计算量很小，不需要复杂优化。

**约束处理：**
- 欧洲居民的出境和入境行程：在居住国内的段，只有被标为出境或入境的那一天能计入 `covered_d`。算法会尝试把"离开居住国的第一天"和"回到居住国的最后一天"标为出境和入境。
- 有效期最后一天出发的夜车：如果该日期是窗口最后一天，夜车段从 `covered_d` 中移除。

**Continuous（连续 L 天）：**
窗口内每个 `value(d) > 0` 的日期都用通票，其余同上。

**输出：**
1. 每种方案的总花费（用 `p_min`、`p_mid`、`p_max` 各算一次，给出区间）
2. 推荐方案和一句话结论
3. 每天的建议（用旅行日 / 单独买票 / 无火车）和原因
4. 违反规则的提示

### 3.6 测试要求
- 规则引擎测试覆盖率 ≥ 95%。
- 必须包含的用例：跨午夜夜车、午夜后换乘、有效期最后一天的夜车、欧洲居民在居住国内多次出行、同一天多段换乘、通票不覆盖的车、价格区间导致结论反转。
- 每条规则的测试都标注对应 RULES-AND-SOURCES.md 中的规则编号。

---

## 4. AI 接入

### 4.1 原则
- **只支持用户自带 key（BYOK）**。key 只保存在用户浏览器，服务端不存储、不记录。
- **AI 只负责建议，规则引擎负责计算。** 涉及旅行日和费用的数字一律由规则引擎算，AI 不能直接给结论数字。
- **AI 改动必须经过用户确认。**
- **没有 key 时其余功能完全可用。**

### 4.2 服务商
| 服务商 | 对话接口 | 联网搜索 | 浏览器直连 | 说明 |
|---|---|---|---|---|
| **DeepSeek** | 兼容 OpenAI 格式的 Chat Completions，支持函数调用 | 官方 Search API（`POST /v1/tools/search`）和 Fetch API（`POST /v1/tools/fetch`），2026-10-17 上线 | 已验证：允许浏览器直连（S2） | 便宜；国内可直接访问 |
| **Claude** | Anthropic Messages API | API 自带网页搜索工具 | 支持（需加浏览器直连请求头） | 规划质量较好 |
| **自定义** | 任意兼容 OpenAI 格式的接口（用户填地址、模型名、key） | 可选：额外填一个 DeepSeek key 用于搜索 | 取决于对方 | 覆盖通义、Kimi、GPT 等 |

模型名不写死在代码里，由配置文件给出默认值，用户可在设置中修改。

**默认服务商**：首次打开设置时按界面语言给出推荐，英文界面推荐 Claude，中文界面推荐 DeepSeek（国内可直连、价格低）。只是推荐，用户随时可以换。

### 4.3 调用方式
> 2026-11-04：DeepSeek、Claude（SDK 的 `dangerouslyAllowBrowser`）都已验证可浏览器直连，第一版不做转发 Worker。下面第 2 条保留为自定义服务商不支持跨域时的备选方案。

1. **优先浏览器直连**：服务商允许跨域时，浏览器直接带着用户的 key 调用，不经过我们的服务器。
2. **不允许跨域时走转发**：Cloudflare Worker 做无状态转发。要求：
   - 只转发到白名单内的服务商地址，防止被当成开放代理。自定义服务商也必须经用户明确确认后才能走转发。
   - 不记录请求体和 key，不写日志，不缓存。
   - 按 IP 限流，防止转发带宽被滥用。
   - 代码开源，用户可以审计。

### 4.4 AI 修改计划的输出格式
AI 通过函数调用输出一组结构化操作，用 zod 校验后生成对比视图：

```ts
type PlanOp =
  | { op: 'add_stop';    city: string; afterStopId?: string; nights: number }
  | { op: 'remove_stop'; stopId: string }
  | { op: 'move_stop';   stopId: string; afterStopId: string | null }
  | { op: 'set_nights';  stopId: string; nights: number }
  | { op: 'set_start_date'; date: string }              // YYYY-MM-DD
  | { op: 'set_journey'; fromStopId: string; segments: SegmentDraft[] }
  | { op: 'set_note';    stopId: string; note: string };

interface PlanPatch {
  summary: string;      // 给用户看的一句话说明
  ops: PlanOp[];
  warnings?: string[];  // AI 认为需要用户注意的点
}
```
流程：AI 输出 `PlanPatch` → 校验失败则把错误回传给 AI 重试一次 → 在副本上应用 → 规则引擎重算 → 显示前后对比（城市、日期、费用变化）→ 用户点"应用"后写入，并压入撤销栈。

### 4.5 AI 工具（函数调用）
| 工具 | 作用 |
|---|---|
| `get_plan` | 读取当前行程（精简后的 JSON） |
| `propose_patch` | 提交 `PlanPatch` |
| `search_web` | 联网搜索（DeepSeek Search API 或 Claude 自带搜索） |
| `fetch_page` | 读取网页内容（DeepSeek Fetch API） |
| `search_timetable` | 查询 Transitous 时刻表 |
| `lookup_reservation_rule` | 查本地订座规则数据 |
| `estimate_cost` | 调用规则引擎计算某个方案的费用 |

### 4.6 提示词管理
- 系统提示词放在 `app/src/ai/prompts/`，有版本号，改动要走代码审查。
- 提示词明确要求：费用以 `estimate_cost` 结果为准；不确定的规则要说明并给出官方链接；联网搜到的信息必须附来源。
- 发给 AI 的行程数据里不包含任何个人身份信息，只有城市、日期、档案类别。
- AI 用用户当前的界面语言回答；城市名和车站名按当前语言显示。

---

## 5. 技术架构

### 5.1 总览
```
┌──────────────────────── 浏览器（PWA）────────────────────────┐
│  React UI ── 状态（Zustand）── 规则引擎（纯 TS）             │
│      │                │                                       │
│      │           IndexedDB（Dexie）：行程、设置、缓存        │
│      │                                                        │
│  AI 适配层 ──直连（允许跨域时）──────────► DeepSeek / Claude  │
│      │                                                        │
└──────┼──────────────────────────────────────────────────────┘
       │ 不允许跨域时，以及时刻表查询
       ▼
┌──── Cloudflare Worker（无状态）────┐
│  /api/ai/*        白名单转发、限流   │──► AI 服务商
│  /api/transit/*   转发并缓存        │──► api.transitous.org
└─────────────────────────────────────┘

静态数据（随前端一起发布）：通票价格表、订座规则、车站别名
```

### 5.2 技术选型
| 层 | 选择 | 理由 |
|---|---|---|
| 构建 | Vite 8 + TypeScript 6.0（strict） | 快、生态成熟。TypeScript 暂不升 7.0：typescript-eslint 目前只支持到 6.0 |
| UI | React 19 + React Router 8 | 生态最大，组件和人才都好找 |
| 样式 | CSS 变量（设计令牌）+ CSS Modules | 令牌对应 UI 设计文档；样式直接沿用原型，不引入 Tailwind，少一层依赖 |
| 状态 | Dexie 的实时查询（`useLiveQuery`） | 行程直接从本地数据库读取并自动刷新，不需要另加状态库 |
| 本地存储 | IndexedDB，通过 Dexie 访问 | 容量大，支持离线 |
| 校验 | zod | 校验 AI 输出、导入文件、数据文件 |
| 日期与时区 | date-fns + date-fns-tz | 旅行日按当地时区计算 |
| 地图（P1） | MapLibre GL JS + OpenFreeMap 矢量瓦片 | 免费、无需 key（条款待核实，S4） |
| PWA | vite-plugin-pwa（Workbox） | 离线、添加到桌面 |
| 国际化 | i18next | 第一版只有英文，第二个语言是简体中文。从第一天起所有文案走 i18n，日期、货币按语言区域格式化 |
| 测试 | Vitest + Testing Library（单元和组件）、Playwright（端到端，M1 起） | |
| 代码规范 | ESLint、Prettier、类型检查，CI 中强制执行 | |
| 包管理 | pnpm workspace（目前只有 `app`；S2 验证后不需要 `worker`） | |
| 部署 | Cloudflare Pages（前端）+ Cloudflare Workers（转发） | 个人用量免费，全球边缘节点 |

所有依赖锁定具体版本（`app/package.json` 不用 `^`），只选发布满两周的版本，并检查相互兼容。字体全部自托管（Fontsource），中文字体只在中文界面按需加载。

### 5.3 目录结构
```
passhopper/
├── app/                      前端
│   ├── src/
│   │   ├── engine/           规则引擎（纯函数，无 UI 依赖）
│   │   │   ├── travelDays.ts
│   │   │   ├── residency.ts
│   │   │   ├── nightTrain.ts
│   │   │   ├── coverage.ts
│   │   │   ├── optimizer.ts
│   │   │   └── __tests__/
│   │   ├── ai/
│   │   │   ├── providers/    deepseek.ts / claude.ts / openaiCompatible.ts
│   │   │   ├── tools/
│   │   │   ├── prompts/
│   │   │   └── patch.ts      PlanPatch 校验与应用
│   │   ├── transit/          Transitous 客户端
│   │   ├── db/               Dexie 表结构与迁移
│   │   ├── store/
│   │   ├── features/         route / travel-days / reservations / value / assistant / settings
│   │   ├── components/       通用组件（见 UI 设计文档 §6）
│   │   ├── styles/tokens.css
│   │   └── i18n/          en.json（第一版）、zh-CN.json（第二个语言）
│   └── e2e/
├── worker/                   Cloudflare Worker
├── data/                     静态数据 + JSON Schema
│   ├── passes.json
│   ├── reservations.json
│   ├── operators.json
│   ├── countries.json
│   └── schema/
├── docs/
└── .github/workflows/        CI
```

---

## 6. 数据模型

### 6.1 行程（存在 IndexedDB）
```ts
interface Trip {
  id: string;
  name: string;
  createdAt: string; updatedAt: string;
  schemaVersion: number;
  traveller: {
    residence: { type: 'europe'; country: string } | { type: 'non_europe' };  // country 为 ISO 3166-1 代码
    ageGroup: 'child' | 'youth' | 'adult' | 'senior';
    travelClass: 1 | 2;
    count: number;
  };
  pass: {
    mode: 'auto' | 'manual';            // auto = 由优化器选择
    selected?: PassProductRef;
    dayOverrides: Record<string, 'pass' | 'ticket'>;   // 用户手动指定的日期
  };
  stops: Stop[];
  journeys: Journey[];
  reservations: Record<string, ReservationState>;      // key = segmentId
}

interface Stop {
  id: string;
  place: { name: string; nameZh?: string; country: string; lat?: number; lon?: number; stationIds?: string[] };
  arriveDate: string;          // YYYY-MM-DD
  nights: number;
  note?: string;
}

interface Journey {
  id: string;
  fromStopId: string; toStopId: string;
  segments: Segment[];
}

interface Segment {
  id: string;
  from: StationRef; to: StationRef;
  departure: string; arrival: string;   // 带时区偏移的 ISO 8601
  operator?: string;                    // 对应 operators.json
  trainType?: string;                   // 例如 TGV、FR、ICE、NJ
  trainNumber?: string;
  isNightTrain: boolean;
  source: 'transitous' | 'manual' | 'ai';
  p2pPrice?: Money & { min?: number; max?: number; source: PriceSource };
  coverage?: Coverage;                  // 规则引擎计算后缓存
}

type PriceSource = 'user' | 'ai_estimate' | 'ai_search' | 'official';
interface Money { amount: number; currency: 'EUR' | 'GBP' | 'CHF' | string }

interface ReservationState {
  status: 'todo' | 'booked' | 'not_needed' | 'buy_ticket';
  bookingRef?: string; seat?: string; paid?: Money;
}
```

### 6.2 通票价格表 `data/passes.json`
```ts
interface PassProduct {
  id: string;                          // 例如 global-flexi-7in1m
  kind: 'flexi' | 'continuous';
  travelDays: number;                  // continuous 时等于天数
  validity: { days?: number; months?: number };
  prices: Array<{ ageGroup: string; travelClass: 1 | 2; amount: number; currency: 'EUR' }>;
  validFrom: string;                   // 价格生效日期
  source: SourceRef;
}
interface SourceRef { url: string; verifiedAt: string; status: 'official' | 'secondary' | 'unverified' }
```

### 6.3 订座规则 `data/reservations.json`
```ts
interface ReservationRule {
  id: string;
  match: { operator?: string; trainType?: string; countries?: string[]; route?: [string, string] };
  coverage: 'covered' | 'covered_with_reservation' | 'not_covered';
  reservation: 'mandatory' | 'recommended' | 'optional' | 'none';
  fee?: { second?: number; first?: number; currency: string; note?: string };
  passholderQuota?: { limited: boolean; note?: string };
  bookingChannels: Array<{ name: string; url?: string; note?: string }>;
  source: SourceRef;
}
```
匹配优先级：具体线路 > 运营商加车型 > 车型 > 国家默认值。都匹配不上时返回 `unknown`。

### 6.4 数据更新流程
- 每条数据都带 `source` 和 `verifiedAt`。
- CI 检查：超过 180 天未核实的数据产生警告。
- 用户可以在界面上点"报告数据错误"，生成预填好的 GitHub Issue。

---

## 7. 外部服务

| 服务 | 用途 | 条款要点 | 应对 |
|---|---|---|---|
| **Transitous**（`api.transitous.org`） | 车站搜索、时刻表、换乘方案 | 社区志愿者提供，只服务开源和非营利项目；尽力而为，可能随时停止服务；要在显眼位置链接其数据来源页并提供联系方式 | 本项目开源、免费，符合条件。Worker 缓存结果，设置带联系方式的 User-Agent。页脚和查询结果处显示来源链接。用量变大前先在其 Matrix 频道联系。转为商业用途时必须更换数据源 |
| **DeepSeek API** | 对话、联网搜索、网页读取 | 用户自己的 key，按用户自己的账户计费 | — |
| **Anthropic API** | 对话、网页搜索 | 同上 | — |
| **OpenFreeMap**（P1） | 地图瓦片 | 待核实（S4） | 地图做成可选模块，不可用时隐藏 |
| **db-rest**（备选） | 德铁时刻表 | 社区服务，有用户报告过长时间 503 | 只作备选，不作为主数据源 |

---

## 8. 隐私与安全
- **API key**：默认存在 IndexedDB 中。设置里明确提示"共享设备上不要保存 key"。可选用用户设置的密码加密存储（Web Crypto，AES-GCM，PBKDF2 派生密钥）。
- **行程数据**：只在用户设备上。发给 AI 时只包含城市、日期、档案类别。
- **转发 Worker**：不写日志，白名单转发，限流，开源可审计。
- **内容安全策略（CSP）**：`connect-src` 只允许白名单内的 AI 服务商、Transitous、自己的 Worker 和地图瓦片地址。
- **AI 输出**：一律当作不可信输入，用 zod 校验，渲染时转义，不执行任何 AI 返回的代码或链接跳转。
- **依赖安全**：开启 GitHub Dependabot 和 CodeQL。

---

## 9. 部署

### 9.1 环境
| 环境 | 地址 | 触发 |
|---|---|---|
| 预览 | Cloudflare Pages 为每个 PR 自动生成的预览地址 | 提交 PR |
| 正式 | 自定义域名 | 合并到 `main` |

### 9.2 CI（GitHub Actions）
代码检查 → 类型检查 → 单元测试 → 数据文件 Schema 校验 → 构建 → 端到端测试 → 部署。

### 9.3 中国大陆访问（优先级降低）
产品面向国际市场，第一版不专门优化中国大陆访问。加入中文界面时再评估。以下是届时的注意事项：
- Cloudflare 的默认域名（`*.pages.dev`、`*.workers.dev`）在大陆经常打不开，必须绑定自定义域名。
- 即使绑定了自定义域名，大陆访问 Cloudflare 的速度和稳定性也不保证。
- Google Fonts 在大陆不可用，字体必须自托管（UI 设计文档 §3.2）。
- DeepSeek 在大陆可直接访问，浏览器直连可行（S2 已验证）。
- **届时的建议**：先观察大陆用户的访问情况；如有需要，在香港或新加坡增加镜像。在大陆境内部署需要 ICP 备案，暂不考虑。

---

## 10. 里程碑

**当前进度（2026-11-04）**
- M0：项目骨架、CI、设计令牌、多语言框架、页面路由和 PWA 已完成；S2 已验证（DeepSeek 和 Transitous 都允许浏览器直连，不需要中转服务器）；订座规则、居住国规则和夜车规则已对照官网核实（见 RULES-AND-SOURCES.md）。S1 和 S4 已完成（见 §12.1）。
- M1：数据模型、本地存储、首次打开的示例行程、新建行程向导、路线页（地铁线路图、编辑城市和晚数、手动填写车次）、行程复制和删除、导出和导入已完成。Transitous 时刻表查询（F1.3）等网络放行后接入；地图（F1.7）和冲突提示（F1.8）放到 M2 之后。
- M2：规则引擎（`app/src/engine/`）已完成：通票覆盖与订座规则匹配、居住国出境和入境规则、夜车计费日和有效期最后一天规则、旅行日优化（Flexi 和连续通票，按最低、常见、最高票价各算一次）。界面上有路线页的通票条和车次标签、旅行日页（选通票、手动切换、规则冲突提示）、订座页（待处理、已订、订座号和座位）。价格和订座规则数据放在 `app/src/data/passes.ts` 和 `reservationRules.ts`，订座规则已对照官网核实（2026-11-04）；通票价格在官网由内部接口动态加载，仍标为"未核实"，界面上有提示。
- M3：回本页已完成：钱包式通票卡（省多少）、最低价特价票下结论会不会反转的提示、哪一段票价最影响结论（敏感度）、全部方案和全部买票的条形图（点击切换通票）、费用明细（订座费和单独买票可展开到每段车）、未填票价的提醒。
- M4：AI 助手已完成第一版（`app/src/ai/`）：DeepSeek、Claude、任意兼容 OpenAI 格式的服务商三选一，key 只存在浏览器（IndexedDB），全部浏览器直连，不需要转发 Worker。工具有 `propose_patch`（改动预览，规则引擎算费用变化，用户点"应用改动"后才写入，10 秒内可撤销）、`lookup_reservation_rule`、`search_web`（DeepSeek Search API；Claude 用自带的网页搜索）。设置页可选服务商、填 key 和模型、测试连接、清除 key。Claude 默认模型 `claude-opus-5-5`，开启服务端拒答回退（`fallbacks: "default"`）。尚未做：新建向导里一句话生成路线（F5.1，目前可在新行程里用助手完成）、用密码加密保存 key（F6.3 P1）。
- M4 之后（2026-11-04）：
  - **时刻表搜索（F1.3）**：添加火车时默认打开时刻表搜索，数据来自 Transitous，浏览器直连。按出发时段（07:00、11:00、15:00、19:00 之后）查询，过滤掉城市内到主站的短途接驳和明显更差的方案，选中后整段替换为真实车次。时刻表未发布的日期，改查最近一周同一星期几的车次，并明确提示。
  - **一句话生成路线（F5.1）**：有 AI key 时，新建向导第 2 步可以描述行程，AI 通过 `propose_route` 工具填好起点、城市、晚数和出发日期，用户再修改。
  - **路线地图（F1.7）**：路线页顶部可折叠的地图，MapLibre + OpenFreeMap，按国家线路色连线，夜车用虚线，深色模式用深色底图。地图库按需加载（gzip 约 290 KB），不支持 WebGL 时不显示。
  - **冲突提示（F1.8）**：车次时间重叠、换乘少于 8 分钟、一段换乘超过 3 次、白天单段超过 10 小时、不过夜的中转城市赶不上下一班车。AI 助手也能看到这些提示。
