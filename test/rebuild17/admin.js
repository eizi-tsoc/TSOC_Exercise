// TSOC Exercise Rebuild20 - New Publish Refresh Fix
// TSOC Exercise Rebuild19 - Published Save Fix
// 公開済み運動は「管理データ保存」で公開内容を更新。
// 「公開する」は初回公開前の新規運動だけに表示。

const BASE = window.TSOC_EXERCISE_DATA || {};
const baseExercises = Array.isArray(BASE.exercises) ? BASE.exercises : [];
const DRAFT_KEY = "tsoc_admin_phase2_drafts_v1";
const NEW_KEY = "tsoc_admin_phase2_new_v1";
const PUBLISHED_KEY="tsoc_admin_phase4_published_v1";
let pubState=JSON.parse(localStorage.getItem(PUBLISHED_KEY)||"{}");
function persistPub(){ localStorage.setItem(PUBLISHED_KEY, JSON.stringify(pubState)); }

const DB_NAME = "tsoc_admin_phase2_images";
const DB_STORE = "images";
const $ = s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

let drafts = JSON.parse(localStorage.getItem(DRAFT_KEY)||"{}");
let newItems = JSON.parse(localStorage.getItem(NEW_KEY)||"[]");
/* FIX2: 旧版で同一IDが多重登録された場合は、起動時に1件へ整理する */
{
  const seen = new Set();
  const cleaned = [];
  for (const item of newItems) {
    const id = String(item?.id || "").trim().toUpperCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    cleaned.push(item);
  }
  if (cleaned.length !== newItems.length) {
    newItems = cleaned;
    localStorage.setItem(NEW_KEY, JSON.stringify(newItems));
  }
}
let currentEditId = null;
let tempEditImageURL = null;
let tempNewImageURL = null;

const baseMap = Object.fromEntries(baseExercises.map(e=>[e.id,e]));
for(const [id,p] of Object.entries(pubState)){
  if(baseMap[id] && p?.unpublished){
    delete p.unpublished;
  }
}
persistPub();
const CUSTOM_CATEGORY_KEY="tsoc_admin_custom_categories_v1";
const RUNTIME_SETTINGS_KEY="tsoc_admin_runtime_settings_v1";

const EXERCISE_ORDER_KEY="tsoc_admin_exercise_order_v1";
const CATEGORY_ORDER_KEY="tsoc_admin_category_order_v1";
const CATEGORY_ALIAS_KEY="tsoc_admin_category_aliases_v1";
let categoryAliases={};
try{categoryAliases=JSON.parse(localStorage.getItem(CATEGORY_ALIAS_KEY)||"{}")}catch{categoryAliases={}}
if(!categoryAliases||typeof categoryAliases!=="object"||Array.isArray(categoryAliases))categoryAliases={};
function categoryDisplayName(c){
  let cur=String(c||""),guard=0;
  while(categoryAliases[cur] && categoryAliases[cur]!==cur && guard++<10)cur=categoryAliases[cur];
  return cur;
}
function mapCategories(list){return [...new Set((list||[]).map(categoryDisplayName).filter(Boolean))]}

let exerciseOrder=[];
let categoryOrder=[];
try{exerciseOrder=JSON.parse(localStorage.getItem(EXERCISE_ORDER_KEY)||"[]")}catch{exerciseOrder=[]}
try{categoryOrder=JSON.parse(localStorage.getItem(CATEGORY_ORDER_KEY)||"[]")}catch{categoryOrder=[]}
if(!Array.isArray(exerciseOrder))exerciseOrder=[];
if(!Array.isArray(categoryOrder))categoryOrder=[];

function normalizeExerciseOrder(){
  const ids=allExercises().map(e=>e.id);
  const seen=new Set();
  exerciseOrder=[
    ...exerciseOrder.filter(id=>ids.includes(id)&&!seen.has(id)&&seen.add(id)),
    ...ids.filter(id=>!seen.has(id)&&seen.add(id))
  ];
  localStorage.setItem(EXERCISE_ORDER_KEY,JSON.stringify(exerciseOrder));
}
function normalizeCategoryOrder(){
  const cats=allCategoryChoices();
  const seen=new Set();
  categoryOrder=[
    ...categoryOrder.map(categoryDisplayName).filter(c=>cats.includes(c)&&!seen.has(c)&&seen.add(c)),
    ...cats.filter(c=>!seen.has(c)&&seen.add(c))
  ];
  localStorage.setItem(CATEGORY_ORDER_KEY,JSON.stringify(categoryOrder));
}
function orderedCategories(){
  normalizeCategoryOrder();
  return categoryOrder.slice();
}
function orderedExercises(list=allExercises()){
  normalizeExerciseOrder();
  const pos=new Map(exerciseOrder.map((id,i)=>[id,i]));
  return [...list].sort((a,b)=>(pos.get(a.id)??999999)-(pos.get(b.id)??999999));
}

let customCategories=[];
try{customCategories=JSON.parse(localStorage.getItem(CUSTOM_CATEGORY_KEY)||"[]")}catch{customCategories=[]}
if(!Array.isArray(customCategories))customCategories=[];
function allCategoryChoices(){
  return [...new Set([...allBaseCategories.map(categoryDisplayName),...customCategories.map(categoryDisplayName)])];
}

const allBaseCategories=[...new Set(baseExercises.flatMap(e=>e.categories||[]))].sort((a,b)=>a.localeCompare(b,'ja'));

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(DB_STORE);
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function idbPut(key,blob){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(blob,key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
async function idbGet(key){const db=await openDB();return new Promise((res,rej)=>{const r=db.transaction(DB_STORE).objectStore(DB_STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbDelete(key){const db=await openDB();return new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).delete(key);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}

function desc(e){if(Array.isArray(e.description))return e.description.join("\n");if(Array.isArray(e.instructions))return e.instructions.join("\n");return e.description||e.instructions||""}
function mergedExercise(id){
  if(id.startsWith("NEW:")){
    return newItems.find(x=>x._key===id);
  }
  const b=baseMap[id]; if(!b)return null;
  const e={...b,...(drafts[id]||{}),_base:true};
  e.categories=mapCategories(e.categories);
  return e;
}
function allExercises(){return [...baseExercises.map(e=>mergedExercise(e.id)),...newItems.map(e=>({...e,categories:mapCategories(e.categories),_new:true}))]}
function isChanged(e){return e._new || (!!drafts[e.id] && Object.keys(drafts[e.id]).length>0)}
function completedPath(e){return `assets/preview-completed/${String(e.id).toLowerCase()}_completed.png`}
function fallbackImage(e){return (e.images&&e.images[0])||""}
async function imageURL(e){
  const key=e._new?e._key:e.id;
  const blob=await idbGet(key).catch(()=>null);
  if(blob)return URL.createObjectURL(blob);
  return completedPath(e);
}

function setupCategoryFilters(){
  const cf=$("#categoryFilter"); cf.innerHTML='<option value="">すべてのカテゴリー</option>';
  orderedCategories().forEach(c=>{
    const o=document.createElement("option");o.value=c;o.textContent=c;cf.appendChild(o);
  });
}
function categoryChecks(container,selected=[]){
  container.innerHTML=orderedCategories().map(c=>`<label class="category-check"><input type="checkbox" value="${esc(c)}" ${selected.includes(c)?'checked':''}>${esc(c)}</label>`).join("");
}
function selectedCats(container){return [...container.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value)}

function filtered(){
  const q=$("#searchBox").value.trim().toLowerCase(),cat=$("#categoryFilter").value,v=$("#visibilityFilter").value;
  return orderedExercises(allExercises()).filter(e=>{
    const text=[e.id,e.name,e.purpose,desc(e),(e.categories||[]).join(" ")].join(" ").toLowerCase();
    const hidden=!!e.hidden,changed=(e._new&&hasUnpublishedChange(e));
    return (!q||text.includes(q))&&(!cat||(e.categories||[]).includes(cat))&&
      (v==="all"||(v==="visible"&&!hidden)||(v==="hidden"&&hidden)||(v==="changed"&&changed));
  });
}
function publicSnapshotFor(e){
  const p=pubState?.[e.id];
  if(p?.data)return p.data;
  return e._new ? null : baseMap[e.id] || null;
}

/* Rebuild19: 既存218運動は初期状態から公開済み。
   「初回公開」が必要なのは、まだ公開スナップショットを持たない新規運動だけ。 */
function needsInitialPublish(e){
  return !!e?._new && !pubState?.[e.id]?.data;
}
function isPublished(e){
  const p=publicSnapshotFor(e);
  return !!p && !p.hidden;
}
function hasUnpublishedChange(e){
  if(!e?._new)return false;
  const p=pubState?.[e.id];
  if(p?.data && !p.unpublished)return false;
  return true;
}
function statusHTML(e){
  const s=[];
  if(e._new)s.push('<span class="status new">新規</span>');

  if(e._new && hasUnpublishedChange(e)){
    s.push('<span class="status changed">未公開</span>');
  }

  if(e.hidden){
    s.push('<span class="status hidden">非表示</span>');
  }else if(!e._new || !hasUnpublishedChange(e)){
    s.push('<span class="status">公開中</span>');
  }

  return `<div class="status-line">${s.join("")}</div>`;
}
function card(e){
  return `<article class="exercise-admin-card ${e.hidden?'hidden-item ':''}${isChanged(e)?'changed-item ':''}${e._new?'new-item':''}" data-id="${esc(e._new?e._key:e.id)}">
    <div class="admin-thumb"><img data-imgkey="${esc(e._new?e._key:e.id)}" src="${esc(completedPath(e))}" alt="" onerror="this.src='${esc(fallbackImage(e))}'"></div>
    <div class="admin-card-body">
      <div class="id-line">${esc(e.id)}</div><div class="admin-name">${esc(e.name)}</div>
      <div class="tags">${(e.categories||[]).map(c=>`<span class="tag">${esc(c)}</span>`).join("")}</div>
      <div class="purpose">${esc(e.purpose||"")}</div><div class="desc">${esc(desc(e))}</div>
      ${statusHTML(e)}
      <div class="card-actions">
  <button data-edit="${esc(e._new?e._key:e.id)}">編集</button>
  <button data-visibility="${esc(e._new?e._key:e.id)}">${e.hidden?'表示に戻す':'非表示'}</button>
  ${e._new?`<button class="danger-outline" data-delete-new="${esc(e._key)}">削除</button>`:""}
</div>
    </div></article>`;
}
function tableRow(e){
  const key=e._new?e._key:e.id;
  return `<tr><td>${esc(e.id)}</td><td><img class="table-thumb" data-imgkey="${esc(key)}" src="${esc(completedPath(e))}" onerror="this.src='${esc(fallbackImage(e))}'"></td><td><strong>${esc(e.name)}</strong></td><td>${esc((e.categories||[]).join(" / "))}</td><td>${esc(e.purpose||"")}</td><td>${esc(e.hidden?'非表示':(e._new&&hasUnpublishedChange(e)?'未公開':'公開中'))}</td><td>
  <button data-edit="${esc(key)}">編集</button>
  <button data-visibility="${esc(key)}">${e.hidden?'表示に戻す':'非表示'}</button>
  ${e._new?` <button class="danger-outline" data-delete-new="${esc(key)}">削除</button>`:""}
</td></tr>`;
}
async function refreshDraftImages(){
  for(const img of document.querySelectorAll("[data-imgkey]")){
    const blob=await idbGet(img.dataset.imgkey).catch(()=>null);
    if(blob)img.src=URL.createObjectURL(blob);
  }
}
function render(){
  const list=filtered();$("#resultCount").textContent=list.length;$("#cardView").innerHTML=list.map(card).join("");$("#tableBody").innerHTML=list.map(tableRow).join("");
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=e=>{e.stopPropagation();openEdit(b.dataset.edit)});
  document.querySelectorAll("[data-visibility]").forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const key=b.dataset.visibility;
    const item=itemByKey(key);
    if(!item)return;
    const makeHidden=!item.hidden;
    const action=makeHidden?"非表示":"表示に戻す";
    if(!confirm(`${item.id} ${item.name}\n\n${action}にしますか？`))return;
    await setExerciseVisibilityByKey(key,makeHidden);
  });
  document.querySelectorAll("[data-delete-new]").forEach(b=>b.onclick=async e=>{
    e.stopPropagation();
    const key=b.dataset.deleteNew;
    const item=itemByKey(key);
    if(!item)return;
    if(!confirm(`${item.id} ${item.name}\n\nこの追加運動を削除しますか？\n管理画面・公開画面の両方から削除します。`))return;
    newItems=newItems.filter(x=>x._key!==key);
    localStorage.setItem(NEW_KEY,JSON.stringify(newItems));
    await idbDelete(key).catch(()=>{});
    await idbDelete(qrBlobKey(key)).catch(()=>{});
    try{
      const db=await veOpenDB();
      await new Promise((res,rej)=>{const r=db.transaction(VE_DB_STORE,"readwrite").objectStore(VE_DB_STORE).delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
    }catch(_){}
    if(item.id && pubState[item.id]){delete pubState[item.id];persistPub();}
    render();
  });
  updateStats();refreshDraftImages();
}
function updateStats(){
  const all=allExercises();
  $("#statBase").textContent=baseExercises.length;
  $("#statTotal").textContent=all.length;
  $("#statHidden").textContent=all.filter(e=>e.hidden).length;
  $("#statChanged").textContent=all.filter(e=>e._new&&hasUnpublishedChange(e)).length;
}

function itemByKey(key){return key.startsWith("NEW:")?newItems.find(x=>x._key===key):mergedExercise(key)}
async function openEdit(key){
  const e=itemByKey(key); if(!e)return; currentEditId=key;
  $("#fId").value=e.id;$("#fName").value=e.name||"";$("#fPurpose").value=e.purpose||"";$("#fDescription").value=desc(e);$("#fHidden").checked=!!e.hidden;
  categoryChecks($("#categoryChecks"),e.categories||[]);
  $("#editTitle").textContent=`運動編集：${e.id} ${e.name}`;
  $("#fImage").value="";

  const initialPublish=needsInitialPublish(e);
  const publishBtn=$("#editPublishBtn");
  const hint=$("#editPublishHint");
  if(publishBtn) publishBtn.hidden=!initialPublish;
  if(hint){
    hint.textContent=initialPublish
      ? "この新規運動は未公開です。内容を保存・確認した後に「公開する」を押してください。"
      : "この運動は公開中です。「管理データ保存」で変更内容が選択画面へ反映されます。";
  }

  await updateEditPreview();
  $("#editModal").hidden=false;
}
async function updateEditPreview(){
  const e=itemByKey(currentEditId);if(!e)return;
  $("#previewName").textContent=$("#fName").value;$("#previewPurpose").textContent=$("#fPurpose").value;$("#previewDescription").textContent=$("#fDescription").value;
  const cats=selectedCats($("#categoryChecks"));$("#previewTags").innerHTML=cats.map(c=>`<span class="tag">${esc(c)}</span>`).join("");
  const box=$("#previewImage");box.innerHTML="";
  const img=document.createElement("img");
  if(tempEditImageURL)img.src=tempEditImageURL;else{const blob=await idbGet(currentEditId).catch(()=>null);img.src=blob?URL.createObjectURL(blob):completedPath(e)}
  img.onerror=()=>{img.src=fallbackImage(e)};box.appendChild(img);
}
["fName","fPurpose","fDescription"].forEach(id=>$("#"+id).addEventListener("input",updateEditPreview));
$("#categoryChecks").addEventListener("change",updateEditPreview);
$("#fImage").addEventListener("change",()=>{const f=$("#fImage").files[0];if(f){if(tempEditImageURL)URL.revokeObjectURL(tempEditImageURL);tempEditImageURL=URL.createObjectURL(f);updateEditPreview()}});

$("#editForm").addEventListener("submit",async ev=>{
  ev.preventDefault();

  const key=currentEditId;
  const e=itemByKey(key);
  if(!e)return;

  const submitBtn=$("#editForm button[type='submit']");
  if(submitBtn?.disabled)return;

  const patch={
    name:$("#fName").value.trim(),
    purpose:$("#fPurpose").value.trim(),
    description:$("#fDescription").value,
    categories:selectedCats($("#categoryChecks")),
    hidden:$("#fHidden").checked
  };
  const candidate={...e,...patch};

  /* FIX4: 編集保存では、既存画像の再取得を要求しない。
     既存データの画像はすでに登録済みなので、編集項目だけを検証する。 */
  const autoErrors=[];
  if(!candidate.name) autoErrors.push("運動名を入力してください。");
  if(!(candidate.categories||[]).length) autoErrors.push("カテゴリーを1つ以上設定してください。");
  if(autoErrors.length){
    alert("保存できません。\n\n・"+autoErrors.join("\n・"));
    return;
  }

  if(submitBtn){
    submitBtn.disabled=true;
    submitBtn.dataset.originalText=submitBtn.textContent;
    submitBtn.textContent="保存中…";
  }

  try{
    if(key.startsWith("NEW:")){
      const i=newItems.findIndex(x=>x._key===key);
      if(i<0)throw new Error("new item not found");
      newItems[i]={...newItems[i],...patch};
      localStorage.setItem(NEW_KEY,JSON.stringify(newItems));
    }else{
      const b=baseMap[key];
      const clean={};
      for(const [k,v] of Object.entries(patch)){
        const bv=k==="description"?desc(b):b[k];
        if(JSON.stringify(v)!==JSON.stringify(bv))clean[k]=v;
      }
      if(Object.keys(clean).length)drafts[key]=clean;
      else delete drafts[key];
      localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));
    }

    const file=$("#fImage").files[0];
    if(file) await idbPut(key,file);

    const qrFile=$("#fQrImage")?.files?.[0];
    if(qrFile) await saveQrForKey(key,qrFile);

    /*
      Rebuild19 公開モデル:
      - 既存218運動は最初から公開済み → 保存した内容を公開スナップショットへ即時反映
      - 一度公開済みの新規運動 → 同様に保存で即時反映
      - 初回公開前の新規運動 → 保存しても未公開のまま
    */
    const updated=itemByKey(key);
    if(updated && !needsInitialPublish(updated)){
      let imageKey=pubState?.[updated.id]?.imageKey||null;
      try{ if(await idbGet(key)) imageKey=key; }catch(_){}
      pubState[updated.id]={
        data:cleanForPublish(updated),
        imageKey,
        publishedAt:new Date().toISOString()
      };
      persistPub();
    }

    if(tempEditImageURL){
      URL.revokeObjectURL(tempEditImageURL);
      tempEditImageURL=null;
    }

    /* 保存完了後に閉じ、一覧を即時更新 */
    $("#editModal").hidden=true;
    setupCategoryFilters();
    render();
  }catch(err){
    console.error(err);
    alert("保存に失敗しました。\n\n"+(err?.message||String(err)));
  }finally{
    if(submitBtn){
      submitBtn.disabled=false;
      submitBtn.textContent=submitBtn.dataset.originalText||"管理データ保存";
    }
  }
});
$("#revertBtn").addEventListener("click",async()=>{
  const key=currentEditId;if(!key)return;
  if(key.startsWith("NEW:")){if(!confirm("この新規運動を下書きから削除しますか？"))return;newItems=newItems.filter(x=>x._key!==key);localStorage.setItem(NEW_KEY,JSON.stringify(newItems));await idbDelete(key)}
  else{
    delete drafts[key];
    localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));
    await idbDelete(key);
    await idbDelete(qrBlobKey(key)).catch(()=>{});
    if(pubState[key]){
      delete pubState[key];
      persistPub();
    }
  }
  $("#editModal").hidden=true;setupCategoryFilters();render();
});
document.querySelectorAll("[data-close-edit]").forEach(x=>x.onclick=()=>{
  if(tempEditImageURL){
    URL.revokeObjectURL(tempEditImageURL);
    tempEditImageURL=null;
  }
  $("#editModal").hidden=true;
});

async function toggleHidden(key){
  const e=itemByKey(key);if(!e)return;
  if(key.startsWith("NEW:")){const i=newItems.findIndex(x=>x._key===key);newItems[i].hidden=!e.hidden;localStorage.setItem(NEW_KEY,JSON.stringify(newItems))}
  else{drafts[key]={...(drafts[key]||{}),hidden:!e.hidden};if(drafts[key].hidden===!!baseMap[key].hidden)delete drafts[key].hidden;if(!Object.keys(drafts[key]).length)delete drafts[key];localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts))}
  render();
}

function nextId(){
  const nums=allExercises().map(e=>parseInt(String(e.id).replace(/\D/g,""),10)).filter(Number.isFinite);
  return `EX${String(Math.max(...nums,0)+1).padStart(3,"0")}`;
}
$("#newBtn").onclick=()=>{const id=nextId();$("#nId").value=id;$("#nName").value="";$("#nPurpose").value="";$("#nDescription").value="";$("#nImage").value="";categoryChecks($("#newCategoryChecks"),[]);updateNewPreview();$("#newModal").hidden=false};
function updateNewPreview(){const f=$("#nImage").files[0];if(tempNewImageURL){URL.revokeObjectURL(tempNewImageURL);tempNewImageURL=null}if(f)tempNewImageURL=URL.createObjectURL(f);$("#newPreviewImage").innerHTML=tempNewImageURL?`<img src="${tempNewImageURL}">`:"";$("#newPreviewName").textContent=$("#nName").value||"新規運動";$("#newPreviewPurpose").textContent=$("#nPurpose").value;$("#newPreviewDescription").textContent=$("#nDescription").value;$("#newPreviewTags").innerHTML=selectedCats($("#newCategoryChecks")).map(c=>`<span class="tag">${esc(c)}</span>`).join("")}
["nName","nPurpose","nDescription"].forEach(id=>$("#"+id).addEventListener("input",updateNewPreview));$("#newCategoryChecks").addEventListener("change",updateNewPreview);$("#nImage").addEventListener("change",updateNewPreview);
$("#newForm").addEventListener("submit",async ev=>{
  ev.preventDefault();

  const btn=$("#newSubmitBtn") || $("#newForm button[type='submit']");
  if(btn?.disabled) return;

  const id=$("#nId").value.trim().toUpperCase();
  const name=$("#nName").value.trim();
  const purpose=$("#nPurpose").value.trim();
  const description=$("#nDescription").value;
  const categories=selectedCats($("#newCategoryChecks"));
  const file=$("#nImage").files[0];

  // 先に検証し、問題があれば一覧データへ追加しない
  const errors=[];
  if(!id) errors.push("IDがありません。");
  if(!name) errors.push("運動名を入力してください。");
  if(!categories.length) errors.push("カテゴリーを1つ以上設定してください。");
  if(!file && !window._tsocNewEditorImageKey) errors.push("「画像レイアウト編集」または完成画像1枚を登録してください。");
  if(allExercises().some(e=>String(e.id||"").trim().toUpperCase()===id)){
    errors.push(`${id} は既に登録されています。`);
  }

  if(errors.length){
    alert("新規登録できません。\n\n・"+errors.join("\n・"));
    return;
  }

  if(btn){
    btn.disabled=true;
    btn.dataset.originalText=btn.textContent;
    btn.textContent="登録中…";
  }

  try{
    // IDとは別に一意な内部キーを持たせる
    const unique=(globalThis.crypto?.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key=`NEW:${id}:${unique}`;
    const item={
      _key:key,
      id,
      name,
      purpose,
      description,
      categories,
      hidden:false,
      images:[]
    };

    // 画像保存成功後に、一覧へ1回だけ追加
    await idbPut(key,file);
    newItems.push(item);
    localStorage.setItem(NEW_KEY,JSON.stringify(newItems));

    if(window._tsocNewEditorImageKey){
      const editorBlob=await idbGet(window._tsocNewEditorImageKey).catch(()=>null);
      if(editorBlob)await idbPut(key,editorBlob);
      const editorLayout=await veGet(window._tsocNewEditorImageKey).catch(()=>null);
      if(editorLayout)await vePut(key,editorLayout);
      window._tsocNewEditorImageKey=null;
    }
    const qrFile=$("#nQrImage")?.files?.[0];
    if(qrFile)await saveQrForKey(key,qrFile);

    $("#newModal").hidden=true;
    setupCategoryFilters();
    render();
  }catch(err){
    console.error(err);
    alert("新規登録に失敗しました。もう一度お試しください。");
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent=btn.dataset.originalText||"新規登録";
    }
  }
});
document.querySelectorAll("[data-close-new]").forEach(x=>x.onclick=()=>$("#newModal").hidden=true);

if($("#exportDraftBtn")) $("#exportDraftBtn").onclick=()=>{
  const payload={format:"TSOC_ADMIN_DRAFT_V1",exported_at:new Date().toISOString(),base_count:baseExercises.length,drafts,new_items:newItems,note:"画像バイナリはブラウザIndexedDB内。Phase 3で公開用ZIP書き出しに統合予定。"};
  const blob=new Blob(["\ufeff"+JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="TSOC_admin_draft.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

$("#searchBox").oninput=render;$("#categoryFilter").onchange=render;$("#visibilityFilter").onchange=render;$("#clearBtn").onclick=()=>{$("#searchBox").value="";$("#categoryFilter").value="";$("#visibilityFilter").value="all";render()};$("#displayMode").onchange=e=>{$("#cardView").hidden=e.target.value!=="cards";$("#tableView").hidden=e.target.value!=="table"};
setupCategoryFilters();render();


/* ============================================================
   Phase 3: preview / validation / publish ZIP export
   ============================================================ */
const PHASE3_PREVIEW_KEY = "tsoc_admin_phase3_preview_payload_v1";
let lastValidation = null;
let exportBlob = null;

async function currentMergedExportData(){
  const items = allExercises().map(e=>({
    id:e.id,
    name:e.name||"",
    purpose:e.purpose||"",
    description:desc(e),
    categories:[...(e.categories||[])],
    hidden:!!e.hidden,
    _key:e._new?e._key:e.id,
    _new:!!e._new,
    images:e.images||[],
    image_transforms:e.image_transforms||[],
    qr_images:e.qr_images||[],
    qr_image:e.qr_image||"",
    qr:e.qr||""
  }));
  return items;
}

async function fileBlobFromURL(url){
  try{
    const r=await fetch(url);
    if(!r.ok)return null;
    return await r.blob();
  }catch{return null;}
}

async function buildPreviewPayload(){
  const items=await currentMergedExportData();
  const previewItems=[];
  for(const e of items){
    let imageURL=completedPath(e);
    const blob=await idbGet(e._key).catch(()=>null);
    if(blob){
      const dataURL=await new Promise(res=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.readAsDataURL(blob)});
      imageURL=dataURL;
    }
    previewItems.push({...e,preview_image:imageURL});
  }
  const payload={generated_at:new Date().toISOString(),items:previewItems};
  sessionStorage.setItem(PHASE3_PREVIEW_KEY,JSON.stringify(payload));
  return payload;
}

$("#__old_previewAppBtn")?.addEventListener("click",async()=>{
  await buildPreviewPayload();
  window.open("admin-preview.html","_blank");
});
$("#__old_previewPrintBtn")?.addEventListener("click",async()=>{
  await buildPreviewPayload();
  window.open("admin-print-preview.html","_blank");
});

async function validateAll(){
  const items=await currentMergedExportData();
  const result=[];
  const ids=new Map(), names=new Map();

  for(const e of items){
    if(!e.id)result.push({level:"error",id:"",text:"IDが空です"});
    if(ids.has(e.id))result.push({level:"error",id:e.id,text:`ID重複：${e.id}`}); else ids.set(e.id,true);
    if(!e.name.trim())result.push({level:"error",id:e.id,text:"運動名が空です"});
    if(!e.purpose.trim())result.push({level:"warn",id:e.id,text:"目的が空です"});
    if(!desc(e).trim())result.push({level:"warn",id:e.id,text:"説明文が空です"});
    if(!(e.categories||[]).length)result.push({level:"warn",id:e.id,text:"カテゴリー未設定"});
    const key=e._key;
    const draftBlob=await idbGet(key).catch(()=>null);
    if(!draftBlob){
      const img=await fileBlobFromURL(completedPath(e));
      if(!img)result.push({level:"error",id:e.id,text:"完成画像が見つかりません"});
    }
    const q=qrPath(e);
    if(!q)result.push({level:"warn",id:e.id,text:"QRパス未検出"});
    const nm=e.name.trim();
    if(nm){
      if(names.has(nm))result.push({level:"warn",id:e.id,text:`運動名重複：${nm}`});else names.set(nm,true);
    }
  }

  for(let n=1;n<=218;n++){
    const id=`EX${String(n).padStart(3,"0")}`;
    if(!ids.has(id))result.push({level:"error",id,text:`既存ID ${id} が欠損しています`});
  }

  const errors=result.filter(x=>x.level==="error");
  const warns=result.filter(x=>x.level==="warn");
  lastValidation={items:items.length,errors:errors.length,warnings:warns.length,details:result,checked_at:new Date().toISOString()};
  return lastValidation;
}

function showValidation(v){
  const sum=$("#validationSummary");
  sum.className="validation-summary "+(v.errors===0?"pass":"fail");
  sum.textContent=v.errors===0
    ? `PASS：${v.items}件 / エラー0 / 警告${v.warnings}`
    : `要修正：${v.items}件 / エラー${v.errors} / 警告${v.warnings}`;
  const list=$("#validationList");
  if(!v.details.length)list.innerHTML='<div class="validation-item ok">問題は見つかりませんでした。</div>';
  else list.innerHTML=v.details.map(x=>`<div class="validation-item ${x.level}"><strong>${esc(x.id||"全体")}</strong>　${esc(x.text)}</div>`).join("");
  $("#validationModal").hidden=false;
}

$("#__old_validateBtn")?.addEventListener("click",async()=>showValidation(await validateAll()));
document.querySelectorAll("[data-close-validation]").forEach(x=>x.addEventListener("click",()=>$("#validationModal").hidden=true));

async function createPublishZip(){
  const v=await validateAll();
  if(v.errors>0){
    showValidation(v);
    return null;
  }

  $("#exportModal").hidden=false;
  $("#exportStatus").textContent="公開用ZIPを作成しています...\n";
  $("#downloadExportBtn").disabled=true;

  const zip=new JSZip();
  const current=await currentMergedExportData();

  const publicExercises=[];
  let copiedImages=0;

  for(let i=0;i<current.length;i++){
    const e=current[i];
    $("#exportStatus").textContent=`公開用ZIPを作成しています...\n運動 ${i+1} / ${current.length}\n画像 ${copiedImages} 件処理済み`;

    const key=e._key;
    let imageBlob=await idbGet(key).catch(()=>null);
    if(!imageBlob)imageBlob=await fileBlobFromURL(completedPath(e));

    const filename=`${e.id.toLowerCase()}_completed.png`;
    if(imageBlob){
      zip.file(`assets/print-completed/${filename}`,imageBlob);
      // preview uses same image for now; deployment/setup can generate lightweight previews later.
      zip.file(`assets/preview-completed/${filename}`,imageBlob);
      copiedImages++;
    }

    publicExercises.push({
      id:e.id,
      name:e.name,
      purpose:e.purpose,
      description:e.description,
      categories:e.categories,
      hidden:e.hidden
    });
  }

  const jsText="window.TSOC_ADMIN_EXPORTED_DATA = "+JSON.stringify({
    exported_at:new Date().toISOString(),
    exercises:publicExercises
  },null,2)+";\n";
  zip.file("data/admin-exported-data.js",jsText);
  zip.file("data/admin-exported-data.json",JSON.stringify({exercises:publicExercises},null,2));
  zip.file("VALIDATION_RESULT.json",JSON.stringify(v,null,2));
  zip.file("README_EXPORT.txt",
`TSOC Exercise 管理画面 Phase 3 公開用パッケージ

作成日時: ${new Date().toLocaleString()}
運動数: ${current.length}
完成画像: ${copiedImages}
整合性チェック: PASS

重要:
このZIPはまだGitHubへ自動反映しません。
次のPhaseで、現在の本番構造に安全にマージする正式エクスポート処理へ進みます。
`);

  $("#exportStatus").textContent=`ZIP圧縮中...\n運動 ${current.length}件\n画像 ${copiedImages}件\n整合性チェック PASS`;
  exportBlob=await zip.generateAsync({type:"blob"});
  $("#exportStatus").textContent=`作成完了\n運動: ${current.length}件\n画像: ${copiedImages}件\nエラー: 0\n警告: ${v.warnings}\nZIPサイズ: ${(exportBlob.size/1024/1024).toFixed(1)} MB`;
  $("#downloadExportBtn").disabled=false;
  return exportBlob;
}

$("#__old_exportPackageBtn")?.addEventListener("click",createPublishZip);
$("#downloadExportBtn").addEventListener("click",()=>{
  if(!exportBlob)return;
  const a=document.createElement("a");
  a.href=URL.createObjectURL(exportBlob);
  const d=new Date(),stamp=d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"_"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0");
  a.download=`TSOC_Exercise_admin_export_${stamp}.zip`;
  a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
});
document.querySelectorAll("[data-close-export]").forEach(x=>x.addEventListener("click",()=>$("#exportModal").hidden=true));

/* =========================================================
   Phase 4: 管理データ保存 → 必要時に表示確認 → 各運動ごとに公開
   ========================================================= */

async function validateOneExercise(e,key){
  const errors=[];
  if(!String(e?.id||"").trim())errors.push("IDがありません。");
  if(!String(e?.name||"").trim())errors.push("運動名を入力してください。");
  if(!(e?.categories||[]).length)errors.push("カテゴリーを1つ以上設定してください。");
  const dup=allExercises().filter(x=>String(x.id||"").toUpperCase()===String(e.id||"").toUpperCase());
  if(dup.length>1)errors.push("同じIDが重複しています。");
  let hasImage=false;
  try{ if(await idbGet(key))hasImage=true; }catch(_){}
  if(!hasImage && !e._new){
    try{ hasImage=!!(await fileBlobFromURL(completedPath(e))); }catch(_){}
  }
  if(!hasImage && e._new)errors.push("完成画像が登録されていません。");
  return errors;
}

function cleanForPublish(e){
  const c={...e};
  delete c._key; delete c._new; delete c._base;
  c.description=desc(e);
  c.hidden=!!e.hidden;
  return c;
}


async function setExerciseVisibilityByKey(key,hidden){
  const e=itemByKey(key);
  if(!e)return;

  if(key.startsWith("NEW:")){
    const i=newItems.findIndex(x=>x._key===key);
    if(i<0)return;
    newItems[i]={...newItems[i],hidden:!!hidden};
    localStorage.setItem(NEW_KEY,JSON.stringify(newItems));
  }else{
    const current={...(drafts[key]||{})};
    current.hidden=!!hidden;
    if(hidden===!!baseMap[key]?.hidden) delete current.hidden;
    if(Object.keys(current).length) drafts[key]=current;
    else delete drafts[key];
    localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));
  }

  const updated=itemByKey(key);
  let imageKey=pubState?.[updated.id]?.imageKey||null;
  try{if(await idbGet(key))imageKey=key}catch(_){}

  pubState[updated.id]={
    data:cleanForPublish(updated),
    imageKey,
    publishedAt:new Date().toISOString()
  };
  persistPub();
  render();

  alert(hidden
    ? `${updated.id} ${updated.name}\\n\\n選択画面で非表示にしました。\\n管理データは削除されていません。`
    : `${updated.id} ${updated.name}\\n\\n選択画面へ表示を戻しました。`);
}

async function publishExerciseByKey(key){
  const e=itemByKey(key);
  if(!e){ alert("対象の運動を取得できません。"); return; }

  const errors=await validateOneExercise(e,key);
  if(errors.length){
    alert("公開できません。\n\n・"+errors.join("\n・"));
    return;
  }

  let imageKey=null;
  try{ if(await idbGet(key)) imageKey=key; }catch(_){}

  pubState[e.id]={
    data:cleanForPublish(e),
    imageKey,
    publishedAt:new Date().toISOString()
  };
  persistPub();
  render();

  if(e.hidden){
    alert(`${e.id} ${e.name}\n\n公開画面で「非表示」に反映しました。`);
  }else{
    alert(`${e.id} ${e.name}\n\n公開中の利用画面へ反映しました。`);
  }
}

$("#editPublishBtn")?.addEventListener("click",async()=>{
  if(!currentEditId)return;
  const key=currentEditId;
  const saved=itemByKey(key);
  if(!saved)return;

  if(!needsInitialPublish(saved)){
    alert("この運動はすでに公開中です。変更は「管理データ保存」で選択画面へ反映されます。");
    return;
  }

  const liveName=$("#fName").value.trim();
  const livePurpose=$("#fPurpose").value.trim();
  const liveDescription=$("#fDescription").value;
  const liveCategories=selectedCats($("#categoryChecks"));
  const unsaved=
    liveName!==String(saved.name||"") ||
    livePurpose!==String(saved.purpose||"") ||
    liveDescription!==desc(saved) ||
    JSON.stringify(liveCategories)!==JSON.stringify(saved.categories||[]) ||
    $("#fHidden").checked!==!!saved.hidden ||
    !!$("#fImage")?.files?.[0] ||
    !!$("#fQrImage")?.files?.[0];

  if(unsaved){
    alert("先に「管理データ保存」を押してください。\n保存後に「公開する」を押してください。");
    return;
  }

  await publishExerciseByKey(key);

  const latest=itemByKey(key);
  if(latest && !needsInitialPublish(latest)){
    const publishBtn=$("#editPublishBtn");
    if(publishBtn)publishBtn.hidden=true;
    const hint=$("#editPublishHint");
    if(hint)hint.textContent="この運動は公開中です。今後の変更は「管理データ保存」で選択画面へ反映されます。";
    /* 初回公開が完了したことを明確にし、古い編集状態を残さない */
    $("#editModal").hidden=true;
    setupCategoryFilters();
    render();
  }
});


/* ===== FIX6-Rebuild1 additions ===== */
async function _tsocFileToDataURL(file){
  if(!file)return null;
  return await new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);
  });
}
async function _tsocOpenPrintPreview(payload){
  sessionStorage.setItem("tsoc_fix6_rebuild_print_v1",JSON.stringify(payload));
  window.open("admin-print-check.html","_blank");
}
async function _tsocPreviewEdit(){
  if(!currentEditId)return;
  const e=itemByKey(currentEditId); if(!e)return;
  let dataUrl=null;
  const file=$("#fImage")?.files?.[0];
  if(file)dataUrl=await _tsocFileToDataURL(file);
  if(!dataUrl){
    const blob=await idbGet(currentEditId).catch(()=>null);
    if(blob)dataUrl=await _tsocFileToDataURL(blob);
  }
  await _tsocOpenPrintPreview({
    id:e.id,
    name:$("#fName").value.trim(),
    purpose:$("#fPurpose").value,
    description:$("#fDescription").value,
    qr:(await qrDataURLForKey(currentEditId)) || e.qr || null,
    imageDataUrl:dataUrl,
    imagePath:dataUrl?null:`assets/print-completed/${String(e.id).toLowerCase()}_completed.png`
  });
}
async function _tsocPreviewNew(){
  const file=$("#nImage")?.files?.[0];
  if(!file){alert("先に完成画像を選択してください。");return;}
  await _tsocOpenPrintPreview({
    id:$("#nId").value.trim(),
    name:$("#nName").value.trim()||"新規運動",
    purpose:$("#nPurpose").value,
    description:$("#nDescription").value,
    qr:($("#nQrImage")?.files?.[0] ? await _tsocFileToDataURL($("#nQrImage").files[0]) : null),
    imageDataUrl:await _tsocFileToDataURL(file),
    imagePath:null
  });
}
$("#editPrintPreviewBtn")?.addEventListener("click",_tsocPreviewEdit);
$("#newPrintPreviewBtn")?.addEventListener("click",_tsocPreviewNew);

$("#editUnpublishBtn")?.addEventListener("click",async()=>{
  if(!currentEditId)return;
  const e=itemByKey(currentEditId); if(!e)return;
  if(!confirm(`${e.id} ${e.name}\n\n公開を取り下げて未公開に戻しますか？`))return;
  pubState[e.id]={
    published:false,
    unpublished:true,
    data:{...e},
    publishedAt:null
  };
  localStorage.setItem(PUBLISHED_KEY,JSON.stringify(pubState));
  $("#editModal").hidden=true;
  render();
  alert("公開を取り下げました。管理データは残っています。");
});



/* ===== Rebuild3 QR image support ===== */
function qrBlobKey(key){ return `QR:${key}`; }
async function saveQrForKey(key,file){
  if(!file)return;
  await idbPut(qrBlobKey(key),file);
}
async function getQrForKey(key){ return await idbGet(qrBlobKey(key)).catch(()=>null); }
async function qrDataURLForKey(key){
  const blob=await getQrForKey(key);
  if(!blob)return null;
  return await new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);
  });
}

/* ===== Rebuild2: non-destructive image layout editor ===== */
const VE_DB_NAME="tsoc_visual_editor_v1";
const VE_DB_STORE="layouts";
let veContext=null,veItems=[],veSelected=null,veSeq=0;

function veOpenDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(VE_DB_NAME,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(VE_DB_STORE))r.result.createObjectStore(VE_DB_STORE)};
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
async function vePut(key,val){const db=await veOpenDB();return new Promise((res,rej)=>{const r=db.transaction(VE_DB_STORE,"readwrite").objectStore(VE_DB_STORE).put(val,key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function veGet(key){const db=await veOpenDB();return new Promise((res,rej)=>{const r=db.transaction(VE_DB_STORE).objectStore(VE_DB_STORE).get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
function veUID(){return "v"+Date.now().toString(36)+(++veSeq)}
function veStage(){return document.getElementById("veStage")}
function veKey(ctx){
  if(ctx.kind==="edit")return ctx.key;
  const id=$("#nId")?.value.trim()||"TEMP";
  const name=$("#nName")?.value.trim()||"NONAME";
  return "NEW_FORM:"+id+":"+name;
}
function vePctX(px){return px/veStage().clientWidth*100}
function vePctY(py){return py/veStage().clientHeight*100}
function veClamp(v,a,b){return Math.max(a,Math.min(b,v))}
const VE_COORD_MIN=-35, VE_COORD_MAX=135;
async function veFileData(file){return await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}

function veMake(type,extra={}){
  const defaults={
    image:{x:10,y:10,w:40,h:55,r:0},
    line:{x:20,y:45,w:35,h:8,r:0,stroke:3},
    arrow:{x:20,y:45,w:35,h:8,r:0,stroke:3,flipH:false},
    thickArrow:{x:20,y:38,w:38,h:18,r:0,stroke:10,flipH:false},
    curvedArrow:{x:22,y:20,w:32,h:42,r:0,stroke:7,flipH:false},
    uTurnArrow:{x:22,y:18,w:32,h:46,r:0,stroke:7,flipH:false},
    doubleArrow:{x:20,y:45,w:35,h:8,r:0,stroke:3,flipH:false},
    rect:{x:25,y:20,w:25,h:30,r:0,stroke:3},
    ellipse:{x:25,y:20,w:25,h:30,r:0,stroke:3},
    text:{x:25,y:25,w:30,h:15,r:0,text:"説明"}
  };
  return {id:veUID(),type,...defaults[type],...extra};
}
function veRender(){
  const st=veStage(); st.innerHTML="";
  veItems.forEach((it,z)=>{
    const el=document.createElement("div");
    const outside=(it.x<0||it.y<0||it.x+it.w>100||it.y+it.h>100);
    el.className="ve-item"+(it.id===veSelected?" selected":"")+(outside?" outside-print":"");
    el.dataset.id=it.id; el.style.left=it.x+"%";el.style.top=it.y+"%";el.style.width=it.w+"%";el.style.height=it.h+"%";
    el.style.transform=`rotate(${it.r||0}deg) scaleX(${it.flipH?-1:1})`; el.style.zIndex=z+1;
    if(it.type==="image")el.innerHTML=`<img src="${it.src}">`;
    if(it.type==="line")el.innerHTML=`<div class="ve-line-inner" style="--stroke:${it.stroke||3}px"></div>`;
    if(it.type==="arrow")el.innerHTML=`<div class="ve-arrow-inner" style="--stroke:${it.stroke||3}px"></div>`;
    if(it.type==="thickArrow")el.innerHTML=`<div class="ve-thick-arrow-inner"></div>`;
    if(it.type==="curvedArrow")el.innerHTML=`<div class="ve-curved-arrow-inner"><svg viewBox="0 0 120 90" preserveAspectRatio="none"><path class="ve-curved-filled" d="M8 74 C10 29 45 8 82 15 C94 17 103 22 110 28 L116 18 L119 49 L91 42 L101 35 C96 31 89 28 80 27 C51 22 24 38 22 75 C22 80 19 84 15 84 C11 84 8 80 8 74 Z"/></svg></div>`;
    if(it.type==="uTurnArrow")el.innerHTML=`<div class="ve-uturn-arrow-inner" style="--stroke:${it.stroke||7}"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M14 88 L14 56 C 14 24, 34 12, 50 12 C 68 12, 86 25, 86 56 L86 72" style="stroke-width:${it.stroke||7}"/><polygon points="86,86 72,67 100,67"/></svg></div>`;
    if(it.type==="doubleArrow")el.innerHTML=`<div class="ve-double-arrow-inner" style="--stroke:${it.stroke||3}px"></div>`;
    if(it.type==="rect")el.innerHTML=`<div class="ve-rect-inner" style="--stroke:${it.stroke||3}px"></div>`;
    if(it.type==="ellipse")el.innerHTML=`<div class="ve-ellipse-inner" style="--stroke:${it.stroke||3}px"></div>`;
    if(it.type==="text"){const d=document.createElement("div");d.className="ve-text-inner";d.textContent=it.text||"";el.appendChild(d)}
    if(it.id===veSelected){
      const rs=document.createElement("span");rs.className="ve-handle ve-resize";el.appendChild(rs);
      const rr=document.createElement("span");rr.className="ve-handle ve-rotate";el.appendChild(rr);
    }
    st.appendChild(el);
  });
  const frame=document.createElement("div");
  frame.className="ve-print-frame-overlay";
  st.appendChild(frame);
  veBindItems(); veProps();
}
function veProps(){
  const it=veItems.find(x=>x.id===veSelected);
  $("#veNoSelection").hidden=!!it; $("#veProps").hidden=!it;
  if(!it)return;
  $("#veX").value=Math.round(it.x);$("#veY").value=Math.round(it.y);$("#veW").value=Math.round(it.w);$("#veH").value=Math.round(it.h);$("#veR").value=Math.round(it.r||0);
  $("#veStrokeRow").hidden=!["line","arrow","thickArrow","curvedArrow","uTurnArrow","doubleArrow","rect","ellipse"].includes(it.type);
  $("#veTextRow").hidden=it.type!=="text";
  $("#veStroke").value=it.stroke||3;$("#veText").value=it.text||"";
}
function veBindItems(){
  veStage().querySelectorAll(".ve-item").forEach(el=>{
    el.addEventListener("pointerdown",ev=>{
      const id=el.dataset.id;veSelected=id;veRender();
      const item=veItems.find(x=>x.id===id),st=veStage(),box=st.getBoundingClientRect();
      const target=ev.target;
      if(target.classList.contains("ve-resize")) return veStartResize(ev,item,box);
      if(target.classList.contains("ve-rotate")) return veStartRotate(ev,item,box);
      const sx=ev.clientX,sy=ev.clientY,ox=item.x,oy=item.y;
      const move=e=>{item.x=veClamp(ox+vePctX(e.clientX-sx),VE_COORD_MIN,VE_COORD_MAX-item.w);item.y=veClamp(oy+vePctY(e.clientY-sy),VE_COORD_MIN,VE_COORD_MAX-item.h);veRender()};
      const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
      window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
    });
  });
}
function veStartResize(ev,item,box){
  ev.stopPropagation();const sx=ev.clientX,sy=ev.clientY,ow=item.w,oh=item.h;
  const move=e=>{item.w=veClamp(ow+(e.clientX-sx)/box.width*100,3,170);item.h=veClamp(oh+(e.clientY-sy)/box.height*100,3,170);veRender()};
  const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
  window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
function veStartRotate(ev,item,box){
  ev.stopPropagation();
  const el=veStage().querySelector(`[data-id="${item.id}"]`),r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const move=e=>{item.r=Math.round(Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90);veRender()};
  const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
  window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
}
async function veOpen(ctx){
  veContext=ctx;veSelected=null;
  const saved=await veGet(veKey(ctx)).catch(()=>null);
  veItems=saved?.items||[];
  if(!veItems.length && ctx.kind==="edit"){
    let src=null;
    const blob=await idbGet(ctx.key).catch(()=>null);
    if(blob)src=await veFileData(blob);
    else{
      const e=itemByKey(ctx.key); if(e)src=completedPath(e);
    }
    if(src)veItems=[veMake("image",{src,x:8,y:8,w:60,h:75})];
  }
  $("#visualEditorModal").hidden=false;veRender();
}

["veX","veY","veW","veH","veR","veStroke"].forEach(id=>$("#"+id)?.addEventListener("input",()=>{
  const it=veItems.find(x=>x.id===veSelected);if(!it)return;
  const m={veX:"x",veY:"y",veW:"w",veH:"h",veR:"r",veStroke:"stroke"};it[m[id]]=Number($("#"+id).value);veRender();
}));
async function veExportPNG(){
  const st=veStage(),W=2200,H=Math.round(W/2.11238),canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
  const c=canvas.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,W,H);
  for(const it of veItems){
    c.save();const x=it.x/100*W,y=it.y/100*H,w=it.w/100*W,h=it.h/100*H;c.translate(x+w/2,y+h/2);c.rotate((it.r||0)*Math.PI/180);if(it.flipH)c.scale(-1,1);
    if(it.type==="image"){
      const im=await new Promise((res,rej)=>{const q=new Image();q.onload=()=>res(q);q.onerror=rej;q.src=it.src});
      const scale=Math.min(w/im.width,h/im.height),dw=im.width*scale,dh=im.height*scale;c.drawImage(im,-dw/2,-dh/2,dw,dh);
    }else if(it.type==="thickArrow"){
      c.fillStyle="#e00000";
      const pts=[[-w/2,-h*.25],[w*.20,-h*.25],[w*.20,-h*.50],[w/2,0],[w*.20,h*.50],[w*.20,h*.25],[-w/2,h*.25]];
      c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();
    }else if(it.type==="curvedArrow"){
      c.fillStyle="#e00000";
      c.beginPath();
      c.moveTo(-w*.43,h*.32);
      c.bezierCurveTo(-w*.42,-h*.18,-w*.12,-h*.47,w*.18,-h*.36);
      c.bezierCurveTo(w*.28,-h*.33,w*.36,-h*.27,w*.42,-h*.20);
      c.lineTo(w*.48,-h*.39);
      c.lineTo(w*.50,-h*.04);
      c.lineTo(w*.24,-h*.12);
      c.lineTo(w*.34,-h*.20);
      c.bezierCurveTo(w*.29,-h*.24,w*.23,-h*.27,w*.16,-h*.29);
      c.bezierCurveTo(-w*.08,-h*.37,-w*.31,-h*.14,-w*.32,h*.33);
      c.bezierCurveTo(-w*.32,h*.41,-w*.36,h*.46,-w*.39,h*.46);
      c.bezierCurveTo(-w*.42,h*.46,-w*.44,h*.40,-w*.43,h*.32);
      c.closePath();c.fill();
    }else if(it.type==="uTurnArrow"){
      c.strokeStyle="#e00000";c.fillStyle="#e00000";c.lineWidth=(it.stroke||7)*2;c.lineCap="round";c.lineJoin="round";
      c.beginPath();
      c.moveTo(-w*.36,h*.40);
      c.lineTo(-w*.36,0);
      c.bezierCurveTo(-w*.36,-h*.44,-w*.10,-h*.50,0,-h*.50);
      c.bezierCurveTo(w*.10,-h*.50,w*.36,-h*.44,w*.36,0);
      c.lineTo(w*.36,h*.18);
      c.stroke();
      c.beginPath();
      c.moveTo(w*.36,h*.42);
      c.lineTo(w*.18,h*.12);
      c.lineTo(w*.54,h*.12);
      c.closePath();c.fill();
    }else if(it.type==="line"||it.type==="arrow"||it.type==="doubleArrow"){
      c.strokeStyle="#e00000";c.fillStyle="#e00000";c.lineWidth=(it.stroke||3)*2;
      const leftPad=it.type==="doubleArrow"?22:0;
      const rightPad=(it.type==="arrow"||it.type==="doubleArrow")?22:0;
      c.beginPath();c.moveTo(-w/2+leftPad,0);c.lineTo(w/2-rightPad,0);c.stroke();
      if(it.type==="arrow"||it.type==="doubleArrow"){
        c.beginPath();c.moveTo(w/2,0);c.lineTo(w/2-28,-16);c.lineTo(w/2-28,16);c.closePath();c.fill();
      }
      if(it.type==="doubleArrow"){
        c.beginPath();c.moveTo(-w/2,0);c.lineTo(-w/2+28,-16);c.lineTo(-w/2+28,16);c.closePath();c.fill();
      }
    }else if(it.type==="rect"){
      c.strokeStyle="#e00000";c.lineWidth=(it.stroke||3)*2;c.strokeRect(-w/2+3,-h/2+3,w-6,h-6);
    }else if(it.type==="ellipse"){
      c.strokeStyle="#e00000";c.lineWidth=(it.stroke||3)*2;c.beginPath();c.ellipse(0,0,w/2-3,h/2-3,0,0,Math.PI*2);c.stroke();
    }else if(it.type==="text"){
      c.fillStyle="#e00000";c.font=`700 ${Math.max(18,Math.round(h*.42))}px sans-serif`;c.textAlign="center";c.textBaseline="middle";c.fillText(it.text||"",0,0,w);
    } c.restore();
  }
  return await new Promise(res=>canvas.toBlob(res,"image/png",0.96));
}



function tsocShowQrStatus(inputId, containerId){
  const input=$(inputId), host=$(containerId);
  if(!input||!host)return;
  let badge=host.querySelector(".qr-preview-badge");
  if(!badge){badge=document.createElement("div");badge.className="qr-preview-badge hint";host.appendChild(badge);}
  badge.textContent=input.files?.[0] ? `QR画像：${input.files[0].name}` : "";
}
$("#fQrImage")?.addEventListener("change",()=>tsocShowQrStatus("#fQrImage","#previewImage"));
$("#nQrImage")?.addEventListener("change",()=>tsocShowQrStatus("#nQrImage","#newPreviewImage"));


/* ===== Rebuild4: robust editor event initialization ===== */
function initVisualEditorControls(){
  const bind=(el,event,fn)=>{
    if(!el)return;
    const key=`veBound${event}`;
    if(el.dataset[key])return;
    el.dataset[key]="1";
    el.addEventListener(event,fn);
  };

  bind($("#editVisualEditorBtn"),"click",()=>{ if(currentEditId) veOpen({kind:"edit",key:currentEditId}); });
  bind($("#newVisualEditorBtn"),"click",()=>{
    const name=$("#nName")?.value.trim();
    if(!name){
      alert("先に「運動名」を入力してください。\n\n画像レイアウトは運動名を入力した後に作成できます。");
      $("#nName")?.focus();
      return;
    }
    veOpen({kind:"new"});
  });
  bind($("#visualEditorCloseBtn"),"click",()=>$("#visualEditorModal").hidden=true);
  bind($("#veCancel"),"click",()=>$("#visualEditorModal").hidden=true);

  bind($("#veAddImage"),"change",async ev=>{
    const files=[...(ev.target.files||[])];
    if(!files.length)return;
    for(const f of files){
      const src=await veFileData(f);
      veItems.push(veMake("image",{src,x:8+(veItems.length%5)*4,y:8+(veItems.length%5)*4,w:40,h:55}));
    }
    ev.target.value="";
    veSelected=veItems.at(-1)?.id||null;
    veRender();
  });

  document.querySelectorAll("[data-ve-add]").forEach(b=>bind(b,"click",()=>{
    const it=veMake(b.dataset.veAdd);
    veItems.push(it);veSelected=it.id;veRender();
  }));

  bind($("#veRecover"),"click",()=>{const it=veItems.find(x=>x.id===veSelected);if(!it)return;it.x=veClamp(it.x,0,Math.max(0,100-it.w));it.y=veClamp(it.y,0,Math.max(0,100-it.h));veRender()});
  bind($("#veDelete"),"click",()=>{if(!veSelected)return;veItems=veItems.filter(x=>x.id!==veSelected);veSelected=null;veRender()});
  bind($("#veFront"),"click",()=>{const i=veItems.findIndex(x=>x.id===veSelected);if(i<0)return;veItems.push(veItems.splice(i,1)[0]);veRender()});
  bind($("#veBack"),"click",()=>{const i=veItems.findIndex(x=>x.id===veSelected);if(i<0)return;veItems.unshift(veItems.splice(i,1)[0]);veRender()});
  bind($("#veRotate90"),"click",()=>{const it=veItems.find(x=>x.id===veSelected);if(!it)return;it.r=((it.r||0)+90)%360;veRender()});
  bind($("#veFlipH"),"click",()=>{const it=veItems.find(x=>x.id===veSelected);if(!it)return;it.flipH=!it.flipH;veRender()});

  ["veX","veY","veW","veH","veR","veStroke"].forEach(id=>bind($("#"+id),"input",()=>{
    const it=veItems.find(x=>x.id===veSelected);if(!it)return;
    const m={veX:"x",veY:"y",veW:"w",veH:"h",veR:"r",veStroke:"stroke"};
    it[m[id]]=Number($("#"+id).value);veRender();
  }));
  bind($("#veText"),"input",()=>{const it=veItems.find(x=>x.id===veSelected);if(it){it.text=$("#veText").value;veRender()}});

  bind($("#veApply"),"click",async()=>{
    if(!veItems.length){alert("画像または図形を1つ以上配置してください。");return;}
    const key=veKey(veContext);
    await vePut(key,{items:veItems,updatedAt:new Date().toISOString()});
    const png=await veExportPNG();
    if(veContext.kind==="edit"){
      await idbPut(veContext.key,png);
      await updateEditPreview();
    }else{
      await idbPut(key,png);
      window._tsocNewEditorImageKey=key;
      const box=$("#newPreviewImage");
      if(box){
        const url=URL.createObjectURL(png);
        box.innerHTML=`<img src="${url}" alt="">`;
      }
    }
    $("#visualEditorModal").hidden=true;
    if(veContext?.kind==="new"){
      $("#newModal").hidden=false;
      const note=document.createElement("div");
      note.className="hint editor-saved-note";
      note.textContent="画像レイアウト保存済み";
      const old=$("#newModal .editor-saved-note"); if(old)old.remove();
      $("#newVisualEditorBtn")?.insertAdjacentElement("afterend",note);
    }else{
      $("#editModal").hidden=false;
    }
    alert("画像レイアウトを保存しました。");
  });
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",initVisualEditorControls,{once:true});
}else{
  initVisualEditorControls();
}


/* ===== Rebuild9 administrator settings ===== */
function parsePresetNumbers(text){
  return [...new Set(String(text||"").split(/[,、\s]+/).map(x=>Number(x)).filter(x=>Number.isFinite(x)&&x>0))].sort((a,b)=>a-b);
}
function runtimeSettings(){
  try{return JSON.parse(localStorage.getItem(RUNTIME_SETTINGS_KEY)||"{}")}catch{return {}}
}
function renderCustomCategoryList(){
  const box=$("#customCategoryList"); if(!box)return;
  box.innerHTML="";
  if(!customCategories.length){
    box.innerHTML='<span class="hint">追加カテゴリーはありません。</span>';
    return;
  }
  customCategories.forEach(c=>{
    const chip=document.createElement("span");chip.className="settings-chip";
    const name=document.createElement("span");name.textContent=c;chip.appendChild(name);
    const del=document.createElement("button");del.type="button";del.textContent="×";del.title="削除";
    del.onclick=()=>{
      const used=allExercises().some(e=>(e.categories||[]).includes(c));
      if(used){alert(`「${c}」は運動に使用中のため削除できません。\\n先に対象運動のカテゴリー設定を変更してください。`);return}
      if(!confirm(`カテゴリー「${c}」を削除しますか？`))return;
      customCategories=customCategories.filter(x=>x!==c);
      localStorage.setItem(CUSTOM_CATEGORY_KEY,JSON.stringify(customCategories));
      renderCustomCategoryList();normalizeCategoryOrder();renderCategoryOrderList();setupCategoryFilters();
    };
    chip.appendChild(del);box.appendChild(chip);
  });
}
function openAdminSettings(){
  const modal=$("#adminSettingsModal");
  if(modal){modal.hidden=false;modal.style.display="block";}
  const s=runtimeSettings();
  $("#repPresetInput").value=(s.rep_values||[1,2,3,4,5,6,7,8,9,10,20,30,40,60]).join(",");
  $("#secondPresetInput").value=(s.second_values||[1,2,3,4,5,6,7,8,9,10,20,30,40,60]).join(",");
  $("#setPresetInput").value=(s.set_values||[1,2,3,4,5,6,7,8,9,10]).join(",");
  $("#currentAdminPassword").value="";
  $("#newAdminPassword").value="";
  $("#confirmAdminPassword").value="";
  $("#passwordChangeMessage").textContent="";
  renderCustomCategoryList();
  if(typeof renderCategoryOrderList==="function") renderCategoryOrderList();
}

function closeAdminSettings(){
  const modal=$("#adminSettingsModal");
  if(!modal)return;
  modal.hidden=true;
  modal.style.display="none";
}

$("#adminSettingsBtn")?.addEventListener("click",openAdminSettings);
document.querySelectorAll("[data-close-settings]").forEach(x=>x.addEventListener("click",closeAdminSettings));
$("#closeAdminSettingsBtn")?.addEventListener("click",closeAdminSettings);

$("#addCategoryBtn")?.addEventListener("click",()=>{
  const input=$("#newCategoryName");
  const name=input.value.trim();
  if(!name){alert("カテゴリー名を入力してください。");return}
  if(allCategoryChoices().includes(name)){alert("同じカテゴリー名が既にあります。");return}
  customCategories.push(name);
  customCategories=[...new Set(customCategories.map(categoryDisplayName))];
  localStorage.setItem(CUSTOM_CATEGORY_KEY,JSON.stringify(customCategories));
  input.value="";
  renderCustomCategoryList();
  normalizeCategoryOrder();
  renderCategoryOrderList();
  setupCategoryFilters();
  alert(`カテゴリー「${name}」を追加しました。`);
});

$("#savePresetBtn")?.addEventListener("click",()=>{
  const reps=parsePresetNumbers($("#repPresetInput").value);
  const seconds=parsePresetNumbers($("#secondPresetInput").value);
  const sets=parsePresetNumbers($("#setPresetInput").value);
  if(!reps.length||!seconds.length||!sets.length){
    alert("回・秒・セットは、それぞれ1つ以上の数値を入力してください。");
    return;
  }
  localStorage.setItem(RUNTIME_SETTINGS_KEY,JSON.stringify({
    rep_values:reps,second_values:seconds,set_values:sets,updatedAt:new Date().toISOString()
  }));
  alert("プリセットを保存しました。\\n選択画面を開くと新しい設定が反映されます。");
});

$("#changeAdminPasswordBtn")?.addEventListener("click",async()=>{
  const cur=$("#currentAdminPassword").value;
  const next=$("#newAdminPassword").value;
  const confirmPw=$("#confirmAdminPassword").value;
  const msg=$("#passwordChangeMessage");
  if(next!==confirmPw){msg.textContent="新しいパスワードが一致しません。";return}
  const result=await TSOC_ADMIN_AUTH.changePassword(cur,next);
  msg.textContent=result.message;
  if(result.ok){
    $("#currentAdminPassword").value="";
    $("#newAdminPassword").value="";
    $("#confirmAdminPassword").value="";
    alert("管理者パスワードを変更しました。");
    closeAdminSettings();
  }
});

$("#adminLogoutBtn")?.addEventListener("click",()=>{
  TSOC_ADMIN_AUTH.logout();
  location.href="index.html";
});

document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && !$("#adminSettingsModal")?.hidden){
    closeAdminSettings();
  }
});


/* ===== Rebuild12 display-order controls ===== */
function persistCategoryOrder(){
  localStorage.setItem(CATEGORY_ORDER_KEY,JSON.stringify(categoryOrder));
}
function persistExerciseOrder(){
  localStorage.setItem(EXERCISE_ORDER_KEY,JSON.stringify(exerciseOrder));
}

function renderCategoryOrderList(){
  const box=$("#categoryOrderList"); if(!box)return;
  normalizeCategoryOrder();
  box.innerHTML="";
  categoryOrder.forEach((name,i)=>{
    const row=document.createElement("div");row.className="order-row";
    row.innerHTML=`<span class="order-no">${i+1}</span><span class="order-name"></span>
      <div class="order-actions">
        <button type="button" data-cat-rename="1">修正</button>
        <button type="button" data-cat-move="-1" ${i===0?"disabled":""}>▲</button>
        <button type="button" data-cat-move="1" ${i===categoryOrder.length-1?"disabled":""}>▼</button>
      </div>`;
    row.querySelector(".order-name").textContent=name;
    row.querySelector("[data-cat-rename]")?.addEventListener("click",()=>{
      const next=prompt("カテゴリー名を修正してください。",name);
      if(next===null)return;
      const newName=next.trim();
      if(!newName){alert("カテゴリー名は空欄にできません。");return}
      if(newName===name)return;
      if(allCategoryChoices().includes(newName)){alert("同じカテゴリー名が既にあります。");return}

      // Base category aliases and previously renamed aliases
      Object.keys(categoryAliases).forEach(k=>{if(categoryDisplayName(k)===name)categoryAliases[k]=newName});
      if(allBaseCategories.includes(name))categoryAliases[name]=newName;

      // Custom categories
      customCategories=customCategories.map(c=>categoryDisplayName(c)===name?newName:categoryDisplayName(c));
      customCategories=[...new Set(customCategories)];
      localStorage.setItem(CUSTOM_CATEGORY_KEY,JSON.stringify(customCategories));

      // Drafts / newly added exercises
      Object.values(drafts).forEach(d=>{if(Array.isArray(d.categories))d.categories=d.categories.map(c=>categoryDisplayName(c)===name?newName:categoryDisplayName(c))});
      newItems=newItems.map(e=>({...e,categories:(e.categories||[]).map(c=>categoryDisplayName(c)===name?newName:categoryDisplayName(c))}));
      localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));
      localStorage.setItem(NEW_KEY,JSON.stringify(newItems));

      // Published local snapshots
      Object.values(pubState).forEach(p=>{if(p?.data && Array.isArray(p.data.categories))p.data.categories=p.data.categories.map(c=>categoryDisplayName(c)===name?newName:categoryDisplayName(c))});
      persistPub();

      // Order and alias persistence
      categoryOrder=categoryOrder.map(c=>categoryDisplayName(c)===name?newName:categoryDisplayName(c));
      categoryAliases[name]=newName;
      localStorage.setItem(CATEGORY_ALIAS_KEY,JSON.stringify(categoryAliases));
      persistCategoryOrder();

      renderCustomCategoryList();
      renderCategoryOrderList();
      setupCategoryFilters();
      render();
      alert(`カテゴリー名を「${name}」から「${newName}」へ変更しました。`);
    });
    row.querySelectorAll("[data-cat-move]").forEach(b=>b.addEventListener("click",()=>{
      const d=Number(b.dataset.catMove),j=i+d;
      if(j<0||j>=categoryOrder.length)return;
      [categoryOrder[i],categoryOrder[j]]=[categoryOrder[j],categoryOrder[i]];
      persistCategoryOrder();
      renderCategoryOrderList();
      setupCategoryFilters();
      const note=$("#categoryOrderSavedNote");
      if(note){note.textContent="保存済み";setTimeout(()=>{note.textContent=""},1200);}
    }));
    box.appendChild(row);
  });
}

function renderExerciseOrderList(){
  normalizeExerciseOrder();
  const box=$("#exerciseOrderList"); if(!box)return;
  const q=($("#exerciseOrderSearch")?.value||"").trim().toLowerCase();
  const map=new Map(allExercises().map(e=>[e.id,e]));
  const visibleIds=exerciseOrder.filter(id=>{
    const e=map.get(id); if(!e)return false;
    return !q || `${e.id} ${e.name}`.toLowerCase().includes(q);
  });
  box.innerHTML="";
  visibleIds.forEach(id=>{
    const e=map.get(id),absoluteIndex=exerciseOrder.indexOf(id);
    const item=document.createElement("div");item.className="exercise-order-item";
    item.innerHTML=`<span class="order-no">${absoluteIndex+1}</span><span class="order-id"></span><span class="order-name"></span>
      <div class="order-actions">
        <button type="button" data-order-action="top" title="上端へ" ${absoluteIndex===0?"disabled":""}>⇈</button>
        <button type="button" data-order-action="up" title="1つ上へ" ${absoluteIndex===0?"disabled":""}>▲</button>
        <button type="button" data-order-action="down" title="1つ下へ" ${absoluteIndex===exerciseOrder.length-1?"disabled":""}>▼</button>
        <button type="button" data-order-action="bottom" title="下端へ" ${absoluteIndex===exerciseOrder.length-1?"disabled":""}>⇊</button>
      </div>`;
    item.querySelector(".order-id").textContent=e.id;
    item.querySelector(".order-name").textContent=e.name||"";
    item.querySelectorAll("[data-order-action]").forEach(b=>b.addEventListener("click",()=>{
      const cur=exerciseOrder.indexOf(id); if(cur<0)return;
      const action=b.dataset.orderAction;
      let target=cur;
      if(action==="up")target=Math.max(0,cur-1);
      if(action==="down")target=Math.min(exerciseOrder.length-1,cur+1);
      if(action==="top")target=0;
      if(action==="bottom")target=exerciseOrder.length-1;
      if(target===cur)return;
      exerciseOrder.splice(cur,1);
      exerciseOrder.splice(target,0,id);
      persistExerciseOrder();
      renderExerciseOrderList();
      render();
    }));
    box.appendChild(item);
  });
}
function openDisplayOrder(){
  normalizeExerciseOrder();
  $("#exerciseOrderSearch").value="";
  renderExerciseOrderList();
  $("#displayOrderModal").hidden=false;
  $("#displayOrderModal").style.display="block";
}
function closeDisplayOrder(){
  const m=$("#displayOrderModal");if(!m)return;
  m.hidden=true;m.style.display="none";
}
$("#displayOrderBtn")?.addEventListener("click",openDisplayOrder);
document.querySelectorAll("[data-close-order]").forEach(x=>x.addEventListener("click",closeDisplayOrder));
$("#closeDisplayOrderBtn")?.addEventListener("click",closeDisplayOrder);
$("#exerciseOrderSearch")?.addEventListener("input",renderExerciseOrderList);
$("#resetExerciseOrderBtn")?.addEventListener("click",()=>{
  if(!confirm("運動の表示順を初期順に戻しますか？"))return;
  exerciseOrder=allExercises().map(e=>e.id);
  persistExerciseOrder();
  renderExerciseOrderList();render();
});

document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && !$("#displayOrderModal")?.hidden)closeDisplayOrder();
});
