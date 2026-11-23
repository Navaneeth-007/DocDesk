const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStore, cleanHtml } = require('./src/store');

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');
const users = ['Avery Chen', 'Jordan Lee', 'Sam Rivera'];
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control':'no-store' });
  res.end(JSON.stringify(data));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = ''; req.on('data', chunk => { raw += chunk; if (raw.length > 2_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function canAccess(doc, user) { return doc.owner === user || doc.sharedWith.includes(user); }
function publicDoc(doc, user) { return { ...doc, access: doc.owner === user ? 'owner' : 'shared' }; }

function createServer(store) { return http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') { res.writeHead(200, {'content-type':'text/plain; charset=utf-8'}); return res.end('ok'); }
  if (url.pathname.startsWith('/api/')) {
    const user = req.headers['x-user'] || 'Avery Chen';
    if (!users.includes(user)) return send(res, 400, { error: 'Choose a valid workspace member.' });
    try {
      if (req.method === 'GET' && url.pathname === '/api/users') return send(res, 200, { users, current: user });
      if (req.method === 'GET' && url.pathname === '/api/documents') {
        const docs = (await store.all()).filter(d => canAccess(d, user)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
        return send(res, 200, docs.map(d => publicDoc(d, user)));
      }
      if (req.method === 'POST' && url.pathname === '/api/documents') {
        const input = await body(req);
        const now = new Date().toISOString();
        const doc = { id: crypto.randomUUID(), title: String(input.title || 'Untitled document').slice(0,120), content: cleanHtml(input.content || '<p><br></p>'), owner: user, sharedWith: [], createdAt: now, updatedAt: now };
        await store.insert(doc); return send(res, 201, publicDoc(doc, user));
      }
      const match = url.pathname.match(/^\/api\/documents\/([\w-]+)(?:\/(share))?$/);
      if (match) {
        const [, id, action] = match;
        const doc = await store.get(id);
        if (!doc || !canAccess(doc, user)) return send(res, 404, { error: 'Document not found.' });
        if (action === 'share' && req.method === 'POST') {
          if (doc.owner !== user) return send(res, 403, { error: 'Only the owner can manage sharing.' });
          const input = await body(req); const target = String(input.user || '');
          if (!users.includes(target) || target === user) return send(res, 400, { error: 'Choose another workspace member.' });
          if (!doc.sharedWith.includes(target)) doc.sharedWith.push(target);
          doc.updatedAt = new Date().toISOString(); await store.update(doc);
          return send(res, 200, publicDoc(doc, user));
        }
        if (!action && req.method === 'GET') return send(res, 200, publicDoc(doc, user));
        if (!action && req.method === 'PATCH') {
          const input = await body(req);
          if (doc.owner !== user) return send(res, 403, { error: 'Shared documents are read only in this demo.' });
          if (typeof input.title === 'string') doc.title = input.title.trim().slice(0,120) || 'Untitled document';
          if (typeof input.content === 'string') doc.content = cleanHtml(input.content);
          doc.updatedAt = new Date().toISOString(); await store.update(doc);
          return send(res, 200, publicDoc(doc, user));
        }
      }
      return send(res, 404, { error: 'Route not found.' });
    } catch (error) { return send(res, 400, { error: error.message || 'Request failed.' }); }
  }
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.resolve(publicDir, `.${requested}`);
  if (!file.startsWith(publicDir + path.sep)) return send(res, 403, { error:'Forbidden' });
  fs.readFile(file, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(content);
  });
}); }

async function start() {
  let store;
  if (process.env.DATABASE_URL) {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString:process.env.DATABASE_URL, max:5 });
    await pool.query(`CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, owner TEXT NOT NULL,
      shared_with JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
    )`);
    store = {
      all: async()=>{const {rows}=await pool.query('SELECT id,title,content,owner,shared_with AS "sharedWith",created_at AS "createdAt",updated_at AS "updatedAt" FROM documents');return rows.map(row=>({...row,createdAt:new Date(row.createdAt).toISOString(),updatedAt:new Date(row.updatedAt).toISOString()}));},
      get: async id=>{const {rows}=await pool.query('SELECT id,title,content,owner,shared_with AS "sharedWith",created_at AS "createdAt",updated_at AS "updatedAt" FROM documents WHERE id=$1',[id]);if(!rows[0])return null;return {...rows[0],createdAt:new Date(rows[0].createdAt).toISOString(),updatedAt:new Date(rows[0].updatedAt).toISOString()};},
      insert: async doc=>pool.query('INSERT INTO documents(id,title,content,owner,shared_with,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[doc.id,doc.title,doc.content,doc.owner,JSON.stringify(doc.sharedWith),doc.createdAt,doc.updatedAt]),
      update: async doc=>pool.query('UPDATE documents SET title=$2,content=$3,owner=$4,shared_with=$5,updated_at=$6 WHERE id=$1',[doc.id,doc.title,doc.content,doc.owner,JSON.stringify(doc.sharedWith),doc.updatedAt])
    };
  } else store=createStore(path.join(__dirname,'data','documents.json'));
  const server=createServer(store);
  server.listen(PORT,'0.0.0.0',()=>console.log(`DocDesk ready at http://localhost:${PORT}`));
  return server;
}

if(require.main===module) start().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={createServer,start};
