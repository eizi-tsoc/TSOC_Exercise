window.TSOC_APPLY_LOCAL_PUBLISHED = async function(){
  const DATA=window.TSOC_EXERCISE_DATA;
  if(!DATA || !Array.isArray(DATA.exercises)) return;

  const PUBLISHED_KEY="tsoc_admin_phase4_published_v1";
  const DB_NAME="tsoc_admin_phase2_images";
  const DB_STORE="images";
  const state=JSON.parse(localStorage.getItem(PUBLISHED_KEY)||"{}");
  let customCategories=[],categoryAliases={},categoryOrder=[];
  try{customCategories=JSON.parse(localStorage.getItem("tsoc_admin_custom_categories_v1")||"[]")}catch{}
  try{categoryAliases=JSON.parse(localStorage.getItem("tsoc_admin_category_aliases_v1")||"{}")}catch{}
  try{categoryOrder=JSON.parse(localStorage.getItem("tsoc_admin_category_order_v1")||"[]")}catch{}
  const catName=c=>{
    let cur=String(c||""),guard=0;
    while(categoryAliases?.[cur] && categoryAliases[cur]!==cur && guard++<10)cur=categoryAliases[cur];
    return cur;
  };
  const mapCats=a=>[...new Set((a||[]).map(catName).filter(Boolean))];
  const map=new Map(DATA.exercises.map(e=>[e.id,{...e,categories:mapCats(e.categories)}]));

  for(const [id,entry] of Object.entries(state)){
    if(entry?.unpublished){ map.delete(id); continue; }
    if(entry?.data) map.set(id,{...entry.data,categories:mapCats(entry.data.categories)});
  }

  DATA.exercises=[...map.values()].filter(e=>!e.hidden);
  const allCats=[...new Set([
    ...DATA.exercises.flatMap(e=>mapCats(e.categories)),
    ...mapCats(customCategories)
  ])];
  const orderPos=new Map((categoryOrder||[]).map(catName).map((c,i)=>[c,i]));
  DATA.categories=allCats.sort((a,b)=>(orderPos.get(a)??999999)-(orderPos.get(b)??999999));

  window.TSOC_PUBLISHED_IMAGE_URLS={};
  window.TSOC_PUBLISHED_QR_URLS={};

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>req.result.createObjectStore(DB_STORE);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function getBlob(key){
    if(!key)return null;
    try{
      const db=await openDB();
      return await new Promise((resolve,reject)=>{
        const r=db.transaction(DB_STORE).objectStore(DB_STORE).get(key);
        r.onsuccess=()=>resolve(r.result||null);
        r.onerror=()=>reject(r.error);
      });
    }catch{return null;}
  }

  for(const [id,entry] of Object.entries(state)){
    if(!entry?.data || entry.data.hidden)continue;
    if(entry.imageKey){
      const blob=await getBlob(entry.imageKey);
      if(blob)window.TSOC_PUBLISHED_IMAGE_URLS[id]=URL.createObjectURL(blob);
    }
    if(entry.qrKey){
      const qrBlob=await getBlob(entry.qrKey);
      if(qrBlob){
        const qrURL=URL.createObjectURL(qrBlob);
        window.TSOC_PUBLISHED_QR_URLS[id]=qrURL;
        const ex=DATA.exercises.find(e=>e.id===id);
        if(ex)ex.qr=qrURL;
      }
    }
  }
};