# AlphaScout

_最后更新:2026-06-12_

FRC 8810 Alphabots 的 **2026 赛季 REBUILT** scouting 应用,移动端优先。Alpha\* 系列第三件
([AlphaSim](https://github.com/Alphabots-8810/AlphaSim) →
[AlphaHarness](https://github.com/Alphabots-8810/AlphaHarness) → AlphaScout)。

思路直接来自 4414 HighTide 导师 Kenny Sandon 的
[「Scouting app in 20 minutes」TideApp 教程](https://www.chiefdelphi.com/t/scouting-app-in-20-minutes-tideapp-tutorial/520424)——
同一套架构(Convex 实时后端 + shadcn/ui),换成 REBUILT 游戏模型,用 Claude Code 写成。

## 功能

- **赛事设置(admin)** — 输入 TBA event key 导入队伍列表和资格赛赛程;重复导入幂等
  (赛程变更后放心重跑);支持多赛事,同一时间一个 active。
- **队伍列表 / 队伍详情** — pit 状态、报告数、每队均值(auto/teleop FUEL、浪费 FUEL、
  auto 爬升成功率、driver/defense 评分)。
- **Pit scouting** — 网格式落地页,checkbox/stepper 表单(底盘、FUEL 容量、intake、
  dumper/shooter、auto L1 爬升能力、auto 宣称数据),机器人照片存 Convex 文件存储。
- **Match scouting** — 选场次,**认领机器人**(Convex mutation 强制一场一机一人),
  然后是手机尺寸的表单:AUTO fuel + L1 爬升,TELEOP fuel + *倒进 inactive HUB 的
  浪费量*(REBUILT 的 SHIFT 机制),1–10 评分,tags。
- **Pick lists** — dnd-kit 看板(Tier 1/2/3/DNP/未分类)。每个 scout 有自己的个人
  列表;admin 持有 primary,可以**按共识分数一键合并所有人的列表**(tier 投票 +
  列内排名加分)。
- 亮/暗主题(254 蓝),全站实时同步(Convex live queries),角色权限
  (第一个账号自动 admin,admin 可提升他人)。

## 技术栈

Bun · Vite · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui
(Base UI) · React Router 7 · Convex(数据库 + auth + 文件存储 + live queries)
· @convex-dev/auth(密码登录) · dnd-kit · TBA API v3。

## 快速开始

```sh
bun install
bunx convex dev          # 首次运行:登录 / 创建 Convex 项目
# 另开一个终端:
bun run dev
```

`bunx convex dev` 会把 deployment URL 写进 `.env.local`。然后:

1. **Auth 密钥** — `bunx @convex-dev/auth --web-server-url http://localhost:5173`
   (在 deployment 上生成 JWT_PRIVATE_KEY/JWKS)。
2. **TBA key** — 在 thebluealliance.com/account 申请,然后
   `bunx convex env set TBA_API_KEY <key>`。
3. 打开应用,注册第一个账号(自动成为 admin),导入赛事。

手头没有 TBA key?灌假数据测试:`bunx convex run dev:seed`。

正式比赛:前端随便找个静态托管(Vercel/Netlify/Pages),后端
`bunx convex deploy`。场馆里 scout 需要有网——本应用刻意做成在线优先
(和 4414 实战同一个取舍),没有离线/QR 模式。

## 设计说明

- REBUILT 的 FUEL 在看台上没法逐球数,表单用 ±1/±5 stepper 做诚实估算;
  inactive HUB 的浪费量单独记一项,因为 SHIFT 意识是机器人之间真实的差距。
- Endgame TOWER 爬升(10/20/30 分)在 REBUILT 里存在,但**刻意不 scout**——
  我们的赛区 meta 没人爬,表单保持精简。只跟踪 AUTO L1 爬升(15 分)。
  你的赛区不一样的话,旧的 endgame 段在 git 历史里(v0.1)。
- `convex/_generated` 是有意提交进仓库的(Convex 官方惯例)。

## 协议

MIT
