# MoodPlanet · 情绪星球

把每一次心情记录变成星球上的一点光。记录心情、点亮记忆星、封存时光胶囊、回看情绪档案。

> 阶段 1–6 已完成：3D 星球场景、心情记录、记忆星、时光胶囊、情绪档案、设置页均已接入。

## 接手第一步

仓库是**私有**的，先在 <https://github.com/settings/invitations> 接受协作邀请，否则 clone 会失败。

环境要求：Node `^20.19.0 || >=22.12.0`（Vite 8.3 的硬性要求），以及 **pnpm**——依赖必须用 `pnpm install` 按仓库根的 `pnpm-lock.yaml` 安装，换 npm/yarn 会绕过锁定解析，构建结果不可比。

```bash
git clone https://github.com/wangsibo0214/moodplanet.git
cd moodplanet
pnpm install
pnpm test     # 必须全绿；当前基线的文件数与用例数以 AGENTS.md 第 5 节为准
pnpm dev      # → http://localhost:5173
```

**接着读 [`AGENTS.md`](./AGENTS.md)**，红线、验收方法、基线读数、已知偏差全在那份文件里，本 README 不复述。

两人协作：**不要直推 master**。开 `feat/<卡片名>` 分支 → 自跑验收 → 推分支开 PR → 对方 approve → @wangsibo0214 用 Squash and merge 合入。完整流程见 `AGENTS.md` 第 9.1 节（Free 计划的私有库没有服务端分支保护，这条纯靠自觉）。

**2026-11-09 ~ 11-15 这一周走特殊安排**：原开发者不参与，`master` 冻结，@reterhog354-star 在 `week1` 集成分支上自主推进、自己 approve 合入 `week1`，周末再开 `week1 → master` 总 PR。详见 `AGENTS.md` 第 9.3 节，含本周放开的两条红线与继续死守的清单。

分工说明：仓库主体（项目骨架、星球渲染与成长系统、四页检索分页、情绪档案与时间胶囊、验收基线）由 @wangsibo0214 完成；@reterhog354-star（早期账号 @ZSQ114coder）独立交付了记忆星交互与锚定跟随弹窗、伙伴径向菜单、面板摆放规则、`actions` 规则层及各自的测试。上面那段是 11-09 ~ 11-15 的临时安排，**已于 11-15 到期失效**，保留仅作过程存档。

`pnpm dev` 起来后应用是空的，星球上什么都没有——数据只存浏览器本地，属正常，不是 bug。想看有数据的样子：F12 → Console，把 `seed/example-data.js` 整个文件内容粘贴进去回车，页面会自动刷新出 12 条示例记录、解锁 12 项成长内容里的 9 项（4 个伙伴动作全开，地表/装饰开 5 项；灯塔 / 栈桥小船 / 粼粼海面要累计保存 15 / 18 / 20 条，示例数据到不了）、1 个待开启胶囊。示例数据是虚构的，会覆盖该端口下已有的 `moodplanet:*` 数据，别在存着真实记录的端口上跑。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 开发服务器 → `http://localhost:5173` |
| `pnpm build` | 类型检查 + 生产构建 → `dist/` |
| `pnpm preview` | 预览生产构建 |
| `pnpm lint` | oxlint 静态检查 |
| `pnpm test` | vitest 单次运行 |

注意 `vite.config.ts` 里 `host: true`，开发服务器除 localhost 外还会监听局域网 IP；在咖啡馆、宿舍等共享网络下开着它，同网段的人能访问到你这个页面。

## 技术选型

| 领域 | 选择 | 说明 |
| --- | --- | --- |
| 框架 | React 19.3 | |
| 语言 | TypeScript 7.0 | `strict` + `noUnusedLocals/Parameters` + `erasableSyntaxOnly` + `noFallthroughCasesInSwitch`（见 `tsconfig.app.json`；未开 `noUncheckedIndexedAccess`，`tsconfig.node.json` 不含严格开关），路径别名 `@/*` → `src/*` |
| 构建 | Vite 8.3 | 路由级懒加载，每个页面独立分包 |
| 样式 | Tailwind CSS 4.3 | CSS-first 配置，设计令牌集中在 `src/styles/index.css` 的 `@theme` |
| 路由 | react-router 7 | `BrowserRouter` + 嵌套布局路由 + `lazy` |
| 状态 | zustand 5 | `persist` 中间件落 localStorage，key 前缀 `moodplanet:` |
| 图标 | lucide-react | 全站唯一图标集，不使用 emoji 代替图标 |
| 3D | three 0.187 + @react-three/fiber 9 + drei 10 | `src/features/planet/scene/`，构建时单独拆 chunk |
| 字体 | Quicksand（标题）+ Nunito Variable（正文） | 本地 `@fontsource` 自托管，中文回退系统字体 |
| Lint | oxlint | 含 React Compiler 规则 |

## 目录结构

```
src/
├─ assets/          logo.svg 等静态资源
├─ components/
│  ├─ background/   StarfieldBackground —— 全站固定星空背景层
│  └─ ui/           Button / Card / Badge / PageHeader / EmptyState / PageLoader
├─ config/          navigation.ts —— 全站导航配置（图标、路径、说明）
├─ features/        按业务域组织，页面只当薄壳
│  ├─ archive/      情绪档案
│  ├─ capsule/      时光胶囊
│  ├─ memory/       记忆星
│  ├─ mood/         情绪模型与色板
│  ├─ planet/       星球主页
│  └─ settings/     设置项控件
├─ hooks/           useMediaQuery / useDocumentTitle
├─ layouts/         AppLayout + SideNav / TopBar / MobileNav
├─ pages/           6 个页面 + 404，均为默认导出以配合懒加载
├─ router/          AppRouter —— 路由表
├─ services/        storage.ts —— localStorage 适配器（隐私模式下降级不抛错）
├─ stores/          useSettingsStore
├─ styles/          index.css —— 设计令牌与基础层
├─ types/           mood.ts / navigation.ts
└─ utils/           cn.ts —— clsx + tailwind-merge
```

## 设计系统

全部令牌定义在 `src/styles/index.css` 的 `@theme` 中，直接以 Tailwind 类的形式使用。

**颜色**

| 角色 | 名称 | 说明 |
| --- | --- | --- |
| 背景 | `cosmos-950 … 600` | 深蓝紫宇宙渐变，底色 `#07081A`（不用纯黑） |
| 主色 | `iris-50 … 800` | 柔和蓝紫，`iris-400 #A48FF2` |
| 主色 | `astro-100 … 700` | 星空蓝，`astro-500 #4E9BDD` |
| 辅助 | `butter-*` | 奶油黄 `#FFD170` |
| 辅助 | `blush-*` | 淡粉 `#FFA3BE` |
| 辅助 | `mint-*` | 薄荷绿 `#7BD9BC` |
| 文本 | `ink-50/100/300/500/700` | 在 `cosmos-900` 上分别为 16.5 / 15.4 / 10.9 / 6.0 / —: 1 |
| 描边 | `hairline`、`hairline-strong` | 9% / 18% 白 |

六种情绪共用同一明度与饱和度，所以「低落」看起来不像错误提示，「愉悦」也不刺眼。

**自定义工具类**

- `cosmic-bg` —— 四层叠加的宇宙渐变，用于固定背景层
- `glass-panel` —— 玻璃拟态卡片：轻透明渐变 + `blur(18px)` + 内高光 + 柔和投影
- `glass-panel-hover` —— 悬停轻微上浮并加深描边
- `hairline`、`text-glow`、`stagger-rise`

**其他令牌**：`radius-xs … 2xl` 与 `radius-card`（20px，柔和但不幼态）；`shadow-card / float / glow-iris / glow-astro / inset-hairline`；`ease-soft`、`ease-out-soft`；`animate-twinkle / drift / rise`。

**无障碍约定**

- 正文与次要文本对比度 ≥ 6:1，全部通过 WCAG AA
- 全局 `:focus-visible` 焦点环
- 触控目标 ≥ 44px（导航项、按钮 md/lg、开关命中区）
- 全局 `prefers-reduced-motion` 降级（只跟随系统设置，设置页没有单独开关）
- 图标一律 `aria-hidden`，纯图标控件必须带 `aria-label`

## 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 星球主页 |
| `/record` | 心情记录 |
| `/memories` | 记忆星 |
| `/capsule` | 时光胶囊 |
| `/archive` | 情绪档案 |
| `/settings` | 设置 |
| `*` | 404 |

使用 History 路由。部署到静态服务器时需要把所有路径重写到 `index.html`，否则直接访问深层链接会 404。

## 已知待办

- `PlanetSnapshot.tsx` 主页「待开启胶囊」格写死为 `0` / 「时光胶囊还没启用」，未接胶囊 store（胶囊页本身正常）。

上面「目录结构」是早期草图，只列了当时的文件；现在 `features/` 下每个域、`services/` 四个仓储、`stores/` 四个 store 都已展开，以仓库实际文件为准。
