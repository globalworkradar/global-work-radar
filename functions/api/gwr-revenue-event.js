// GWR revenue event receiver v1 - preview only. No commercial promotion or payment inference.
const TYPES = new Set(['webhook_test','human_reaction','qualified_buyer_action','contract','payment_pending','paid_confirmed']);
const encoder = new TextEncoder();
const json = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export async function onRequestPost({request,env}) {
  if (!env.GWR_EVENT_SECRET || !env.GWR_EVENT_DB) return json({ok:false,error:'not_configured'},503);
  const length = Number(request.headers.get('content-length') || 0);
  if(length > 8192) return json({ok:false,error:'too_large'},413);
  const raw = await request.text();
  if(encoder.encode(raw).length > 8192) return json({ok:false,error:'too_large'},413);
  const signature = request.headers.get('x-gwr-signature') || '';
  if(!/^sha256=[a-f0-9]{64}$/.test(signature)) return json({ok:false,error:'unauthorized'},401);
  const key = await crypto.subtle.importKey('raw',encoder.encode(env.GWR_EVENT_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(raw)));
  const provided = new Uint8Array(signature.slice(7).match(/../g).map(h=>parseInt(h,16)));
  let mismatch=0; for(let i=0;i<32;i++) mismatch |= expected[i]^provided[i];
  if(mismatch) return json({ok:false,error:'unauthorized'},401);
  let data; try{data=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
  if(!data || typeof data!=='object' || Array.isArray(data)) return json({ok:false,error:'invalid_payload'},400);
  const {event_id,event_type,occurred_at,source,is_test,evidence_ref}=data;
  if(typeof event_id!=='string'|| !/^[a-zA-Z0-9_-]{8,100}$/.test(event_id) || !TYPES.has(event_type) || typeof source!=='string' || !/^gwr[-_a-zA-Z0-9]{0,60}$/.test(source) || typeof is_test!=='boolean') return json({ok:false,error:'invalid_fields'},400);
  const timestamp=Date.parse(occurred_at);
  if(!Number.isFinite(timestamp)||Math.abs(Date.now()-timestamp)>300000) return json({ok:false,error:'stale_event'},400);
  if(!Number.isFinite(Date.parse(occurred_at)) || typeof occurred_at !== 'string') return json({ok:false,error:'invalid_timestamp'},400);
  if(['contract','payment_pending','paid_confirmed'].includes(event_type) && (typeof evidence_ref!=='string'||evidence_ref.length<8||evidence_ref.length>250)) return json({ok:false,error:'evidence_required'},400);
  // The receiver stores only unverified claims. Never promotes a claimed paid_confirmed event into actual revenue.
  const record={event_id,event_type,occurred_at,source,is_test,verification:'UNVERIFIED',received_at:new Date().toISOString()};
  // Durable Object / D1 with unique index is needed for atomic dedupe. KV alone cannot provide atomic insert.
  try{
    const inserted=await env.GWR_EVENT_DB.prepare('INSERT OR IGNORE INTO gwr_events (event_id,event_type,occurred_at,source,is_test,verification,received_at) VALUES (?,?,?,?,?,?,?)').bind(record.event_id,record.event_type,record.occurred_at,record.source,is_test?1:0,record.verification,record.received_at).run();
    if(!inserted.meta?.changes) return json({ok:true,duplicate:true,commercial_evidence:false},200);
  }catch{return json({ok:false,error:'storage_unavailable'},503)}
  return json({ok:true,accepted:true,commercial_evidence:false},202);
}
export function onRequestGet(){return json({ok:false,error:'method_not_allowed'},405)}
