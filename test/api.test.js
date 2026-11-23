const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore } = require('../src/store');
const { createServer } = require('../server');

test('owner can share a document and the recipient can only read it', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'docdesk-api-'));
  const store=createStore(path.join(dir,'documents.json'));
  const server=createServer(store);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=(url,user,options={})=>fetch(`${base}${url}`,{...options,headers:{'x-user':user,'content-type':'application/json',...(options.headers||{})}});

  const health=await fetch(`${base}/health`);
  assert.equal(health.status,200);
  assert.equal(await health.text(),'ok');

  const created=await request('/api/documents','Avery Chen',{method:'POST',body:JSON.stringify({title:'Product brief',content:'<p>hello</p>'})});
  assert.equal(created.status,201);
  const doc=await created.json();
  const hidden=await request(`/api/documents/${doc.id}`,'Jordan Lee');
  assert.equal(hidden.status,404);

  const shared=await request(`/api/documents/${doc.id}/share`,'Avery Chen',{method:'POST',body:JSON.stringify({user:'Jordan Lee'})});
  assert.equal(shared.status,200);
  const readable=await request(`/api/documents/${doc.id}`,'Jordan Lee');
  assert.equal((await readable.json()).access,'shared');
  const write=await request(`/api/documents/${doc.id}`,'Jordan Lee',{method:'PATCH',body:JSON.stringify({content:'<p>changed</p>'})});
  assert.equal(write.status,403);
});
