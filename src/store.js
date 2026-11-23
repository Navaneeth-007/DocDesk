const fs = require('node:fs');
const path = require('node:path');

function cleanHtml(html) {
  const allowed = new Set(['p','br','h1','h2','h3','strong','b','em','i','u','ul','ol','li','blockquote','a']);
  const input = String(html).slice(0, 1_000_000).replace(/<!--[\s\S]*?-->/g, '');
  const noActiveContent = input.replace(/<\s*(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  return noActiveContent.replace(/<[^>]*>/g, token => {
    const match = token.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>$/i);
    if (!match) return '';
    const [, closing, rawTag] = match; const tag = rawTag.toLowerCase();
    if (!allowed.has(tag)) return '';
    if (tag === 'br') return '<br>';
    if (closing) return `</${tag}>`;
    if (tag === 'a') {
      const href = match[3].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value = href ? (href[1] ?? href[2] ?? href[3]).trim() : '';
      const safe = /^(https?:\/\/|mailto:)/i.test(value) ? value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') : '#';
      return `<a href="${safe}" rel="nofollow noopener noreferrer">`;
    }
    return `<${tag}>`;
  });
}
function createStore(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  if (!fs.existsSync(filename)) fs.writeFileSync(filename, '[]');
  let docs;
  try { docs = JSON.parse(fs.readFileSync(filename, 'utf8')); } catch { docs = []; }
  const persist = () => fs.writeFileSync(filename, JSON.stringify(docs, null, 2));
  return {
    all: () => docs,
    get: id => docs.find(d => d.id === id),
    insert: doc => { docs.push(doc); persist(); },
    update: doc => { const i = docs.findIndex(d => d.id === doc.id); if (i < 0) throw new Error('Document not found.'); docs[i] = doc; persist(); }
  };
}
module.exports = { createStore, cleanHtml };
