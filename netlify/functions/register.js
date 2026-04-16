
const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    const onesignalId = (body.onesignalId || "").trim();
    if(!cid || !onesignalId) return json(400, {ok:false, error:"cid/onesignalId required"});

    // upsert user
    let r = await supa(process.env, `users?id=eq.${encodeURIComponent(cid)}`, "PATCH", {
      onesignal_id: onesignalId,
      updated_at: new Date().toISOString()
    });

    if(!r.ok){
      const ins = await supa(process.env, "users", "POST", [{
        id: cid, onesignal_id: onesignalId, updated_at: new Date().toISOString()
      }]);
      if(!ins.ok) return json(500, {ok:false, error:"supabase error", details: ins.data});
    }

    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
