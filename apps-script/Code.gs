/**
 * Project Hub — Google Apps Script backend
 *
 * The Apps Script project has TWO files:
 *   Code.gs  — this file: Google Sheets storage, Google Drive files, sign-in check
 *   Core.gs  — a copy of assets/core.js: who may see and change what
 *
 * Setup (see README.md):
 *   1. Fill in CLIENT_ID below.
 *   2. Run setup() once from the editor and approve the permissions.
 *   3. Deploy > New deployment > Web app: Execute as "Me", access "Anyone".
 *
 * The super admin is fixed in Core.gs (SUPER_ADMIN) and cannot be removed.
 */

const CLIENT_ID = 'PASTE-YOUR-OAUTH-CLIENT-ID.apps.googleusercontent.com';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const TABLES = {
  users: ['id', 'name', 'active', 'createdBy', 'createdAt', 'updatedAt'],
  sections: ['id', 'name', 'template', 'order', 'fields', 'stageField', 'archived', 'createdBy', 'createdAt', 'updatedAt'],
  access: ['id', 'sectionId', 'userId', 'level', 'createdBy', 'createdAt', 'updatedAt'],
  items: ['id', 'sectionId', 'title', 'data', 'editors', 'collaborators', 'files', 'stageChangedAt', 'createdBy', 'createdAt', 'updatedAt'],
  comments: ['id', 'sectionId', 'itemId', 'kind', 'author', 'text', 'createdAt', 'updatedAt'],
};
const JSON_COLS = ['fields', 'data', 'editors', 'collaborators', 'files'];
const BOOL_COLS = ['active', 'archived'];
const NUM_COLS = ['order'];
const READ_ONLY_ACTIONS = ['bootstrap', 'item.file'];

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

  Object.keys(TABLES).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = TABLES[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Keep dates and codes as typed text; numbers are coerced on read.
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  if (!props.getProperty('FOLDER_ID')) {
    props.setProperty('FOLDER_ID', DriveApp.createFolder('Project Hub — Files').getId());
  }

  // Creates the super admin's account row.
  Core.identify(sheetStore_(), Core.SUPER_ADMIN, '');

  Logger.log('Sheet:  ' + ss.getUrl());
  Logger.log('Folder: ' + DriveApp.getFolderById(props.getProperty('FOLDER_ID')).getUrl());
  Logger.log('Super admin: ' + Core.SUPER_ADMIN);
}

// ---------------------------------------------------------------- HTTP

function doGet() {
  return json_({ ok: true, app: 'project-hub' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const ident = verifyGoogle_(req.token);
    const run = function () {
      const store = sheetStore_();
      const me = Core.identify(store, ident.email, ident.name);
      return Core.handle(store, me, req.action, req.payload || {});
    };
    const data = READ_ONLY_ACTIONS.indexOf(req.action) >= 0 ? run() : withLock_(run);
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, code: err.code || 'ERROR', error: String(err.message || err) });
  }
}

// ---------------------------------------------------------------- Google sign-in check

function verifyGoogle_(token) {
  if (!token) throw Core.fail('AUTH_REQUIRED', 'Please sign in.');
  const cache = CacheService.getScriptCache();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  const key = 'tok_' + Utilities.base64EncodeWebSafe(digest).slice(0, 43);
  const hit = cache.get(key);
  if (hit) return JSON.parse(hit);

  const res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw Core.fail('AUTH_INVALID', 'Your sign-in has expired. Please sign in again.');
  const info = JSON.parse(res.getContentText());
  const now = Math.floor(Date.now() / 1000);
  if (info.aud !== CLIENT_ID) throw Core.fail('AUTH_INVALID', 'This sign-in belongs to a different app.');
  if (String(info.email_verified) !== 'true') throw Core.fail('AUTH_INVALID', 'Your Google email is not verified.');
  if (Number(info.exp) <= now) throw Core.fail('AUTH_EXPIRED', 'Your sign-in has expired. Please sign in again.');

  const ident = { email: String(info.email).toLowerCase(), name: info.name || '' };
  cache.put(key, JSON.stringify(ident), Math.max(30, Math.min(600, Number(info.exp) - now - 30)));
  return ident;
}

// ---------------------------------------------------------------- Sheets store used by Core

function sheetStore_() {
  const cache = {};
  function rows(t) {
    if (!cache[t]) cache[t] = load_(t);
    return cache[t];
  }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  return {
    all: function (t) { return rows(t).map(function (x) { return copy(x.rec); }); },
    insert: function (t, rec) {
      sheet_(t).appendRow(toRow_(t, rec));
      delete cache[t];
    },
    save: function (t, rec) {
      const x = rows(t).filter(function (r) { return r.rec.id === rec.id; })[0];
      if (!x) throw Core.fail('NOT_FOUND', 'This record was deleted by someone else.');
      const row = toRow_(t, rec);
      sheet_(t).getRange(x.row, 1, 1, row.length).setValues([row]);
      x.rec = copy(rec);
    },
    del: function (t, id) {
      const x = rows(t).filter(function (r) { return r.rec.id === id; })[0];
      if (x) sheet_(t).deleteRow(x.row);
      delete cache[t];
    },
    delWhere: function (t, fn) {
      const hits = rows(t).filter(function (r) { return fn(r.rec); }).sort(function (a, b) { return b.row - a.row; });
      hits.forEach(function (x) { sheet_(t).deleteRow(x.row); });
      delete cache[t];
    },
    now: function () { return new Date().toISOString(); },
    uid: function () { return Utilities.getUuid().replace(/-/g, '').slice(0, 16); },
    saveFile: function (item, name, mime, base64, by) {
      const bytes = Utilities.base64Decode(base64);
      if (!bytes.length) throw Core.fail('BAD_REQUEST', 'The file is empty.');
      if (bytes.length > MAX_UPLOAD_BYTES) throw Core.fail('BAD_REQUEST', 'Files must be 20 MB or smaller.');
      const root = DriveApp.getFolderById(prop_('FOLDER_ID'));
      const folder = subfolder_(subfolder_(root, item.sectionId), item.id);
      const file = folder.createFile(Utilities.newBlob(bytes, mime, name));
      return { id: file.getId(), name: name, mimeType: file.getMimeType(), size: bytes.length, uploadedBy: by, uploadedAt: new Date().toISOString() };
    },
    readFile: function (fileId) {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      return { name: file.getName(), mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
    },
  };
}

function sheet_(name) {
  const sh = SpreadsheetApp.openById(prop_('SHEET_ID')).getSheetByName(name);
  if (!sh) throw Core.fail('SETUP', 'Run setup() in the Apps Script editor first.');
  return sh;
}

function load_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const cols = TABLES[name];
  return sh.getRange(2, 1, last - 1, cols.length).getValues()
    .map(function (r, i) { return { rec: fromRow_(name, r), row: i + 2 }; })
    .filter(function (x) { return x.rec.id; });
}

function fromRow_(name, row) {
  const rec = {};
  TABLES[name].forEach(function (c, i) {
    let v = row[i];
    if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
    if (JSON_COLS.indexOf(c) >= 0) {
      try { v = v ? JSON.parse(v) : (c === 'data' ? {} : []); } catch (e) { v = c === 'data' ? {} : []; }
    } else if (BOOL_COLS.indexOf(c) >= 0) {
      v = v === true || String(v).toLowerCase() === 'true';
    } else if (NUM_COLS.indexOf(c) >= 0) {
      v = Number(v) || 0;
    } else {
      v = v === null || v === undefined ? '' : String(v);
    }
    rec[c] = v;
  });
  return rec;
}

function toRow_(name, rec) {
  return TABLES[name].map(function (c) {
    const v = rec[c];
    if (v === undefined || v === null) return '';
    if (JSON_COLS.indexOf(c) >= 0) return JSON.stringify(v);
    if (typeof v === 'string' && /^[=+]/.test(v)) return "'" + v; // never run as a formula
    return v;
  });
}

// ---------------------------------------------------------------- misc

function subfolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function prop_(key) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw Core.fail('SETUP', 'Run setup() in the Apps Script editor first.');
  return v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
