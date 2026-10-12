// Run: node --test tests/gwr-revenue-event.test.mjs (Node 20+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { onRequestPost, onRequestGet } from '../functions/api/gwr-revenue-event.js';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const encoder = new TextEncoder();
const secret = 'local-test-secret-only';
function db() {
 const rows = new Map();
 return { rows, prepare(sql) {
  assert.match(sql,/INSERT OR IGNORE/);
  return { bind(...args) { return { async run() {
   const [id,type,occurred,source,isTest,verification,received]=args;
   if(rows.has(id)) return {meta:{changes:0}};
   rows.set(id,{id,type,occurred,source,isTest,verification,received});
   return {meta:{changes:1}};
  } }; } };
 } };
}
async function signature(raw) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return 'sha256='+Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
}
const sample=()=>({event_id:'gwr-test-00001',event_type:'webhook_test',occurred_at:new Date().toISOString(),source:'gwr_test',is_test:true});
async function post(data,opts={}) {
 const raw=opts.raw??JSON.stringify(data);
 const headers=opts.unsigned?{}:{'x-gwr-signature':opts.signature??await signature(raw)};
 return onRequestPost({request:new Request('https://preview.example/api/gwr-revenue-event',{method:'POST',headers,body:raw}),env:opts.env??{GWR_EVENT_SECRET:secret,GWR_EVENT_DB:opts.db??db()}});
}
test('missing config fails closed',async()=>{const r=await post(sample(),{env:{}});assert.equal(r.status,503)});
test('unsigned request rejected',async()=>{const r=await post(sample(),{unsigned:true});assert.equal(r.status,401)});
test('invalid signature rejected',async()=>{const r=await post(sample(),{signature:'sha256='+'0'.repeat(64)});assert.equal(r.status,401)});
test('valid signed test event accepted, repeated ID deduped',async()=>{
 const store=db(), data=sample();
 const a=await post(data,{db:store});assert.equal(a.status,202);assert.equal((await a.json()).commercial_evidence,false);
 const b=await post(data,{db:store});assert.equal(b.status,200);assert.equal((await b.json()).duplicate,true);
 assert.equal(store.rows.size,1);assert.equal([...store.rows.values()][0].verification,'UNVERIFIED');
});
test('stale event rejected',async()=>{const r=await post({...sample(),occurred_at:'2020-01-01T00:00:00Z'});assert.equal(r.status,400)});
test('malformed signed JSON rejected',async()=>{const r=await post(null,{raw:'{invalid'});assert.equal(r.status,400)});
test('paid claim without evidence rejected',async()=>{const r=await post({...sample(),event_type:'paid_confirmed'});assert.equal(r.status,400)});
test('paid claim with evidence remains unverified',async()=>{
 const store=db(),r=await post({...sample(),event_type:'paid_confirmed',evidence_ref:'test-only-reference'},{db:store});
 assert.equal(r.status,202);assert.equal([...store.rows.values()][0].verification,'UNVERIFIED');
});
test('GET is not accepted',()=>{const r=onRequestGet();assert.equal(r.status,405)});
