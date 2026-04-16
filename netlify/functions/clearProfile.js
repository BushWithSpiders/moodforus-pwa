
const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    if(!cid) return json(400, {ok:false, error:"cid required"});

    const r = await supa(process.env, `profiles?user_id=eq.${encodeURIComponent(cid)}`, "DELETE");
    if(!r.ok) return json(500, {ok:false, error:"supabase error", details: r.data});

    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
