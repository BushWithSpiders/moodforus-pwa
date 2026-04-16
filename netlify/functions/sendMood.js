
const { json, supa, onesignalSend } = require("./_utils");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const cid = (body.cid || "").trim();
    if(!cid) return json(400, {ok:false, error:"cid required"});

    const state = (body.state || "").trim();
    const scale = Number(body.scale || 0);
    const need = (body.need || "не указано").trim();
    const bound = (body.bound ? String(body.bound).replaceAll("_"," ") : "не указано");
    const comment = (body.comment || "").trim();

    // partner
    const pr = await supa(process.env, `pairs?user_id=eq.${encodeURIComponent(cid)}`, "GET");
    if(!pr.ok) return json(500, {ok:false, error:"supabase error", details: pr.data});
    const pair = pr.data && pr.data[0];
    if(!pair) return json(400, {ok:false, error:"not paired"});
    const partnerId = pair.partner_id;

    // partner onesignal id
    const ur = await supa(process.env, `users?id=eq.${encodeURIComponent(partnerId)}`, "GET");
    if(!ur.ok) return json(500, {ok:false, error:"supabase error", details: ur.data});
    const partner = ur.data && ur.data[0];
    if(!partner || !partner.onesignal_id) return json(400, {ok:false, error:"partner has no push enabled"});

    // me
    const meU = await supa(process.env, `users?id=eq.${encodeURIComponent(cid)}`, "GET");
    const me = (meU.ok && meU.data && meU.data[0]) ? meU.data[0] : {name:"Партнёр"};

    // profile
    const myP = await supa(process.env, `profiles?user_id=eq.${encodeURIComponent(cid)}`, "GET");
    const prof = (myP.ok && myP.data && myP.data[0]) ? myP.data[0] : {say:"—", todo:"—"};

    const niceState = state ? (state.charAt(0).toUpperCase()+state.slice(1)) : "—";

    const text =
`🔔 ${me.name || "Партнёр"} отметил/а состояние
• ${niceState}
• Интенсивность: ${scale}/10
• Нужно: ${need || "не указано"}
• Границы: ${bound || "не указано"}${comment ? `\n\n💬 Комментарий: ${comment}` : ""}

🗣 Что сказать: ${prof.say || "—"}
🧩 Что сделать: ${prof.todo || "—"}

Если хочешь — отметь и своё состояние тоже.`;

    const os = await onesignalSend(process.env, partner.onesignal_id, text);
    if(!os.ok) return json(500, {ok:false, error:"onesignal error", details: os.data});

    return json(200, {ok:true});
  }catch(e){
    return json(500, {ok:false, error:String(e)});
  }
};
