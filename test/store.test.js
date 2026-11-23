const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore, cleanHtml } = require('../src/store');

test('documents persist and can be reopened', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docdesk-'));
  const file = path.join(dir, 'docs.json');
  const first = createStore(file);
  first.insert({ id:'doc-1', title:'Plan', content:'<h1>Launch</h1>', owner:'Avery Chen', sharedWith:[] });
  const reopened = createStore(file);
  assert.equal(reopened.get('doc-1').content, '<h1>Launch</h1>');
  fs.rmSync(dir, { recursive:true, force:true });
});

test('stored rich text removes executable markup', () => {
  assert.equal(cleanHtml('<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(2)">bad link</a>'), '<p>Hi</p><a href="#" rel="nofollow noopener noreferrer">bad link</a>');
  assert.equal(cleanHtml('<svg onload="x()"><text>bad</text></svg><strong>safe</strong>'), '<strong>safe</strong>');
});
