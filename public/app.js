const $ = selector => document.querySelector(selector);
const els = {
  list:$('#docList'), user:$('#userSelect'), profile:$('#profileName'), avatar:$('#avatar'), welcome:$('#welcome'), editorView:$('#editorView'), empty:$('#emptyState'),
  title:$('#titleInput'), editor:$('#editor'), crumb:$('#crumbTitle'), status:$('#saveStatus'), access:$('#docAccess'), updated:$('#updatedLabel'), count:$('#wordCount'),
  shareDialog:$('#shareDialog'), shareSelect:$('#shareSelect'), accessList:$('#accessList'), toast:$('#toast')
};
let currentUser = 'Avery Chen';
let documents = [];
let active = null;
let saveTimer = null;
let toastTimer = null;
const initial = name => name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url, options={}) {
  const response = await fetch(url, { ...options, headers:{ 'content-type':'application/json', 'x-user':currentUser, ...(options.headers||{}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}
function notify(message) {
  els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>els.toast.classList.remove('show'),2400);
}
function setStatus(state) {
  els.status.className = `save-status ${state}`;
  els.status.innerHTML = `<i></i> ${state==='saving'?'Saving…':state==='error'?'Could not save':'All changes saved'}`;
}
function showView(view) {
  els.welcome.classList.toggle('hidden',view!=='welcome');
  els.editorView.classList.toggle('hidden',view!=='editor');
  els.empty.classList.toggle('hidden',view!=='empty');
  $('#shareButton').disabled = view!=='editor' || !active || active.access!=='owner';
  $('#crumbTitle').textContent = view==='editor' ? active.title : view==='empty' ? 'All documents' : 'All documents';
}
function renderList() {
  els.list.innerHTML = documents.map(doc=>`<button class="doc-row ${active?.id===doc.id?'active':''}" data-id="${doc.id}"><span class="row-icon">▤</span><span class="row-title">${escapeHtml(doc.title)}</span>${doc.access==='shared'?'<span class="shared-tag">shared</span>':''}</button>`).join('');
  els.list.querySelectorAll('.doc-row').forEach(row=>row.addEventListener('click',()=>openDocument(row.dataset.id)));
}
async function refresh() {
  documents = await api('/api/documents'); renderList();
  if (active) {
    const latest = documents.find(doc=>doc.id===active.id);
    if (!latest) { active=null; if(documents.length) await openDocument(documents[0].id); else showView('welcome'); }
    else { active=latest; }
  } else if(documents.length) await openDocument(documents[0].id);
  else showView('welcome');
}
async function openDocument(id) {
  try {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer=null; await persist(); }
    active = await api(`/api/documents/${id}`);
    els.title.value=active.title; els.editor.innerHTML=active.content || '<p><br></p>';
    els.editor.contentEditable=String(active.access==='owner');
    els.title.readOnly=active.access!=='owner';
    const canEdit=active.access==='owner';
    document.querySelectorAll('[data-command],#blockFormat,#linkButton,#importButton').forEach(control=>{control.disabled=!canEdit;});
    els.access.textContent=active.access==='owner'?'YOUR DOCUMENT':'SHARED WITH YOU';
    $('#privacyLabel').textContent=active.access==='shared'?'Shared with you':active.sharedWith.length?`Shared with ${active.sharedWith.length} teammate${active.sharedWith.length===1?'':'s'}`:'Private to you';
    els.updated.textContent=`Edited ${new Date(active.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`;
    updateCount(); showView('editor'); renderList();
  } catch(error) { notify(error.message); }
}
async function createDocument(title='Untitled document', content='<p><br></p>') {
  try { if(saveTimer){clearTimeout(saveTimer);saveTimer=null;await persist();} const doc=await api('/api/documents',{method:'POST',body:JSON.stringify({title,content})}); documents.unshift(doc); active=doc; await openDocument(doc.id); els.title.focus(); els.title.select(); renderList(); }
  catch(error) { notify(error.message); }
}
function scheduleSave() {
  if (!active || active.access!=='owner') return;
  setStatus('saving'); clearTimeout(saveTimer); saveTimer=setTimeout(persist,650);
}
async function persist() {
  if (!active || active.access!=='owner') return;
  const id=active.id;
  try {
    const saved=await api(`/api/documents/${id}`,{method:'PATCH',body:JSON.stringify({title:els.title.value,content:els.editor.innerHTML})});
    if (active?.id!==id) return;
    active=saved; const index=documents.findIndex(d=>d.id===id); if(index>=0) documents[index]=saved;
    els.title.value=saved.title; els.crumb.textContent=saved.title; els.updated.textContent=`Edited ${new Date(saved.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`;
    setStatus('saved'); renderList();
  } catch(error) { setStatus('error'); notify(error.message); }
}
function updateCount() {
  const words=(els.editor.innerText.trim().match(/\S+/g)||[]).length; els.count.textContent=`${words} ${words===1?'word':'words'}`;
}
async function setUser(user) {
  if(saveTimer){clearTimeout(saveTimer);saveTimer=null;await persist();}
  if(els.shareDialog.open)els.shareDialog.close();
  currentUser=user; els.profile.textContent=user; els.avatar.textContent=initial(user); active=null;
  try { await refresh(); } catch(error) { notify(error.message); }
}
async function openShare() {
  if (!active || active.access!=='owner') return;
  const openedFor=active.id;
  try {
    const all=await api('/api/users');
    if(active?.id!==openedFor||active.access!=='owner')return;
    const available=all.users.filter(u=>u!==currentUser&&!active.sharedWith.includes(u));
    els.shareSelect.innerHTML=available.length?available.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join(''):'<option value="">Everyone has access</option>';
    $('#grantShare').disabled=!available.length;
    els.accessList.innerHTML=`<div class="access-person"><div class="avatar">${initial(active.owner)}</div><span class="person-name">${escapeHtml(active.owner)}${active.owner===currentUser?' (you)':''}</span><span class="person-role">Owner</span></div>`+
      active.sharedWith.map(name=>`<div class="access-person"><div class="avatar">${initial(name)}</div><span class="person-name">${escapeHtml(name)}</span><span class="person-role">Can view</span></div>`).join('');
    els.shareDialog.showModal();
  } catch(error) { notify(error.message); }
}
$('#newDoc').addEventListener('click',()=>createDocument()); $('#welcomeNew').addEventListener('click',()=>createDocument()); $('#emptyNew').addEventListener('click',()=>createDocument());
$('#refreshDocs').addEventListener('click',()=>refresh().catch(e=>notify(e.message)));
els.user.addEventListener('change',event=>setUser(event.target.value));
$('#shareButton').addEventListener('click',openShare);
$('#exportButton').addEventListener('click',()=>{
  if(!active)return;
  const markdown=htmlToMarkdown(els.editor.innerHTML);
  const safeTitle=(els.title.value.trim() || 'Untitled document').replace(/([\\`*_\[\]{}()#+\-.!|>])/g,'\\$1');
  const blob=new Blob([`# ${safeTitle}\n\n${markdown.trim()}\n`],{type:'text/markdown;charset=utf-8'});
  const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=`${(els.title.value.trim() || 'document').replace(/[\\/:*?"<>|]/g,'-')}.md`; link.click(); setTimeout(()=>URL.revokeObjectURL(link.href),1000);
});
function htmlToMarkdown(html) {
  const doc=new DOMParser().parseFromString(html,'text/html');
  function inline(node){
    if(node.nodeType===Node.TEXT_NODE)return node.nodeValue.replace(/([\\`*_\[\]{}()#+\-.!|>])/g,'\\$1');
    if(node.nodeType!==Node.ELEMENT_NODE)return '';
    const body=[...node.childNodes].map(inline).join('');
    switch(node.tagName){
      case 'STRONG':case 'B':return `**${body}**`;
      case 'EM':case 'I':return `*${body}*`;
      case 'U':return `<u>${body}</u>`;
      case 'BR':return '  \n';
      case 'A':{const href=node.getAttribute('href')||'';const safeHref=href.replace(/[\\()]/g,'\\$&');return /^(https?:\/\/|mailto:)/i.test(href)?`[${body}](${safeHref})`:body;}
      default:return body;
    }
  }
  function blocks(nodes){
    return [...nodes].map(node=>{
      if(node.nodeType===Node.TEXT_NODE)return node.nodeValue.trim();
      if(node.nodeType!==Node.ELEMENT_NODE)return '';
      const tag=node.tagName;
      if(/^H[1-3]$/.test(tag))return `${'#'.repeat(Number(tag[1]))} ${inline(node)}`;
      if(tag==='UL'||tag==='OL')return [...node.children].filter(li=>li.tagName==='LI').map((li,index)=>`${tag==='UL'?'-':`${index+1}.`} ${[...li.childNodes].filter(n=>n.nodeType!==Node.ELEMENT_NODE||!['UL','OL'].includes(n.tagName)).map(inline).join('')}${[...li.children].filter(n=>['UL','OL'].includes(n.tagName)).length?`\n${blocks([...li.children].filter(n=>['UL','OL'].includes(n.tagName))).split('\n').map(line=>`  ${line}`).join('\n')}`:''}`).join('\n');
      if(tag==='BLOCKQUOTE')return inline(node).split('\n').map(line=>`> ${line}`).join('\n');
      if(tag==='DIV')return blocks(node.childNodes);
      if(tag==='P')return inline(node);
      return inline(node);
    }).filter(Boolean).join('\n\n');
  }
  return blocks(doc.body.childNodes);
}
$('#grantShare').addEventListener('click',async event=>{
  event.preventDefault(); if(!els.shareSelect.value)return;
  const sharedDocId=active?.id; if(!sharedDocId)return;
  try { const doc=await api(`/api/documents/${sharedDocId}/share`,{method:'POST',body:JSON.stringify({user:els.shareSelect.value})}); documents=documents.map(d=>d.id===doc.id?doc:d); renderList(); if(active?.id===doc.id&&currentUser===doc.owner){active=doc;await openShare();notify('Teammate can now view this document.');} }
  catch(error){notify(error.message);}
});
els.title.addEventListener('input',scheduleSave); els.editor.addEventListener('input',()=>{scheduleSave();updateCount();});
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('mousedown',e=>e.preventDefault()));
document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>{els.editor.focus();document.execCommand(button.dataset.command,false,null);button.classList.toggle('active');scheduleSave();}));
$('#blockFormat').addEventListener('change',event=>{els.editor.focus();document.execCommand('formatBlock',false,`<${event.target.value}>`);scheduleSave();});
$('#linkButton').addEventListener('click',()=>{const url=prompt('Paste a link');if(url){els.editor.focus();document.execCommand('createLink',false,url);scheduleSave();}});
$('#importButton').addEventListener('click',()=>$('#fileInput').click());
$('#fileInput').addEventListener('change',async event=>{
  const file=event.target.files[0]; event.target.value=''; if(!file)return;
  if(file.size>1_000_000){notify('Please choose a file smaller than 1 MB.');return;}
  if(!/\.(txt|md)$/i.test(file.name)){notify('Import supports .txt and .md files.');return;}
  try {
    const text=await file.text();
    const html=text.split(/\r?\n/).map(line=>{
      const heading=line.match(/^(#{1,3})\s+(.+)$/); if(heading)return `<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`;
      const bullet=line.match(/^[-*]\s+(.+)$/); if(bullet)return `<ul><li>${escapeHtml(bullet[1])}</li></ul>`;
      return `<p>${line?escapeHtml(line):'<br>'}</p>`;
    }).join('');
    const title=file.name.replace(/\.(txt|md)$/i,'');
    if(active) {
      const replace=confirm(`Replace the content of “${active.title}” with this file?\nChoose Cancel to import it as a new document.`);
      if(replace){els.editor.innerHTML=html;els.title.value=title;scheduleSave();updateCount();notify('File imported into this document.');}
      else await createDocument(title,html);
    } else await createDocument(title,html);
  } catch(error){notify('Could not read that file.');}
});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='n'){event.preventDefault();createDocument();}});
async function init(){
  try { const data=await api('/api/users'); currentUser=data.current; els.user.innerHTML=data.users.map(u=>`<option>${escapeHtml(u)}</option>`).join(''); els.user.value=currentUser; els.profile.textContent=currentUser; els.avatar.textContent=initial(currentUser); await refresh(); }
  catch(error){notify(`Could not connect: ${error.message}`);}
}
init();
