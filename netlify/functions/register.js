const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    const onesignalId = (body.onesignalId || "").trim();
    if(!cid || !onesignalId) return json(400, {ok:false, error:"cid/onesignalId required"});

    // ✅ TRUE UPSERT
    const url = process.env.SUPABASE_URL + "/rest/v1/users?on_conflict=id";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{ id: cid, onesignal_id: onesignalId, updated_at: new Date().toISOString() }])
    });

    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if(!res.ok) return json(500, {ok:false, error:"supabase error", details: data});
    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
