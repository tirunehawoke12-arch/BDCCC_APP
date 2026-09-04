/**
 * BDCCC backend — a small, real server that gives the Bahir Dar Childcare
 * Center app persistent, shared storage: every device that talks to this
 * server sees the SAME data, instead of each browser keeping its own copy.
 *
 * It intentionally mirrors the app's existing window.storage interface
 * (get / set / delete / list, keyed by string) so the frontend only needed
 * one small change (see the "REAL BACKEND MODE" block in app.html) rather
 * than a full rewrite.
 *
 * Data is kept in a single JSON file on disk (data.json). That's simple and
 * fully portable, but it means the data lives wherever this file lives —
 * see README.md for notes on which hosts keep that file around vs. wipe it
 * on every restart.
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY; // required — set this when you deploy
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // lock this to your app's real URL once it's live

if (!API_KEY) {
  console.error('FATAL: the API_KEY environment variable is not set. Refusing to start with an unprotected database.');
  process.exit(1);
}

// ---------- tiny JSON-file "database" ----------
let store = {};
function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Could not read data file, starting empty:', e.message);
    store = {};
  }
}
let saveTimer = null;
function saveStoreSoon() {
  // debounce writes so a burst of requests doesn't hammer the disk
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(store), 'utf8');
    } catch (e) {
      console.error('Could not write data file:', e.message);
    }
  }, 150);
}
loadStore();

// ---------- app ----------
const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: '20mb' })); // photos/documents are base64 text, can be a few MB

app.get('/api/health', (req, res) => res.json({ ok: true, keys: Object.keys(store).length }));

function requireApiKey(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key || key !== API_KEY) return res.status(401).json({ error: 'invalid or missing X-API-Key header' });
  next();
}
app.use('/api/kv', requireApiKey);

app.get('/api/kv/:key', (req, res) => {
  const key = req.params.key;
  if (!(key in store)) return res.status(404).json({ error: 'not found' });
  res.json({ key, value: store[key] });
});

app.put('/api/kv/:key', (req, res) => {
  const key = req.params.key;
  const value = req.body && typeof req.body.value === 'string' ? req.body.value : null;
  if (value === null) return res.status(400).json({ error: 'body must be { "value": "<string>" }' });
  store[key] = value;
  saveStoreSoon();
  res.json({ key, value });
});

app.delete('/api/kv/:key', (req, res) => {
  const key = req.params.key;
  const existed = key in store;
  delete store[key];
  saveStoreSoon();
  res.json({ key, deleted: existed });
});

app.get('/api/kv', (req, res) => {
  const prefix = req.query.prefix || '';
  const keys = Object.keys(store).filter(k => k.startsWith(prefix));
  res.json({ keys, prefix });
});

app.listen(PORT, () => {
  console.log(`BDCCC backend listening on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
