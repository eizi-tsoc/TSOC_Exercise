// TSOC Exercise Rebuild20 - selection refresh after publish
(async()=>{
if(window.TSOC_APPLY_LOCAL_PUBLISHED) await window.TSOC_APPLY_LOCAL_PUBLISHED();
const DATA=window.TSOC_EXERCISE_DATA;
const CONFIG=window.TSOC_EXERCISE_CONFIG||{};

function readLocalOrder(key){
  try{
    const v=JSON.parse(localStorage.getItem(key)||"[]");
    return Array.isArray(v)?v:[];
  }catch{return []}
}
const exOrder=readLocalOrder("tsoc_admin_exercise_order_v1");
if(exOrder.length){
  const pos=new Map(exOrder.map((id,i)=>[id,i]));
  DATA.exercises=[...DATA.exercises].sort((a,b)=>(pos.get(a.id)??999999)-(pos.get(b.id)??999999));
}
const catOrder=readLocalOrder("tsoc_admin_category_order_v1");
if(catOrder.length){
  const pos=new Map(catOrder.map((c,i)=>[c,i]));
  DATA.categories=[...DATA.categories].sort((a,b)=>(pos.get(a)??999999)-(pos.get(b)??999999));
}

const state={category:'ALL',search:'',selected:[],manualOrder:false};
const ORDER=new Map(DATA.exercises.map((e,i)=>[e.id,i]));
const $=s=>document.querySelector(s); const byId=id=>DATA.exercises.find(x=>x.id===id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const repValues=CONFIG.rep_values||CONFIG.dose_values||[1,2,3,4,5,6,7,8,9,10,20,30,40,60];
const secondValues=CONFIG.second_values||CONFIG.dose_values||[1,2,3,4,5,6,7,8,9,10,20,30,40,60];
const setValues=CONFIG.set_values||[1,2,3,4,5,6,7,8,9,10];
const units=CONFIG.dose_units||['回','秒'];
const valuesForUnit=u=>u==='秒'?secondValues:repValues;
function renderCategoryNav(){
  const box=$('#categoryNav');box.innerHTML='';
  DATA.categories.forEach(c=>{const b=document.createElement('button');b.className='nav';b.textContent=c;b.onclick=()=>setCategory(c);box.appendChild(b)});
}
function init(){
  renderCategoryNav();
  const allBtn=document.querySelector('.nav[data-cat="ALL"]');
  if(allBtn) allBtn.onclick=()=>setCategory('ALL');
  $('#search').oninput=e=>{state.search=e.target.value.trim().toLowerCase();renderGrid()};
  $('#clearBtn').onclick=()=>{state.selected=[];state.manualOrder=false;renderAll()}; $('#previewBtn').onclick=showPreview; $('#printBtn').onclick=printMenu;
  $('#closePreview').onclick=()=>$('#previewBackdrop').classList.add('hidden'); $('#previewPrint').onclick=printMenu; renderAll();
}
function setCategory(c){state.category=c;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',(c==='ALL'&&b.dataset.cat==='ALL')||b.textContent===c));renderGrid()}
function selectedId(id){return state.selected.find(x=>x.id===id)}
function toggle(id){
  const i=state.selected.findIndex(x=>x.id===id);
  if(i>=0)state.selected.splice(i,1);
  else{
    if(state.selected.length>=DATA.max_selection){notice('選択できる運動は最大8種目です。');return}
    state.selected.push({id,reps:'',unit:'回',sets:''});
    if(!state.manualOrder)state.selected.sort((a,b)=>ORDER.get(a.id)-ORDER.get(b.id));
  }
  renderAll();
}
function moveSelection(idx,delta){const next=idx+delta;if(next<0||next>=state.selected.length)return;[state.selected[idx],state.selected[next]]=[state.selected[next],state.selected[idx]];state.manualOrder=true;renderSelection();}
function notice(t){const n=$('#notice');n.textContent=t;n.classList.remove('hidden');setTimeout(()=>n.classList.add('hidden'),2500)}
function filtered(){return DATA.exercises.filter(e=>(state.category==='ALL'||e.categories.includes(state.category))&&(!state.search||(`${e.name} ${e.purpose} ${e.description}`).toLowerCase().includes(state.search)))}
function transformStyle(t){const sx=t?.flipH?-1:1,sy=t?.flipV?-1:1,r=t?.rotate||0;return `transform:rotate(${r}deg) scaleX(${sx}) scaleY(${sy});`}
function completedPreviewPath(e){return window.TSOC_PUBLISHED_IMAGE_URLS?.[e.id]||`assets/preview-completed/${String(e.id).toLowerCase()}_completed.png`}
function imageMarkup(e,cls=''){const fallback=e.images.length?`<div class="photo-layout ${cls}">${e.images.map((src,i)=>`<div class="photo-item"><img loading="lazy" src="${src}" alt="" style="${transformStyle(e.image_transforms?.[i])}"></div>`).join('')}</div>`:`<div class="no-photo">画像なし</div>`;return `<div class="completed-preview-wrap ${cls}"><img loading="lazy" class="completed-preview-image" src="${completedPreviewPath(e)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="completed-preview-fallback">${fallback}</div></div>`}
function thumbMarkup(e){const fallback=e.images?.[0];return `<div class="sel-thumb"><img class="completed-thumb" src="${completedPreviewPath(e)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><img class="legacy-thumb" src="${fallback||''}" alt="" style="${fallback?transformStyle(e.image_transforms?.[0]):'display:none'}"></div>`}
function categoryTag(e){return e.categories.map(c=>`<span class="tag">${esc(c)}</span>`).join('')}
function renderGrid(){const g=$('#exerciseGrid');g.innerHTML='';filtered().forEach(e=>{const card=document.createElement('article');card.className='exercise-card'+(selectedId(e.id)?' selected':'');card.innerHTML=`${imageMarkup(e)}<div class="card-body"><div class="tags">${categoryTag(e)}</div><h3 class="card-title">${esc(e.name)}</h3><p class="purpose">${esc(e.purpose)}</p><div class="description">${esc(e.description)}</div></div>`;card.onclick=()=>toggle(e.id);g.appendChild(card)})}
function selectOptions(values,current,blank='－'){return `<option value="">${blank}</option>${values.map(v=>`<option value="${v}" ${String(current)===String(v)?'selected':''}>${v}</option>`).join('')}`}
function renderSelection(){
  const box=$('#selectionList');box.innerHTML='';
  state.selected.forEach((s,idx)=>{const e=byId(s.id),d=document.createElement('div');d.className='selection-item';
    d.innerHTML=`<div class="sel-main">${thumbMarkup(e)}<div class="sel-info"><div class="sel-row"><span class="sel-no">${idx+1}</span><strong>${esc(e.name)}</strong><button class="remove" aria-label="削除">×</button></div><div class="reorder"><button class="move up" title="上へ" ${idx===0?'disabled':''}>▲</button><button class="move down" title="下へ" ${idx===state.selected.length-1?'disabled':''}>▼</button><span>印刷順</span></div></div></div><div class="dose"><label><span>回数/時間</span><select class="reps">${selectOptions(valuesForUnit(s.unit),s.reps)}</select></label><label><span>単位</span><select class="unit">${units.map(u=>`<option ${s.unit===u?'selected':''}>${u}</option>`).join('')}</select></label><label><span>セット</span><select class="sets">${selectOptions(setValues,s.sets)}</select></label></div>`;
    d.querySelector('.remove').onclick=()=>{state.selected.splice(idx,1);renderAll()};
    d.querySelector('.up').onclick=()=>moveSelection(idx,-1); d.querySelector('.down').onclick=()=>moveSelection(idx,1);
    d.querySelector('.reps').onchange=x=>s.reps=x.target.value;d.querySelector('.unit').onchange=x=>{s.unit=x.target.value;s.reps='';renderSelection()};d.querySelector('.sets').onchange=x=>s.sets=x.target.value;box.appendChild(d)});
  $('#count').textContent=state.selected.length;
}
function renderAll(){renderGrid();renderSelection()}
function doseText(s){let t='';if(s.reps)t+=`${s.reps}${s.unit}`;if(s.sets)t+=(t?' × ':'')+`${s.sets}セット`;return t}
function getPrintImageSet(e){const high=Array.isArray(e.print_images)&&e.print_images.length?e.print_images:null;return {images:high||e.images||[],transforms:high?(e.print_image_transforms||[]):(e.image_transforms||[]),highRes:!!high}}
function legacyPrintImages(e){const set=getPrintImageSet(e);return set.images.length?`<div class="print-photo-layout${set.highRes?' high-res':''}">${set.images.map((src,i)=>`<div class="print-photo-item"><img src="${src}" alt="" style="${transformStyle(set.transforms?.[i])}"></div>`).join('')}</div>`:`<div class="print-no-photo">画像なし</div>`}
function completedPrintPath(e){return window.TSOC_PUBLISHED_IMAGE_URLS?.[e.id]||`assets/print-completed/${String(e.id).toLowerCase()}_completed.png`}
function printImages(e){
  const fallback=legacyPrintImages(e);
  return `<div class="print-completed-stack"><img class="print-completed-image" src="${completedPrintPath(e)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="print-completed-fallback">${fallback}</div></div>`;
}
function exercisePrintCard(s){const e=byId(s.id);const qr=e.qr?`<div class="print-qr"><img src="${e.qr}" alt="QR"></div>`:'';return `<article class="print-ex"><div class="print-title"><span>種目：</span><strong>${esc(e.name)}</strong></div><div class="print-purpose-row"><div class="print-purpose">${esc(e.purpose)}</div><div class="print-dose">${esc(doseText(s))}</div></div><div class="print-media"><div class="print-pictures">${printImages(e)}</div>${qr}</div><div class="print-description">${esc(e.description)}</div></article>`}
function emptyPrintSlot(){return `<article class="print-empty"><div class="empty-grid"><div class="empty-logo">TSOC<span>◆</span></div><div class="empty-mark">TSOC</div></div></article>`}
function buildPrintHTML(){
  const patient=$('#patientName').value.trim(),per=CONFIG.print?.exercises_per_page||4,pages=[];
  for(let i=0;i<state.selected.length;i+=per)pages.push(state.selected.slice(i,i+per));
  return pages.map((page,pi)=>{const slots=[...page];while(slots.length<per)slots.push(null);return `<section class="print-page"><header class="print-head"><div class="print-brand">TSOC_エクササイズパンフレット</div><div class="print-patient"><span>氏名</span><strong>${esc(patient)}</strong><span>様</span></div><img class="print-brand-logo" src="assets/branding/tsoc-logo.png" alt="Tokyo Sports & Orthopaedic Clinic"></header><div class="print-grid">${slots.map(s=>s?exercisePrintCard(s):emptyPrintSlot()).join('')}</div><footer>Copyright © 2023 TSOC. All Rights Reserved.</footer></section>`}).join('')
}
function ensureSelection(){if(!state.selected.length){notice('運動を選択してください。');return false}return true}
function showPreview(){if(!ensureSelection())return;$('#previewView').innerHTML=buildPrintHTML();$('#previewBackdrop').classList.remove('hidden')}
function printMenu(){if(!ensureSelection())return;$('#printView').innerHTML=buildPrintHTML();window.print()}
window.addEventListener("storage",e=>{
  if([
    "tsoc_admin_category_order_v1",
    "tsoc_admin_exercise_order_v1",
    "tsoc_admin_phase4_published_v1",
    "tsoc_admin_custom_categories_v1",
    "tsoc_admin_category_aliases_v1"
  ].includes(e.key)){
    location.reload();
  }
});
window.addEventListener("pageshow",e=>{
  /* Rebuild20:
     管理画面で公開・保存した後に「戻る」で選択画面へ戻った場合、
     bfcache の有無にかかわらず最新の localStorage 公開状態を読み直す。
     初回表示では再読み込みしない。 */
  const nav=performance.getEntriesByType?.("navigation")?.[0];
  if(e.persisted || nav?.type==="back_forward") location.reload();
});

init();

})();
