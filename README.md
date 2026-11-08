# MoodPlanet · 情绪星球

把每一次心情记录变成星球上的一点光。记录心情、点亮记忆星、封存时光胶囊、回看情绪档案。

> 阶段 1–6 已完成：3D 星球场景、心情记录、记忆星、时光胶囊、情绪档案、设置页均已接入。
> 接手前先读 [`AGENTS.md`](./AGENTS.md)——硬性约束、已知偏差、验收方法和示例数据都在那里。

## 启动

```bash
pnpm install      # 安装依赖
pnpm dev          # 开发服务器 → http://localhost:5173
pnpm build        # 类型检查 + 生产构建 → dist/
pnpm preview      # 预览生产构建
pnpm lint         # oxlint 静态检查
```

## 技术选型

| 领域 | 选择 | 说明 |
| --- | --- | --- |
| 框架 | React 19.3 | |
| 语言 | TypeScript 7.0 | `strict` 全开，路径别名 `@/*` → `src/*` |
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
- 全局 `prefers-reduced-motion` 降级，并可在设置页手动开启「降低动效」
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

## 起步

clone 之后应用是空的，星球上什么都没有——数据只存本地，属正常现象。想看有数据的样子：

```bash
pnpm install && pnpm dev
```

然后打开 `http://localhost:5173`，F12 → Console，把 `seed/example-data.js` 整个文件内容粘进去回车，页面会自动刷新出 12 条示例记录、8 项装饰全解锁、1 个待开启胶囊。示例数据是虚构的，会覆盖当前浏览器里的已有数据。

## 已知待办

- `PlanetSnapshot.tsx` 主页「待开启胶囊」格写死为 `0` / 「时光胶囊还没启用」，未接胶囊 store（胶囊页本身正常）。

上面「目录结构」是早期草图，只列了当时的文件；现在 `features/` 下每个域、`services/` 四个仓储、`stores/` 四个 store 都已展开，以仓库实际文件为准。
