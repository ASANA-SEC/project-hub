// Data layer. Two interchangeable backends with the same methods:
//   Remote — Google Apps Script web app (Sheets + Drive), used when API_URL is set
//   Demo   — this browser's localStorage, seeded with example records
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const ENTITIES = ['users', 'rfqs', 'projects', 'tasks', 'claims', 'comments'];
  const DEMO_KEY = 'projecthub_demo_v1';

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const nowIso = () => new Date().toISOString();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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
          body: JSON.stringify(Object.assign({ action, token: this.token }, payload)),
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

    bootstrap() { return this.call('bootstrap', {}); },
    create(entity, record) { return this.call('create', { entity, record }); },
    update(entity, id, patch) { return this.call('update', { entity, id, patch }); },
    remove(entity, id) { return this.call('remove', { entity, id }); },

    async upload(entity, id, file) {
      const base64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] || '');
        r.onerror = () => reject(new Error('Could not read the file.'));
        r.readAsDataURL(file);
      });
      return this.call('upload', { entity, id, fileName: file.name, mimeType: file.type, base64 });
    },
  };

  // ------------------------------------------------------------ Demo

  function day(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function stamp(offsetDays) { return new Date(Date.now() + offsetDays * 864e5).toISOString(); }

  function seed() {
    const me = 'director@example.com';
    const users = [
      { id: me, name: 'You (Director)', role: 'admin', active: true },
      { id: 'ali@example.com', name: 'Ali (PM)', role: 'editor', active: true },
      { id: 'meiling@example.com', name: 'Mei Ling (PM)', role: 'editor', active: true },
      { id: 'raj@example.com', name: 'Raj (PM)', role: 'editor', active: true },
      { id: 'tender@example.com', name: 'Nurul (Tender)', role: 'editor', active: true },
    ];
    const rfq = (n, title, client, category, stage, assignee, closeIn, hour, est, stageAge, outcome) => ({
      id: 'r' + n, rfqNo: 'RFQ-DEMO-' + String(n).padStart(3, '0'), title, client, category, stage, assignee,
      closingDate: day(closeIn) + 'T' + hour, estValue: est, outcome: outcome || 'Pending', notes: '', files: [],
      stageChangedAt: stamp(-stageAge), createdBy: me, createdAt: stamp(-stageAge - 2), updatedAt: stamp(-stageAge),
    });
    const rfqs = [
      rfq(1, 'Supply & delivery of chemical injection pump spares', 'Client A (example)', 'Supply', 'todo', 'tender@example.com', 6, '12:00', 185000, 0.2),
      rfq(2, 'Supply of gate valves and flanges', 'Client B (example)', 'Supply', 'todo', 'tender@example.com', 4, '21:00', 96000, 1.6),
      rfq(3, 'Maintenance service for fire water pumps (2 years)', 'Client A (example)', 'Project/Service', 'todo', 'raj@example.com', 9, '12:00', 640000, 0.5),
      rfq(4, 'Supply of instrumentation cables', 'Client C (example)', 'Supply', 'pending', 'tender@example.com', 2, '12:00', 72000, 3.1),
      rfq(5, 'Calibration service for pressure gauges', 'Client B (example)', 'Project/Service', 'pending', 'meiling@example.com', 5, '17:00', 48000, 1.2),
      rfq(6, 'Supply of safety relief valves', 'Client D (example)', 'Supply', 'complete', 'tender@example.com', 3, '12:00', 133000, 0.8),
      rfq(7, 'Corrosion monitoring system upgrade', 'Client A (example)', 'Project/Service', 'draft_cptp', 'ali@example.com', 1, '21:00', 1250000, 1.0),
      rfq(8, 'Supply of gas detectors', 'Client C (example)', 'Supply', 'cptp_rejected', 'tender@example.com', 2, '12:00', 88000, 0.4),
      rfq(9, 'Scaffolding service for shutdown', 'Client D (example)', 'Project/Service', 'cptp_approved', 'raj@example.com', 2, '12:00', 420000, 0.3),
      rfq(10, 'Supply of lube oil filters', 'Client B (example)', 'Supply', 'submitted', 'tender@example.com', -3, '12:00', 54000, 3),
      rfq(11, 'Painting and blasting works', 'Client A (example)', 'Project/Service', 'submitted', 'meiling@example.com', -6, '12:00', 980000, 6),
      rfq(12, 'Supply of level transmitters', 'Client C (example)', 'Supply', 'tc', 'tender@example.com', -10, '12:00', 210000, 2),
      rfq(13, 'Insulation repair works', 'Client D (example)', 'Project/Service', 'tc_submitted', 'ali@example.com', -20, '12:00', 365000, 5, 'Awarded'),
      rfq(14, 'Supply of battery chargers', 'Client B (example)', 'Supply', 'tc_submitted', 'tender@example.com', -25, '12:00', 77000, 9, 'Lost'),
      rfq(15, 'Supply of process analysers', 'Client A (example)', 'Supply', 'closed', 'tender@example.com', -2, '12:00', 300000, 4, 'Cancelled'),
    ];
    const projects = [
      { id: 'p1', code: 'PRJ-DEMO-01', name: 'Insulation repair works (example)', client: 'Client D (example)', pm: 'ali@example.com',
        contractValue: 3650000, voValue: 120000, retentionPct: 5, startDate: day(-120), endDate: day(60), status: 'Active',
        health: 'On track', progressPct: 62, notes: '', files: [] },
      { id: 'p2', code: 'PRJ-DEMO-02', name: 'Fire water pump overhaul (example)', client: 'Client A (example)', pm: 'raj@example.com',
        contractValue: 1880000, voValue: 0, retentionPct: 10, startDate: day(-75), endDate: day(15), status: 'Active',
        health: 'At risk', progressPct: 48, notes: '', files: [] },
      { id: 'p3', code: 'PRJ-DEMO-03', name: 'Control room renovation (example)', client: 'Client B (example)', pm: 'meiling@example.com',
        contractValue: 2420000, voValue: 260000, retentionPct: 5, startDate: day(-200), endDate: day(-10), status: 'Active',
        health: 'Off track', progressPct: 88, notes: '', files: [] },
    ];
    const t = (n, projectId, title, assignee, status, priority, due, milestone) => ({
      id: 't' + n, projectId, title, assignee, status, priority, dueDate: due === null ? '' : day(due), isMilestone: !!milestone,
      completedAt: status === 'Done' ? stamp(-1) : '', notes: '', files: [], createdBy: me, createdAt: stamp(-30), updatedAt: stamp(-1),
    });
    const tasks = [
      t(1, 'p1', 'Mobilisation and site setup', 'ali@example.com', 'Done', 'High', -100, true),
      t(2, 'p1', 'Remove damaged insulation — Area 1', 'ali@example.com', 'Done', 'Medium', -40),
      t(3, 'p1', 'Install new cladding — Area 1', 'ali@example.com', 'In Progress', 'High', 5),
      t(4, 'p1', 'Area 1 handover inspection', 'ali@example.com', 'To Do', 'High', 12, true),
      t(5, 'p1', 'Submit method statement for Area 2', 'director@example.com', 'Review', 'Medium', 1),
      t(6, 'p2', 'Pump dismantling and inspection report', 'raj@example.com', 'Done', 'High', -30, true),
      t(7, 'p2', 'Order impeller and mechanical seals', 'raj@example.com', 'In Progress', 'Urgent', -4),
      t(8, 'p2', 'Reassembly and performance test', 'raj@example.com', 'To Do', 'High', 10, true),
      t(9, 'p2', 'Update client on spare part delay', 'director@example.com', 'To Do', 'Urgent', 0),
      t(10, 'p3', 'Ceiling and lighting works', 'meiling@example.com', 'Done', 'Medium', -45),
      t(11, 'p3', 'Console installation', 'meiling@example.com', 'In Progress', 'High', -12, true),
      t(12, 'p3', 'Testing and commissioning', 'meiling@example.com', 'To Do', 'High', 7, true),
      t(13, 'p3', 'Prepare VO-03 justification', 'director@example.com', 'To Do', 'Medium', 3),
    ];
    const c = (n, projectId, claimNo, title, submitted, claimed, certified, paid, paidDate, status) => ({
      id: 'c' + n, projectId, claimNo, title, submittedDate: submitted === null ? '' : day(submitted), claimedAmount: claimed,
      certifiedAmount: certified, paidAmount: paid, paidDate: paidDate === null ? '' : day(paidDate), paymentTermDays: 30,
      status, notes: '', files: [], createdBy: me, createdAt: stamp(-30), updatedAt: stamp(-1),
    });
    const claims = [
      c(1, 'p1', 'PC-01', 'Progress claim 1', -95, 540000, 520000, 494000, -62, 'Paid'),
      c(2, 'p1', 'PC-02', 'Progress claim 2', -60, 780000, 760000, 722000, -25, 'Paid'),
      c(3, 'p1', 'PC-03', 'Progress claim 3', -25, 690000, 650000, 0, null, 'Certified'),
      c(4, 'p1', 'PC-04', 'Progress claim 4', null, 410000, 0, 0, null, 'Draft'),
      c(5, 'p2', 'PC-01', 'Progress claim 1', -50, 460000, 440000, 396000, -15, 'Paid'),
      c(6, 'p2', 'PC-02', 'Progress claim 2', -38, 380000, 360000, 0, null, 'Invoiced'),
      c(7, 'p3', 'PC-05', 'Progress claim 5', -70, 520000, 500000, 0, null, 'Certified'),
      c(8, 'p3', 'VO-02', 'Variation order 2', -12, 260000, 0, 0, null, 'Submitted'),
    ];
    return { me, data: { users, rfqs, projects, tasks, claims, comments: [] } };
  }

  const Demo = {
    mode: 'demo',
    _s: null,

    _load() {
      if (this._s) return this._s;
      let raw = null;
      try { raw = localStorage.getItem(DEMO_KEY); } catch (e) { /* storage blocked */ }
      try { this._s = raw ? JSON.parse(raw) : null; } catch (e) { this._s = null; }
      if (!this._s || !this._s.data) this._s = seed();
      ENTITIES.forEach((k) => { if (!Array.isArray(this._s.data[k])) this._s.data[k] = []; });
      this._save();
      return this._s;
    },
    _save() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(this._s)); } catch (e) { /* storage blocked */ } },
    _me() { const s = this._load(); return s.data.users.find((u) => u.id === s.me) || s.data.users[0]; },

    async bootstrap() {
      const s = this._load();
      const me = this._me();
      return { me: { id: me.id, name: me.name, role: me.role }, data: clone(s.data) };
    },
    async create(entity, record) {
      const s = this._load();
      const rec = Object.assign({}, record, {
        id: entity === 'users' ? String(record.id || '').toLowerCase() : uid(),
        createdBy: this._me().id, createdAt: nowIso(), updatedAt: nowIso(),
      });
      if (entity === 'users' && s.data.users.some((u) => u.id === rec.id)) throw new Error(rec.id + ' is already on the list.');
      if (entity === 'comments') rec.author = this._me().id;
      if (['rfqs', 'projects', 'tasks', 'claims'].includes(entity) && !Array.isArray(rec.files)) rec.files = [];
      s.data[entity].push(rec);
      this._save();
      return clone(rec);
    },
    async update(entity, id, patch) {
      const s = this._load();
      const rec = s.data[entity].find((r) => r.id === id);
      if (!rec) throw new Error('This item no longer exists.');
      Object.assign(rec, patch, { updatedAt: nowIso() });
      this._save();
      return clone(rec);
    },
    async remove(entity, id) {
      const s = this._load();
      s.data[entity] = s.data[entity].filter((r) => r.id !== id);
      this._save();
      return { id };
    },
    async upload() {
      throw new Error('File attachments go to Google Drive. They start working after the Google setup in README.md.');
    },
    reset() {
      try { localStorage.removeItem(DEMO_KEY); } catch (e) { /* storage blocked */ }
      this._s = null;
    },
  };

  window.API = CFG.API_URL ? Remote : Demo;
})();
