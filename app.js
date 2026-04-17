const STATES = ["тревога","грусть","злость","недовольство","страх","спокойствие","радость","стыд","нейтрально","никак"];
const NEEDS  = ["тишина","объятия","поговорить","помощь","присутствие"];
const BOUNDS = ["только_тишина","не_трогать","можно_обнять","позвони","напомни_дышать"];

const API = "/.netlify/functions";

// 👉 ВСТАВЬ сюда App ID из OneSignal (ровно строку формата xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
const ONESIGNAL_APP_ID = "PASTE_YOUR_ONESIGNAL_APP_ID_HERE";

function $(id){ return document.getElementById(id); }
function setMsg(id, text, ok=true){
  const el = $(id);
  if(!el) return;
  el.textContent = text;
  el.className = "small " + (ok ? "ok" : "err");
}

// ✅ экранная диагностика: если JS упал — ты увидишь причину прямо в приложении
function installErrorOverlay(){
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#fff;border:1px solid #f99;padding:8px;border-radius:10px;font:12px/1.3 -apple-system,system-ui;display:none;white-space:pre-wrap;max-height:40vh;overflow:auto";
  box.id = "errbox";
  document.body.appendChild(box);

  function show(msg){
    box.style.display = "block";
    box.textContent = "JS ERROR:\n" + msg;
  }
  window.addEventListener("error", (e)=> show(e.message + "\n" + (e.filename||"") + ":" + (e.lineno||"") ));
  window.addEventListener("unhandledrejection", (e)=> show(String(e.reason)));
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
  if(!c) return;
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
  try{
    setMsg("pushStatus","Запрашиваю уведомления…", true);

    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID.includes("PASTE_")) {
      setMsg("pushStatus","Не указан ONESIGNAL_APP_ID в app.js", false);
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
        // ✅ явно укажем воркеры OneSignal
        serviceWorkerPath: "OneSignalSDKWorker.js",
        serviceWorkerUpdaterPath: "OneSignalSDKUpdaterWorker.js",
        serviceWorkerParam: { scope: "/" }
      });

      const perm1 = await OneSignal.Notifications.permission;
      let sid1 = await OneSignal.User.PushSubscription.id;
      setMsg("pushStatus", `permission=${perm1}, subId=${sid1 || "(empty)"}`, perm1 === "granted" && !!sid1);

      if (perm1 !== "granted") {
        await OneSignal.Notifications.requestPermission();
      }

      const perm2 = await OneSignal.Notifications.permission;
      const sid2 = await OneSignal.User.PushSubscription.id;
      setMsg("pushStatus", `after request: permission=${perm2}, subId=${sid2 || "(empty)"}`, perm2 === "granted" && !!sid2);

      if (!sid2) return;

      const res = await apiCall("register", { onesignalId: sid2 });
      setMsg("pushStatus", res.ok ? "Уведомления включены ✅" : (res.error||"Ошибка register"), !!res.ok);
    });
  } catch(e){
    setMsg("pushStatus", "enablePush error: " + String(e), false);
  }
}

function wireButtons(){
  $("saveName").onclick = async () => {
    const name = $("name").value.trim();
    const r = await apiCall("setName", { name });
    setMsg("pairStatus", r.ok ? "Имя сохранено ✅" : (r.error||"Ошибка"), !!r.ok);
  };

  $("enablePush").onclick = enablePush;

  $("makeCode").onclick = async () => {
    const r = await apiCall("makeCode", {});
    if(r.ok){ $("pairCode").value = r.code; setMsg("pairStatus","Код создан ✅ Отправь партнёру: "+r.code, true); }
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
      setMsg("profileStatus","Загружено ✅", true);
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

function boot(){
  installErrorOverlay();

  // регистрируем PWA service worker (не OneSignal)
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});

  renderButtons("states", STATES, v=>{ chosen.state=v; setMsg("sendStatus","Состояние: "+v, true); });
  renderButtons("needs", NEEDS, v=>{ chosen.need=v; });
  renderButtons("bounds", BOUNDS, v=>{ chosen.bound=v; });

  $("scale").addEventListener("input", e => $("scaleVal").textContent = e.target.value);

  wireButtons();

  setMsg("sendStatus","Готово. Выбери состояние и отправь.", true);
}

document.addEventListener("DOMContentLoaded", boot);
