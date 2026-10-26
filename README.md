# Project Hub — 公司项目管理平台

仿 Asana，专为建筑 / 工程公司做。所有模块（Section）和栏位都能在线上新增、修改：

- **登录页**：只有 Super admin 开过账号的 Google 账号才能进
- **Super admin（3 位）**：`sam.secov@gmail.com`、`szesian.mitosc@gmail.com`、`eileen.secov@gmail.com`，什么都能做，写死在后端，不能被删除或降级
- **Section**：Super admin 可以新增、改名、排序、移除、恢复（预设 RFQ & Tender、Projects、Project Tasks、Payment & Claims）
- **栏位模板**：Super admin 和该 Section 的 Manager 可以新增、删除、改名、改类型、调整下拉选项
- **权限**：每个人在每个 Section 各自设定权限；Dashboard 只显示他有权限的 Section
- **每个 task** 可以指定多个 Editors 和 Collaborators
- **筛选和排序**：每个 Section 都可以按任何栏位筛选（可以叠加多个条件）、排序，会记住每个人的设定
- **日历**：平台内有月、周、议程三种视图；有截止日期的 task 也会自动出现在相关同事自己的 Google Calendar 里
- **导出报表**（只有该 Section 的 Manager 和 Super admin 能用）：每个 Section 右上角「Export report」，可以下载 Excel 或 PDF
  - 导出的就是画面上现在的内容（套用搜索、筛选、排序）
  - Excel：「Items」工作表有全部栏位，金额和日期都是能计算的格式，附筛选箭头和合计；「Summary」工作表有筛选条件、各阶段的件数和金额小计
  - PDF：A4 横向，包含摘要表、明细表、逾期提醒（红字）、页码
  - 资料里有中文时，PDF 会改用浏览器的「另存为 PDF」视窗产生（内置的 PDF 字体不支持中文），在视窗里选「另存为 PDF」即可

- **全局搜索**：左上角「Search」或按 **Ctrl + K**（或 `/`），一次搜索所有你有权限的 Section：标题、编号、客户、人名、下拉选项、留言都搜得到
- **分享链接**：打开任何 task，按「Copy link」复制链接发给同事；只有对这个 task 有权限的人打得开，打开时直接以全屏显示
- **全屏**：task 视窗按「⤢ Full screen」展开成整页（左边栏位、右边附件和留言），系统会记住你的选择
- **Team performance**（Super admin 和 Section Manager）：每个人跨 Section 的工作量和绩效一页看完，可以导出 Excel / PDF
  - Super admin 看所有人、所有 Section；Manager 只看自己管理的 Section 的成员（不含 Super admin）
  - 栏位：Open（担任 Editor 或负责人的未完成项）、Late、Due ≤ 7 天、Waiting（卡在某阶段太久）、Completed（期间内完成）、On time %、平均完成天数、Collaborating
- **Dashboard 导出**（Super admin 和 Manager）：「Export dashboard」勾选要导出的区块（Section 摘要、各阶段件数、Needs attention、My open work、Team performance），合成一份 Excel 或 PDF

## 日历与监看

- 日期来源：每个 Section 里勾了「Deadline」的那个栏位。有时间的显示时间，只有日期的显示成全天
- **一般用户**：只看自己的日历（自己担任 Editor、Collaborator 或被指定为负责人的 task）
- **Section Manager**：可以切换查看自己管理的 Section 里每个成员的日历（只限这些 Section 的 task），名单里不会有 Super admin
- **Super admin**：可以查看所有人的日历

**Google Calendar 同步**：后端会在部署者（Sam）的 Google 账号里建一个「Project Hub」日历。每个有截止日期的 task 是一个活动，相关的人是宾客，所以活动会出现在他们自己的 Google Calendar。task 改名、改日期、改人、删除时会自动更新，活动里也附有回到平台的链接。

- 预设不寄邀请 email（`Code.gs` 里的 `SEND_INVITE_EMAILS = false`）。如果有同事看不到活动，请他在 Google Calendar 设定 →「活动设定」→「添加邀请」选「所有人」；或者把 `SEND_INVITE_EMAILS` 改成 `true`，让 Google 第一次寄邀请给他接受
- 一次改了很多资料后，Super admin 可以在 Calendar 页面按「Re-sync Google Calendar」，全部重新同步

```
GitHub Pages（网页） ──Google 登录凭证──▶ Google Apps Script（Code.gs + Core.gs） ──▶ Google Sheets（数据）
                                                                           └──▶ Google Drive（附件）
```

还没接 Google 之前，网页以**演示模式**运行：登录页会列出几个示例账号，点进去就能体验不同权限，数据只存在自己的浏览器里。

---

## 权限说明

**Section 权限**（在「Users & access」里按人、按 Section 设定）

| 权限 | 能做什么 |
|---|---|
| — | 看不到这个 Section；但被指定为某个 task 的 Editor / Collaborator 时，仍然看得到那个 task |
| Viewer | 看这个 Section 的全部 task |
| Contributor | 新增 task；只能修改自己担任 Editor 的 task（自己建的会自动成为 Editor） |
| Editor | 修改、删除这个 Section 的任何 task |
| Manager | Editor 能做的全部，加上修改这个 Section 的栏位模板 |
| Super admin | 全部 Section 都是最高权限，加上开账号、设权限、增删 Section |

**Task 层**

| 角色 | 能做什么 |
|---|---|
| Editors（可多人） | 修改这个 task、上传附件、改 Editors / Collaborators 名单 |
| Collaborators（可多人） | 查看这个 task、留言 |

所有权限都在后端（Core.gs）检查，不是只隐藏按钮。就算有人改了网页代码，也拿不到没有权限的数据。

---

## 第 1 部分：建 Google 登录用的 Client ID（约 10 分钟，只做一次）

1. 打开 <https://console.cloud.google.com/>，用 `sam.secov@gmail.com` 登录
2. 左上角选单 → **New Project**，名字填 `Project Hub` → Create
3. 左侧 **APIs & Services → OAuth consent screen**
   - User type 选 **External** → Create
   - App name：`Project Hub`；User support email 和 Developer email 填你的 email → Save
   - 一路 Save and Continue 到底（Scopes 不用加）
   - 回到 OAuth consent screen，按 **Publish App**（不发布的话，只有 Test users 名单里的人能登录）
4. 左侧 **Credentials → Create Credentials → OAuth client ID**
   - Application type：**Web application**
   - Authorized JavaScript origins 加两行：
     - `https://asana-sec.github.io`
     - `http://localhost:8765`（本机测试用）
   - Create → 复制 **Client ID**（结尾是 `.apps.googleusercontent.com`）

## 第 2 部分：建后端（Apps Script，约 5 分钟）

1. 打开 <https://script.google.com/>（同样用 `sam.secov@gmail.com`）→ **New project**，项目名改成 `Project Hub API`
2. 把 `apps-script/Code.gs` 的全部内容贴进 `Code.gs`，取代原本的代码
3. 左侧 Files 旁边按 **+ → Script**，命名为 `Core`，把 `assets/core.js` 的全部内容贴进去
4. 回到 `Code.gs`，改最上面这一行：
   ```js
   const CLIENT_ID = '第 1 部分复制的 Client ID';
   ```
5. 左侧 ⚙️ **Project Settings** → Time zone 选 `(GMT+08:00) Kuala Lumpur`
6. 回到 `Code.gs`，上方函数选单选 **setup** → 按 **Run** → 按提示授权（Google 会警告「未验证的应用」，按 Advanced → Go to Project Hub API）。授权项目包括 Sheets、Drive 和 Calendar
   - 跑完后 Execution log 会显示新建的 **Google Sheet**、**Drive 文件夹**和 **Project Hub 日历**
7. 右上 **Deploy → New deployment**
   - 齿轮选 **Web app**
   - Execute as：**Me**
   - Who has access：**Anyone**（放心，没登录、没开账号的人一样会被挡掉）
   - Deploy → 复制 **Web app URL**（结尾是 `/exec`）

> 以后 Code.gs 或 core.js 有更新，两个文件都要重新贴，再按 **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**，网址不会变。

## 第 3 部分：填设定、推上 GitHub

1. 把 **Web app URL** 和 **Client ID** 交给小助，小助会填进 `config.js` 并推上 GitHub
2. 1–2 分钟后打开 <https://asana-sec.github.io/project-hub/>，用 `sam.secov@gmail.com` 登录

## 第 4 部分：第一次登录后

1. Dashboard 会提示「No sections yet」→ 按 **Create the standard sections**，自动建好 4 个预设 Section
2. 左侧 **Users & access** → **+ Add user**，输入同事的 Google email，同时选好他在每个 Section 的权限
3. 需要调整栏位：进入 Section → **Customize columns**
4. 需要新的 Section（例如 Procurement）：左侧 **Manage sections** → **+ New section**

---

## 常见问题

- **代码公开安全吗？** 公开的只有网页代码。公司数据在你的 Google Sheet 里，后端每次都会核对登录凭证和权限。
- **附件安全吗？** Drive 文件夹不分享给任何人，同事只能通过平台下载他有权限的附件。
- **删掉栏位，数据会不见吗？** 不会。栏位只是隐藏起来，已经填的内容还在 Google Sheet 里。
- **移除 Section 呢？** 也只是隐藏，Super admin 可以在 Manage sections 里恢复。
- **数据可以直接在 Google Sheet 里改吗？** 不建议。`data`、`fields` 等栏位是 JSON 格式，改坏了平台会读不到。
- **备份？** Google Sheet 自带版本记录（档案 → 版本记录）。
- **附件上限**：每个文件 20 MB。

## 文件结构

| 文件 | 用途 |
|---|---|
| `index.html` | 网页入口 |
| `config.js` | 设定（API 网址、Client ID、公司名） |
| `assets/core.js` | 权限与数据规则：网页和 Google 后端共用（后端贴成 Core.gs） |
| `assets/templates.js` | 新建 Section 用的预设模板 |
| `assets/app.js` | 全部画面和操作 |
| `assets/api.js` | 数据层（演示模式 / Google 后端） |
| `assets/style.css` | 样式（自动跟随系统深色模式） |
| `apps-script/Code.gs` | Google 后端：Sheets 存取、Drive 附件、登录核对 |
