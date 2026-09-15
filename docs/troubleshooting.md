# DSH 升级后插件失效的排查手册

[← 返回 README](../README.md)

**适用对象**：所有 DSH（DeepSeek Harness）插件作者。本文记录 2026-09-15 DSH 更新
（`dsh-v0.1.6-alpha.1` 之后合入的 `perf(typert): materialize generated schemas on first use`）导致
本插件**整行未激活**的完整排查过程，并把它整理成可复用的定位方法——同一类问题会反复出现，因为
**平台与插件之间的契约变更不会以编译错误的形式暴露**。

## 一、先认清失效形态

DSH 插件由「宿主行 + 客户端半」两部分组成，两半的加载时机不同，失效表现也不同：

| 失效层次 | 表现 | 典型原因 |
| --- | --- | --- |
| **宿主行未激活**（最严重） | 插件像没装：无任何业务效果；客户端 UI 一起消失 | `apply()` 抛错，或 `inject` 声明的服务不存在（fiber 停在 pending） |
| 宿主已激活、部分链路静默 | 部分通知 / 功能不出现，日志无异常 | 事件名或 payload 变了、读的属性被移除（旧代码取到 `undefined` 被 `try/catch` 吞掉） |
| 客户端半未激活 | 页面无 UI，宿主侧功能正常 | 客户端入口无法解析、`dsh.client` 声明不合规、Slot 名或注册契约变更 |
| 会话内调用报错 | 点击按钮弹错误、RPC 返回 `RemoteError` | Remote 描述符 / codec 契约与当前 Gateway 不匹配 |

**关键区分**：整行未激活时，插件自己订阅的事件、注册的 Slot、提供的服务**全都不会存在**——所以
「没有通知 + 没有铃铛 + 没有设置面板」这种「全都没有」的组合，几乎一定是宿主侧 `apply()` 失败，
而不是某一处逻辑写错。先按这条判断，能省掉大量在业务代码里找 bug 的时间。

## 二、证据从哪来

### 1. 宿主启动审计（最直接）

DSH 启动结束后会审计整棵 Loader 树，未激活的行会打到 stderr：

```text
dsh web: warning: 1 entry did not activate
<entry-id> (<包名>): <错误堆栈>
```

堆栈第一行通常就是根因，例如本次：

```text
typert: dsh-task-notify#taskNotify/getSettings result strict codec has no create() factory
```

其他常见形态：

| 诊断行 | 含义 |
| --- | --- |
| `<id> (<pkg>): pending (waiting for services: xxx)` | `inject` 声明的服务没有提供者——契约改名或该行没装上 |
| `<id> (<pkg>): failed to import` | 包的宿主入口无法解析（`exports` / 文件缺失） |
| `<id> (<pkg>): <module> does not provide an export named 'x'` | 平台删除了插件静态导入的导出（0.1.3-alpha.1 的 `settingsNamespace` 就是这样） |
| `<id> (<pkg>): ... is not a function` / `... of undefined` | 平台 API 形状变了，插件仍按旧形状调用 |

### 2. 运行中的代码 ≠ 仓库里的代码

这是最容易走错的一步。运行中的 DSH 加载的是 **profile 内安装副本**：

```text
$DSH_HOME/profiles/<profile>/node_modules/<包名>/
```

而平台包（`@deepseek-ai/*`）来自 DSH 工作树的构建产物。pnpm 对 git / `file:` 依赖按内容拷贝，
所以「仓库里已改好、profile 里仍是旧版」是常态。排查前先确认三件事：

```powershell
# 1) 安装副本到底是不是你以为的那份
(Get-FileHash <profile>\node_modules\<包名>\lib\index.js).Hash
(Get-FileHash .\lib\index.js).Hash          # 两者不一致 → 看到的现象来自旧构建

# 2) 平台包是什么版本 / 何时构建的
Get-Content $env:USERPROFILE\.dsh\profiles\node_modules\@deepseek-ai\dsh-typert-protocol\package.json |
  Select-String version
Get-Item     $env:USERPROFILE\.dsh\profiles\node_modules\@deepseek-ai\dsh-typert-protocol\lib\index.js |
  Select-Object LastWriteTime                # 构建时间 ≈ 你更新 DSH 的时间

# 3) 平台包实际落在哪里（junction / 同步回退目录）
(Get-Item $env:USERPROFILE\.dsh\profiles\node_modules\@deepseek-ai\*).Target
```

> `profiles/<profile>/.dsh-module-fallback/node_modules` 是 DSH 的解析回退目录；数据 Git 同步会把
> junction 展开成真实目录，导致启动报 `exists and is not a symlink or dsh-managed module proxy`。
> 删掉那些污染条目即可，DSH 会重建。

### 3. 定位平台改动的那一次提交

确认平台包已重建后，直接在 DSH 工作树里查契约的当前形状与变更历史：

```powershell
cd <DSH 工作树>
git log --oneline -S "<关键标识>" -- <包路径>      # 例：-S "no create() factory"
git log -1 --format="%h %ci %s" <该提交>          # 确认它在哪个发布标签之后合入
git show <标签>:<文件> | Select-String "关键字段"  # 对比「发布版本」与「当前 HEAD」的差异
```

**一定要对比工作树 HEAD，而不是发布标签**：上游会在标签之后继续合并提交，本机
`git pull` + 重新构建后生效的就是 HEAD。本次的 `create()` 改动就晚于 `dsh-v0.1.6-alpha.1` 标签，
只看标签会得出「契约没变」的错误结论。

## 三、案例：strict codec 的 `schema` → `create()`

**症状**：DSH 更新后插件整体消失（无通知、无铃铛、无设置面板），宿主启动审计报一行未激活。

**根因**：平台把 Typert 的 strict codec 契约从「直接给 schema」改成「给惰性 `create()` 工厂」：

| 位置 | 旧 | 新 |
| --- | --- | --- |
| `TypertCodec`（strict 分支） | `schema: TypertSchema` | `create: () => TypertSchema` |
| `TypertContribution.schemas[]` | `schema` | `create` 工厂 |
| `TypertRegistry.validateCodec` | 只校验 `typeSymbol` | 额外要求 `typeof codec.create === 'function'`，否则抛 `strict codec has no create() factory` |
| `dsh-api-gateway`（宿主收 / 客户端发） | `codec.schema.parse(v)` | `codec.create().parse(v)` |

插件仍在 5 个描述符上写 `schema:`，于是 `apply()` 里第一句
`ctx.typert.register(TYPERT_MANIFEST)` 同步抛错 → **整行未激活**。因为抛错点在 `apply()` 最前面，
连事件订阅都没来得及注册，所以现象是「全都没有」。

**修复形状**（手写 codec 的插件可直接照搬）：

```js
const strictCodec = (typeSymbol, schema) => {
  let cached
  return {
    mode: 'strict',
    typeSymbol,
    create: () => (cached === undefined ? (cached = schema) : cached),
  }
}
```

`create()` 返回同一缓存实例即可：注册表与两端 Gateway 都可能反复调用，schema 无状态、可安全共享。
**手写的 `parse` 方法仍然有效**——变的只是「怎么把 schema 交出去」。

**经验**：

- 平台对生成代码的「惰性物化」优化，对手写 manifest 的插件同样是破坏性变更；
- 报错信息里出现**包名 + 端点 + 契约词**（`strict codec has no create() factory`）时，问题在声明层，
  不在业务逻辑，直接改声明即可；
- 这类失败是**同步抛错**，所以会把 `apply()` 里它之后的所有注册一起带走——排查时先看第一句。

## 四、高频破坏点速查（近几个版本实测）

| 层 | 契约点 | 已知变更 / 症状 | 自查方式 |
| --- | --- | --- | --- |
| 宿主 | 静态导入的平台导出 | `does not provide an export named 'settingsNamespace'`（0.1.3-alpha.1 删除该 helper） | 把平台包导出列出来对比：`node -e "import('...').then(m=>console.log(Object.keys(m)))"` |
| 宿主 | Typert strict codec | `schema` → `create()`（见上例） | 对真实注册表跑一次 `ctx.typert.register(<你的 manifest>)` |
| 宿主 | `TypertContribution.schemas[]` | 每项必须是 `{ name, create }`，缺 `create` 抛 `schema ... has no create() factory` | 同上 |
| 宿主 | 请求数据的读取口 | `Session.events` 被移除 → 改读 `session.snapshotEvents()`；旧代码得到 `undefined` 被吞，链路静默失效 | 搜索平台类型定义，确认属性 / 方法仍存在；给折叠函数加「读不到就报错」而不是静默返回默认值 |
| 宿主 | 服务名 | 服务 key 改名会让 `inject` 永远 pending | 启动审计的 `pending (waiting for services: ...)` 会直接点名 |
| 客户端 | `dsh.client` 声明 | `platform` 必填；`inject` / `external` / `immediately` 类型错误会在组合期直接抛 | 对照任一官方客户端插件的 `package.json` |
| 客户端 | 客户端入口 | 必须能解析 `exports["./client"]`；`dsh.client.platform` 决定是否进入 boot graph | 浏览器控制台报错 + `client-modules: ...` 前缀的异常 |
| 客户端 | Slot 名与注册契约 | Slot 改名 / 变 kind（`single` ↔ `list`）会让 UI 不出现且不一定报错 | 在 DSH 工作树里搜 Slot 名：`rg "<slot 名>" packages/client`（无 ripgrep 时用 `git grep`） |
| 客户端 | `$mount` 的 strict 描述符 | 客户端 Gateway 会 `requireStrictDescriptor`，非 strict 直接拒绝 | 与宿主共用同一份描述符即可避免两边不一致 |

## 五、排查清单

按顺序做完，基本能定位到单一原因：

1. **确认失效层次**：是「全都没有」（宿主未激活），还是局部 / 仅客户端？→ §一
2. **拿到宿主侧真实报错**：看启动审计的 `did not activate` 行。拿不到就重启一次 DSH 并保留终端输出
3. **确认看的是运行中的那份代码**：比对 `<profile>/node_modules/<包名>/lib/` 与仓库产物的哈希 → §二.2
4. **确认平台侧的当前契约**：在 DSH 工作树 HEAD（不是发布标签）里读类型定义与校验函数
5. **定位变更提交**：`git log -S "<错误信息里的关键词>"`，并用 `git show <标签>:<文件>` 对比
6. **最小复现**：写一个几十行脚本，用真实平台服务 + 假上下文跑通 `apply()`；比反复重启 DSH 快得多，
   也能直接进回归（本仓库的 `tools/verify-contract.mjs` 就是这样做出来的）
7. **改声明层**，重建产物，**同步到 profile 安装副本**，重新验证
8. **把这次断言固化成脚本**，并在文档里写清契约点——下一次升级先跑脚本，10 秒出结论

## 六、把排查成本降到最低的做法

| 做法 | 好处 |
| --- | --- |
| 把「平台契约」集中在**一个文件**里（如 `src/contract.js`），宿主与客户端共用 | 契约变更只改一处，两边不会漂移 |
| 常驻一个**对真实 DSH 的契约校验脚本**（`npm run verify`） | 升级后 10 秒区分「插件坏了」还是「平台契约变了」；失败信息直接指向契约点 |
| 校验脚本里加一条**负向对照**（旧形状必须仍被拒绝） | 保证脚本自身不会因为「两边一起改错」而失去意义 |
| 产物（`lib/`）随仓库提交，并在文档里写死**重建 + 同步 profile** 两条命令 | 避免「源码已修、运行仍是旧构建」 |
| 折叠函数遇到读不到的数据**报错或显式降级**，不要静默 `catch` 成默认值 | 平台删属性时能立刻暴露，而不是静默失效 |

## 相关文档

- [安装与升级](installation.md)：安装方式、版本要求与故障排查表
- [测试与验收](testing.md)：契约校验脚本的检查项与用法
- [构建与开发](development.md)：wire 契约的维护约定
- [版本历史](changelog.md)：1.7.0 的完整根因记录
