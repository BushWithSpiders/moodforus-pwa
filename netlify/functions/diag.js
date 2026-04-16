const { json } = require("./_utils");

exports.handler = async () => {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) return json(500, { ok:false, step:"env", error:"SUPABASE_URL missing" });
    if (!key) return json(500, { ok:false, step:"env", error:"SUPABASE_SERVICE_ROLE_KEY missing" });

    // простейший запрос: получить 1 строку из users
    const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
      }
    });

    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    return json(200, {
      ok: res.ok,
      status: res.status,
      supabase_url_starts_with_https: String(url).startsWith("https://"),
      supabase_url: url,
      key_prefix: String(key).slice(0, 12),
      response: data
    });
  } catch (e) {
    return json(500, { ok:false, error:String(e) });
  }
};
