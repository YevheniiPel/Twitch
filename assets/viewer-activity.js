import {initializeApp,getApps,getApp} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {getDatabase,ref,onValue} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
const WORKER="https://yevheniipel-movie-queue.shinewar06.workers.dev";
const SESSION="yevheniipel_twitch_session";
const app=getApps().length?getApp():initializeApp({apiKey:"AIzaSyBkB1BamCMrPshtejkl23pkRvCa_thJns8",authDomain:"yevheniipel.firebaseapp.com",databaseURL:"https://yevheniipel-default-rtdb.europe-west1.firebasedatabase.app/",projectId:"yevheniipel",storageBucket:"yevheniipel.firebasestorage.app",messagingSenderId:"1062789800045",appId:"1:1062789800045:web:e72c6a2826b699fd579f64"});
const db=getDatabase(app);
const $=id=>document.getElementById(id);
const set=(id,value)=>{if($(id)) $(id).textContent=value;};
const state={user:null,points:null,queue:null,music:null};
let stopPoints=null,authSerial=0;
const time=x=>{const n=Number(x);if(Number.isFinite(n)&&n>0)return n<1e11?n*1000:n;const d=Date.parse(x||"");return Number.isFinite(d)?d:0;};
const owned=x=>state.user&&String(x?.twitchUserId||"")===String(state.user.id);
const cards=$("viewerActivityCards");
function render(){
  const logged=!!state.user;
  $("viewerGuest").hidden=logged;
  $("viewerSignedIn").hidden=!logged;
  if(!logged)return;
  set("viewerGreeting",`Привіт, ${state.user.displayName||state.user.login||state.user.name||"глядачу"}!`);
  set("viewerPoints",state.points===null?"—":Number(state.points).toLocaleString("uk-UA"));
  set("viewerPointsDesc",state.points===null?"Баланс недоступний або ще не синхронізований":"Баланс із бази сайту");
  const items=state.queue?Object.entries(state.queue).map(([id,v])=>({id,...v})).filter(v=>!["watched","cancelled","rejected","completed"].includes(String(v.status||"").toLowerCase())).sort((a,b)=>{const ao=Number(a.order),bo=Number(b.order);if(Number.isFinite(ao)&&Number.isFinite(bo)&&ao!==bo)return ao-bo;return time(a.createdAt)-time(b.createdAt)||a.id.localeCompare(b.id)}):null;
  const index=items?.findIndex(owned)??-1;
  set("viewerMovie",items===null?"Завантаження…":index<0?"Немає в черзі":`№ ${index+1} з ${items.length}`);
  set("viewerMovieDesc",index>=0?(items[index].tmdbTitle||items[index].title||"Твій фільм очікує перегляду"):"Твої замовлення фільмів");
  const tracks=state.music?Object.entries(state.music).map(([id,v])=>({id,...v})).filter(owned).sort((a,b)=>time(b.createdAt)-time(a.createdAt)||b.id.localeCompare(a.id)):null;
  const last=tracks?.[0];
  set("viewerTrack",tracks===null?"Завантаження…":last?(last.title||"YouTube трек"):"Ще немає");
  set("viewerTrackDesc",last?[last.artist,last.status].filter(Boolean).join(" · ")||"Останнє замовлення":"Замов музику на стрімі");
}
function watch(name,path){
  onValue(ref(db,path),snap=>{state[name]=snap.val()||{};render()},err=>{console.warn("Viewer activity read",name,err);state[name]={};render()});
}
watch("queue","queue");watch("music","musicQueue");
async function checkAuth(){
 const serial=++authSerial,token=localStorage.getItem(SESSION);
 if(stopPoints){stopPoints();stopPoints=null;}
 state.user=null;state.points=null;render();
 if(!token)return;
 try{
   const response=await fetch(`${WORKER}/site-auth/me`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   if(!response.ok)throw Error("Session expired");
   const data=await response.json();
   if(serial!==authSerial||localStorage.getItem(SESSION)!==token)return;
   state.user=data.user||null;render();
   if(state.user?.id){
     stopPoints=onValue(ref(db,`users/${state.user.id}/points`),snap=>{state.points=snap.exists()?Number(snap.val()):null;render()},()=>{state.points=null;render()});
   }
 }catch(err){if(serial===authSerial){state.user=null;state.points=null;render();}}
}
$("viewerLogin")?.addEventListener("click",()=>{location.href=`${WORKER}/login/twitch?return=${encodeURIComponent("index.html")}`;});
window.addEventListener("storage",e=>{if(e.key===SESSION)checkAuth()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkAuth()});
setTimeout(checkAuth,0);
