
const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    const say = (body.say || "").trim();
    const todo = (body.todo || "").trim();
    if(!cid) return json(400, {ok:false, error:"cid required"});

    await supa(process.env, `profiles?user_id=eq.${encodeURIComponent(cid)}`, "DELETE");
    const ins = await supa(process.env, "profiles", "POST", [{
      user_id: cid, say, todo, updated_at: new Date().toISOString()
    }]);
    if(!ins.ok) return json(500, {ok:false, error:"supabase error", details: ins.data});

    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
