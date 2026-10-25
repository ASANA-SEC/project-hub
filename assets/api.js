// Data layer. Both backends answer the same actions through call(action, payload):
//   Remote — Google Apps Script web app (Sheets + Drive), used when API_URL is set
//   Demo   — this browser's localStorage with example data; runs the same rules (core.js)
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const DEMO_KEY = 'projecthub_demo_v3';
  const DEMO_USER = 'projecthub_demo_user';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* blocked */ } }

  function readBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] || '');
      r.onerror = () => reject(new Error('Could not read the file.'));
      r.readAsDataURL(file);
    });
  }

  // ------------------------------------------------------------ Remote

  const Remote = {
    mode: 'remote',
    token: null,

    async call(action, payload) {
      let res;
      try {
        res = await fetch(CFG.API_URL, {
          method: 'POST',
          // text/plain keeps this a "simple" request, so Apps Script needs no CORS preflight
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, token: this.token, payload: payload || {} }),
        });
      } catch (e) {
        throw Object.assign(new Error('Cannot reach the server. Check your internet connection.'), { code: 'NETWORK' });
      }
      let out;
      try { out = await res.json(); } catch (e) {
        throw Object.assign(new Error('The server sent an unexpected reply. Check API_URL in config.js.'), { code: 'BAD_REPLY' });
      }
      if (!out.ok) throw Object.assign(new Error(out.error || 'Request failed'), { code: out.code });
      return out.data;
    },

    async upload(id, file) {
      return this.call('item.upload', { id, fileName: file.name, mimeType: file.type, base64: await readBase64(file) });
    },
  };

  // ------------------------------------------------------------ Demo

  function day(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const stamp = (offsetDays) => new Date(Date.now() + offsetDays * 864e5).toISOString();

  const DEMO_ACCOUNTS = {
    'sam.secov@gmail.com': 'Super admin — everything, including accounts, access and sections',
    'szesian.mitosc@gmail.com': 'Super admin',
    'eileen.secov@gmail.com': 'Super admin',
    'ali@example.com': 'Projects: Manager · Project Tasks: Editor · Payment & Claims: Contributor',
    'nurul@example.com': 'RFQ & Tender: Editor',
    'meiling@example.com': 'Projects: Viewer · Project Tasks: Contributor · collaborator on one RFQ',
    'siti@example.com': 'Payment & Claims: Manager · Projects: Viewer',
    'raj@example.com': 'No section access — sees only the tasks and RFQ he is assigned to',
  };

  function seed() {
    const SAM = 'sam.secov@gmail.com';
    const users = [
      ['sam.secov@gmail.com', 'Sam'], ['szesian.mitosc@gmail.com', 'Sze Sian'], ['eileen.secov@gmail.com', 'Eileen'], ['ali@example.com', 'Ali (PM)'], ['nurul@example.com', 'Nurul (Tender)'],
      ['meiling@example.com', 'Mei Ling (PM)'], ['siti@example.com', 'Siti (Finance)'], ['raj@example.com', 'Raj (Site)'],
    ].map(([id, name]) => ({ id, name, active: true, createdBy: SAM, createdAt: stamp(-60), updatedAt: stamp(-60) }));

    const ids = { rfq: 's_rfq', projects: 's_projects', tasks: 's_tasks', claims: 's_claims' };
    const sections = window.TEMPLATES.map((t, i) => {
      const fields = clone(t.fields).map((f) => { if (f.type === 'link') f.target = ids[f.target] || ''; return f; });
      return { id: ids[t.id], name: t.name, template: t.id, order: i + 1, fields, stageField: t.stageField, archived: false, createdBy: SAM, createdAt: stamp(-60), updatedAt: stamp(-60) };
    });

    const access = [
      ['ali@example.com', 's_projects', 'manager'], ['ali@example.com', 's_tasks', 'editor'], ['ali@example.com', 's_claims', 'contributor'],
      ['nurul@example.com', 's_rfq', 'editor'],
      ['meiling@example.com', 's_projects', 'viewer'], ['meiling@example.com', 's_tasks', 'contributor'],
      ['siti@example.com', 's_claims', 'manager'], ['siti@example.com', 's_projects', 'viewer'],
    ].map(([userId, sectionId, level], i) => ({ id: 'a' + i, sectionId, userId, level, createdBy: SAM, createdAt: stamp(-60), updatedAt: stamp(-60) }));

    const item = (id, sectionId, title, data, editors, collaborators, ageDays) => ({
      id, sectionId, title, data, editors: editors || [], collaborators: collaborators || [], files: [],
      stageChangedAt: stamp(-(ageDays || 0)), createdBy: SAM, createdAt: stamp(-(ageDays || 0) - 2), updatedAt: stamp(-(ageDays || 0)),
    });
    const N = 'nurul@example.com', A = 'ali@example.com', M = 'meiling@example.com', R = 'raj@example.com', T = 'siti@example.com';
    const rfq = (n, title, client, category, stage, close, hour, est, age, outcome, eds, cols) =>
      item('i_r' + n, 's_rfq', title, { rfqNo: 'RFQ-DEMO-' + String(n).padStart(3, '0'), client, category, stage, closingDate: day(close) + 'T' + hour, estValue: est, outcome: outcome || 'pending', notes: '' }, eds || [N], cols, age);
    const items = [
      rfq(1, 'Supply & delivery of chemical injection pump spares', 'Client A (example)', 'supply', 'todo', 6, '12:00', 185000, 0.2),
      rfq(2, 'Supply of gate valves and flanges', 'Client B (example)', 'supply', 'todo', 4, '21:00', 96000, 1.6),
      rfq(3, 'Maintenance service for fire water pumps (2 years)', 'Client A (example)', 'projsvc', 'todo', 9, '12:00', 640000, 0.5, null, [N], [R]),
      rfq(4, 'Supply of instrumentation cables', 'Client C (example)', 'supply', 'pending', 2, '12:00', 72000, 3.1),
      rfq(5, 'Calibration service for pressure gauges', 'Client B (example)', 'projsvc', 'pending', 5, '17:00', 48000, 1.2, null, [N], [M]),
      rfq(6, 'Supply of safety relief valves', 'Client D (example)', 'supply', 'complete', 3, '12:00', 133000, 0.8),
      rfq(7, 'Corrosion monitoring system upgrade', 'Client A (example)', 'projsvc', 'draft_cptp', 1, '21:00', 1250000, 1.0, null, [N, A]),
      rfq(8, 'Supply of gas detectors', 'Client C (example)', 'supply', 'cptp_rejected', 2, '12:00', 88000, 0.4),
      rfq(9, 'Scaffolding service for shutdown', 'Client D (example)', 'projsvc', 'cptp_approved', 2, '12:00', 420000, 0.3),
      rfq(10, 'Supply of lube oil filters', 'Client B (example)', 'supply', 'submitted', -3, '12:00', 54000, 3),
      rfq(11, 'Painting and blasting works', 'Client A (example)', 'projsvc', 'submitted', -6, '12:00', 980000, 6),
      rfq(12, 'Supply of level transmitters', 'Client C (example)', 'supply', 'tc', -10, '12:00', 210000, 2),
      rfq(13, 'Insulation repair works', 'Client D (example)', 'projsvc', 'tc_submitted', -20, '12:00', 365000, 5, 'awarded'),
      rfq(14, 'Supply of battery chargers', 'Client B (example)', 'supply', 'tc_submitted', -25, '12:00', 77000, 9, 'lost'),
      rfq(15, 'Supply of process analysers', 'Client A (example)', 'supply', 'closed', -2, '12:00', 300000, 4, 'cancelled'),

      item('i_p1', 's_projects', 'Insulation repair works (example)', { code: 'PRJ-DEMO-01', client: 'Client D (example)', pm: A, status: 'active', health: 'ontrack', contractValue: 3650000, voValue: 120000, retentionPct: 5, progressPct: 62, startDate: day(-120), endDate: day(60), notes: '' }, [A], [], 30),
      item('i_p2', 's_projects', 'Fire water pump overhaul (example)', { code: 'PRJ-DEMO-02', client: 'Client A (example)', pm: A, status: 'active', health: 'atrisk', contractValue: 1880000, voValue: 0, retentionPct: 10, progressPct: 48, startDate: day(-75), endDate: day(15), notes: '' }, [A], [], 20),
      item('i_p3', 's_projects', 'Control room renovation (example)', { code: 'PRJ-DEMO-03', client: 'Client B (example)', pm: M, status: 'active', health: 'offtrack', contractValue: 2420000, voValue: 260000, retentionPct: 5, progressPct: 88, startDate: day(-200), endDate: day(-10), notes: '' }, [M], [], 40),
    ];
    const task = (n, project, title, status, priority, due, milestone, eds, cols) =>
      item('i_t' + n, 's_tasks', title, { project, status, priority, dueDate: day(due), milestone: !!milestone, notes: '' }, eds, cols, 3);
    items.push(
      task(1, 'i_p1', 'Mobilisation and site setup', 'done', 'high', -100, true, [A]),
      task(2, 'i_p1', 'Remove damaged insulation — Area 1', 'done', 'medium', -40, false, [R]),
      task(3, 'i_p1', 'Install new cladding — Area 1', 'doing', 'high', 5, false, [R], [A]),
      task(4, 'i_p1', 'Area 1 handover inspection', 'todo', 'high', 12, true, [A], [R, SAM]),
      task(5, 'i_p1', 'Submit method statement for Area 2', 'review', 'medium', 1, false, [SAM]),
      task(6, 'i_p2', 'Pump dismantling and inspection report', 'done', 'high', -30, true, [A]),
      task(7, 'i_p2', 'Order impeller and mechanical seals', 'doing', 'urgent', -4, false, [A]),
      task(8, 'i_p2', 'Reassembly and performance test', 'todo', 'high', 10, true, [R]),
      task(9, 'i_p2', 'Update client on spare part delay', 'todo', 'urgent', 0, false, [SAM]),
      task(10, 'i_p3', 'Console installation', 'doing', 'high', -12, true, [M]),
      task(11, 'i_p3', 'Testing and commissioning', 'todo', 'high', 7, true, [M]),
      task(12, 'i_p3', 'Prepare VO-03 justification', 'todo', 'medium', 3, false, [SAM], [M]),
    );
    const claim = (n, project, claimNo, title, status, sub, claimed, certified, paid, due, paidDate) =>
      item('i_c' + n, 's_claims', title, { claimNo, project, status, submittedDate: sub === null ? '' : day(sub), claimedAmount: claimed, certifiedAmount: certified, paidAmount: paid, paymentDue: due === null ? '' : day(due), paidDate: paidDate === null ? '' : day(paidDate), notes: '' }, [T], [], 5);
    items.push(
      claim(1, 'i_p1', 'PC-01', 'Progress claim 1', 'paid', -95, 540000, 520000, 494000, -65, -62),
      claim(2, 'i_p1', 'PC-02', 'Progress claim 2', 'paid', -60, 780000, 760000, 722000, -30, -25),
      claim(3, 'i_p1', 'PC-03', 'Progress claim 3', 'certified', -25, 690000, 650000, 0, 5, null),
      claim(4, 'i_p1', 'PC-04', 'Progress claim 4', 'draft', null, 410000, 0, 0, null, null),
      claim(5, 'i_p2', 'PC-01', 'Progress claim 1', 'paid', -50, 460000, 440000, 396000, -20, -15),
      claim(6, 'i_p2', 'PC-02', 'Progress claim 2', 'invoiced', -38, 380000, 360000, 0, -8, null),
      claim(7, 'i_p3', 'PC-05', 'Progress claim 5', 'certified', -70, 520000, 500000, 0, -40, null),
      claim(8, 'i_p3', 'VO-02', 'Variation order 2', 'submitted', -12, 260000, 0, 0, 18, null),
    );
    return { users, sections, access, items, comments: [] };
  }

  function demoStore() {
    let db = null;
    function load() {
      if (db) return db;
      try { db = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) { db = null; }
      if (!db || !Array.isArray(db.sections)) db = seed();
      ['users', 'sections', 'access', 'items', 'comments'].forEach((t) => { if (!Array.isArray(db[t])) db[t] = []; });
      persist();
      return db;
    }
    function persist() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch (e) { /* blocked */ } }
    const noDrive = () => Core.fail('DEMO', 'Attachments are saved to Google Drive. They start working after the Google setup in README.md.');
    return {
      all: (t) => clone(load()[t]),
      insert: (t, rec) => { load()[t].push(clone(rec)); persist(); },
      save: (t, rec) => {
        const rows = load()[t];
        const i = rows.findIndex((r) => r.id === rec.id);
        if (i < 0) throw Core.fail('NOT_FOUND', 'This record no longer exists.');
        rows[i] = clone(rec);
        persist();
      },
      del: (t, id) => { db[t] = load()[t].filter((r) => r.id !== id); persist(); },
      delWhere: (t, fn) => { db[t] = load()[t].filter((r) => !fn(r)); persist(); },
      now: () => new Date().toISOString(),
      uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      saveFile: () => { throw noDrive(); },
      readFile: () => { throw noDrive(); },
      reset: () => { try { localStorage.removeItem(DEMO_KEY); } catch (e) { /* blocked */ } db = null; },
    };
  }

  const store = demoStore();

  const Demo = {
    mode: 'demo',
    me: null,

    restore() {
      const email = ssGet(DEMO_USER);
      if (!email) return false;
      try { this.me = Core.identify(store, email, ''); } catch (e) { this.me = null; ssSet(DEMO_USER, null); }
      return !!this.me;
    },
    login(email) {
      this.me = Core.identify(store, email, '');
      ssSet(DEMO_USER, email);
    },
    logout() { this.me = null; ssSet(DEMO_USER, null); },
    accounts() {
      return store.all('users').filter((u) => u.active !== false)
        .map((u) => ({ id: u.id, name: u.name, note: DEMO_ACCOUNTS[u.id] || 'Added in this demo' }));
    },
    async call(action, payload) {
      if (!this.me) throw Core.fail('AUTH_REQUIRED', 'Please sign in.');
      // Re-check the account each call, like the server does
      this.me = Core.identify(store, this.me.id, '');
      return clone(Core.handle(store, this.me, action, payload || {}));
    },
    async upload(id, file) {
      return this.call('item.upload', { id, fileName: file.name, mimeType: file.type, base64: '' });
    },
    reset() { store.reset(); this.logout(); },
  };

  // On this computer, http://localhost:8765/?demo forces demo mode for testing.
  const forceDemo = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]demo\b/.test(location.search);
  window.API = CFG.API_URL && !forceDemo ? Remote : Demo;
})();
