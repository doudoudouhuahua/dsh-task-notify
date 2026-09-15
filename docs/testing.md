# 测试与验收

[← 返回 README](../README.md)

实测环境：Windows 11 + DSH Web，桌面 toast 通道（通知图标热更新一节另需一次「测试 Windows 通知」）。

## 验收表

| 通知 | 触发方式 | 预期内容 |
| --- | --- | --- |
| 任务完成 | agent 正常跑完一个回合（含子代理 / 工作流） | 会话名、时间、状态（完成 / 失败 / 中止…） |
| 需要审批 | 权限设为 read-only，agent 写文件被沙箱拒绝后申请提权（审批策略 `ask`） | 工具名、提权原因 |
| 询问用户 | agent 调用 `ask_user_question` 抛出问题后主动停下 | 问题文本 |
| 计划待确认 | `/plan` 进入计划模式，agent 调用 `exit_plan_mode` 提交带 `#` 标题的计划 | 计划标题与摘要（每条评审只提醒一次） |
| 目标受阻 | 创建注定无法完成的目标，跑满自动轮次上限或模型上报 blocked | 阻塞原因 |
| 语言切换 | 面板头部滑块切到 English（自动同步「设置 → 通用 → 语言」） | 面板、铃铛 tooltip、后续 toast 与推送正文全部英文；切回中文同理 |
| 依赖自装 | 在未装 BurntToast 的机器上启动插件并触发一次通知 | 宿主日志出现 `BurntToast missing — installing it for the current user`，随后 toast 正常弹出；已装机器上无任何输出 |

## 实测记录

| 版本 | 结论 |
| --- | --- |
| v1.2.0 | **任务完成 / 需要审批 / 询问用户 / 目标受阻** 已实测通过 |
| v1.2.0 | **计划待确认** 需先在会话中进入计划模式（`/plan`）后由 agent 调用 `exit_plan_mode` 触发，按上表操作即可验收 |
| v1.6.1 | 已在宿主侧以「假 Cordis 上下文 + 假事件」回归验证上表全部触发条件与状态文案（见[版本历史](changelog.md)） |
| v1.7.0 | 该回归已固化为可执行脚本 `tools/verify-contract.mjs`（26 项检查全通过，见下节） |
| v1.8.0 | 脚本扩展为 31 项检查，新增语言五项（默认中文、英文切换、关注类文案、未知语言回退、testNotify 语言入参）与 `testNotify` 参数契约 |
| v1.8.0 | **通知图标静默回退**：`verify-contract.mjs` 只断言「toast 送达」（exit 0），而图标被替换时命令**仍然 exit 0**，因此 31 项检查全通过也发现不了。已新增 `tools/check-toast-icon.mjs` 直接读 Windows 通知数据库比对**实际记录的图片路径**，并做了负向对照（把变体顺序改回 `plain` 优先即 FAIL，见下节） |

## 契约校验（v1.7.0+）

平台契约变更（尤其是 Typert strict codec、Remote 描述符这类 wire 契约）不会以编译错误的形式暴露，
而是让插件在宿主侧**整行激活失败**：没有通知、没有铃铛、没有设置面板。因此每次**升级 DSH 之后**
以及每次**改动 `src/contract.js` 之后**，先跑一次：

```powershell
node tools/verify-contract.mjs      # 等价于 npm run verify
$env:DSH_HARNESS = 'D:\path\to\deepseek-harness'; node tools/verify-contract.mjs
```

脚本对**本机真实 DSH**依次检查：

1. **strict codec 契约**——5 个调用描述符的 7 个 codec 都带 `create()` 工厂，`create()` 返回同一
   缓存实例且暴露 `parse()`，并做正反解析（合法值通过、非法值拒绝）；`testNotify` 还额外校验它的
   一个可选语言参数（`'zh' | 'en'`，缺省为 `zh`，非法值拒绝）；
2. **宿主清单注册**——`ctx.typert.register(TYPERT_MANIFEST)` 在真实 `TypertRegistry` 上提交成功，
   5 个 `taskNotify/*` 端点可解析且仍保持 `create` 契约（**这一步就是故障现场的那一句**）；
3. **已安装构建**——默认加载 profile 内 `node_modules/dsh-task-notify/lib/index.js`（即运行中的 DSH
   真正加载的那份），在真实 Cordis 上下文里 `apply()` 并驱动 7 类合成事件，断言入队种类、状态文案、
   审批工具名/原因、计划标题与摘要、目标阻塞原因，以及总开关/分类开关的抑制行为；
4. **本地化**——没有 locale 快照时全部文案保持中文（headless 组合的默认路径）、英文 locale 切换后
   状态与兜底标题变英文、关注类通道（审批 / 提问）的状态与详情行同样跟随、目录外的语言（如 `ja`）
   回退英文，以及 `testNotify` 的语言入参；
5. **Windows toast 通道**——用 `en` 与 `zh` 各调用一次 `testNotify`，报告 `pwsh` + BurntToast 是否
   真的送达（失败必须带原因）；未装 BurntToast 的机器上这一步会看到自动安装的日志；
6. **负向对照**——把 codec 改回 `schema`-only 的形状必须仍被拒绝，保证脚本今后仍能识别同类漂移。

退出码 0 = 全部通过。默认校验「已安装副本」；要校验尚未同步的仓库产物，用
`DSH_TASK_NOTIFY_BUILD=<仓库>/lib/index.js` 指定，`DSH_TASK_NOTIFY_DEBUG=1` 打印每个候选路径与跳过原因。

## 验证通知图标热更新（v1.3.0+）

替换 `node_modules\dsh-task-notify\deepseek.png`（或仓库根目录的 `deepseek.png`，取决于 `file:` 依赖
是否软链）后，点「测试 Windows 通知」即可验证 toast 角标已换成新图标，无需重建插件或重启 DSH。

## 图标回归检查（v1.8.0+）

「toast 弹出来了」**不等于**「图标是对的」。BurntToast 的 `New-BTImage` 声明了
`[string] $Source = $Script:DefaultImage`，而 `New-BurntToastNotification` 在 `-AppLogo` 为空时
正是**不带 `-Source`** 调用它——于是模块自带的吐司照片被静默写进通知，命令依然 exit 0，
面板还会提示「已弹出 Windows 系统通知」。

因此判定标准只能是**系统实际记录的图片路径**：

```powershell
node tools/probe-toast-icon.mjs     # 发一条探针通知（按插件同样的方式解析图标路径）
node tools/check-toast-icon.mjs     # 读回通知库，比对实际记录的 <image src>
npm run verify:icon                 # 等价于上面第二条
```

`check-toast-icon.mjs` 退出码 0 = 最新一条通知带的是插件自己的图标。它同时会预先校验
预期路径不含 8.3 短名（`~1`）与查询串（`?`）——这两种形式被 Windows 拒绝后同样会静默回退。

两个必须记住的坑：

- 通知库是 **WAL 模式**：最新的通知先在 `wpndatabase.db-wal` 里，只拷 `wpndatabase.db`
  会读到过期历史（表现为「刚发的通知查不到」）。脚本会把 `-wal` / `-shm` 一起拷贝；
- 变体顺序是**功能性**的：`TOAST_VARIANTS` 必须把带 `-AppLogo` 的变体排在前面，因为
  `showWindowsToast` 以「首个 exit 0」为准返回，`plain` 变体没有任何可失败之处，排在首位
  就必然成功，logo 永远不会被传下去（1.8.0 曾如此，31 项契约检查全绿也照样静默回退）。

> **宿主半改了必须重启 DSH**：`lib/index.js` 是被 ESM 在进程启动时导入的，改完同步进 profile
> 后，**只有重启 DSH 才会生效**——运行中的进程仍持有旧模块。判断办法：对比 DSH 进程启动时间与
> `lib/index.js` 的修改时间（进程更早就说明它加载的是旧代码）。客户端半是另一回事：它有
> `clientModules.rebuilt(id)` 触发的重建路径，刷新页面即可换新。

## 相关文档

- [通知类型与触发时机](notifications.md)
- [配置与使用](configuration.md)
- [DSH 升级后插件失效的排查手册](troubleshooting.md)
- [版本历史](changelog.md)
