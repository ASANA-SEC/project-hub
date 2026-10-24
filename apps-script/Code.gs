/**
 * Project Hub — Google Apps Script backend
 *
 * Data lives in one Google Sheet (one tab per table), attachments in one
 * Google Drive folder. The GitHub Pages front end calls this web app with a
 * Google Sign-In ID token; only people listed in the "users" tab get in.
 *
 * Setup (see README.md):
 *   1. Fill in CLIENT_ID and ADMIN_EMAIL below.
 *   2. Run setup() once from the editor and approve the permissions.
 *   3. Deploy > New deployment > Web app: Execute as "Me", access "Anyone".
 */

const CLIENT_ID = 'PASTE-YOUR-OAUTH-CLIENT-ID.apps.googleusercontent.com';
const ADMIN_EMAIL = 'sam.secov@gmail.com';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_TEXT = 5000;

const SCHEMA = {
  users: {
    cols: ['id', 'name', 'role', 'active', 'createdBy', 'createdAt', 'updatedAt'],
    bool: ['active'],
  },
  rfqs: {
    cols: ['id', 'rfqNo', 'title', 'client', 'category', 'stage', 'assignee', 'closingDate',
      'estValue', 'outcome', 'notes', 'files', 'stageChangedAt', 'createdBy', 'createdAt', 'updatedAt'],
    num: ['estValue'],
    json: ['files'],
  },
  projects: {
    cols: ['id', 'code', 'name', 'client', 'pm', 'contractValue', 'voValue', 'retentionPct',
      'startDate', 'endDate', 'status', 'health', 'progressPct', 'notes', 'files',
      'createdBy', 'createdAt', 'updatedAt'],
    num: ['contractValue', 'voValue', 'retentionPct', 'progressPct'],
    json: ['files'],
  },
  tasks: {
    cols: ['id', 'projectId', 'title', 'assignee', 'status', 'priority', 'dueDate', 'isMilestone',
      'completedAt', 'notes', 'files', 'createdBy', 'createdAt', 'updatedAt'],
    bool: ['isMilestone'],
    json: ['files'],
  },
  claims: {
    cols: ['id', 'projectId', 'claimNo', 'title', 'submittedDate', 'claimedAmount', 'certifiedAmount',
      'paidAmount', 'paidDate', 'paymentTermDays', 'status', 'notes', 'files',
      'createdBy', 'createdAt', 'updatedAt'],
    num: ['claimedAmount', 'certifiedAmount', 'paidAmount', 'paymentTermDays'],
    json: ['files'],
  },
  comments: {
    cols: ['id', 'entity', 'entityId', 'kind', 'author', 'text', 'createdAt', 'updatedAt'],
  },
};

const ROLES = ['admin', 'editor', 'viewer'];
const SERVER_FIELDS = ['id', 'createdBy', 'createdAt', 'updatedAt', 'files'];

// ---------------------------------------------------------------- setup

/** Run once from the editor. Safe to run again: it only adds what is missing. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  let ss;
  const sheetId = props.getProperty('SHEET_ID');
  if (sheetId) {
    ss = SpreadsheetApp.openById(sheetId);
  } else {
    ss = SpreadsheetApp.create('Project Hub — Data');
    props.setProperty('SHEET_ID', ss.getId());
  }

  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = SCHEMA[name].cols;
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Keep dates and codes as typed text; numbers are coerced on read.
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  let folderId = props.getProperty('FOLDER_ID');
  if (!folderId) {
    const folder = DriveApp.createFolder('Project Hub — Files');
    folderId = folder.getId();
    props.setProperty('FOLDER_ID', folderId);
  }

  const admin = ADMIN_EMAIL.trim().toLowerCase();
  if (!findRow_('users', admin)) {
    insert_('users', { id: admin, name: 'Admin', role: 'admin', active: true, createdBy: admin });
  }

  Logger.log('Sheet:  ' + ss.getUrl());
  Logger.log('Folder: ' + DriveApp.getFolderById(folderId).getUrl());
}

// ---------------------------------------------------------------- HTTP

function doGet() {
  return json_({ ok: true, app: 'project-hub' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = authenticate_(req.token);
    const data = route_(user, req);
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, code: err.code || 'ERROR', error: String(err.message || err) });
  }
}

function route_(user, req) {
  switch (req.action) {
    case 'bootstrap':
      return bootstrap_(user);
    case 'create':
      return create_(user, req.entity, req.record || {});
    case 'update':
      return update_(user, req.entity, req.id, req.patch || {});
    case 'remove':
      return remove_(user, req.entity, req.id);
    case 'upload':
      return upload_(user, req);
    default:
      throw fail_('BAD_REQUEST', 'Unknown action: ' + req.action);
  }
}

// ---------------------------------------------------------------- auth

function authenticate_(token) {
  if (!token) throw fail_('AUTH_REQUIRED', 'Please sign in.');
  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  const key = 'tok_' + Utilities.base64EncodeWebSafe(digest).slice(0, 43);

  let ident = null;
  const hit = cache.get(key);
  if (hit) {
    ident = JSON.parse(hit);
  } else {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw fail_('AUTH_INVALID', 'Sign-in expired. Please sign in again.');
    const info = JSON.parse(res.getContentText());
    const now = Math.floor(Date.now() / 1000);
    if (info.aud !== CLIENT_ID) throw fail_('AUTH_INVALID', 'Sign-in is for a different app.');
    if (String(info.email_verified) !== 'true') throw fail_('AUTH_INVALID', 'Google email is not verified.');
    if (Number(info.exp) <= now) throw fail_('AUTH_EXPIRED', 'Sign-in expired. Please sign in again.');
    ident = { email: String(info.email).toLowerCase(), name: info.name || '' };
    const ttl = Math.max(30, Math.min(600, Number(info.exp) - now - 30));
    cache.put(key, JSON.stringify(ident), ttl);
  }

  const row = findRow_('users', ident.email);
  if (!row || !row.record.active) {
    const err = fail_('NOT_INVITED', ident.email + ' does not have access yet. Ask your admin to add this email under Team & Access.');
    err.email = ident.email;
    throw err;
  }
  const u = row.record;
  // Fill in the display name the first time someone signs in.
  if ((!u.name || u.name === 'Admin') && ident.name) {
    u.name = ident.name;
    writeRow_('users', row.index, u);
  }
  return { id: u.id, name: u.name, role: u.role };
}

function allowed_(user, entity, action, record) {
  if (user.role === 'admin') return true;
  if (user.role !== 'editor') return false;
  if (entity === 'users') return false;
  if (entity === 'comments') {
    if (action === 'create') return true;
    return record && record.author === user.id;
  }
  if (action === 'remove') return entity === 'tasks';
  return true;
}

// ---------------------------------------------------------------- actions

function bootstrap_(user) {
  const data = {};
  Object.keys(SCHEMA).forEach(function (name) { data[name] = readAll_(name); });
  return { me: user, data: data };
}

function create_(user, entity, record) {
  checkEntity_(entity);
  if (!allowed_(user, entity, 'create')) throw fail_('FORBIDDEN', 'You do not have permission to add this.');
  const rec = clean_(entity, record);
  rec.createdBy = user.id;
  if (entity === 'comments') {
    rec.author = user.id;
    rec.kind = rec.kind === 'log' ? 'log' : 'comment';
  }
  if (entity === 'users') {
    rec.id = String(record.id || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rec.id)) throw fail_('BAD_REQUEST', 'Enter a valid email.');
    if (ROLES.indexOf(rec.role) < 0) rec.role = 'viewer';
    if (findRow_('users', rec.id)) throw fail_('BAD_REQUEST', rec.id + ' is already on the list.');
    shareFolder_(rec.id);
  } else {
    rec.id = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  }
  return withLock_(function () { return insert_(entity, rec); });
}

function update_(user, entity, id, patch) {
  checkEntity_(entity);
  return withLock_(function () {
    const row = findRow_(entity, id);
    if (!row) throw fail_('NOT_FOUND', 'This item was deleted by someone else.');
    if (!allowed_(user, entity, 'update', row.record)) throw fail_('FORBIDDEN', 'You do not have permission to change this.');
    const changes = clean_(entity, patch);
    if (entity === 'users' && changes.role && ROLES.indexOf(changes.role) < 0) delete changes.role;
    if (entity === 'users' && id === user.id && (changes.role && changes.role !== 'admin' || changes.active === false)) {
      throw fail_('BAD_REQUEST', 'You cannot remove your own admin access.');
    }
    const rec = Object.assign({}, row.record, changes);
    rec.updatedAt = new Date().toISOString();
    writeRow_(entity, row.index, rec);
    return rec;
  });
}

function remove_(user, entity, id) {
  checkEntity_(entity);
  return withLock_(function () {
    const row = findRow_(entity, id);
    if (!row) return { id: id };
    if (!allowed_(user, entity, 'remove', row.record)) throw fail_('FORBIDDEN', 'Only an admin can delete this.');
    if (entity === 'users' && id === user.id) throw fail_('BAD_REQUEST', 'You cannot delete yourself.');
    sheet_(entity).deleteRow(row.index);
    return { id: id };
  });
}

function upload_(user, req) {
  const entity = req.entity;
  checkEntity_(entity);
  if (['rfqs', 'projects', 'tasks', 'claims'].indexOf(entity) < 0) throw fail_('BAD_REQUEST', 'Files cannot be attached here.');
  if (!allowed_(user, entity, 'update')) throw fail_('FORBIDDEN', 'You do not have permission to attach files.');
  const bytes = Utilities.base64Decode(req.base64 || '');
  if (!bytes.length) throw fail_('BAD_REQUEST', 'The file is empty.');
  if (bytes.length > MAX_UPLOAD_BYTES) throw fail_('BAD_REQUEST', 'Files must be 20 MB or smaller.');

  const root = DriveApp.getFolderById(prop_('FOLDER_ID'));
  const folder = subfolder_(subfolder_(root, entity), String(req.id));
  const name = String(req.fileName || 'file').slice(0, 200);
  const file = folder.createFile(Utilities.newBlob(bytes, req.mimeType || 'application/octet-stream', name));

  return withLock_(function () {
    const row = findRow_(entity, req.id);
    if (!row) throw fail_('NOT_FOUND', 'This item was deleted by someone else.');
    const rec = row.record;
    const files = Array.isArray(rec.files) ? rec.files.slice() : [];
    files.push({
      id: file.getId(), name: name, url: file.getUrl(), mimeType: file.getMimeType(),
      size: bytes.length, uploadedBy: user.id, uploadedAt: new Date().toISOString(),
    });
    rec.files = files;
    rec.updatedAt = new Date().toISOString();
    writeRow_(entity, row.index, rec);
    return rec;
  });
}

// ---------------------------------------------------------------- sheet helpers

function sheet_(entity) {
  const sh = SpreadsheetApp.openById(prop_('SHEET_ID')).getSheetByName(entity);
  if (!sh) throw fail_('SETUP', 'Run setup() in the Apps Script editor first.');
  return sh;
}

function readAll_(entity) {
  const sh = sheet_(entity);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const cols = SCHEMA[entity].cols;
  const values = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return values.filter(function (r) { return r[0] !== ''; }).map(function (r) { return fromRow_(entity, r); });
}

function findRow_(entity, id) {
  if (!id) return null;
  const sh = sheet_(entity);
  const last = sh.getLastRow();
  if (last < 2) return null;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      const cols = SCHEMA[entity].cols;
      const row = sh.getRange(i + 2, 1, 1, cols.length).getValues()[0];
      return { index: i + 2, record: fromRow_(entity, row) };
    }
  }
  return null;
}

function insert_(entity, rec) {
  const now = new Date().toISOString();
  rec.createdAt = now;
  rec.updatedAt = now;
  sheet_(entity).appendRow(toRow_(entity, rec));
  return rec;
}

function writeRow_(entity, index, rec) {
  const row = toRow_(entity, rec);
  sheet_(entity).getRange(index, 1, 1, row.length).setValues([row]);
}

function fromRow_(entity, row) {
  const s = SCHEMA[entity];
  const rec = {};
  s.cols.forEach(function (c, i) {
    let v = row[i];
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
    if (s.num && s.num.indexOf(c) >= 0) v = v === '' ? 0 : Number(v) || 0;
    else if (s.bool && s.bool.indexOf(c) >= 0) v = v === true || String(v).toLowerCase() === 'true';
    else if (s.json && s.json.indexOf(c) >= 0) { try { v = v ? JSON.parse(v) : []; } catch (e) { v = []; } }
    else v = v === null || v === undefined ? '' : String(v);
    rec[c] = v;
  });
  return rec;
}

function toRow_(entity, rec) {
  const s = SCHEMA[entity];
  return s.cols.map(function (c) {
    let v = rec[c];
    if (v === undefined || v === null) return '';
    if (s.json && s.json.indexOf(c) >= 0) return JSON.stringify(v);
    if (typeof v === 'string' && /^[=+]/.test(v)) return "'" + v; // never run as a formula
    return v;
  });
}

/** Keep only known, client-editable fields, with sane types and lengths. */
function clean_(entity, input) {
  const s = SCHEMA[entity];
  const out = {};
  s.cols.forEach(function (c) {
    if (SERVER_FIELDS.indexOf(c) >= 0 || !(c in input)) return;
    let v = input[c];
    if (s.num && s.num.indexOf(c) >= 0) v = Number(v) || 0;
    else if (s.bool && s.bool.indexOf(c) >= 0) v = v === true || v === 'true';
    else v = String(v === null || v === undefined ? '' : v).slice(0, MAX_TEXT);
    out[c] = v;
  });
  return out;
}

// ---------------------------------------------------------------- misc

function checkEntity_(entity) {
  if (!SCHEMA[entity]) throw fail_('BAD_REQUEST', 'Unknown table: ' + entity);
}

function subfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function shareFolder_(email) {
  try {
    DriveApp.getFolderById(prop_('FOLDER_ID')).addViewer(email);
  } catch (e) {
    // Not a Google account yet: they can still use the app, only file links need access.
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function prop_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw fail_('SETUP', 'Run setup() in the Apps Script editor first.');
  return v;
}

function fail_(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
