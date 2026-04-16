const { json, supa, makeCode } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    if(!cid) return json(400, {ok:false, error:"cid required"});

    // ✅ Ensure user exists (insert if missing)
    // (просто вставим user с id, если его ещё нет)
    const ensure = await supa(process.env, "users", "POST", [{ id: cid, updated_at: new Date().toISOString() }]);
    // insert может вернуть конфликт — это ок, поэтому игнорим ошибки, кроме прям 401/403
    if (!ensure.ok && (ensure.status === 401 || ensure.status === 403)) {
      return json(500, {ok:false, error:"supabase auth error", details: ensure.data});
    }

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
