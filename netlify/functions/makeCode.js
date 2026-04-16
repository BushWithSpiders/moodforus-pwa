
const { json, supa, makeCode } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    if(!cid) return json(400, {ok:false, error:"cid required"});

    // delete expired codes (best effort)
    await supa(process.env, `codes?expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, "DELETE");

    const code = makeCode();
    const expires = new Date(Date.now() + 24*60*60*1000).toISOString();

    const ins = await supa(process.env, "codes", "POST", [{ code, user_id: cid, expires_at: expires }]);
    if(!ins.ok) return json(500, {ok:false, error:"supabase error", details: ins.data});

    return json(200, {ok:true, code});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
