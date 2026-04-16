function json(statusCode, obj){
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function requireEnv(env, key){
  const v = env[key];
  if(!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

async function supa(env, path, method="GET", body=null){
  const url = requireEnv(env, "SUPABASE_URL") + "/rest/v1/" + path;
  const key = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

  const headers = {
    "apikey": key,
    "authorization": `Bearer ${key}`,
    "content-type": "application/json",
    "prefer": "return=representation"
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function makeCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out="";
  for(let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

async function onesignalSend(env, onesignalId, text){
  const appId = requireEnv(env, "ONESIGNAL_APP_ID");
  const rest = requireEnv(env, "ONESIGNAL_REST_API_KEY");

  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Basic ${rest}`
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: [onesignalId],
      headings: { en: "MoodForUs" },
      contents: { en: text }
    })
  });

  const out = await res.text();
  let data;
  try { data = out ? JSON.parse(out) : null; } catch { data = out; }
  return { ok: res.ok, status: res.status, data };
}

module.exports = { json, supa, makeCode, onesignalSend };
