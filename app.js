const STATES = ["тревога","грусть","злость","недовольство","страх","спокойствие","радость","стыд","нейтрально","никак"];
const NEEDS  = ["тишина","объятия","поговорить","помощь","присутствие"];
const BOUNDS = ["только_тишина","не_трогать","можно_обнять","позвони","напомни_дышать"];

const API = "/.netlify/functions";

// 👉 ВСТАВЬ СЮДА OneSignal App ID:
const ONESIGNAL_APP_ID = "cdb677ec-6732-47d8-9452-483603d3264e";

function $(id){ return document.getElementById(id); }
function setMsg(id, text, ok=true){
  const el = $(id);
  el.textContent = text;
  el.className = "small " + (ok ? "ok" : "err");
}
function uuid(){
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c=>{
    const r = Math.random()*16|0, v = c==="x"?r:(r&0x3|0x8);
    return v.toString(16);
  });
}
function getCid(){
  let cid = localStorage.getItem("cid");
  if(!cid){ cid = uuid(); localStorage.setItem("cid", cid); }
  return cid;
}
async function apiCall(fn, body){
  const r = await fetch(`${API}/${fn}`, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({ cid: getCid(), ...body })
  });
  return r.json();
}
function renderButtons(containerId, arr, onPick){
  const c = $(containerId);
  c.innerHTML = "";
  arr.forEach(v => {
    const b = document.createElement("button");
    b.textContent = v.replaceAll("_"," ");
    b.onclick = () => onPick(v);
    c.appendChild(b);
  });
}

let chosen = { state:null, need:null, bound:null };

async function enablePush(){
  setMsg("pushStatus","Запрашиваю уведомления…");

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      notifyButton: { enable: false },
      allowLocalhostAsSecureOrigin: true
    });

    const permission = await OneSignal.Notifications.permission;
    if (permission !== "granted") await OneSignal.Notifications.requestPermission();

    const onesignalId = await OneSignal.User.PushSubscription.id;
    if (!onesignalId){
      setMsg("pushStatus","Не получил subscription id. На iPhone нужно запускать как PWA с Дом.экрана.", false);
      return;
    }

    const res = await apiCall("register", { onesignalId });
    setMsg("pushStatus", res.ok ? "Уведомления включены ✅" : (res.error||"Ошибка"), !!res.ok);
  });
}

async function boot(){
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");

  renderButtons("states", STATES, v=>{ chosen.state=v; setMsg("sendStatus","Состояние: "+v); });
  renderButtons("needs", NEEDS, v=>{ chosen.need=v; });
  renderButtons("bounds", BOUNDS, v=>{ chosen.bound=v; });

  $("scale").addEventListener("input", e => $("scaleVal").textContent = e.target.value);

  $("saveName").onclick = async () => {
    const name = $("name").value.trim();
    const r = await apiCall("setName", { name });
    setMsg("pairStatus", r.ok ? "Имя сохранено ✅" : (r.error||"Ошибка"), !!r.ok);
  };

  $("enablePush").onclick = enablePush;

  $("makeCode").onclick = async () => {
    const r = await apiCall("makeCode", {});
    if(r.ok){ $("pairCode").value = r.code; setMsg("pairStatus","Код создан ✅ Отправь партнёру: "+r.code); }
    else setMsg("pairStatus", r.error||"Ошибка", false);
  };

  $("joinCode").onclick = async () => {
    const code = $("pairCode").value.trim().toUpperCase();
    const r = await apiCall("joinCode", { code });
    setMsg("pairStatus", r.ok ? "Связано ✅" : (r.error||"Ошибка"), !!r.ok);
  };

  $("saveProfile").onclick = async () => {
    const say = $("say").value.trim();
    const todo = $("todo").value.trim();
    const r = await apiCall("setProfile", { say, todo });
    setMsg("profileStatus", r.ok ? "Анкета сохранена ✅" : (r.error||"Ошибка"), !!r.ok);
  };

  $("showProfile").onclick = async () => {
    const r = await apiCall("getProfile", {});
    if(r.ok){
      $("say").value  = r.profile.say || "";
      $("todo").value = r.profile.todo || "";
      setMsg("profileStatus","Загружено ✅");
    } else setMsg("profileStatus", r.error||"Ошибка", false);
  };

  $("clearProfile").onclick = async () => {
    const r = await apiCall("clearProfile", {});
    setMsg("profileStatus", r.ok ? "Удалено ✅" : (r.error||"Ошибка"), !!r.ok);
  };

  $("sendMood").onclick = async () => {
    if(!chosen.state) return setMsg("sendStatus","Сначала выбери состояние", false);
    const r = await apiCall("sendMood", {
      state: chosen.state,
      scale: Number($("scale").value),
      need: chosen.need,
      bound: chosen.bound,
      comment: $("comment").value.trim()
    });
    setMsg("sendStatus", r.ok ? "Отправлено ✅" : (r.error||"Ошибка"), !!r.ok);
  };
}

boot();
