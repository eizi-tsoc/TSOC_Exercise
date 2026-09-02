
(() => {
  const KEY="tsoc_admin_runtime_settings_v1";
  const CUSTOM_CAT_KEY="tsoc_admin_custom_categories_v1";
  let s={};
  try{s=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{}
  const cfg=window.TSOC_EXERCISE_CONFIG||(window.TSOC_EXERCISE_CONFIG={});
  if(Array.isArray(s.rep_values)&&s.rep_values.length)cfg.rep_values=s.rep_values;
  if(Array.isArray(s.second_values)&&s.second_values.length)cfg.second_values=s.second_values;
  if(Array.isArray(s.set_values)&&s.set_values.length)cfg.set_values=s.set_values;
  let custom=[];
  try{custom=JSON.parse(localStorage.getItem(CUSTOM_CAT_KEY)||"[]")}catch{}
  window.TSOC_CUSTOM_CATEGORIES=Array.isArray(custom)?custom:[];
})();

(() => {
  const EXERCISE_ORDER_KEY="tsoc_admin_exercise_order_v1";
  const CATEGORY_ORDER_KEY="tsoc_admin_category_order_v1";
  try{window.TSOC_EXERCISE_ORDER=JSON.parse(localStorage.getItem(EXERCISE_ORDER_KEY)||"[]")}catch{window.TSOC_EXERCISE_ORDER=[]}
  try{window.TSOC_CATEGORY_ORDER=JSON.parse(localStorage.getItem(CATEGORY_ORDER_KEY)||"[]")}catch{window.TSOC_CATEGORY_ORDER=[]}
})();

(() => {
  try{window.TSOC_CATEGORY_ALIASES=JSON.parse(localStorage.getItem("tsoc_admin_category_aliases_v1")||"{}")}catch{window.TSOC_CATEGORY_ALIASES={}}
})();
