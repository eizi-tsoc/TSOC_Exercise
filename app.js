const DATA=window.TSOC_EXERCISE_DATA;
const state={category:'ALL',search:'',selected:[]};
const ORDER=new Map(DATA.exercises.map((e,i)=>[e.id,i]));
const $=s=>document.querySelector(s); const byId=id=>DATA.exercises.find(x=>x.id===id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function init(){
  DATA.categories.forEach(c=>{const b=document.createElement('button');b.className='nav';b.textContent=c;b.onclick=()=>setCategory(c);$('#categoryNav').appendChild(b)});
  $('#search').oninput=e=>{state.search=e.target.value.trim().toLowerCase();renderGrid()};
  $('#clearBtn').onclick=()=>{state.selected=[];renderAll()}; $('#previewBtn').onclick=showPreview; $('#printBtn').onclick=printMenu;
  $('#closePreview').onclick=()=>$('#previewBackdrop').classList.add('hidden'); $('#previewPrint').onclick=printMenu; renderAll();
}
function setCategory(c){state.category=c;document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',(c==='ALL'&&b.dataset.cat==='ALL')||b.textContent===c));renderGrid()}
function selectedId(id){return state.selected.find(x=>x.id===id)}
function toggle(id){const i=state.selected.findIndex(x=>x.id===id);if(i>=0)state.selected.splice(i,1);else{if(state.selected.length>=DATA.max_selection){notice('選択できる運動は最大8種目です。');return}state.selected.push({id,reps:'',unit:'回',sets:''});state.selected.sort((a,b)=>ORDER.get(a.id)-ORDER.get(b.id))}renderAll()}
function notice(t){const n=$('#notice');n.textContent=t;n.classList.remove('hidden');setTimeout(()=>n.classList.add('hidden'),2500)}
function filtered(){return DATA.exercises.filter(e=>(state.category==='ALL'||e.categories.includes(state.category))&&(!state.search||(`${e.name} ${e.purpose} ${e.description}`).toLowerCase().includes(state.search)))}
function transformStyle(t){const sx=t?.flipH?-1:1,sy=t?.flipV?-1:1,r=t?.rotate||0;return `transform:rotate(${r}deg) scaleX(${sx}) scaleY(${sy});`}
function imageMarkup(e,cls=''){return e.images.length?`<div class="photo-layout ${cls}">${e.images.map((src,i)=>`<div class="photo-item"><img loading="lazy" src="${src}" alt="" style="${transformStyle(e.image_transforms?.[i])}"></div>`).join('')}</div>`:`<div class="no-photo">画像なし</div>`}
function categoryTag(e){return e.categories.map(c=>`<span class="tag">${esc(c)}</span>`).join('')}
function renderGrid(){const g=$('#exerciseGrid');g.innerHTML='';filtered().forEach(e=>{const card=document.createElement('article');card.className='exercise-card'+(selectedId(e.id)?' selected':'');card.innerHTML=`${imageMarkup(e)}<div class="card-body"><div class="tags">${categoryTag(e)}</div><h3 class="card-title">${esc(e.name)}</h3><p class="purpose">${esc(e.purpose)}</p><div class="description">${esc(e.description)}</div></div>`;card.onclick=()=>toggle(e.id);g.appendChild(card)})}
function renderSelection(){const box=$('#selectionList');box.innerHTML='';state.selected.forEach((s,idx)=>{const e=byId(s.id),d=document.createElement('div');d.className='selection-item';d.innerHTML=`<div class="sel-row"><span>${idx+1}.</span><strong>${esc(e.name)}</strong><button class="remove" aria-label="削除">×</button></div><div class="dose"><input class="reps" inputmode="numeric" placeholder="回数/時間" value="${esc(s.reps)}"><select class="unit"><option ${s.unit==='回'?'selected':''}>回</option><option ${s.unit==='秒'?'selected':''}>秒</option></select><input class="sets" inputmode="numeric" placeholder="セット" value="${esc(s.sets)}"></div>`;d.querySelector('.remove').onclick=()=>{state.selected.splice(idx,1);renderAll()};d.querySelector('.reps').oninput=x=>s.reps=x.target.value;d.querySelector('.unit').onchange=x=>s.unit=x.target.value;d.querySelector('.sets').oninput=x=>s.sets=x.target.value;box.appendChild(d)});$('#count').textContent=state.selected.length}
function renderAll(){renderGrid();renderSelection()}
function doseText(s){let t='';if(s.reps)t+=`${s.reps}${s.unit}`;if(s.sets)t+=(t?' × ':'')+`${s.sets}セット`;return t}
function exercisePrintCard(s,idx){const e=byId(s.id);return `<article class="print-ex"><div class="print-title"><span class="print-label">種目：</span><strong>${esc(e.name)}</strong></div><div class="print-purpose-row"><div class="print-purpose">${esc(e.purpose)}</div><div class="print-dose">${esc(doseText(s))}</div></div><div class="print-media">${imageMarkup(e,'print-images')}</div><div class="print-description">${esc(e.description)}</div></article>`}
function buildPrintHTML(){const patient=$('#patientName').value.trim(),pages=[];for(let i=0;i<state.selected.length;i+=4)pages.push(state.selected.slice(i,i+4));return pages.map((page,pi)=>`<section class="print-page"><header class="print-head"><div class="print-brand">TSOC_エクササイズパンフレット</div><div class="print-patient"><span>氏名</span><strong>${esc(patient)}</strong><span>患者様</span></div></header><div class="print-grid">${page.map((s,j)=>exercisePrintCard(s,pi*4+j)).join('')}</div><footer>Copyright © 2023 TSOC. All Rights Reserved.</footer></section>`).join('')}
function ensureSelection(){if(!state.selected.length){notice('運動を選択してください。');return false}return true}
function showPreview(){if(!ensureSelection())return;$('#previewView').innerHTML=buildPrintHTML();$('#previewBackdrop').classList.remove('hidden')}
function printMenu(){if(!ensureSelection())return;$('#printView').innerHTML=buildPrintHTML();window.print()}
init();