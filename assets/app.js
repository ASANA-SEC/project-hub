// Project Hub — single-page app. Views render from state S into #main;
// every click goes through one delegated handler keyed on data-act.
(function () {
  'use strict';

  const CFG = window.APP_CONFIG || {};
  const API = window.API;
  const CUR = CFG.CURRENCY || 'RM';

  // ------------------------------------------------------------ reference lists

  const RFQ_STAGES = [
    { key: 'todo', label: 'To Do' },
    { key: 'pending', label: 'Pending' },
    { key: 'complete', label: 'Complete' },
    { key: 'draft_cptp', label: 'Draft CP & TP' },
    { key: 'cptp_rejected', label: 'CP & TP Rejected' },
    { key: 'cptp_approved', label: 'Approved CP & TP' },
    { key: 'early_sub', label: 'Early Submission' },
    { key: 'submitted', label: 'Tender Submitted' },
    { key: 'tc', label: 'Technical Clarification' },
    { key: 'tc_submitted', label: 'TC Submitted' },
    { key: 'closed', label: 'Closed by Management' },
  ];
  const PRE = ['todo', 'pending', 'complete', 'draft_cptp', 'cptp_rejected', 'cptp_approved'];
  const SUB = ['early_sub', 'submitted', 'tc', 'tc_submitted'];
  const RFQ_CATEGORIES = ['Supply', 'Project/Service'];
  const RFQ_OUTCOMES = ['Pending', 'Awarded', 'Lost', 'Cancelled'];
  const PROJECT_STATUS = ['Planning', 'Active', 'On Hold', 'Completed'];
  const HEALTH = ['On track', 'At risk', 'Off track'];
  const TASK_STATUS = ['To Do', 'In Progress', 'Review', 'Done'];
  const PRIORITY = ['Low', 'Medium', 'High', 'Urgent'];
  const CLAIM_STATUS = ['Draft', 'Submitted', 'Certified', 'Invoiced', 'Paid'];
  const OPEN_CLAIM = ['Submitted', 'Certified', 'Invoiced'];
  const ROLES = [['admin', 'Admin — sees and changes everything'], ['editor', 'Editor — PM / staff'], ['viewer', 'Viewer — read only']];
  const FILE_ENTITIES = ['rfqs', 'projects', 'tasks', 'claims'];

  const LABEL = { rfqs: 'RFQ / Tender', projects: 'Project', tasks: 'Task', claims: 'Claim', users: 'Team member' };

  const FIELDS = {
    rfqs: [
      { k: 'rfqNo', l: 'RFQ / tender no.', t: 'text', req: true },
      { k: 'client', l: 'Client', t: 'text', list: 'clients' },
      { k: 'title', l: 'Title / scope', t: 'text', req: true, wide: true },
      { k: 'category', l: 'Category', t: 'select', opts: RFQ_CATEGORIES },
      { k: 'stage', l: 'Stage', t: 'select', opts: RFQ_STAGES.map((s) => [s.key, s.label]) },
      { k: 'assignee', l: 'Assigned to', t: 'user' },
      { k: 'closingDate', l: 'Closing date & time', t: 'datetime' },
      { k: 'estValue', l: 'Estimated value (' + CUR + ')', t: 'money' },
      { k: 'outcome', l: 'Outcome', t: 'select', opts: RFQ_OUTCOMES },
      { k: 'notes', l: 'Notes', t: 'textarea', wide: true },
    ],
    projects: [
      { k: 'code', l: 'Project code', t: 'text', req: true },
      { k: 'client', l: 'Client', t: 'text', list: 'clients' },
      { k: 'name', l: 'Project name', t: 'text', req: true, wide: true },
      { k: 'pm', l: 'Project manager', t: 'user' },
      { k: 'status', l: 'Status', t: 'select', opts: PROJECT_STATUS },
      { k: 'contractValue', l: 'Contract value (' + CUR + ')', t: 'money' },
      { k: 'voValue', l: 'Approved VO (' + CUR + ')', t: 'money' },
      { k: 'retentionPct', l: 'Retention %', t: 'number', min: 0, max: 100 },
      { k: 'progressPct', l: 'Physical progress %', t: 'number', min: 0, max: 100 },
      { k: 'startDate', l: 'Start date', t: 'date' },
      { k: 'endDate', l: 'Completion date', t: 'date' },
      { k: 'health', l: 'Health', t: 'select', opts: HEALTH },
      { k: 'notes', l: 'Notes', t: 'textarea', wide: true },
    ],
    tasks: [
      { k: 'title', l: 'Task', t: 'text', req: true, wide: true },
      { k: 'projectId', l: 'Project', t: 'project', req: true },
      { k: 'assignee', l: 'Assigned to', t: 'user' },
      { k: 'status', l: 'Status', t: 'select', opts: TASK_STATUS },
      { k: 'priority', l: 'Priority', t: 'select', opts: PRIORITY },
      { k: 'dueDate', l: 'Due date', t: 'date' },
      { k: 'isMilestone', l: 'This is a milestone', t: 'checkbox' },
      { k: 'notes', l: 'Notes', t: 'textarea', wide: true },
    ],
    claims: [
      { k: 'projectId', l: 'Project', t: 'project', req: true },
      { k: 'claimNo', l: 'Claim no.', t: 'text', req: true },
      { k: 'title', l: 'Description', t: 'text', wide: true },
      { k: 'status', l: 'Status', t: 'select', opts: CLAIM_STATUS },
      { k: 'submittedDate', l: 'Submitted on', t: 'date' },
      { k: 'claimedAmount', l: 'Claimed (' + CUR + ')', t: 'money' },
      { k: 'certifiedAmount', l: 'Certified (' + CUR + ')', t: 'money' },
      { k: 'paidAmount', l: 'Received (' + CUR + ')', t: 'money' },
      { k: 'paidDate', l: 'Received on', t: 'date' },
      { k: 'paymentTermDays', l: 'Payment term (days)', t: 'number', min: 0, max: 365 },
      { k: 'notes', l: 'Notes', t: 'textarea', wide: true },
    ],
    users: [
      { k: 'id', l: 'Google email', t: 'email', req: true, lockOnEdit: true },
      { k: 'name', l: 'Name', t: 'text', req: true },
      { k: 'role', l: 'Access', t: 'select', opts: ROLES },
      { k: 'active', l: 'Can sign in', t: 'checkbox' },
    ],
  };

  // ------------------------------------------------------------ state

  const S = {
    me: null,
    data: { users: [], rfqs: [], projects: [], tasks: [], claims: [], comments: [] },
    loaded: false,
    drawer: null,
    f: { rfqQuery: '', rfqMonth: 'all', rfqCat: 'all', rfqWho: 'all', rfqView: 'board', projTab: 'tasks', claimProject: 'all', claimStatus: 'open', projStatus: 'live' },
  };
  try { const v = localStorage.getItem('projecthub_rfqView'); if (v) S.f.rfqView = v; } catch (e) { /* storage blocked */ }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const app = $('#app');
  const drawerEl = $('#drawer');
  const toastEl = $('#toast');

  // ------------------------------------------------------------ helpers

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  const nf2 = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });
  function money(n) { return CUR + ' ' + nf2.format(Number(n) || 0); }
  function money0(n) { return CUR + ' ' + nf0.format(Number(n) || 0); }
  function moneyShort(n) {
    n = Number(n) || 0;
    const a = Math.abs(n);
    if (a >= 1e6) return CUR + ' ' + (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e4) return CUR + ' ' + (n / 1e3).toFixed(0) + 'K';
    return CUR + ' ' + nf0.format(n);
  }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function sum(arr, f) { return arr.reduce((t, x) => t + (Number(f(x)) || 0), 0); }

  function pad(n) { return String(n).padStart(2, '0'); }
  function dayStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return dayStr(new Date()); }
  function parseDay(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function parseDT(s) {
    if (!s) return null;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? parseDay(s) : new Date(s);
    return isNaN(d) ? null : d;
  }
  function addDays(s, n) { const d = parseDay(s); if (!d) return ''; d.setDate(d.getDate() + n); return dayStr(d); }
  function daysFromToday(s) { const d = parseDay(s); if (!d) return null; return Math.round((d - parseDay(today())) / 864e5); }
  function hoursUntil(s) { const d = parseDT(s); return d ? (d - Date.now()) / 36e5 : null; }
  function daysSince(iso) { const d = parseDT(iso); return d ? (Date.now() - d) / 864e5 : 0; }
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(s) { const d = parseDT(s); return d ? d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() : '—'; }
  function fmtShort(s) { const d = parseDT(s); return d ? d.getDate() + ' ' + MON[d.getMonth()] : '—'; }
  function fmtDT(s) {
    const d = parseDT(s);
    if (!d) return '—';
    return fmtShort(s) + (/T\d/.test(s) ? ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '');
  }
  function monthKey(s) { const d = parseDT(s); return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) : ''; }
  function monthLabel(k) { const [y, m] = k.split('-'); return MON[+m - 1] + ' ' + y; }
  function ago(iso) {
    const s = (Date.now() - (parseDT(iso) || Date.now())) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago';
    return fmtDate(iso);
  }
  function nowIso() { return new Date().toISOString(); }

  function find(entity, id) { return S.data[entity].find((r) => r.id === id); }
  function replace(entity, rec) {
    const i = S.data[entity].findIndex((r) => r.id === rec.id);
    if (i >= 0) S.data[entity][i] = rec; else S.data[entity].push(rec);
  }
  function user(id) { return S.data.users.find((u) => u.id === id); }
  function userName(id) { if (!id) return 'Unassigned'; const u = user(id); return (u && u.name) || id; }
  function initials(id) {
    const n = userName(id).replace(/\(.*?\)/g, '').trim();
    const parts = n.split(/[\s@._-]+/).filter(Boolean);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  function avatar(id, lg) {
    if (!id) return `<span class="av${lg ? ' lg' : ''}" style="background:var(--line-strong)" title="Unassigned">–</span>`;
    return `<span class="av${lg ? ' lg' : ''}" style="background:hsl(${hue(id)} 42% 40%)" title="${esc(userName(id))}">${esc(initials(id))}</span>`;
  }
  function stageLabel(k) { const s = RFQ_STAGES.find((x) => x.key === k); return s ? s.label : k || '—'; }
  function projectName(id) { const p = find('projects', id); return p ? p.name : '—'; }

  const isAdmin = () => S.me && S.me.role === 'admin';
  const canWrite = () => S.me && (S.me.role === 'admin' || S.me.role === 'editor');
  function canEditRec(entity, rec) {
    if (isAdmin()) return true;
    if (!canWrite() || entity === 'users') return false;
    return true;
  }
  function canDelete(entity, rec) {
    if (isAdmin()) return true;
    return canWrite() && entity === 'tasks';
  }

  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* blocked */ } }

  let toastTimer;
  function toast(msg, isErr) {
    toastEl.textContent = msg;
    toastEl.className = 'toast' + (isErr ? ' err' : '');
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, isErr ? 6000 : 2600);
  }

  const AUTH_CODES = ['AUTH_REQUIRED', 'AUTH_INVALID', 'AUTH_EXPIRED', 'NOT_INVITED'];
  function handleError(e) {
    if (e && AUTH_CODES.includes(e.code)) {
      ssSet('projecthub_token', null);
      API.token = null;
      closeDrawer();
      showSignIn(e.message);
      return;
    }
    toast((e && e.message) || 'Something went wrong. Try again.', true);
  }

  // ------------------------------------------------------------ derived figures

  function rfqAging(r) {
    const d = daysSince(r.stageChangedAt || r.createdAt);
    if (r.stage === 'todo' && d >= 1) return { cls: 'warn', text: 'Over 1 day' };
    if (r.stage === 'pending' && d > 2) return { cls: 'crit', text: 'Pending ' + Math.floor(d) + 'd' };
    if (r.stage === 'pending' && d >= 1) return { cls: 'warn', text: 'Pending ' + Math.floor(d) + 'd' };
    return null;
  }
  function rfqClosing(r) {
    if (!r.closingDate) return null;
    if (!PRE.includes(r.stage)) return { cls: '', text: 'Closed ' + fmtShort(r.closingDate) };
    const h = hoursUntil(r.closingDate);
    if (h < 0) return { cls: 'crit', text: 'Closing passed ' + fmtShort(r.closingDate) };
    if (h <= 24) return { cls: 'crit', text: 'Closes in ' + Math.max(1, Math.round(h)) + 'h' };
    if (h <= 72) return { cls: 'warn', text: 'Closes in ' + Math.ceil(h / 24) + 'd' };
    return { cls: '', text: 'Closes ' + fmtDT(r.closingDate) };
  }
  function taskDue(t) {
    if (!t.dueDate) return null;
    if (t.status === 'Done') return { cls: 'ok', text: 'Done' };
    const n = daysFromToday(t.dueDate);
    if (n < 0) return { cls: 'crit', text: 'Late ' + -n + 'd' };
    if (n === 0) return { cls: 'warn', text: 'Due today' };
    if (n <= 3) return { cls: 'warn', text: 'Due in ' + n + 'd' };
    return { cls: '', text: 'Due ' + fmtShort(t.dueDate) };
  }
  function claimDue(c) { return c.submittedDate ? addDays(c.submittedDate, Number(c.paymentTermDays) || 0) : ''; }
  function claimOutstanding(c) {
    if (!OPEN_CLAIM.includes(c.status)) return 0;
    return Math.max(0, (Number(c.certifiedAmount) || Number(c.claimedAmount) || 0) - (Number(c.paidAmount) || 0));
  }
  function claimOverdue(c) { const due = claimDue(c); return OPEN_CLAIM.includes(c.status) && due && daysFromToday(due) < 0; }
  function projectFinance(p) {
    const cl = S.data.claims.filter((c) => c.projectId === p.id && c.status !== 'Draft');
    const revised = (Number(p.contractValue) || 0) + (Number(p.voValue) || 0);
    const claimed = sum(cl, (c) => c.claimedAmount);
    const certified = sum(cl, (c) => c.certifiedAmount);
    const received = sum(cl, (c) => c.paidAmount);
    const outstanding = sum(cl, claimOutstanding);
    const retention = certified * (Number(p.retentionPct) || 0) / 100;
    return { revised, claimed, certified, received, outstanding, retention, overdue: cl.filter(claimOverdue) };
  }
  const healthCls = (h) => (h === 'Off track' ? 'crit' : h === 'At risk' ? 'warn' : 'ok');
  function chip(c) { return c ? `<span class="chip ${c.cls}">${esc(c.text)}</span>` : ''; }

  // ------------------------------------------------------------ boot & auth

  function jwtExpired(t) {
    try {
      const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !p.exp || p.exp * 1000 < Date.now() + 60000;
    } catch (e) { return true; }
  }

  async function boot() {
    if (API.mode === 'remote') {
      if (!CFG.GOOGLE_CLIENT_ID) {
        app.innerHTML = '<div class="boot">GOOGLE_CLIENT_ID is missing in config.js. See README.md, step 1.</div>';
        return;
      }
      const t = ssGet('projecthub_token');
      if (t && !jwtExpired(t)) { API.token = t; await loadData(); } else showSignIn();
    } else {
      await loadData();
    }
  }

  let gisLoading;
  function loadGis() {
    if (window.google && google.accounts) return Promise.resolve();
    if (!gisLoading) {
      gisLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Could not load Google Sign-In.'));
        document.head.appendChild(s);
      });
    }
    return gisLoading;
  }

  function showSignIn(message) {
    S.loaded = false;
    app.innerHTML = `
      <div class="signin"><div class="box">
        <div class="brand"><span class="mark">PH</span><div><b style="color:var(--ink)">${esc(CFG.COMPANY_NAME || 'Project Hub')}</b></div></div>
        <h1>Sign in</h1>
        <p>Use the Google account your admin added to Project Hub.</p>
        ${message ? `<div class="err">${esc(message)}</div>` : ''}
        <div id="gbtn"></div>
      </div></div>`;
    loadGis().then(() => {
      google.accounts.id.initialize({
        client_id: CFG.GOOGLE_CLIENT_ID,
        callback: (resp) => {
          API.token = resp.credential;
          ssSet('projecthub_token', resp.credential);
          loadData();
        },
        auto_select: !message,
      });
      const el = $('#gbtn');
      if (el) google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', width: 300 });
      if (!message) google.accounts.id.prompt();
    }).catch((e) => toast(e.message, true));
  }

  function signOut() {
    ssSet('projecthub_token', null);
    API.token = null;
    if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
    showSignIn();
  }

  async function loadData(silent) {
    try {
      const res = await API.bootstrap();
      S.me = res.me;
      const data = res.data || {};
      Object.keys(S.data).forEach((k) => { S.data[k] = Array.isArray(data[k]) ? data[k] : []; });
      FILE_ENTITIES.forEach((k) => S.data[k].forEach((r) => {
        if (typeof r.files === 'string') { try { r.files = JSON.parse(r.files); } catch (e) { r.files = []; } }
        if (!Array.isArray(r.files)) r.files = [];
      }));
      if (!S.loaded) { S.loaded = true; renderShell(); }
      render();
    } catch (e) {
      if (!silent) handleError(e);
    }
  }

  // ------------------------------------------------------------ shell

  const ICONS = {
    dashboard: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    rfq: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    projects: '<path d="M3 7h18v13H3zM8 7V4h8v3"/><path d="M3 12h18"/>',
    tasks: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    claims: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  };
  function navItem(key, label, count) {
    return `<a href="#${key}" data-nav="${key}"><svg viewBox="0 0 24 24">${ICONS[key]}</svg><span class="lbl">${label}</span>${count ? `<span class="count">${count}</span>` : ''}</a>`;
  }

  function renderShell() {
    app.innerHTML = `
      <div class="shell">
        <aside class="side">
          <div class="brand"><span class="mark">PH</span><div><b>${esc(CFG.COMPANY_NAME || 'Project Hub')}</b><small>Project Hub</small></div></div>
          <nav class="nav" id="nav"></nav>
          <div class="side-foot">
            <div class="me">${avatar(S.me.id, true)}<div class="who"><b>${esc(S.me.name || S.me.id)}</b><small>${esc(S.me.role)}</small></div></div>
            <div class="links">
              <button type="button" data-act="refresh">Refresh</button>
              ${API.mode === 'remote' ? '<button type="button" data-act="signout">Sign out</button>' : ''}
            </div>
          </div>
        </aside>
        <main class="main" id="main"></main>
      </div>`;
  }

  function renderNav(view) {
    const myOverdue = S.data.tasks.filter((t) => t.assignee === S.me.id && t.status !== 'Done' && t.dueDate && daysFromToday(t.dueDate) < 0).length;
    const nav = $('#nav');
    nav.innerHTML = navItem('dashboard', 'Dashboard') + navItem('rfq', 'RFQ &amp; Tender') + navItem('projects', 'Projects') +
      navItem('tasks', 'My Tasks', myOverdue) + navItem('claims', 'Payments &amp; Claims') + (isAdmin() ? navItem('users', 'Team &amp; Access') : '');
    const active = view === 'project' ? 'projects' : view;
    nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.nav === active));
  }

  function demoBanner() {
    if (API.mode !== 'demo') return '';
    return `<div class="banner"><b>Demo mode</b><span>Example data, saved in this browser only. Connect Google Sheets to share it with the team (README.md).</span><button type="button" data-act="reset-demo">Reset example data</button></div>`;
  }

  function route() {
    const h = decodeURIComponent((location.hash || '#dashboard').slice(1));
    const [view, id] = h.split('/');
    return { view: view || 'dashboard', id };
  }

  function render() {
    if (!S.loaded) return;
    const main = $('#main');
    if (!main) return;
    const { view, id } = route();
    renderNav(view);
    const board = $('.board', main);
    const keepLeft = board ? board.scrollLeft : 0;
    const keepTop = window.scrollY;
    const views = { dashboard: viewDashboard, rfq: viewRfq, projects: viewProjects, project: () => viewProject(id), tasks: viewMyTasks, claims: viewClaims, users: viewUsers };
    main.innerHTML = demoBanner() + (views[view] || viewDashboard)();
    const nb = $('.board', main);
    if (nb && keepLeft) nb.scrollLeft = keepLeft;
    if (S._sameView === view + id) window.scrollTo(0, keepTop);
    S._sameView = view + id;
    document.title = ({ dashboard: 'Dashboard', rfq: 'RFQ & Tender', projects: 'Projects', project: 'Project', tasks: 'My Tasks', claims: 'Payments & Claims', users: 'Team & Access' }[view] || 'Dashboard') + ' · Project Hub';
  }

  // ------------------------------------------------------------ dashboard

  function kpi(value, label, sub, cls) {
    return `<div class="kpi"><div class="v ${cls || ''}">${value}</div><div class="l">${label}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
  }

  function viewDashboard() {
    const d = S.data;
    const open = d.rfqs.filter((r) => PRE.includes(r.stage));
    const soon = open.filter((r) => { const h = hoursUntil(r.closingDate); return h !== null && h >= 0 && h <= 72; });
    const missed = open.filter((r) => { const h = hoursUntil(r.closingDate); return h !== null && h < 0; });
    const won = d.rfqs.filter((r) => r.outcome === 'Awarded').length;
    const lost = d.rfqs.filter((r) => r.outcome === 'Lost').length;
    const pipeline = sum(d.rfqs.filter((r) => (PRE.includes(r.stage) || SUB.includes(r.stage)) && r.outcome === 'Pending'), (r) => r.estValue);
    const active = d.projects.filter((p) => p.status === 'Active');
    const risky = active.filter((p) => p.health !== 'On track');
    const openTasks = d.tasks.filter((t) => t.status !== 'Done');
    const lateTasks = openTasks.filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0);
    const lateMs = lateTasks.filter((t) => t.isMilestone);
    const outstanding = sum(d.claims, claimOutstanding);
    const overdueClaims = d.claims.filter(claimOverdue);
    const thisMonth = monthKey(today());
    const receivedMonth = sum(d.claims.filter((c) => c.paidDate && monthKey(c.paidDate) === thisMonth), (c) => c.paidAmount);

    // Needs attention — most urgent first
    const items = [];
    missed.forEach((r) => items.push({ sev: 'crit', w: 0, title: r.rfqNo + ' · ' + r.title, meta: 'RFQ closing date passed, not submitted · ' + userName(r.assignee), e: 'rfqs', id: r.id }));
    soon.forEach((r) => items.push({ sev: hoursUntil(r.closingDate) <= 24 ? 'crit' : 'warn', w: 1 + hoursUntil(r.closingDate) / 100, title: r.rfqNo + ' · ' + r.title, meta: rfqClosing(r).text + ' · ' + stageLabel(r.stage) + ' · ' + userName(r.assignee), e: 'rfqs', id: r.id }));
    open.forEach((r) => { const a = rfqAging(r); if (a && a.cls === 'crit' && !items.some((i) => i.id === r.id)) items.push({ sev: 'warn', w: 3, title: r.rfqNo + ' · ' + r.title, meta: a.text + ' in Pending · ' + userName(r.assignee), e: 'rfqs', id: r.id }); });
    lateMs.forEach((t) => items.push({ sev: 'crit', w: 2, title: '◆ ' + t.title, meta: 'Milestone late ' + -daysFromToday(t.dueDate) + 'd · ' + projectName(t.projectId), e: 'tasks', id: t.id }));
    overdueClaims.forEach((c) => items.push({ sev: 'crit', w: 2.5, title: c.claimNo + ' · ' + projectName(c.projectId), meta: 'Payment overdue ' + -daysFromToday(claimDue(c)) + 'd · ' + money0(claimOutstanding(c)), e: 'claims', id: c.id }));
    lateTasks.filter((t) => !t.isMilestone).forEach((t) => items.push({ sev: 'warn', w: 4, title: t.title, meta: 'Task late ' + -daysFromToday(t.dueDate) + 'd · ' + userName(t.assignee), e: 'tasks', id: t.id }));
    items.sort((a, b) => (a.sev === b.sev ? a.w - b.w : a.sev === 'crit' ? -1 : 1));
    const shown = items.slice(0, 12);

    // Workload by person
    const people = d.users.filter((u) => u.active !== false).map((u) => ({
      u,
      rfq: open.filter((r) => r.assignee === u.id).length,
      task: openTasks.filter((t) => t.assignee === u.id && !(t.dueDate && daysFromToday(t.dueDate) < 0)).length,
      late: lateTasks.filter((t) => t.assignee === u.id).length,
    })).filter((p) => p.rfq + p.task + p.late > 0).sort((a, b) => (b.rfq + b.task + b.late) - (a.rfq + a.task + a.late));
    const maxLoad = Math.max(1, ...people.map((p) => p.rfq + p.task + p.late));

    const projRows = d.projects.filter((p) => p.status !== 'Completed').map((p) => {
      const f = projectFinance(p);
      const tl = d.tasks.filter((t) => t.projectId === p.id);
      const late = tl.filter((t) => t.status !== 'Done' && t.dueDate && daysFromToday(t.dueDate) < 0).length;
      return `<tr data-act="go" data-href="#project/${esc(p.id)}">
        <td class="title">${esc(p.name)}<div class="muted mono">${esc(p.code)}</div></td>
        <td><span class="pill ${healthCls(p.health)}">${esc(p.health)}</span></td>
        <td style="min-width:110px"><div class="bar"><i style="width:${Math.min(100, Number(p.progressPct) || 0)}%"></i></div><small class="muted num">${Number(p.progressPct) || 0}% physical</small></td>
        <td class="r">${moneyShort(f.received)}<div class="muted">${pct(f.received, f.revised)}% of ${moneyShort(f.revised)}</div></td>
        <td class="r">${late ? `<span class="chip crit">${late} late</span>` : '<span class="muted">—</span>'}</td>
      </tr>`;
    }).join('');

    return `
      <div class="head"><div><h1>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${esc((S.me.name || '').split(' ')[0] || 'there')}</h1>
        <div class="sub">${fmtDate(today())} · ${items.filter((i) => i.sev === 'crit').length} urgent, ${items.filter((i) => i.sev === 'warn').length} to watch</div></div></div>
      <section class="kpis">
        <div class="kgroup"><h3>Tendering</h3><div class="krow">
          ${kpi(open.length, 'Open RFQs', soon.length + ' closing in 72h', soon.length ? 'warn' : '')}
          ${kpi(won + lost ? pct(won, won + lost) + '%' : '—', 'Win rate', won + ' won · ' + lost + ' lost')}
          ${kpi(moneyShort(pipeline), 'Pipeline', 'est. value, undecided')}
        </div></div>
        <div class="kgroup"><h3>Delivery</h3><div class="krow">
          ${kpi(active.length, 'Active projects', risky.length + ' at risk or off track', risky.length ? 'warn' : '')}
          ${kpi(lateMs.length, 'Late milestones', 'across all projects', lateMs.length ? 'crit' : '')}
          ${kpi(lateTasks.length, 'Late tasks', openTasks.length + ' open in total', lateTasks.length ? 'warn' : '')}
        </div></div>
        <div class="kgroup"><h3>Cash</h3><div class="krow">
          ${kpi(moneyShort(outstanding), 'Outstanding', 'submitted, not yet received')}
          ${kpi(overdueClaims.length, 'Overdue payments', moneyShort(sum(overdueClaims, claimOutstanding)), overdueClaims.length ? 'crit' : '')}
          ${kpi(moneyShort(receivedMonth), 'Received', 'this month')}
        </div></div>
      </section>
      <div class="grid2">
        <section class="panel">
          <div class="ph"><h2>Needs attention</h2><span class="muted">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
          ${shown.length ? `<ul class="alerts">${shown.map((i) => `
            <li data-act="open" data-entity="${i.e}" data-id="${esc(i.id)}"><span class="sev ${i.sev}"></span>
              <div style="min-width:0"><div class="at">${esc(i.title)}</div><div class="am">${esc(i.meta)}</div></div><span class="chip ${i.sev}">${i.e === 'rfqs' ? 'RFQ' : i.e === 'claims' ? 'Claim' : 'Task'}</span></li>`).join('')}</ul>
            ${items.length > shown.length ? `<div class="muted">and ${items.length - shown.length} more</div>` : ''}`
          : '<div class="empty">Nothing urgent. All RFQs, milestones and payments are on time.</div>'}
        </section>
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
          <section class="panel">
            <div class="ph"><h2>Projects</h2><a href="#projects">All projects</a></div>
            ${projRows ? `<div class="tablewrap"><table class="t"><thead><tr><th>Project</th><th>Health</th><th>Progress</th><th class="r">Received</th><th class="r">Tasks</th></tr></thead><tbody>${projRows}</tbody></table></div>`
              : '<div class="empty">No live projects yet. Add one under Projects.</div>'}
          </section>
          <section class="panel">
            <div class="ph"><h2>Team workload</h2><div class="legend"><span><i style="background:#4f8fb0"></i>Open RFQs</span><span><i style="background:#8bb7cc"></i>Open tasks</span><span><i style="background:var(--crit)"></i>Late</span></div></div>
            ${people.length ? `<div class="load">${people.map((p) => `
              <div class="row"><div class="nm">${avatar(p.u.id)}<span>${esc(p.u.name || p.u.id)}</span></div>
                <div class="stack" style="width:${Math.max(6, ((p.rfq + p.task + p.late) / maxLoad) * 100)}%">
                  <i class="s1" style="flex:${p.rfq}"></i><i class="s2" style="flex:${p.task}"></i><i class="s3" style="flex:${p.late}"></i></div>
                <span class="muted num" style="text-align:right">${p.rfq} · ${p.task}${p.late ? ` · <b style="color:var(--crit)">${p.late}</b>` : ''}</span></div>`).join('')}</div>`
              : '<div class="empty">No open work assigned yet.</div>'}
          </section>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------ RFQ & tender

  function rfqFiltered() {
    const q = S.f.rfqQuery.toLowerCase();
    return S.data.rfqs.filter((r) =>
      (S.f.rfqMonth === 'all' || monthKey(r.closingDate) === S.f.rfqMonth) &&
      (S.f.rfqCat === 'all' || r.category === S.f.rfqCat) &&
      (S.f.rfqWho === 'all' || (S.f.rfqWho === 'me' ? r.assignee === S.me.id : r.assignee === S.f.rfqWho)) &&
      (!q || [r.rfqNo, r.title, r.client, r.notes].join(' ').toLowerCase().includes(q)));
  }

  function viewRfq() {
    const months = [...new Set(S.data.rfqs.map((r) => monthKey(r.closingDate)).filter(Boolean))].sort().reverse();
    const users = S.data.users.filter((u) => u.active !== false);
    return `
      <div class="head"><div><h1>RFQ &amp; Tender</h1><div class="sub">Every enquiry from receipt to award. Drag a card to move it to the next stage.</div></div>
        ${canWrite() ? '<button class="btn primary" data-act="new" data-entity="rfqs">+ New RFQ</button>' : ''}</div>
      <div class="toolbar">
        <div class="grow"><input type="search" id="rfqQuery" placeholder="Search RFQ no., title or client" value="${esc(S.f.rfqQuery)}" data-filter-input="rfqQuery" aria-label="Search RFQs"></div>
        <select id="rfqMonth" data-filter="rfqMonth" aria-label="Closing month"><option value="all">All closing months</option>${months.map((m) => `<option value="${m}"${S.f.rfqMonth === m ? ' selected' : ''}>${monthLabel(m)}</option>`).join('')}</select>
        <select id="rfqCat" data-filter="rfqCat" aria-label="Category"><option value="all">Supply + Project/Service</option>${RFQ_CATEGORIES.map((c) => `<option${S.f.rfqCat === c ? ' selected' : ''}>${c}</option>`).join('')}</select>
        <select id="rfqWho" data-filter="rfqWho" aria-label="Assigned to"><option value="all">Everyone</option><option value="me"${S.f.rfqWho === 'me' ? ' selected' : ''}>Assigned to me</option>${users.map((u) => `<option value="${esc(u.id)}"${S.f.rfqWho === u.id ? ' selected' : ''}>${esc(u.name || u.id)}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="View"><button type="button" class="${S.f.rfqView === 'board' ? 'on' : ''}" data-act="rfq-view" data-v="board">Board</button><button type="button" class="${S.f.rfqView === 'table' ? 'on' : ''}" data-act="rfq-view" data-v="table">Table</button></div>
      </div>
      <div id="rfqBody">${rfqBody()}</div>`;
  }

  function rfqBody() {
    const list = rfqFiltered();
    if (!S.data.rfqs.length) {
      return `<div class="empty-state"><b>No RFQs yet</b>Add the first enquiry with “+ New RFQ”. It starts in To Do and moves across the board as the tender progresses.</div>`;
    }
    const open = list.filter((r) => PRE.includes(r.stage));
    const stat = `<div class="statline"><span><b>${list.length}</b> shown</span><span><b>${open.length}</b> in preparation</span>
      <span><b>${list.filter((r) => SUB.includes(r.stage)).length}</b> submitted</span>
      <span><b>${list.filter((r) => r.outcome === 'Awarded').length}</b> awarded</span>
      <span>Est. value in preparation <b>${moneyShort(sum(open, (r) => r.estValue))}</b></span></div>`;
    if (S.f.rfqView === 'table') return stat + rfqTable(list);
    const drag = canWrite();
    return stat + `<div class="board">${RFQ_STAGES.map((s) => {
      const cards = list.filter((r) => r.stage === s.key).sort((a, b) => (a.closingDate || '9').localeCompare(b.closingDate || '9'));
      return `<section class="col" data-drop="${s.key}" data-drop-field="stage" data-drop-entity="rfqs">
        <div class="col-h"><b>${s.label}</b><span class="n">${cards.length}</span>${cards.length ? `<span class="sum">${moneyShort(sum(cards, (r) => r.estValue))}</span>` : ''}</div>
        <div class="col-b">${cards.map((r) => rfqCard(r, drag)).join('') || '<div class="none">Drop a card here</div>'}</div>
      </section>`;
    }).join('')}</div>`;
  }

  function rfqCard(r, drag) {
    const nComments = S.data.comments.filter((c) => c.entity === 'rfqs' && c.entityId === r.id && c.kind !== 'log').length;
    const outcome = r.outcome && r.outcome !== 'Pending' ? `<span class="chip ${r.outcome === 'Awarded' ? 'ok' : r.outcome === 'Lost' ? 'crit' : ''}">${esc(r.outcome)}</span>` : '';
    return `<article class="card" tabindex="0" ${drag ? `draggable="true" data-drag="rfqs:${esc(r.id)}"` : ''} data-act="open" data-entity="rfqs" data-id="${esc(r.id)}">
      <div class="top"><span class="no">${esc(r.rfqNo)}</span><span class="chip ${r.category === 'Supply' ? '' : 'info'}">${r.category === 'Supply' ? 'Supply' : 'Proj/Svc'}</span></div>
      <div class="tt">${esc(r.title)}</div>
      ${r.client ? `<div class="cl">${esc(r.client)}${r.estValue ? ' · ' + moneyShort(r.estValue) : ''}</div>` : ''}
      <div class="ft">${chip(rfqClosing(r))}${chip(rfqAging(r))}${outcome}
        ${r.files && r.files.length ? `<span class="meta" title="Attachments">📎${r.files.length}</span>` : ''}
        ${nComments ? `<span class="meta" title="Comments">💬${nComments}</span>` : ''}
        <span class="sp"></span>${avatar(r.assignee)}</div>
    </article>`;
  }

  function rfqTable(list) {
    if (!list.length) return '<div class="empty-state"><b>No RFQs match these filters</b>Clear the search or pick another month.</div>';
    const rows = list.slice().sort((a, b) => (b.closingDate || '').localeCompare(a.closingDate || '')).map((r) => `
      <tr data-act="open" data-entity="rfqs" data-id="${esc(r.id)}">
        <td class="mono nw">${esc(r.rfqNo)}</td><td class="title">${esc(r.title)}</td><td>${esc(r.client)}</td>
        <td class="nw">${esc(r.category)}</td><td class="nw">${esc(stageLabel(r.stage))} ${chip(rfqAging(r))}</td>
        <td class="nw">${avatar(r.assignee)} ${esc(userName(r.assignee))}</td>
        <td class="nw">${fmtDT(r.closingDate)} ${PRE.includes(r.stage) ? chip(rfqClosing(r) && rfqClosing(r).cls ? rfqClosing(r) : null) : ''}</td>
        <td class="r">${r.estValue ? money0(r.estValue) : '—'}</td><td class="nw">${esc(r.outcome || '')}</td></tr>`).join('');
    return `<div class="tablewrap"><table class="t"><thead><tr><th>RFQ no.</th><th>Title</th><th>Client</th><th>Category</th><th>Stage</th><th>Assigned</th><th>Closing</th><th class="r">Est. value</th><th>Outcome</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ projects

  function viewProjects() {
    const list = S.data.projects.filter((p) => S.f.projStatus === 'all' || (S.f.projStatus === 'live' ? p.status !== 'Completed' : p.status === S.f.projStatus));
    const rows = list.map((p) => {
      const f = projectFinance(p);
      const tl = S.data.tasks.filter((t) => t.projectId === p.id);
      const done = tl.filter((t) => t.status === 'Done').length;
      return `<tr data-act="go" data-href="#project/${esc(p.id)}">
        <td class="mono nw">${esc(p.code)}</td><td class="title">${esc(p.name)}<div class="muted">${esc(p.client)}</div></td>
        <td class="nw">${avatar(p.pm)} ${esc(userName(p.pm))}</td><td class="nw">${esc(p.status)}</td>
        <td><span class="pill ${healthCls(p.health)}">${esc(p.health)}</span></td>
        <td style="min-width:120px"><div class="bar"><i style="width:${Math.min(100, Number(p.progressPct) || 0)}%"></i></div><small class="muted num">${Number(p.progressPct) || 0}% · ${done}/${tl.length} tasks</small></td>
        <td class="r">${money0(f.revised)}</td><td class="r">${money0(f.received)}<div class="muted">${pct(f.received, f.revised)}%</div></td>
        <td class="nw">${fmtDate(p.endDate)}</td></tr>`;
    }).join('');
    return `
      <div class="head"><div><h1>Projects</h1><div class="sub">${S.data.projects.filter((p) => p.status === 'Active').length} active · contract value ${moneyShort(sum(S.data.projects.filter((p) => p.status !== 'Completed'), (p) => (Number(p.contractValue) || 0) + (Number(p.voValue) || 0)))}</div></div>
        <div class="toolbar">
          <select id="projStatus" data-filter="projStatus" aria-label="Status"><option value="live"${S.f.projStatus === 'live' ? ' selected' : ''}>Not completed</option><option value="all"${S.f.projStatus === 'all' ? ' selected' : ''}>All projects</option>${PROJECT_STATUS.map((s) => `<option${S.f.projStatus === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
          ${canWrite() ? '<button class="btn primary" data-act="new" data-entity="projects">+ New project</button>' : ''}
        </div></div>
      ${rows ? `<div class="tablewrap"><table class="t"><thead><tr><th>Code</th><th>Project</th><th>PM</th><th>Status</th><th>Health</th><th>Progress</th><th class="r">Revised contract</th><th class="r">Received</th><th>Completion</th></tr></thead><tbody>${rows}</tbody></table></div>`
        : '<div class="empty-state"><b>No projects here</b>Add a project when a tender is awarded. Tasks, milestones and claims all hang off it.</div>'}`;
  }

  function viewProject(id) {
    const p = find('projects', id);
    if (!p) return '<div class="empty-state"><b>Project not found</b>It may have been deleted. <a href="#projects">Back to projects</a></div>';
    const f = projectFinance(p);
    const tasks = S.data.tasks.filter((t) => t.projectId === p.id);
    const ms = tasks.filter((t) => t.isMilestone);
    const claims = S.data.claims.filter((c) => c.projectId === p.id);
    const done = tasks.filter((t) => t.status === 'Done').length;
    const tab = S.f.projTab;
    const tabBtn = (k, label, n) => `<button type="button" class="${tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${label}<span class="n">${n}</span></button>`;
    let body = '';
    if (tab === 'milestones') body = milestoneTable(ms, p);
    else if (tab === 'claims') body = claimTable(claims, false, p);
    else body = taskBoard(tasks, p);
    const daysLeft = daysFromToday(p.endDate);
    return `
      <div class="head"><div><div class="crumb"><a href="#projects">Projects</a> / <span class="mono">${esc(p.code)}</span></div>
        <h1>${esc(p.name)}</h1>
        <div class="sub">${esc(p.client || 'No client set')} · PM ${esc(userName(p.pm))} · <span class="pill ${healthCls(p.health)}">${esc(p.health)}</span> · ${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}${p.endDate && p.status !== 'Completed' ? ` (${daysLeft < 0 ? -daysLeft + ' days past completion' : daysLeft + ' days left'})` : ''}</div></div>
        <button class="btn" data-act="open" data-entity="projects" data-id="${esc(p.id)}">${canWrite() ? 'Edit project' : 'Project details'}</button></div>
      <div class="strip">
        ${kpi(moneyShort(f.revised), 'Revised contract', p.voValue ? 'incl. VO ' + moneyShort(p.voValue) : 'no VO yet')}
        ${kpi(pct(f.claimed, f.revised) + '%', 'Claimed to date', moneyShort(f.claimed))}
        ${kpi(moneyShort(f.received), 'Received', pct(f.received, f.revised) + '% of contract')}
        ${kpi(moneyShort(f.outstanding), 'Outstanding', f.overdue.length ? f.overdue.length + ' overdue' : 'none overdue', f.overdue.length ? 'crit' : '')}
        ${kpi((Number(p.progressPct) || 0) + '%', 'Physical progress', 'retention held ' + moneyShort(f.retention))}
        ${kpi(done + '/' + tasks.length, 'Tasks done', ms.filter((t) => t.status !== 'Done' && t.dueDate && daysFromToday(t.dueDate) < 0).length + ' late milestones')}
      </div>
      <div class="tabs">${tabBtn('tasks', 'Tasks', tasks.filter((t) => t.status !== 'Done').length)}${tabBtn('milestones', 'Milestones', ms.length)}${tabBtn('claims', 'Claims', claims.length)}</div>
      ${body}`;
  }

  function taskCard(t, drag, showProject) {
    return `<article class="card" tabindex="0" ${drag ? `draggable="true" data-drag="tasks:${esc(t.id)}"` : ''} data-act="open" data-entity="tasks" data-id="${esc(t.id)}">
      <div class="tt">${t.isMilestone ? '<span class="ms" title="Milestone">◆</span> ' : ''}${esc(t.title)}</div>
      ${showProject ? `<div class="cl">${esc(projectName(t.projectId))}</div>` : ''}
      <div class="ft">${chip(taskDue(t))}${t.priority === 'Urgent' || t.priority === 'High' ? `<span class="chip ${t.priority === 'Urgent' ? 'crit' : 'warn'}">${esc(t.priority)}</span>` : ''}
        ${t.files && t.files.length ? `<span class="meta">📎${t.files.length}</span>` : ''}<span class="sp"></span>${avatar(t.assignee)}</div>
    </article>`;
  }

  function taskBoard(tasks, p) {
    const drag = canWrite();
    const add = canWrite() ? `<div class="toolbar"><button class="btn primary sm" data-act="new" data-entity="tasks" data-project="${esc(p.id)}">+ Add task</button><button class="btn sm" data-act="new" data-entity="tasks" data-project="${esc(p.id)}" data-milestone="1">+ Add milestone</button></div>` : '';
    return add + `<div class="board">${TASK_STATUS.map((s) => {
      const cards = tasks.filter((t) => t.status === s).sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9'));
      return `<section class="col" data-drop="${s}" data-drop-field="status" data-drop-entity="tasks">
        <div class="col-h"><b>${s}</b><span class="n">${cards.length}</span></div>
        <div class="col-b">${cards.map((t) => taskCard(t, drag)).join('') || '<div class="none">No tasks</div>'}</div></section>`;
    }).join('')}</div>`;
  }

  function milestoneTable(ms, p) {
    const add = canWrite() ? `<div class="toolbar"><button class="btn primary sm" data-act="new" data-entity="tasks" data-project="${esc(p.id)}" data-milestone="1">+ Add milestone</button></div>` : '';
    if (!ms.length) return add + '<div class="empty-state"><b>No milestones yet</b>Milestones are tasks marked “This is a milestone”, such as mobilisation, handover or testing and commissioning.</div>';
    const rows = ms.slice().sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9')).map((t) => {
      let variance = '<span class="muted">—</span>';
      if (t.status === 'Done' && t.completedAt && t.dueDate) {
        const late = Math.round((parseDay(t.completedAt.slice(0, 10)) - parseDay(t.dueDate)) / 864e5);
        variance = late > 0 ? `<span class="chip warn">Done ${late}d late</span>` : '<span class="chip ok">On time</span>';
      } else if (t.dueDate) variance = chip(taskDue(t));
      return `<tr data-act="open" data-entity="tasks" data-id="${esc(t.id)}"><td class="title"><span class="ms">◆</span> ${esc(t.title)}</td>
        <td class="nw">${fmtDate(t.dueDate)}</td><td class="nw">${t.completedAt ? fmtDate(t.completedAt) : '—'}</td>
        <td class="nw">${esc(t.status)}</td><td class="nw">${variance}</td><td class="nw">${avatar(t.assignee)} ${esc(userName(t.assignee))}</td></tr>`;
    }).join('');
    return add + `<div class="tablewrap"><table class="t"><thead><tr><th>Milestone</th><th>Planned</th><th>Actual</th><th>Status</th><th>Variance</th><th>Owner</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ claims

  function claimStatusChip(c) {
    if (claimOverdue(c)) return '<span class="chip crit">Overdue</span>';
    const cls = { Paid: 'ok', Certified: 'info', Invoiced: 'info', Submitted: 'warn', Draft: '' }[c.status] || '';
    return `<span class="chip ${cls}">${esc(c.status)}</span>`;
  }

  function claimTable(claims, showProject, p) {
    const add = canWrite() ? `<div class="toolbar"><button class="btn primary sm" data-act="new" data-entity="claims"${p ? ` data-project="${esc(p.id)}"` : ''}>+ New claim</button></div>` : '';
    if (!claims.length) return add + '<div class="empty-state"><b>No claims yet</b>Record each progress claim or VO claim here, then update it as it is certified and paid.</div>';
    const rows = claims.slice().sort((a, b) => (b.submittedDate || '9').localeCompare(a.submittedDate || '9')).map((c) => {
      const due = claimDue(c);
      return `<tr data-act="open" data-entity="claims" data-id="${esc(c.id)}">
        <td class="mono nw">${esc(c.claimNo)}</td>${showProject ? `<td class="title">${esc(projectName(c.projectId))}</td>` : ''}<td>${esc(c.title)}</td>
        <td class="nw">${fmtDate(c.submittedDate)}</td><td class="r">${money(c.claimedAmount)}</td><td class="r">${c.certifiedAmount ? money(c.certifiedAmount) : '—'}</td>
        <td class="r">${c.paidAmount ? money(c.paidAmount) : '—'}</td><td class="nw">${due && c.status !== 'Paid' && c.status !== 'Draft' ? fmtDate(due) : '—'}</td><td class="nw">${claimStatusChip(c)}</td></tr>`;
    }).join('');
    const live = claims.filter((c) => c.status !== 'Draft');
    return add + `<div class="tablewrap"><table class="t"><thead><tr><th>Claim</th>${showProject ? '<th>Project</th>' : ''}<th>Description</th><th>Submitted</th><th class="r">Claimed</th><th class="r">Certified</th><th class="r">Received</th><th>Payment due</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><td colspan="${showProject ? 4 : 3}">Total (excl. drafts)</td><td class="r">${money(sum(live, (c) => c.claimedAmount))}</td><td class="r">${money(sum(live, (c) => c.certifiedAmount))}</td><td class="r">${money(sum(live, (c) => c.paidAmount))}</td><td colspan="2" class="r">Outstanding ${money(sum(live, claimOutstanding))}</td></tr></tfoot></table></div>`;
  }

  function viewClaims() {
    const all = S.data.claims;
    const list = all.filter((c) => (S.f.claimProject === 'all' || c.projectId === S.f.claimProject) &&
      (S.f.claimStatus === 'all' || (S.f.claimStatus === 'open' ? c.status !== 'Paid' : S.f.claimStatus === 'overdue' ? claimOverdue(c) : c.status === S.f.claimStatus)));
    const live = all.filter((c) => c.status !== 'Draft');
    const overdue = all.filter(claimOverdue);
    const revised = sum(S.data.projects.filter((p) => p.status !== 'Completed'), (p) => (Number(p.contractValue) || 0) + (Number(p.voValue) || 0));
    return `
      <div class="head"><div><h1>Payments &amp; Claims</h1><div class="sub">Progress claims and VO claims across all projects. Payment due = submitted date + payment term.</div></div></div>
      <div class="strip five">
        ${kpi(moneyShort(revised), 'Live contract value', 'incl. approved VO')}
        ${kpi(moneyShort(sum(live, (c) => c.claimedAmount)), 'Claimed', pct(sum(live, (c) => c.claimedAmount), revised) + '% of contract value')}
        ${kpi(moneyShort(sum(live, (c) => c.certifiedAmount)), 'Certified', 'by client / consultant')}
        ${kpi(moneyShort(sum(all, claimOutstanding)), 'Outstanding', 'not yet received')}
        ${kpi(overdue.length, 'Overdue', moneyShort(sum(overdue, claimOutstanding)), overdue.length ? 'crit' : '')}
      </div>
      <div class="toolbar">
        <select id="claimProject" data-filter="claimProject" aria-label="Project"><option value="all">All projects</option>${S.data.projects.map((p) => `<option value="${esc(p.id)}"${S.f.claimProject === p.id ? ' selected' : ''}>${esc(p.code + ' · ' + p.name)}</option>`).join('')}</select>
        <select id="claimStatus" data-filter="claimStatus" aria-label="Status">
          <option value="open"${S.f.claimStatus === 'open' ? ' selected' : ''}>Not yet paid</option><option value="overdue"${S.f.claimStatus === 'overdue' ? ' selected' : ''}>Overdue only</option><option value="all"${S.f.claimStatus === 'all' ? ' selected' : ''}>All statuses</option>
          ${CLAIM_STATUS.map((s) => `<option${S.f.claimStatus === s ? ' selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      ${claimTable(list, true, S.f.claimProject !== 'all' ? find('projects', S.f.claimProject) : null)}`;
  }

  // ------------------------------------------------------------ my tasks

  function viewMyTasks() {
    const mine = S.data.tasks.filter((t) => t.assignee === S.me.id);
    const open = mine.filter((t) => t.status !== 'Done');
    const groups = [
      { k: 'Late', cls: 'crit', f: (t) => t.dueDate && daysFromToday(t.dueDate) < 0 },
      { k: 'Today', f: (t) => t.dueDate && daysFromToday(t.dueDate) === 0 },
      { k: 'Next 7 days', f: (t) => t.dueDate && daysFromToday(t.dueDate) > 0 && daysFromToday(t.dueDate) <= 7 },
      { k: 'Later', f: (t) => t.dueDate && daysFromToday(t.dueDate) > 7 },
      { k: 'No due date', f: (t) => !t.dueDate },
    ];
    const myRfq = S.data.rfqs.filter((r) => r.assignee === S.me.id && PRE.includes(r.stage)).sort((a, b) => (a.closingDate || '9').localeCompare(b.closingDate || '9'));
    const recentDone = mine.filter((t) => t.status === 'Done').sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')).slice(0, 5);
    const li = (t) => `<div class="li"><button type="button" class="check${t.status === 'Done' ? ' done' : ''}" data-act="toggle-done" data-id="${esc(t.id)}" aria-label="${t.status === 'Done' ? 'Mark as not done' : 'Mark as done'}"${canWrite() ? '' : ' disabled'}></button>
      <div class="tx" data-act="open" data-entity="tasks" data-id="${esc(t.id)}"><b>${t.isMilestone ? '<span class="ms">◆</span> ' : ''}${esc(t.title)}</b><small>${esc(projectName(t.projectId))} · ${esc(t.status)}</small></div>
      <div class="rt">${t.priority === 'Urgent' || t.priority === 'High' ? `<span class="chip ${t.priority === 'Urgent' ? 'crit' : 'warn'}">${esc(t.priority)}</span>` : ''}${chip(taskDue(t))}</div></div>`;
    return `
      <div class="head"><div><h1>My Tasks</h1><div class="sub">${open.length} open · ${open.filter(groups[0].f).length} late · ${myRfq.length} RFQs in preparation</div></div></div>
      ${myRfq.length ? `<div class="group"><h2>My RFQs in preparation</h2><div class="list">${myRfq.map((r) => `<div class="li"><span></span>
        <div class="tx" data-act="open" data-entity="rfqs" data-id="${esc(r.id)}"><b>${esc(r.title)}</b><small><span class="mono">${esc(r.rfqNo)}</span> · ${esc(r.client)} · ${esc(stageLabel(r.stage))}</small></div>
        <div class="rt">${chip(rfqAging(r))}${chip(rfqClosing(r))}</div></div>`).join('')}</div></div>` : ''}
      ${open.length ? groups.map((g) => { const ts = open.filter(g.f).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')); return ts.length ? `<div class="group"><h2 class="${g.cls || ''}">${g.k} · ${ts.length}</h2><div class="list">${ts.map(li).join('')}</div></div>` : ''; }).join('')
        : '<div class="empty-state"><b>No open tasks</b>Tasks assigned to you on any project show up here.</div>'}
      ${recentDone.length ? `<div class="group"><h2>Recently done</h2><div class="list">${recentDone.map(li).join('')}</div></div>` : ''}`;
  }

  // ------------------------------------------------------------ team & access

  function viewUsers() {
    if (!isAdmin()) return '<div class="empty-state"><b>Admins only</b>Ask an admin to change who has access.</div>';
    const rows = S.data.users.slice().sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)).map((u) => `
      <tr data-act="open" data-entity="users" data-id="${esc(u.id)}"><td class="nw">${avatar(u.id)} ${esc(u.name || '—')}</td><td>${esc(u.id)}</td>
        <td class="nw">${esc((ROLES.find((r) => r[0] === u.role) || [u.role, u.role])[1])}</td>
        <td>${u.active === false ? '<span class="chip">No access</span>' : '<span class="chip ok">Active</span>'}</td></tr>`).join('');
    return `
      <div class="head"><div><h1>Team &amp; Access</h1><div class="sub">Only the Google accounts listed here can sign in. Adding someone also gives them view access to the Drive folder for attachments.</div></div>
        <button class="btn primary" data-act="new" data-entity="users">+ Add person</button></div>
      <div class="tablewrap"><table class="t"><thead><tr><th>Name</th><th>Google email</th><th>Access</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ------------------------------------------------------------ drawer: view / edit any record

  function defaultsFor(entity, opts) {
    opts = opts || {};
    switch (entity) {
      case 'rfqs': return { stage: 'todo', category: 'Supply', outcome: 'Pending', assignee: S.me.id };
      case 'projects': return { status: 'Active', health: 'On track', retentionPct: 5, progressPct: 0, voValue: 0, pm: S.me.id };
      case 'tasks': return { status: 'To Do', priority: 'Medium', assignee: S.me.id, projectId: opts.project || '', isMilestone: !!opts.milestone };
      case 'claims': {
        const n = S.data.claims.filter((c) => c.projectId === opts.project).length + 1;
        return { status: 'Draft', paymentTermDays: 30, projectId: opts.project || '', claimNo: opts.project ? 'PC-' + pad(n) : '', title: opts.project ? 'Progress claim ' + n : '' };
      }
      case 'users': return { role: 'editor', active: true };
      default: return {};
    }
  }

  function recTitle(entity, r) {
    if (!r || !r.id) return 'New ' + LABEL[entity].toLowerCase();
    return { rfqs: r.rfqNo, projects: r.name, tasks: r.title, claims: r.claimNo + ' · ' + projectName(r.projectId), users: r.name || r.id }[entity] || '';
  }

  function fieldHtml(f, v, ro, isNew) {
    const id = 'f_' + f.k;
    const dis = ro || (f.lockOnEdit && !isNew) ? ' disabled' : '';
    const req = f.req ? ' required' : '';
    let input = '';
    switch (f.t) {
      case 'select':
        input = `<select id="${id}" name="${f.k}"${dis}>${f.opts.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
        break;
      case 'user': {
        const us = S.data.users.filter((u) => u.active !== false || u.id === v);
        input = `<select id="${id}" name="${f.k}"${dis}><option value="">Unassigned</option>${us.map((u) => `<option value="${esc(u.id)}"${u.id === v ? ' selected' : ''}>${esc(u.name || u.id)}</option>`).join('')}</select>`;
        break;
      }
      case 'project':
        input = `<select id="${id}" name="${f.k}"${dis}${req}><option value="">Choose a project</option>${S.data.projects.map((p) => `<option value="${esc(p.id)}"${p.id === v ? ' selected' : ''}>${esc(p.code + ' · ' + p.name)}</option>`).join('')}</select>`;
        break;
      case 'textarea':
        input = `<textarea id="${id}" name="${f.k}"${dis}>${esc(v)}</textarea>`;
        break;
      case 'checkbox':
        return `<label class="fld chk"><input type="checkbox" id="${id}" name="${f.k}"${v ? ' checked' : ''}${dis}><span>${esc(f.l)}</span></label>`;
      case 'money':
        input = `<input type="number" id="${id}" name="${f.k}" step="0.01" min="0" inputmode="decimal" value="${v === 0 || v ? esc(v) : ''}"${dis}>`;
        break;
      case 'number':
        input = `<input type="number" id="${id}" name="${f.k}" step="1" min="${f.min}" max="${f.max}" value="${v === 0 || v ? esc(v) : ''}"${dis}>`;
        break;
      case 'date':
        input = `<input type="date" id="${id}" name="${f.k}" value="${esc((v || '').slice(0, 10))}"${dis}>`;
        break;
      case 'datetime':
        input = `<input type="datetime-local" id="${id}" name="${f.k}" value="${esc((v || '').slice(0, 16))}"${dis}>`;
        break;
      case 'email':
        input = `<input type="email" id="${id}" name="${f.k}" value="${esc(v)}" autocomplete="off"${dis}${req}>`;
        break;
      default:
        input = `<input type="text" id="${id}" name="${f.k}" value="${esc(v)}"${f.list ? ` list="dl_${f.list}"` : ''}${dis}${req}>`;
    }
    return `<label class="fld${f.wide ? ' wide' : ''}"><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${input}</label>`;
  }

  function openRecord(entity, id, opts) {
    const rec = id ? find(entity, id) : null;
    if (id && !rec) { toast('This item no longer exists.', true); return; }
    S.drawer = { entity, id: rec ? rec.id : null, armed: false, busy: false };
    renderDrawer(rec ? Object.assign({}, rec) : defaultsFor(entity, opts));
  }

  function renderDrawer(rec) {
    const { entity, id } = S.drawer;
    const isNew = !id;
    const ro = !isNew && !canEditRec(entity, rec);
    const clients = [...new Set(S.data.rfqs.concat(S.data.projects).map((r) => r.client).filter(Boolean))].sort();
    const thread = isNew || entity === 'users' ? [] : S.data.comments.filter((c) => c.entity === entity && c.entityId === id).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    let extra = '';
    if (!isNew && entity === 'projects') extra = `<a class="btn sm" href="#project/${esc(id)}" data-act="close-drawer">Open project page</a>`;
    if (!isNew && entity === 'rfqs' && rec.outcome === 'Awarded' && canWrite() && !S.data.projects.some((p) => p.notes && p.notes.includes(rec.rfqNo))) {
      extra = `<button type="button" class="btn sm" data-act="rfq-to-project">Create project from this award</button>`;
    }
    drawerEl.innerHTML = `
      <div class="scrim" data-act="close-drawer"></div>
      <div class="pane" role="dialog" aria-modal="true" aria-labelledby="paneTitle">
        <div class="pane-h"><div style="min-width:0"><div class="k">${esc(LABEL[entity])}</div><h2 id="paneTitle">${esc(recTitle(entity, rec))}</h2>
          ${!isNew && rec.updatedAt ? `<div class="muted" style="font-size:12px">Updated ${ago(rec.updatedAt)}</div>` : ''}</div>
          <button type="button" class="x" data-act="close-drawer" aria-label="Close">×</button></div>
        <div class="pane-b">
          <form class="form" id="recForm" novalidate>
            ${FIELDS[entity].map((f) => fieldHtml(f, rec[f.k], ro, isNew)).join('')}
            <datalist id="dl_clients">${clients.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
            <div class="form-actions">
              ${ro ? '<span class="muted">You have view-only access.</span>' : `<button type="submit" class="btn primary" id="saveBtn">${isNew ? 'Add ' + LABEL[entity].toLowerCase() : 'Save changes'}</button><button type="button" class="btn" data-act="close-drawer">Cancel</button>`}
              ${extra}
              <span class="sp"></span>
              ${!isNew && canDelete(entity, rec) ? `<button type="button" class="btn danger${S.drawer.armed ? ' armed' : ''}" data-act="delete">${S.drawer.armed ? 'Click again to delete' : 'Delete'}</button>` : ''}
            </div>
          </form>
          ${!isNew && FILE_ENTITIES.includes(entity) ? `
            <section class="sec"><h3>Attachments <span>${canWrite() ? `<button type="button" class="btn sm" data-act="upload"${S.drawer.busy ? ' disabled' : ''}>${S.drawer.busy ? 'Uploading…' : 'Attach file'}</button>` : ''}</span></h3>
              <input type="file" id="fileInput" hidden>
              ${rec.files && rec.files.length ? `<ul class="files">${rec.files.map((fl) => `<li>📄 <a href="${esc(fl.url)}" target="_blank" rel="noopener">${esc(fl.name)}</a><small>${fl.size ? Math.max(1, Math.round(fl.size / 1024)) + ' KB · ' : ''}${esc(userName(fl.uploadedBy))} · ${ago(fl.uploadedAt)}</small></li>`).join('')}</ul>`
                : `<div class="muted">No files yet. ${API.mode === 'demo' ? 'Attachments are saved to Google Drive once it is connected.' : 'Attach quotations, drawings or certificates; they are saved to Google Drive.'}</div>`}
            </section>` : ''}
          ${!isNew && entity !== 'users' ? `
            <section class="sec"><h3>Comments &amp; activity</h3>
              <div class="thread">${thread.length ? thread.map((c) => c.kind === 'log'
                ? `<div class="msg log"><span class="dot"></span><div>${esc(userName(c.author))} ${esc(c.text)} · ${ago(c.createdAt)}</div></div>`
                : `<div class="msg">${avatar(c.author)}<div class="bd"><div class="hd"><b>${esc(userName(c.author))}</b> · ${ago(c.createdAt)}</div><div class="tx">${esc(c.text)}</div></div></div>`).join('')
                : '<div class="muted">No comments yet.</div>'}</div>
              ${canWrite() ? `<div class="composer"><textarea id="commentText" placeholder="Write an update or ask a question…" aria-label="Comment"></textarea><button type="button" class="btn sm" data-act="add-comment">Post comment</button></div>` : ''}
            </section>` : ''}
        </div>
      </div>`;
    drawerEl.hidden = false;
    document.body.style.overflow = 'hidden';
    const first = drawerEl.querySelector(isNew ? '#recForm input:not([disabled]), #recForm select:not([disabled])' : '.x');
    if (first) first.focus();
  }

  function closeDrawer() {
    S.drawer = null;
    drawerEl.hidden = true;
    drawerEl.innerHTML = '';
    document.body.style.overflow = '';
  }

  function readForm(form, entity, isNew) {
    const vals = {};
    for (const f of FIELDS[entity]) {
      if (f.lockOnEdit && !isNew) continue;
      const el = form.elements[f.k];
      if (!el) continue;
      let v = f.t === 'checkbox' ? el.checked : el.value.trim();
      if (f.t === 'money' || f.t === 'number') v = v === '' ? 0 : Number(v);
      if (f.req && (v === '' || v === null)) throw new Error(f.l + ' is required.');
      vals[f.k] = v;
    }
    if (entity === 'users' && isNew) {
      vals.id = vals.id.toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(vals.id)) throw new Error('Enter a valid Google email.');
    }
    if (vals.progressPct !== undefined) vals.progressPct = Math.min(100, Math.max(0, vals.progressPct));
    if (vals.retentionPct !== undefined) vals.retentionPct = Math.min(100, Math.max(0, vals.retentionPct));
    return vals;
  }

  function logChange(entity, id, text) {
    API.create('comments', { entity, entityId: id, kind: 'log', text })
      .then((c) => { S.data.comments.push(c); })
      .catch(() => { /* activity log is best-effort */ });
  }

  async function saveForm(form) {
    const { entity, id } = S.drawer;
    const isNew = !id;
    let vals;
    try { vals = readForm(form, entity, isNew); } catch (e) { toast(e.message, true); return; }
    const btn = $('#saveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      if (isNew) {
        if (entity === 'rfqs') vals.stageChangedAt = nowIso();
        if (entity === 'tasks') vals.completedAt = vals.status === 'Done' ? nowIso() : '';
        const created = await API.create(entity, vals);
        if (FILE_ENTITIES.includes(entity) && !Array.isArray(created.files)) created.files = [];
        S.data[entity].push(created);
        toast(LABEL[entity] + ' added');
        if (entity === 'projects') { closeDrawer(); location.hash = '#project/' + created.id; render(); return; }
      } else {
        const prev = find(entity, id);
        if (entity === 'rfqs' && prev.stage !== vals.stage) vals.stageChangedAt = nowIso();
        if (entity === 'tasks' && prev.status !== vals.status) vals.completedAt = vals.status === 'Done' ? nowIso() : '';
        const updated = await API.update(entity, id, vals);
        if (FILE_ENTITIES.includes(entity) && !Array.isArray(updated.files)) updated.files = prev.files || [];
        replace(entity, updated);
        if (entity === 'rfqs' && prev.stage !== vals.stage) logChange(entity, id, 'moved this to ' + stageLabel(vals.stage));
        if (entity === 'tasks' && prev.status !== vals.status) logChange(entity, id, 'changed status to ' + vals.status);
        if (entity === 'claims' && prev.status !== vals.status) logChange(entity, id, 'changed status to ' + vals.status);
        toast('Saved');
      }
      closeDrawer();
      render();
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = isNew ? 'Add ' + LABEL[entity].toLowerCase() : 'Save changes'; }
      handleError(e);
    }
  }

  async function deleteRecord() {
    const { entity, id } = S.drawer;
    if (!S.drawer.armed) {
      S.drawer.armed = true;
      renderDrawer(find(entity, id));
      return;
    }
    try {
      await API.remove(entity, id);
      S.data[entity] = S.data[entity].filter((r) => r.id !== id);
      closeDrawer();
      toast(LABEL[entity] + ' deleted');
      if (entity === 'projects') location.hash = '#projects';
      render();
    } catch (e) { handleError(e); }
  }

  async function addComment() {
    const ta = $('#commentText');
    const text = ta && ta.value.trim();
    if (!text) return;
    const { entity, id } = S.drawer;
    ta.disabled = true;
    try {
      const c = await API.create('comments', { entity, entityId: id, kind: 'comment', text });
      S.data.comments.push(c);
      renderDrawer(find(entity, id));
      render();
    } catch (e) { ta.disabled = false; handleError(e); }
  }

  async function uploadFile(file) {
    const { entity, id } = S.drawer;
    if (file.size > 20 * 1024 * 1024) { toast('Files must be 20 MB or smaller.', true); return; }
    S.drawer.busy = true;
    renderDrawer(find(entity, id));
    try {
      const updated = await API.upload(entity, id, file);
      replace(entity, updated);
      toast('File attached');
    } catch (e) { handleError(e); }
    if (S.drawer && S.drawer.id === id) { S.drawer.busy = false; renderDrawer(find(entity, id)); }
    render();
  }

  async function rfqToProject() {
    const r = find('rfqs', S.drawer.id);
    closeDrawer();
    S.drawer = { entity: 'projects', id: null, armed: false, busy: false };
    renderDrawer(Object.assign(defaultsFor('projects'), {
      name: r.title, client: r.client, contractValue: r.estValue || 0, pm: r.assignee || S.me.id,
      code: '', notes: 'Awarded from ' + r.rfqNo,
    }));
  }

  // Moving a card on a board, or ticking a task
  async function moveRecord(entity, id, field, value) {
    const rec = find(entity, id);
    if (!rec || rec[field] === value) return;
    const before = Object.assign({}, rec);
    const patch = { [field]: value };
    if (entity === 'rfqs') patch.stageChangedAt = nowIso();
    if (entity === 'tasks') patch.completedAt = value === 'Done' ? nowIso() : '';
    Object.assign(rec, patch);
    render();
    try {
      const updated = await API.update(entity, id, patch);
      if (!Array.isArray(updated.files)) updated.files = before.files || [];
      replace(entity, updated);
      logChange(entity, id, entity === 'rfqs' ? 'moved this to ' + stageLabel(value) : 'changed status to ' + value);
      toast(entity === 'rfqs' ? 'Moved to ' + stageLabel(value) : 'Marked ' + value);
    } catch (e) {
      replace(entity, before);
      render();
      handleError(e);
    }
  }

  // ------------------------------------------------------------ events

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'open': openRecord(el.dataset.entity, el.dataset.id); break;
      case 'new': openRecord(el.dataset.entity, null, { project: el.dataset.project, milestone: el.dataset.milestone === '1' }); break;
      case 'go': location.hash = el.dataset.href; break;
      case 'close-drawer': closeDrawer(); break;
      case 'delete': deleteRecord(); break;
      case 'add-comment': addComment(); break;
      case 'upload': { const fi = $('#fileInput'); if (fi) fi.click(); break; }
      case 'rfq-to-project': rfqToProject(); break;
      case 'tab': S.f.projTab = el.dataset.tab; render(); break;
      case 'rfq-view':
        S.f.rfqView = el.dataset.v;
        try { localStorage.setItem('projecthub_rfqView', S.f.rfqView); } catch (err) { /* storage blocked */ }
        render();
        break;
      case 'toggle-done': {
        const t = find('tasks', el.dataset.id);
        if (t) moveRecord('tasks', t.id, 'status', t.status === 'Done' ? 'In Progress' : 'Done');
        break;
      }
      case 'refresh': loadData().then(() => toast('Up to date')); break;
      case 'signout': signOut(); break;
      case 'reset-demo':
        if (API.reset) { API.reset(); S.loaded = false; loadData().then(() => toast('Example data restored')); }
        break;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && S.drawer) closeDrawer();
    if (e.key === 'Enter' && e.target.matches('.card[data-act="open"]')) openRecord(e.target.dataset.entity, e.target.dataset.id);
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'recForm') { e.preventDefault(); saveForm(e.target); }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'fileInput' && t.files && t.files[0]) { uploadFile(t.files[0]); return; }
    if (t.dataset.filter) {
      S.f[t.dataset.filter] = t.value;
      if (t.dataset.filter.startsWith('rfq') && $('#rfqBody')) $('#rfqBody').innerHTML = rfqBody();
      else render();
    }
  });

  let searchTimer;
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset.filterInput) return;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      S.f[t.dataset.filterInput] = t.value;
      const body = $('#rfqBody');
      if (body) body.innerHTML = rfqBody();
    }, 150);
  });

  // Drag and drop between board columns
  let dragKey = null;
  document.addEventListener('dragstart', (e) => {
    const c = e.target.closest && e.target.closest('[data-drag]');
    if (!c) return;
    dragKey = c.dataset.drag;
    e.dataTransfer.setData('text/plain', dragKey);
    e.dataTransfer.effectAllowed = 'move';
    c.classList.add('dragging');
  });
  document.addEventListener('dragend', (e) => {
    const c = e.target.closest && e.target.closest('[data-drag]');
    if (c) c.classList.remove('dragging');
    document.querySelectorAll('.drop-on').forEach((x) => x.classList.remove('drop-on'));
    dragKey = null;
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest && e.target.closest('[data-drop]');
    if (!col || !dragKey || dragKey.split(':')[0] !== col.dataset.dropEntity) return;
    e.preventDefault();
    if (!col.classList.contains('drop-on')) {
      document.querySelectorAll('.drop-on').forEach((x) => x.classList.remove('drop-on'));
      col.classList.add('drop-on');
    }
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('[data-drop]');
    if (!col) return;
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain') || dragKey;
    col.classList.remove('drop-on');
    if (!key) return;
    const [entity, id] = key.split(':');
    if (entity !== col.dataset.dropEntity) return;
    moveRecord(entity, id, col.dataset.dropField, col.dataset.drop);
  });

  window.addEventListener('hashchange', () => { closeDrawer(); render(); });

  // Pick up teammates' changes every 90 s while the tab is visible and nothing is being edited
  setInterval(() => {
    if (API.mode === 'remote' && S.loaded && !S.drawer && !dragKey && document.visibilityState === 'visible') loadData(true);
  }, 90000);

  boot();
})();
