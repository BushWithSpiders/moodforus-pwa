const { json, supa } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    if(!cid) return json(400, {ok:false, error:"cid required"});

    const r = await supa(process.env, `profiles?user_id=eq.${encodeURIComponent(cid)}`, "GET");
    if(!r.ok) return json(500, {ok:false, error:"supabase error", details: r.data});

    const row = (r.data && r.data[0]) || { say:"", todo:"" };
    return json(200, {ok:true, profile:{ say: row.say || "", todo: row.todo || "" }});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
