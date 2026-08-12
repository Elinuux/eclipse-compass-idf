(()=>{"use strict";
const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtPct=v=>Number.isFinite(v)?v.toFixed(2).replace(".",",")+" %":"—";
const fmtDeg=v=>Number.isFinite(v)?v.toFixed(1).replace(".",",")+"°":"—";
const fmtClock=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
const fmtShort=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",hour:"2-digit",minute:"2-digit",hour12:false});
const state={lat:null,lon:null,alt:0,accuracy:null,observer:null,eclipse:null,heading:null,headingAcc:null,sun:null,weather:null,weatherUpdated:null};
function notice(t){$("notice").textContent=t;$("notice").classList.add("show")} function clearNotice(){$("notice").classList.remove("show")}
function eventDate(x){return x?.time?.date instanceof Date?x.time.date:null}
function times(){return{begin:eventDate(state.eclipse?.partial_begin),peak:eventDate(state.eclipse?.peak),end:eventDate(state.eclipse?.partial_end)}}
function setPosition(lat,lon,alt=0,accuracy=null,source="manuel"){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180)return notice("Coordonnées invalides.");
 if(typeof Astronomy!=="object")return notice("Le moteur astronomique n’est pas chargé. Recharge la page.");
 state.lat=lat;state.lon=lon;state.alt=Number.isFinite(alt)?alt:0;state.accuracy=accuracy;
 state.observer=new Astronomy.Observer(lat,lon,state.alt);
 try{state.eclipse=Astronomy.SearchLocalSolarEclipse(new Date("2026-08-11T00:00:00Z"),state.observer)}catch(e){console.error(e);notice("Calcul d’éclipse indisponible.");}
 $("locName").textContent=`${lat.toFixed(6)}, ${lon.toFixed(6)}`;
 $("locSub").textContent=source==="GPS"?`GPS ± ${Math.round(accuracy||0)} m`:`Position ${source}`;
 $("status").textContent="Position active • calcul astronomique local";
 requestOrientation();reverseGeocode();fetchWeather();render();
}
function geolocate(){
 clearNotice();requestOrientation();
 if(!window.isSecureContext){notice("Le GPS exige une page HTTPS. Ouvre la version GitHub Pages dans Safari.");return}
 if(!navigator.geolocation){notice("Géolocalisation indisponible dans ce navigateur.");return}
 $("gps").textContent="Localisation…";
 navigator.geolocation.getCurrentPosition(p=>{
  $("gps").textContent="↻ ACTUALISER MA POSITION";
  setPosition(p.coords.latitude,p.coords.longitude,p.coords.altitude||0,p.coords.accuracy,"GPS");
 },e=>{
  $("gps").textContent="📍 RÉESSAYER LE GPS";
  notice(e.code===1?"Localisation refusée. Autorise Safari à utiliser ta position dans Réglages > Confidentialité et sécurité > Service de localisation.":e.code===2?"Position indisponible.":"Le GPS n’a pas répondu à temps.");
 },{enableHighAccuracy:true,timeout:12000,maximumAge:3000});
}
async function requestOrientation(){
 try{
  if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){
   const p=await DeviceOrientationEvent.requestPermission(); if(p!=="granted")return;
  }
  window.removeEventListener("deviceorientation",onOrientation,true);
  window.removeEventListener("deviceorientationabsolute",onOrientation,true);
  window.addEventListener("deviceorientation",onOrientation,true);
  window.addEventListener("deviceorientationabsolute",onOrientation,true);
 }catch(e){console.warn(e)}
}
function onOrientation(e){
 let h=null,a=null;
 if(Number.isFinite(e.webkitCompassHeading)){h=e.webkitCompassHeading;a=Number.isFinite(e.webkitCompassAccuracy)?e.webkitCompassAccuracy:null}
 else if(e.absolute&&Number.isFinite(e.alpha))h=(360-e.alpha)%360;
 if(Number.isFinite(h)){state.heading=h;state.headingAcc=a;renderCompass()}
}
function sunAt(d=new Date()){
 if(!state.observer)return null;
 const eq=Astronomy.Equator("Sun",d,state.observer,true,true);
 const hor=Astronomy.Horizon(d,state.observer,eq.ra,eq.dec,"normal");
 return {az:hor.azimuth,alt:hor.altitude};
}
function obscurationNow(){
 if(!state.observer)return null;
 try{
  const t=times();
  if(!t.begin||!t.end)return 0;
  const n=new Date(); if(n<t.begin||n>t.end)return 0;
  const max=Number.isFinite(state.eclipse?.obscuration)?state.eclipse.obscuration:0;
  if(n<=t.peak){const x=(n-t.begin)/(t.peak-t.begin);return max*clamp(x,0,1)}
  const x=(t.end-n)/(t.end-t.peak);return max*clamp(x,0,1);
 }catch{return null}
}
function render(){
 if(!state.observer||!state.eclipse)return;
 const t=times(),s=sunAt();state.sun=s;
 const current=obscurationNow();
 $("pct").textContent=fmtPct((current??0)*100);
 const max=Number.isFinite(state.eclipse.obscuration)?state.eclipse.obscuration*100:null;
 $("peak").textContent=`Maximum : ${fmtPct(max)} à ${fmtClock.format(t.peak)}`;
 $("begin").textContent="Début "+fmtShort.format(t.begin);$("maxTime").textContent="MAX "+fmtShort.format(t.peak);$("end").textContent="Fin "+fmtShort.format(t.end);
 renderTimeline();renderCompass();renderWeather();
}
function renderTimeline(){
 const t=times();if(!t.begin||!t.end)return;
 const now=Date.now(),p=clamp((now-t.begin)/(t.end-t.begin)*100,0,100);
 $("fill").style.width=p+"%";$("dot").style.left=p+"%";
 $("phase").textContent="Phase : "+(now<t.begin?"avant l’éclipse":now<t.peak?"montante":now<=t.end?"descendante":"terminée");
}
function renderCompass(){
 if(!state.sun)return;
 const az=state.sun.az;
 $("arrow").style.transform=`translate(-50%,-100%) rotate(${az}deg)`;
 $("sunline").textContent=`Soleil : azimut ${fmtDeg(az)} • hauteur ${fmtDeg(state.sun.alt)}`;
 if(!Number.isFinite(state.heading)){
  $("compass").style.transform="rotate(0deg)";$("turn").textContent="Azimut prêt";$("heading").textContent=`Cible ${fmtDeg(az)} • capteur en attente`;return
 }
 $("compass").style.transform=`rotate(${-state.heading}deg)`;
 const d=((az-state.heading+540)%360)-180,ad=Math.abs(d);
 $("turn").textContent=ad<=4?"✓ BONNE DIRECTION":`${d>0?"→":"←"} TOURNE DE ${Math.round(ad)}°`;
 $("turn").classList.toggle("good",ad<=4);
 $("heading").textContent=`Cap ${fmtDeg(state.heading)}${Number.isFinite(state.headingAcc)?" • ±"+Math.round(state.headingAcc)+"°":""}`;
}
async function fetchWeather(){
 if(state.lat===null)return;
 try{
  const q=new URLSearchParams({latitude:state.lat,longitude:state.lon,timezone:"Europe/Paris",hourly:"cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation",forecast_days:"1"});
  const r=await fetch("https://api.open-meteo.com/v1/meteofrance?"+q,{cache:"no-store"});if(!r.ok)throw new Error(r.status);
  state.weather=await r.json();state.weatherUpdated=new Date();renderWeather();
 }catch(e){console.warn(e);$("clear").textContent="Indisponible";$("cloud").textContent="—"}
}
function peakWeather(){
 const t=times();const h=state.weather?.hourly;if(!t.peak||!h?.time?.length)return null;
 let best=0,bd=Infinity;
 h.time.forEach((s,i)=>{const d=Math.abs(new Date(s+":00+02:00")-t.peak);if(d<bd){bd=d;best=i}});
 return{cloud:h.cloud_cover?.[best],low:h.cloud_cover_low?.[best],mid:h.cloud_cover_mid?.[best],high:h.cloud_cover_high?.[best]};
}
function renderWeather(){
 const w=peakWeather();if(!w)return;
 const clear=Number.isFinite(w.cloud)?100-w.cloud:null;
 $("clear").textContent=Number.isFinite(clear)?Math.round(clear)+" %":"—";
 $("clearSub").textContent="*100 − couverture nuageuse totale AROME/ARPEGE. Pas une probabilité.";
 $("cloud").textContent=Number.isFinite(w.cloud)?Math.round(w.cloud)+" %":"—";
 $("layers").textContent=`Bas ${Number.isFinite(w.low)?Math.round(w.low)+" %":"—"} • Moyens ${Number.isFinite(w.mid)?Math.round(w.mid)+" %":"—"} • Hauts ${Number.isFinite(w.high)?Math.round(w.high)+" %":"—"}`;
}
async function reverseGeocode(){
 try{
  const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${state.lat}&lon=${state.lon}&zoom=13&addressdetails=1`,{headers:{"Accept-Language":"fr"}});
  if(r.ok){const j=await r.json();if(j.display_name)$("locName").textContent=j.display_name}
 }catch{}
}
function tick(){
 const now=new Date();$("clock").textContent=fmtClock.format(now);
 if(state.observer){state.sun=sunAt(now);renderCompass();renderTimeline()}
 const t=times();if(t.peak){
  let ms=t.peak-now,past=ms<0;if(past)ms=-ms;const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;
  $("countdown").textContent=(past?"Maximum passé depuis ":"Maximum dans ")+`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
 }
}
function openSheet(title,html){$("sheetTitle").textContent=title;$("sheetBody").innerHTML=html;$("modal").classList.add("open")}
function details(){
 const t=times(),max=Number.isFinite(state.eclipse?.obscuration)?state.eclipse.obscuration*100:null;
 const rows=[["Position",state.lat===null?"—":`${state.lat.toFixed(6)}, ${state.lon.toFixed(6)}`],["Début",t.begin?fmtClock.format(t.begin):"—"],["Maximum",t.peak?fmtClock.format(t.peak):"—"],["Fin",t.end?fmtClock.format(t.end):"—"],["Obscuration max",fmtPct(max)],["Azimut actuel",state.sun?fmtDeg(state.sun.az):"—"],["Hauteur actuelle",state.sun?fmtDeg(state.sun.alt):"—"]];
 openSheet("Mon éclipse",rows.map(r=>`<div class="row"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("")+'<div class="source">L’obscuration courante est une estimation d’affichage entre les contacts et le maximum. Le maximum, les contacts, l’azimut et la hauteur viennent du moteur astronomique.</div>');
}
function sources(){
 openSheet("Sources",`
 <div class="source"><strong>Référence scientifique :</strong> Observatoire de Paris / ÉclipSEOP / IMCCE. <a href="https://eclipseop.obspm.fr/" target="_blank" rel="noopener">ÉclipSEOP</a></div>
 <div class="source"><strong>Calcul embarqué :</strong> Astronomy Engine 2.1.19, précision annoncée ±1 arcminute et vérification contre NOVAS/JPL. <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">Source</a></div>
 <div class="source"><strong>Météo :</strong> modèles Météo-France AROME/ARPEGE via Open‑Meteo.</div>
 <div class="source"><strong>Géographie :</strong> OpenStreetMap/Nominatim pour le nom du lieu.</div>`);
}
$("gps").onclick=geolocate;$("manualToggle").onclick=()=>$("manualBox").classList.toggle("open");
$("manualUse").onclick=()=>{requestOrientation();setPosition(parseFloat($("lat").value.replace(",",".")),parseFloat($("lon").value.replace(",",".")),0,null,"manuelle")};
$("parisTest").onclick=()=>{requestOrientation();notice("Mode test : Paris est une position fictive.");setPosition(48.8566,2.3522,35,null,"fictive")};
$("refreshBtn").onclick=()=>{if(state.lat!==null){fetchWeather();render()}};$("detailsBtn").onclick=details;$("sourcesBtn").onclick=sources;
$("closeBtn").onclick=()=>$("modal").classList.remove("open");$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.remove("open")};
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
if(typeof Astronomy!=="object")notice("Le moteur astronomique n’a pas pu être chargé. Recharge la page avec Internet.");
tick();setInterval(tick,1000);setInterval(()=>{if(state.observer)render()},30000);
})();