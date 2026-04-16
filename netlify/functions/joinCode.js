
const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    const code = (body.code || "").trim().toUpperCase();
    if(!cid || !code) return json(400, {ok:false, error:"cid/code required"});

    const r = await supa(process.env, `codes?code=eq.${encodeURIComponent(code)}`, "GET");
    if(!r.ok) return json(500, {ok:false, error:"supabase error", details: r.data});
    const row = (r.data && r.data[0]) || null;
    if(!row) return json(404, {ok:false, error:"code not found"});
    if(row.user_id === cid) return json(400, {ok:false, error:"this is your code"});
    if(new Date(row.expires_at).getTime() < Date.now()) return json(400, {ok:false, error:"code expired"});

    // remove existing pairs for both (best effort)
    await supa(process.env, `pairs?user_id=eq.${encodeURIComponent(cid)}`, "DELETE");
    await supa(process.env, `pairs?user_id=eq.${encodeURIComponent(row.user_id)}`, "DELETE");

    const ins = await supa(process.env, "pairs", "POST", [
      { user_id: cid, partner_id: row.user_id, updated_at: new Date().toISOString() },
      { user_id: row.user_id, partner_id: cid, updated_at: new Date().toISOString() }
    ]);
    if(!ins.ok) return json(500, {ok:false, error:"supabase error", details: ins.data});

    await supa(process.env, `codes?code=eq.${encodeURIComponent(code)}`, "DELETE");

    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
