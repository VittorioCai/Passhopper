# 规则与数据核实表

版本 v0.2 · 2026-11-04（已对照官网核实）

本文件记录产品依赖的每条规则、价格和外部服务条款，标明来源和核实状态。规则引擎的测试用例引用这里的编号（R1、R2…）。

**核实状态说明：**
- ✅ **官方确认**：已在官方网站原文核实
- 🟡 **多方一致**：多个可靠的第三方来源说法一致，但还没有在官方原文中核实
- ⚠️ **有冲突**：来源之间说法不一致，开发前必须核实

> **本版说明：** 2026-11-04 放行网络后，R1、R4、R5、R6 已对照 interrail.com 官方页面核实。通票价格（R3）在官网是由内部接口动态加载的，我们不抓取内部接口，所以价格仍是"多方一致"状态，App 内继续显示"价格未核实"提示。

---

## R1 品牌统一：Eurail 并入 Interrail　✅
- **内容**：2026 年 9 月 9 日或 10 日起（各来源日期差一天），Eurail 品牌在全球并入 Interrail，欧洲和非欧洲居民都购买 Interrail 通票。官方称产品本身不变。
- **核实（2026-11-04）**：eurail.com 已跳转到 interrail.com。
- **影响**：产品内统一使用 "Interrail"；用户档案仍需区分欧洲居民和非欧洲居民（见 R4）。
- **待核实**：非欧洲居民购买 One Country Pass 的限制（有来源称英国和瑞士的单国通票仅限欧洲居民购买）。
- **来源**：
  - [Eurail Rebrands as Interrail Globally – Open Jaw (2026-09-11)](https://openjaw.com/buzz-board/2026/09/11/eurail-rebrands-as-interrail-globally/)
  - [Eurail becomes Interrail – KarryOn](https://karryon.com.au/industry-news/need-to-know/eurail-becomes-interrail/)
  - [Eurail adopts Interrail name globally – Travel Trade Journal](https://traveltradejournal.com/eurail-adopts-interrail-name-globally-brings-both-rail-passes-under-one-brand/)
  - [Interrail – Wikipedia](https://en.wikipedia.org/wiki/Interrail)

## R2 年龄段　🟡
- **内容**：青年 12–27 岁，成人 28–59 岁，老人 60 岁及以上。0–11 岁儿童随付费成人免费，每位成人最多带 2 名儿童。
- **待核实**：年龄按出发日还是购买日计算。
- **来源**：[Interrail 2026 价格汇总 – Ulysse](https://ulysse.com/news/interrail-2026-vrai-cout-francais-guide)

## R3 Global Pass 2026 价格（二等，欧元）　⚠️
| 规格 | 青年 | 成人 | 老人 |
|---|---|---|---|
| Flexi 4 天 / 1 个月 | 212 | 283 | 255 |
| Flexi 5 天 / 1 个月 | 239 | 318 | — |
| Flexi 7 天 / 1 个月 | 286 | 381 | — |
| Flexi 10 天 / 2 个月 | 335 | 447 | — |
| Continuous 15 天 | 357 | 476 | — |
| Continuous 22 天 | 440 | 586 | — |

- **冲突**：一等舱 Flexi 4 天成人价，一个来源为 €359，克罗地亚铁路价格表为 €367。另有来源给出"青年起价 €194"等不同数字，可能是促销价或旧价格。
- **缺失**：老人价格大多缺失；1 个月、2 个月、3 个月 Continuous 价格；其他 Flexi 规格。
- **待办**：从官方价格页整理完整价格表，写入 `data/passes.json`。
- **来源**：
  - [克罗地亚铁路 HŽPP 2026 价格表](https://hzpp.hr/api/v1/repository/download/f9bad1bf-71ae-4ed8-b930-1b23711bb7d8)
  - [Interrail 2026 – Ulysse](https://ulysse.com/news/interrail-2026-vrai-cout-francais-guide)
  - [Interrail Europe 2026 Complete Guide – Pixidia](https://pixidia.com/en/interrail-europe-2026-complete-guide-pass-itineraries-budget/)

## R4 居住国出境和入境行程　✅
- **内容**：
  1. 欧洲居民使用 Global Pass 时，在居住国内可用 1 个旅行日出境、1 个旅行日入境。
  2. 出境：从居住国任意地点到边境、机场或港口；入境反之。
  3. 同一天内的多次乘车算作 1 次出境或入境行程。
  4. 先后顺序不限，可在有效期内任意时间使用。
  5. 用完之后，居住国内的其他行程需单独买票。
  6. 非欧洲居民不受此限制。
  7. One Country Pass 不能在自己的居住国使用。
  8. 只适用于居住国属于通票网络（Pass Network）的人；居住在网络以外国家的人不受此限制。
  9. 回到居住国、当天的旅行日结束后，再出境需要另外买票。
- **核实（2026-11-04）**：官方 FAQ 原文 "If you're travelling with a Global Pass and live in a country that is part of our Pass Network, your Pass usually includes one outbound journey and one inbound journey"。
- **实现**：`app/src/engine/residency.ts`。App 只让用户在通票网络国家中选择居住国，所以第 8 条自动满足。
- **来源**：
  - [What is an outbound or inbound journey? – Interrail 官方 FAQ](https://www.interrail.com/en/interrail-passes/interrail-mobile-pass/mobile-pass-faq/how-can-I-travel-in-my-country-of-residence-with-a-global-pass)
  - [Travel your own country – Interrail 官方](https://www.interrail.com/en/interrail-passes/what-is-interrail/travel-your-own-country)

## R5 夜车规则　✅
- **内容**：
  1. 旧的"19:00 以后出发"规则已经取消。
  2. 夜车跨过午夜，只要一直在同一趟车上，只需出发当天的旅行日。
  3. 午夜后换乘别的车，或在夜车到达当天继续乘车，需要第二个旅行日。
  4. 旅行日按当地时间从午夜到午夜计算。
  5. 有效期最后一天不能乘夜车回家，除非夜车到达那天仍在有效期内。
- **核实（2026-11-04）**：官方 How to use your Pass 页面原文 "you cannot use the last day of validity to return home by night train (unless the arrival day of the night train falls within the validity of your Pass)"。
- **实现**：`app/src/engine/optimizer.ts` 在有效期最后一天排除夜车（到达日在有效期内的情况暂未单独处理，结果偏保守）。
- **冲突**：部分旧网页仍把"19:00 规则"描述为现行规则，判断为过时信息。
- **来源**：
  - [Interrail rule for night trains – rail.cc](https://rail.cc/it/faq/interrail-night-train-rule)
  - [What is the 7pm rule for night trains – EveryRail](https://everyrail.com/blog/what-is-the-7pm-rule-for-night-trains/)

## R6 订座规则和费用　✅
官方三个费用页面（国内、国际、夜车），2026-11-04 读取。完整数据在 `app/src/data/reservationRules.ts`，每条规则标有 `verified`。下表是主要车型（二等 / 一等）：

| 车型 | 订座 | 费用 | 备注 |
|---|---|---|---|
| 法国 TGV INOUI（国内） | 必须 | €10–20 | 通票名额有限 |
| 法国 OUIGO 高铁（OGV） | 必须 | €10–20 | **通票适用**（旧资料说不适用，已过时） |
| 法国 OUIGO Train Classique（OTC） | 必须 | €5–10；巴黎 ↔ 布鲁塞尔 €10 / €15 | |
| 法国 Intercités | 部分线路必须 | 约 €1.60 起 | |
| 巴黎 ↔ 巴塞罗那 TGV | 必须 | €35（里昂、蒙彼利埃出发 €25） | |
| 法国 ↔ 西班牙 AVE | 必须 | €25 / €28 | |
| 巴黎 ↔ 都灵 / 米兰 TGV | 必须 | €31 / €45 | |
| 巴黎 ↔ 米兰 Frecciarossa | 必须 | €13 / €13 | |
| 法国 ↔ 德国 TGV / ICE | 必须 | €19 | 需通票专用票价 |
| TGV Lyria 法国 ↔ 瑞士 | 必须 | €29 / €39 | |
| Eurostar 伦敦 ↔ 巴黎 / 布鲁塞尔 | 必须 | €35 / €40 | 伦敦 ↔ 阿姆斯特丹 €35 / €43 |
| Eurostar 巴黎 ↔ 布鲁塞尔 | 必须 | €27 / €32 | 巴黎 ↔ 阿姆斯特丹、科隆 €32 / €37 |
| 意大利 Frecciarossa / Frecciargento | 必须 | €13 | |
| 意大利 Frecciabianca | 必须 | €10 | |
| 意大利 Intercity | 必须 | €3 | |
| 瑞士 ↔ 意大利 EuroCity | 必须 | €13–17 | 旧资料说"建议"，已过时 |
| 奥地利 / 德国 ↔ 意大利 Railjet（布伦纳） | 必须 | €10 / €15 | |
| 德国 ICE / IC / EC | 可选 | €5.50 / €6.90 | 去荷兰、丹麦的车 6 月 26 日至 8 月 16 日必须订座 |
| 奥地利 Railjet / IC | 可选 | €3 | |
| 瑞士 IC | 可选 | €4.40 | 观光列车（GEX、BEX）必须订座，价格不定 |
| 西班牙 AVE / iryo | 必须 | €10 / €13 | iryo 通票适用 |
| 西班牙 Alvia / Intercity / Euromed | 必须 | €6.50 / €10 | |
| 捷克 RegioJet、Leo Express | 必须 | RegioJet 约 €1.30–2.80；Leo 免费 | 通票适用 |
| Nightjet 夜车 | 必须 | 座位 €4.90–24.90；6 人卧铺 €19.90–64.90 | App 按 6 人卧铺最低价 €19.90 计算 |
| 其他夜车（EuroNight 等） | 必须 | 视线路而定 | App 显示"价格不定" |

- **冲突 1 已解决**：官方费用页面仍列出订座费，"2026 年 4 月起订座免费"的说法不成立。
- **冲突 2 已解决**：OUIGO（高铁和 Classique）在官方页面中都列为通票适用、必须订座。
- **App 计算方式**：回本计算使用每条规则的最低订座费；有价格区间的，在车次标签中显示区间，例如 "€13–17"。
- **未覆盖**：没有规则的车型显示"需核实规则"，提醒用户自己查询。
- **来源**：
  - [Domestic Train Reservation Fees – Interrail 官方](https://www.interrail.com/en/book-reservations/reservation-fees/domestic-train-reservation-fees)
  - [International Train Reservation Fees – Interrail 官方](https://www.interrail.com/en/book-reservations/reservation-fees/international-train-reservation-fees)
  - [Night Train Reservation Fees – Interrail 官方](https://www.interrail.com/en/book-reservations/reservation-fees/night-train-reservation-fees)

## R7 移动通票与官方 App　🟡
- **内容**：移动通票提前激活后计划变动可能浪费旅行日；网站上订的座位不会出现在 App 里，也不和通票关联；居住国的出境和入境行程由 App 自动识别，添加时需要联网。
- **影响**：产品内的提示文案；订座清单需要用户自己记录订座号。
- **来源**：
  - [Travel days on mobile pass – Interrail Community](https://community.interrail.com/interrail-passes-41/travel-days-on-mobile-pass-4949)
  - [Interrail Travel FAQ](https://www.interrail.eu/en/support/already-bought-pass)

## R8 欧洲边境：EES 与 ETIAS　🟡
- **EES**（出入境系统）：2026 年 4 月 10 日起在申根区全面运行。
- **ETIAS**（旅行授权）：官方曾定于 2026 年第四季度上线，但没有确定日期，有报道称可能推迟到 2027 年。
- **影响**：第一版不做签证功能。非欧洲居民的帮助页面里提醒用户关注，并链接欧盟官方网站。
- **来源**：
  - [EES goes live on 10 April 2026 – 法国外交部](https://www.diplomatie.gouv.fr/en/presse-et-ressources/decouvrir-et-informer/actualites/ees-le-nouveau-systeme-europeen-de-gestion-des-frontieres-entre-en-service-le-10-avril-2026)
  - [EU explainer on EES and ETIAS – EU Neighbours East](https://euneighbourseast.eu/news/latest-news/eu-publishes-explainer-on-main-differences-between-ees-and-etias-what-travellers-need-to-know/)

---

## 外部服务条款

### E1 Transitous　🟡
- 社区志愿者提供，只服务开源和非营利项目，不用于商业用途；不确定时联系对方，个案决定。
- 尽力而为，运营方可随时停止对任何使用方的服务。
- 资源有限：不要通过 API 抓取数据，需要全量数据时下载源数据集；预计用量较大时先在 Matrix 频道联系。
- 在显眼位置链接 Transitous 数据来源页，并在网站上提供联系方式。
- 正式地址 `https://api.transitous.org/api/`；测试环境不得用于正式应用。
- **已验证（2026-11-04）**：接口返回 `Access-Control-Allow-Origin: *`，浏览器可直接调用。
- **使用方式**：每次搜索只发一次 `/api/v5/plan` 请求（`detailedLegs=false` 减小体积），手动自定义城市才额外调用一次地理编码；不批量抓取。搜索结果下方链接到 Transitous 数据来源页，项目地址在 GitHub 上公开，满足其署名和联系方式要求。
- **来源**：[Transitous API 使用政策](https://transitous.org/api/)、[MOTIS 项目](https://github.com/motis-project/motis)

### E2 DeepSeek Search 与 Fetch API　🟡
- **请求格式**：Search 接口 `POST /v1/tools/search`，请求体 `{query, count}`，返回 `results[]`（title、url、snippet、summary、date）。来自第三方文档，官方文档页面在开发环境里打不开，待核实；代码按字段缺失容错处理。
- **模型名**：`deepseek-chat` 已于 2026-07-24 停用，第一版默认 `deepseek-v4-flash`（第三方来源，用户可在设置里改）。
- **已验证（2026-11-04）**：`/chat/completions` 和 `/v1/tools/search` 都允许浏览器直接跨域调用（返回请求来源作为 CORS 允许来源），所以不需要中转服务器，用户的 key 只从他自己的浏览器发出。
- 2026 年 10 月 17 日上线。Search（`POST /v1/tools/search`）返回网页搜索结果；Fetch（`POST /v1/tools/fetch`）把一个网页转换为 Markdown 返回。
- 价格：TechNode 报道为每 1000 次成功请求 5 元人民币；另有来源写 0.75 美元。失败、无结果和超时不计费。
- 对话接口内可能另有模型自己调用的服务端搜索工具，与独立 API 不同（待验证，开发文档 S3）。
- **来源**：
  - [DeepSeek launches web search and page-fetching APIs – TechNode (2026-10-19)](https://technode.com/2026/10/19/deepseek-launches-web-search-and-page-fetching-apis-for-ai-agents/)
  - [DeepSeek undercutting search API rivals – The New Stack](https://thenewstack.io/deepseek-web-search-api/)
  - [DeepSeek Search/Fetch 说明 – APIYI 文档](https://docs.apiyi.com/en/api-capabilities/deepseek-search-fetch/overview)

### E4 OpenFreeMap　🟡
- 免费矢量地图瓦片，不需要 key，不需要注册。必须显示 OpenStreetMap 署名（地图右下角的 (i) 按钮里）。
- **已验证（2026-11-04）**：`tiles.openfreemap.org/styles/positron` 和 `/styles/dark` 可访问，允许跨域。使用条款以 openfreemap.org 为准（开发环境打不开该网站，未逐条核对）。

### E3 db-rest（备选）　⚠️
- 社区维护的德铁数据接口，有用户报告 `v6.db.transport.rest` 连续数天返回 503。只作备选。
- **来源**：[transport.rest issue #34](https://github.com/public-transport/transport.rest/issues/34)

---

## 竞品与用户痛点（产品决策依据）
- **TREK**：开源自托管的协作旅行规划工具，约 3.7k 星，功能全面但不懂通票规则。[链接](https://awesome.ecosyste.ms/projects/github.com%2Fmauriceboe%2FTREK)
- **AdventureLog**：开源旅行记录和规划，约 2.2k 星。[链接](https://awesome.ecosyste.ms/projects/github.com%2Fseanmorley15%2FAdventureLog)
- **官方 Rail Planner App**：App Store 评分约 2.7；常见抱怨是订座不同步、有些车次搜不到也不能手动添加、规划功能弱、离线时刻表不准。
  - [App Store](https://apps.apple.com/us/app/id579547877)
  - [Many problems with the Rail Planner app](https://community.eurail.com/eurail-interrail-passes-41/many-problems-with-the-rail-planner-app-369)
  - [Can't add manual trips](https://community.eurail.com/train-connections-reservations-47/can-t-add-manual-trips-2975)
  - [Seat reservation doesn't appear on the app](https://community.eurail.com/train-connections-reservations-47/my-seat-reservation-from-toulouse-to-lyon-doesn-t-appear-on-the-rail-planner-app-3092)
