# MoodPlanet · 交接与协作约束

给接手本项目的人和你自己的 AI 助手。这里写的都是**从代码里读不出来**的东西：历史决定、硬性红线、已知偏差、验收手段。代码结构本身请直接读仓库。

## 1. 真实进度（以本节为准）

阶段 1–6 全部完成并经原开发者验收：3D 星球场景、心情记录、记忆星、时光胶囊、情绪档案、设置页均已接入。

2026-11-16 协作者追加（提交 `f082140`，直推 master，主管事后审查追认，见第 6 节偏差 8）：记忆星散点布局与独立公转/游走、左键详情 + 右键/长按调大小（50–150 按星持久化、三档视觉）、锚定跟随弹窗、伙伴径向动作菜单（坐下/睡觉/跳舞/比心四个新动作）、全局合成音效与设置页音量控制。**伙伴动作交互以径向菜单为准**，week1 上的 E1 选择行方案弃用（见偏差 9）。

`README.md` 里「当前为第一阶段：项目初始化与基础架构」「下一阶段待接入 3D 场景」是**早期留下的过时描述**，已于本次交接更正，如果再次看到类似表述以本节为准。

## 2. 硬性红线（破坏任何一条即为不合格交付）

- **零网络请求、零遥测**。不引入任何上报、埋点、CDN 字体、在线资源。所有数据只落在浏览器本地。
- **不新增运行期依赖**。devDependency 可以为了构建/测试增加。
- **不新增持久化字段**。`moodplanet:records` / `:planet` / `:capsules` / `:settings` 四个键的结构是稳定的，扩展前先确认原开发者同意。
- **门控为 0 时其余表现逐位不变**。动效/微交互类改动必须做到：关掉该特性，画面与数值和改动前完全一致。
- **`reduceMotion` 开启时一律不排期任何新动作**。
- 卡片自相矛盾（例如频次上限与最小间隔冲突）时，取**无障碍上限**那个读法，并在交付说明里写明你的取舍。

## 3. 视觉硬性要求

小人物（companion）初始挂在**星球顶部正中、正脸朝向用户**，这是刻意选定、经过验收的构图，理由是「符合大众审美」。

- 不要挪动挂点，也不要调整到会被植被遮挡的位置。
- 气泡（CompanionBubble）三档落位逻辑依赖 `companionAnchor.ts` 单例每帧写屏幕坐标 + `PlanetHud` 顶行的 `data-hud-top`；改 HUD 时注意这两处耦合，气泡不得与 HUD 文字相交。

## 4. 数据契约与示例数据

| 键 | 信封 | 备注 |
| --- | --- | --- |
| `moodplanet:records` | `{version, savedAt, records[]}` | 数组**从旧到新**，加载时不排序，顺序错了记忆星编号就乱 |
| `moodplanet:planet` | `{version, savedAt, stars[], growth, environment}` | `stars` 与 `environment` 加载时按 records 重建；`growth.totalSaved` 取 `max(存值, 记录数)`；`growth.interactions` 只能靠存值；`unlocks` 由 `evaluateUnlocks` 重算，手填无效 |
| `moodplanet:capsules` | `{version, savedAt, capsules[]}` | `status` 读盘时被忽略，按 `unlockAt` 与当前时钟重算 |
| `moodplanet:settings` | zustand persist 的 `{state, version:0}` | 不是上面那种信封结构 |

**应用只有导出，没有导入入口**（`src/services/dataTransfer.ts` 仅 `buildExportPayload` / `downloadExport` / `clearAllData`）。想看有数据的界面，用 `seed/example-data.js`：`pnpm dev` 打开页面 → F12 Console 粘贴整个文件 → 回车。

clone 后什么都不做的话应用是空的，这属正常，不是 bug。

## 5. 当前基线读数（改动后用同一命令复测）

```bash
pnpm test    # Test Files 18 passed / Tests 213 passed
pnpm build   # three 743.00 kB (gzip 187.59) / r3f 206.70 (65.14) / index 316.32 (103.66) / PlanetPage 32.38 (10.23)
pnpm lint    # 0 warnings 0 errors
```

2026-11-16 实测（f082140 之上）。相对上一基线：+65 用例全部为新增文件（布局/大小/定位/动作/音效），既有测试零删改；index +2.85 kB raw / +1.04 gzip，PlanetPage +7.96 kB raw / +2.35 gzip，three 本体不动。

`growth.interactions` 之类计数只增不减，测试与验收时不要假设它等于点击次数。

## 6. 已知偏差（交付时要如实复报，不要藏）

1. `pnpm build` 报 *Some chunks are larger than 500 kB*：three 本体固有体积，已用 rolldown `codeSplitting.groups` 拆出 three 与 r3f，警告仍在。拆包代价约 +5 kB gzip，换来 three 长期缓存稳定。
2. planet 每次 hydrate 会重写一次 envelope，实际只有 `savedAt` 变化（见 `usePlanetStore.ts` hydrate 末尾的 `save`）。
3. `PlanetSnapshot.tsx` 的「待开启胶囊」格是写死的 `value: '0'` / hint「时光胶囊还没启用」，**没有读胶囊 store**。胶囊页本身正常。这条是交接时发现既存问题，尚未修。

新增偏差就往下加。

4. **星位一次性跳变**：`f082140` 起 hydrate 不再复用存盘轨道位，一律按记录哈希重算散点（`starLayout.ts`，取代旧窄球带+黄金角星环）。老数据刷新后所有星换位置，属刻意的视觉变更，主管 2026-11-16 追认。极区留白（`SCATTER_TILT_MAX 0.9`），伙伴所在的星球顶部不放星。
5. **径向菜单绕过解锁门控**：菜单里「挥手」无需解锁即可用（点击随机池仍走解锁），坐下/睡觉/跳舞/比心四个新动作天生可用、不进随机池。成长解锁的奖励语义被稀释，属产品决定，主管 2026-11-16 追认。
6. **音效默认开启**：`soundEnabled` 默认 `true`、`soundVolume` 默认 0.6；`reduceMotion` 下声音照播（声音不算动效，主管确认此读法）。九种音效全部 WebAudio 本机合成，零音频文件零网络；AudioContext 只在用户手势里解锁，suspended 时放弃播放不绕过浏览器策略。
7. **持久化扩展（主管 2026-11-16 追认）**：`stars[].size`（50–150 整数，缺省/非法回 100，`clampStarSize` 夹取）；settings 追加 `soundEnabled` / `soundVolume`（zustand 浅合并补默认，未 bump version）。四个键名与第 4 节重建语义未动，旧数据 hydrate 正常。等级由 size 实时算出不另存；默认 100 档光效系数全 1，默认画面逐位不变。
8. **流程偏差**：`f082140` 由协作者直推 master，未走 PR/审批，AGENTS.md 当时未同步更新；提交身份挂的是其弃用旧号 `ZSQ114coder` 的邮箱（推送权限实际来自 reterhog354-star）。主管 2026-11-16 选择接受直推、事后审查追认（代码层红线全部守住，读数见第 5 节），本条及 4–7 为追认记录。协作者需把本机 `git config user.email` 改回现用账号。
9. **E1 选择行弃用**：week1 上的 E1「伙伴互动自选」（选择行 + `actionChoice.ts` + settings 的 `companionAction` 字段）与径向菜单是同一功能两套实现，主管 2026-11-16 拍板**留径向菜单、弃 E1 选择行**。week1 分支保留作历史、不合入 master；E1 的 PR #3/#4 读数与偏差记录随之作废。此后协作恢复 9.1 常规流程：从 master 开分支、PR 进 master、原开发者审批合并。

## 7. 验收怎么做

- **控制台必须零错误**，七条路由逐个走一遍，再按 390 / 320 宽度各走一遍手机端（横溢、HUD 重叠是历史高发问题）。
- **3D 画面不能只靠整页截图判断**：遮挡、偏离中心只有在 clipped 放大图里看得出来。要证明「每次加载初始位置相同」，得连拍两次加载做对照。
- 内置浏览器（App 内嵌那个）常处于隐藏标签页状态，`visibilityState=hidden`、viewport 0x0，**截图接口会直接失败，也不能拿它当交互结论的依据**。用 Edge + CDP 探针跑。
- 无头 Edge（swiftshader）在本机场景里约 **6.65 fps**，dt 钳到 0.05，所以 5 分钟墙钟只推进约 99.4 环境秒——低频动作在这个时长内测不出第二次，只能靠「99.4 环境秒内仅 1 次」间接排除某个读法，再用单测锁常量。
- 要让随机分支确定化，把 `Math.random` 钉成常数（例如 `() => 0.9999` 让 `pickAction` 固定在池尾），否则证不了门槛类条件被触发。
- **动效规则不要只写在 `useFrame` 里**，那样零可测性。抽成 `lib/` 纯函数再让场景消费，本仓库的 `breath.ts` / `fidget.ts` / `glow.ts` / `roll.ts` / `warmth.ts` 都是这个形状。
- 验收探针脚本历史上放在仓库外的系统临时目录（`%TEMP%\mp-acceptance`、`%TEMP%\a1-verify`），**不在仓库里，可能已被清理**。找不到就按上面几条的路子重建，别因为「脚本没了」跳过实测。

## 8. 换心情时的回归比对读数

用来判断一次改动有没有把别的状态带偏（同一天重复加载应当逐位一致）：

- `sad`：灯色 `fab46a`，emI 1.0425，scaleY 0.985
- `anxious`：emI 0.637–1.037（呼吸起伏，A1）
- `tired`：emI 0.27，scaleY 0.94，rotX 0.3
- 非点亮期间灯球 scale 恒为 1.0000
- `reduceMotion` 下连续 508 帧 `rotZ` 非零计数为 0，且读数恒定

## 9. 协作规矩

### 9.1 Git 流程

仓库是 Free 计划下的私有库，GitHub 不给分支保护 / rulesets（API 返回 403），所以下面这套**没有任何服务端强制，纯靠自觉**。谁直推了 master 都拦不住，只能事后回滚。

- **master 只进 PR**。任何人不得直推 master，不得 force push，不得删 master。
- 开工前先 `git checkout master && git pull`，再开分支：`git switch -c feat/<卡片名>`（修 bug 用 `fix/<卡片名>`）。一张卡一个分支，不要在 master 上写代码。
- 卡片做完、自跑验收（`pnpm test` / `pnpm lint` / `pnpm build` 全绿）后再推：`git push -u origin feat/<卡片名>`，然后在 GitHub 开 PR，base 选 `master`。
- PR 描述写三件事：这张卡做了什么、验收命令的**真实读数**、偏差清单（对照第 6 节的格式）。
- **至少 1 个 approve 才能合，自己不能 approve 自己的 PR**。合并由原开发者 @wangsibo0214 点，作者不要自己合。
- 合并方式统一 **Squash and merge**：一张卡在 master 上只留一个提交，合完删源分支。
- 分支落后了就 `git fetch origin && git rebase origin/master`，冲突在自己分支上解完再推；不要在 master 上解冲突。
- 推之前确认没带上真实日记、导出 JSON、密钥、`node_modules`、`dist`（见 `.gitignore`）。示例数据只有 `seed/example-data.js` 那一份是脱敏的。

### 9.2 卡片与验收

- 改动按**任务卡**推进，一张卡做完、自跑验收、逐条报偏差，再进下一张。不要顺手把相邻功能一起改了。
- **不要删改既有测试**。要加就追加；若认为某个既有测试的断言本身错了，先报出来等确认，不要自己改绿。
- 原开发者会在卡片之间自己改代码（例如把呼吸逻辑抽成 `lib/breath.ts` 并补测试）。遇到「这文件怎么和我预期不一样」，先看 `git log`，不要直接覆盖。
- 手机端看起来比桌面「糊」是第二阶段刻意的性能取舍（地形 detail 9 vs 13、植被 reduced 约 1.1k vs 约 4.6k 三角、fov 48 vs 42），渲染分辨率两端都没降（dpr `[1,2]`、antialias、阴影 percentage 一致）。要不要拉高，是产品决定，不是 bug。

### 9.3 本周临时安排（2026-11-09 ~ 2026-11-15）

> **本节已于 2026-11-15 到期失效**，审批与红线恢复 9.1 与第 2 节原文。实际收尾未按本节走：协作者 11-16 直推 master（见偏差 8），主管追认并拍板 E1 弃用（见偏差 9），week1 保留作历史。以下原文仅作存档。

原开发者本周不参与，仓库交给 @reterhog354-star 自主推进：自己提想法、自己拆卡、自己验收。**本节在这段时间内覆盖 9.1 的审批条款和第 2 节的两条红线**，其余条款照常生效。11-15 之后本节失效，恢复 9.1 与第 2 节原文。

#### 分支模型

| 分支 | 本周谁能写 | 用途 |
| --- | --- | --- |
| `master` | **冻结，谁都不写** | 原开发者验收过的基线，周末回来时的对照物 |
| `week1` | reterhog354-star | 本周集成分支，他的 PR 全部合到这里 |
| `feat/<想法名>` | reterhog354-star | 一个想法一条，从 `week1` 开出来 |

接受邀请、clone、`pnpm install`、`pnpm test` 确认既有 129 个用例全绿之后，第一步是建集成分支：

```bash
git switch -c week1 master
git push -u origin week1
```

之后每个想法：

```bash
git checkout week1 && git pull
git switch -c feat/<想法名>
# 做完，自跑下面「每个 PR 必须带」的验收
git push -u origin feat/<想法名>
# 开 PR 时 base 选 week1，不是 master
```

本周**允许他自己 approve 并 squash 合入 `week1`**——原开发者不在，这是 9.1「自己不能 approve 自己的 PR」的唯一例外。合完删源分支。

周末他把 `week1 → master` 开一个总 PR，列出本周所有卡片、累计偏差和最终读数，原开发者审完 squash 合，本周工作才算落地。

#### 本周放开的两条红线（第 2 节）

1. **运行期依赖可以加**。每个新增在 PR 里单列一节：加了什么 / 为什么非它不可 / `pnpm build` 前后体积对照。必须用 pnpm，`pnpm-lock.yaml` 一起提交。
2. **持久化字段可以扩**。四个键名 `moodplanet:records` / `:planet` / `:capsules` / `:settings` 不许改；新字段必须可选且有默认值，旧数据能正常 hydrate；PR 里写新旧结构对照，并**追加测试覆盖「旧数据 + 新代码」**。第 4 节的重建语义不能被破坏：records 从旧到新且加载不排序、stars 与 environment 按 records 重建、`totalSaved` 取 `max(存值, 记录数)`、`unlocks` 由 `evaluateUnlocks` 重算、capsules 的 `status` 按 `unlockAt` 与当前时钟重算。

#### 继续死守的（破一条周末就退回）

- 零网络请求、零遥测。
- `reduceMotion` 开启时一律不排期任何新动作。
- 门控为 0 时其余表现逐位不变。
- 小人物挂点在星球顶部正中、正脸朝用户，不挪动、不被植被遮挡；气泡不与 HUD 文字相交（第 3 节）。
- **不删改既有测试**，既有 129 个用例必须继续全绿，新用例往上加。认为某个既有断言本身错了，写进 PR 等原开发者周末定夺，不要自己改绿。
- 卡片自相矛盾时取无障碍上限那个读法，并写明取舍。
- 真实日记 / 导出 JSON / 密钥不进仓库；`seed/example-data.js` 保持脱敏，不许换成真实内容。

#### 每个 PR 必须带

- 一句话说明这个想法做了什么。
- **真实读数**：`pnpm test`（文件数 / 用例数）、`pnpm lint`、`pnpm build`（three / r3f / index 的 raw + gzip，对照第 5 节基线）。没跑就不要写「应该没问题」。
- 偏差清单：额外改动、没做到的、取舍理由，往第 6 节追加。
- 动了依赖或数据结构就单列一节。
- 七条路由 + 390 / 320 两个宽度各跑一遍，零 console 错误（第 7 节）。隐藏标签页只能拿到结构层证据，不能当交互验收依据。

第 6 节第 3 条（`PlanetSnapshot.tsx` 写死「待开启胶囊」）本周可以自行修，修完在 PR 里说明，并把该条从已知偏差里移除。

验证数据落盘时别污染自己的浏览器：seed 会覆盖当前 origin 下全部 `moodplanet:*`。要试 seed 就另起端口（`pnpm dev --port 5199`）或用无痕窗口，别在存了自己真实记录的窗口里跑。
