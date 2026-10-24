# Project Hub — 公司项目管理平台

仿 Asana，专为建筑 / 工程公司做：**RFQ & Tender 看板、项目与任务、里程碑、Progress Claim 收款、总监总览**。

- 网页放在 **GitHub Pages**（免费）
- 数据存在你自己的 **Google Sheets**，附件存在 **Google Drive**
- 同事用 **Google 账号**登录，只有你在「Team & Access」里加进去的 email 才能进

```
GitHub Pages（网页） ──登录凭证──▶ Google Apps Script（后端） ──▶ Google Sheets（数据）
                                                         └──▶ Google Drive（附件）
```

还没接 Google 之前，网页会以**演示模式**运行：用示例数据，只存在你自己的浏览器里，可以先看界面、试操作。

---

## 第 1 部分：建 Google 登录用的 Client ID（约 10 分钟，只做一次）

1. 打开 <https://console.cloud.google.com/>，用你的 Google 账号登录
2. 左上角选单 → **New Project**，名字填 `Project Hub` → Create
3. 左侧 **APIs & Services → OAuth consent screen**
   - User type 选 **External** → Create
   - App name：`Project Hub`；User support email 和 Developer email 填你的 email → Save
   - 一路 Save and Continue 到底（Scopes 不用加）
   - 回到 OAuth consent screen，按 **Publish App**（不发布的话，只有 Test users 名单里的人能登录）
4. 左侧 **Credentials → Create Credentials → OAuth client ID**
   - Application type：**Web application**
   - Authorized JavaScript origins 加两行：
     - `https://<你的GitHub用户名>.github.io`
     - `http://localhost:8765`（本机测试用）
   - Create → 复制 **Client ID**（结尾是 `.apps.googleusercontent.com`）

## 第 2 部分：建后端（Apps Script，约 5 分钟）

1. 打开 <https://script.google.com/> → **New project**，项目名改成 `Project Hub API`
2. 把 `apps-script/Code.gs` 的全部内容贴进去，取代原本的代码
3. 改最上面两行：
   ```js
   const CLIENT_ID = '第 1 部分复制的 Client ID';
   const ADMIN_EMAIL = '你的 Google email';
   ```
4. 左侧 ⚙️ **Project Settings** → Time zone 选 `(GMT+08:00) Kuala Lumpur`
5. 回到编辑器，上方函数选单选 **setup** → 按 **Run** → 按提示授权（Google 会警告「未验证的应用」，按 Advanced → Go to Project Hub API）
   - 跑完后 Execution log 会显示新建的 **Google Sheet** 和 **Drive 文件夹**网址
6. 右上 **Deploy → New deployment**
   - 齿轮选 **Web app**
   - Execute as：**Me**
   - Who has access：**Anyone**（放心，没登录、不在名单里的人一样会被挡掉）
   - Deploy → 复制 **Web app URL**（结尾是 `/exec`）

> 以后改了 Code.gs，要 **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**，网址不会变。

## 第 3 部分：填设定、放上 GitHub

1. 打开 `config.js`，填入：
   ```js
   API_URL: '第 2 部分的 Web app URL',
   GOOGLE_CLIENT_ID: '第 1 部分的 Client ID',
   COMPANY_NAME: '你公司的名字',
   ```
2. 推到 GitHub（小助 可以帮你做）：
   ```bash
   gh repo create project-hub --public --source=. --push
   ```
3. GitHub 仓库页面 → **Settings → Pages** → Source 选 **Deploy from a branch**，Branch 选 `main` / `(root)` → Save
4. 等 1–2 分钟，网址是 `https://<你的GitHub用户名>.github.io/project-hub/`

## 第 4 部分：加同事

用你的账号登录网页 → 左侧 **Team & Access** → **+ Add person**，输入同事的 Google email，选权限：

| 权限 | 能做什么 |
|---|---|
| Admin | 全部都能改，可以删 RFQ / 项目 / Claim，可以管人 |
| Editor | PM / 员工：新增和修改 RFQ、项目、任务、Claim，可以删任务 |
| Viewer | 只能看 |

加人的同时，系统会把 Drive 附件文件夹的「检视」权限分享给他。

---

## 常见问题

- **代码公开安全吗？** 公开的只有网页代码。公司数据在你的 Google Sheet 里，后端每次都会核对登录凭证和名单，不在名单里拿不到任何数据。
- **数据可以直接在 Google Sheet 里改吗？** 可以，但不要改第一行的栏位名称，也不要改 `id` 栏。
- **备份？** Google Sheet 自带版本记录（档案 → 版本记录）。
- **附件上限**：每个文件 20 MB。

## 文件结构

| 文件 | 用途 |
|---|---|
| `index.html` | 网页入口 |
| `config.js` | 设定（API 网址、Client ID、公司名） |
| `assets/app.js` | 全部画面和操作 |
| `assets/api.js` | 数据层（演示模式 / Google 后端） |
| `assets/style.css` | 样式（自动跟随系统深色模式） |
| `apps-script/Code.gs` | Google 后端代码（贴到 script.google.com） |
