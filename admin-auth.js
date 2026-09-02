
window.TSOC_ADMIN_AUTH = (() => {
  const HASH_KEY="tsoc_admin_password_hash_v1";
  const SESSION_KEY="tsoc_admin_auth_session_v1";

  async function sha256(text){
    const data=new TextEncoder().encode(text);
    const buf=await crypto.subtle.digest("SHA-256",data);
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  function isAuthenticated(){ return sessionStorage.getItem(SESSION_KEY)==="1"; }
  async function verify(password){
    const saved=localStorage.getItem(HASH_KEY);
    if(!saved) return password==="admin";
    return (await sha256(password))===saved;
  }
  async function login(password){
    if(await verify(password)){sessionStorage.setItem(SESSION_KEY,"1");return true}
    return false;
  }
  function logout(){ sessionStorage.removeItem(SESSION_KEY); }
  function guard(){
    if(!isAuthenticated()){
      location.replace("admin-login.html");
      return false;
    }
    return true;
  }
  async function changePassword(currentPassword,newPassword){
    if(!(await verify(currentPassword))) return {ok:false,message:"現在のパスワードが違います。"};
    if(!newPassword || newPassword.length<4) return {ok:false,message:"新しいパスワードは4文字以上にしてください。"};
    localStorage.setItem(HASH_KEY,await sha256(newPassword));
    return {ok:true,message:"管理者パスワードを変更しました。"};
  }
  return {login,logout,guard,isAuthenticated,changePassword};
})();
