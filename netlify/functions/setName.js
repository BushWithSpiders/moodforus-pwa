
const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    const name = (body.name || "").trim();
    if(!cid || !name) return json(400, {ok:false, error:"cid/name required"});

    let r = await supa(process.env, `users?id=eq.${encodeURIComponent(cid)}`, "PATCH", {
      name, updated_at: new Date().toISOString()
    });

    if(!r.ok){
      const ins = await supa(process.env, "users", "POST", [{
        id: cid, name, updated_at: new Date().toISOString()
      }]);
      if(!ins.ok) return json(500, {ok:false, error:"supabase error", details: ins.data});
    }

    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
