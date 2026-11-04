# Passhopper 通票漫游 · 文档索引

> 产品名称：**Passhopper**（中文界面名称：通票漫游）。标语：Plan your Interrail trip. Make the pass pay off.
> "Interrail" 是 Eurail B.V. 的注册商标，产品名不能直接使用它（见开发文档 §11）。

## 文档

| 文档 | 内容 |
|---|---|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 开发文档：产品定位、功能需求、规则引擎、AI 接入、技术架构、数据模型、里程碑 |
| [UI-DESIGN.md](./UI-DESIGN.md) | UI 设计文档：设计原则、视觉规范、信息架构、页面线框、组件、状态与文案 |
| [RULES-AND-SOURCES.md](./RULES-AND-SOURCES.md) | 规则与数据核实表：每条通票规则、价格、外部服务条款的来源、核实状态 |
| [../prototype/](../prototype/README.md) | 可点击原型（v0.1） |

## 已确定的决策（2026-11-04）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 产品方向 | 专注 Interrail 通票的规划工具，不做通用旅行规划；面向国际市场 |
| D2 | 目标用户 | 欧洲居民和非欧洲居民都要。2026 年 9 月起 Eurail 已并入 Interrail，两类用户用的是同一种通票，区别只在本国出行规则 |
| D3 | 产品形态 | 独立 Web 项目（PWA），开源放在 GitHub，不用 Claude Artifact |
| D4 | AI 模型 | 多模型可选：DeepSeek（默认）、Claude、任意兼容 OpenAI 格式的接口 |
| D5 | AI 费用 | 只支持用户自带 API key。key 只存在用户自己的浏览器里，服务端不保存。产品公开给所有人使用 |
| D6 | 联网搜索 | DeepSeek 已于 2026-10-17 推出官方 Search / Fetch API，作为统一的联网搜索能力 |
| D7 | 第一版功能 | 路线规划、旅行日规划、订座清单、回本计算，四个都做 |
| D8 | 代码仓库 | https://github.com/VittorioCai/Passhopper（公开） |
| D9 | 文档形式 | Markdown，放在仓库 `docs/` 目录 |
| D10 | 产品名称 | 英文名 Passhopper，中文名 通票漫游；GitHub 仓库名 `passhopper`。名称不含 Interrail / Eurail 商标 |
| D11 | 开源许可证 | MIT |
| D12 | 界面语言 | 第一版英文；简体中文作为第二语言，之后加入。从第一天起所有文案走 i18n |
| D13 | 配色 | 薄荷汽水（薄荷绿 + 柠檬黄） |
| D14 | 图标 | Phosphor（MIT） |
| D15 | 标志 | 站点 P（1a 精修版），文件在 `design/logo/` |

## 待决定事项

- [ ] 域名（例如 passhopper.app，待查是否可注册）
- [x] 中国大陆访问：第一版不作为目标，加入中文界面时再评估（开发文档 §9.3）
- [ ] 评审本目录三份文档，确认后进入 M0 开发
