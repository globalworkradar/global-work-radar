import fs from 'node:fs';
import crypto from 'node:crypto';

const ROOT='incubator/global-work-radar';
const INPUT=`${ROOT}/data/verified-jobs.json`;
const OUTPUT=`${ROOT}/data/gwr-social-growth-candidates.json`;
const BASE_URL='https://global-work-radar.pages.dev/';
const MEASUREMENT_CHAIN=Object.freeze(['social_publish','gwr_visit','gwr_return_visit','gwr_search','gwr_buyer_reaction','gwr_official_apply_click']);
const KPI_ORDER=Object.freeze(['revenue_evidence','buyer_reaction_evidence','official_apply_evidence','qualified_gwr_action','gwr_return_visit','qualified_social_visit','qualified_follow','reach']);

const text=v=>typeof v==='string'?v.trim():'';
const finite=v=>{if(v===null||v===undefined)return null;if(typeof v==='string'&&!v.trim())return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const compact=(value,max=180)=>{const n=text(value).replace(/\s+/g,' ');return n.length<=max?n:`${n.slice(0,Math.max(0,max-1)).trimEnd()}…`};
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,12);

function trackedUrl(candidateId,extra={}){
  const url=new URL(BASE_URL);
  url.searchParams.set('japan','1');
  url.searchParams.set('utm_source','social');
  url.searchParams.set('utm_medium','organic');
  url.searchParams.set('utm_campaign','gwr_signal_growth');
  url.searchParams.set('utm_content',candidateId);
  for(const [k,v] of Object.entries(extra))if(v!==null&&v!==undefined&&String(v).trim())url.searchParams.set(k,String(v));
  return url.toString();
}

function scoreJob(job){
  let score=0;
  if(job.japan===true)score+=35;
  if(job.status==='VERIFIED ACTIVE')score+=15;
  if(job.remote==='remote')score+=8;
  if(job.freshness?.bucket==='NEW_24H')score+=25;else if(job.freshness?.bucket==='NEW_3D')score+=20;else if(job.freshness?.bucket==='FRESH_7D')score+=12;
  if(job.hiringMomentum?.state==='NEW_EMPLOYER_SIGNAL')score+=14;else if(job.hiringMomentum?.state==='HIRING_UP')score+=Math.min(18,8+Math.max(0,finite(job.hiringMomentum?.delta)||0));
  if(finite(job.payMin)!==null)score+=Math.min(12,Math.max(0,Number(job.payMin))/5);
  if(/^https:\/\//i.test(text(job.url)))score+=8;
  return Number(score.toFixed(1));
}

function payLabel(job){
  const min=finite(job.payMin);if(min===null)return'';
  const max=finite(job.payMax),currency=text(job.currency)||'USD',period=job.period==='hour'?'/h':job.period?`/${job.period}`:'';
  return `${currency} ${max!==null&&max!==min?`${min}–${max}`:min}${period}`;
}

function evidenceForJob(job){return{
  job_id:text(job.id)||null,employer:text(job.employer)||null,title:text(job.title)||null,source:text(job.source)||null,
  official_url:/^https:\/\//i.test(text(job.url))?text(job.url):null,last_verified_at:text(job.lastVerifiedAt)||null,
  freshness_bucket:text(job.freshness?.bucket)||null,hiring_momentum:text(job.hiringMomentum?.state)||null,hiring_delta:finite(job.hiringMomentum?.delta)
}}

function baseCandidate({id,type,score,scope,destinationUrl,evidence,copy}){return{
  candidate_id:id,signal_type:type,objective:'qualified_revenue_growth',score,source_generated_at:null,claim_scope:scope,text:copy,
  destination_url:destinationUrl,evidence,measurement_chain:[...MEASUREMENT_CHAIN],publish_state:'CANDIDATE_NOT_PUBLISHED',channel_rule:'GWR_CHANNEL_ONLY'
}}

function buildOpenCandidate(job){
  const id=`gwr-open-${hash(['OPEN',job.id,job.lastVerifiedAt,job.hiringMomentum?.state])}`;
  const destinationUrl=trackedUrl(id,{q:job.employer||job.title||'',intent:job.remote==='remote'?'remote':'general'});
  const core=`${[text(job.title),text(job.employer),text(job.location)].filter(Boolean).join('｜')}${payLabel(job)?`｜${payLabel(job)}`:''}`;
  const follow='GWRは日本から確認できる海外求人の変化を継続観測中。';
  return baseCandidate({id,type:'GWR_OPEN',score:scoreJob(job),scope:'verified_active_structured_facts_only',destinationUrl,evidence:[evidenceForJob(job)],copy:{
    x:compact(`【GWR OPEN】${core}。公式求人の確認先まで検証済み。${follow} ${destinationUrl}`,275),
    bluesky:compact(`GWR OPEN｜${core}。公式求人まで確認済み。${follow} ${destinationUrl}`,295),
    linkedin:compact(`Global Work Radarで新しい求人Signalを確認。 ${core} 公開対象はVERIFIED ACTIVEかつ公式応募先を確認できたものに限定しています。 ${destinationUrl}`,900)
  }});
}

function buildAlertCandidate(job){
  const id=`gwr-alert-${hash(['ALERT',job.id,job.freshness?.bucket,job.lastVerifiedAt])}`;
  const destinationUrl=trackedUrl(id,{q:job.employer||'',intent:'general'}),delta=finite(job.hiringMomentum?.delta);
  const momentum=job.hiringMomentum?.state==='NEW_EMPLOYER_SIGNAL'?'GWR観測内で新規Employer Signal':job.hiringMomentum?.state==='HIRING_UP'&&delta!==null?`前回スナップショット比 +${delta}`:'新着Signal';
  const core=`${text(job.employer)}｜${text(job.title)}｜${momentum}`;
  return baseCandidate({id,type:'GWR_ALERT',score:scoreJob(job)+7,scope:'snapshot_change_only_no_hiring_outcome_inference',destinationUrl,evidence:[evidenceForJob(job)],copy:{
    x:compact(`【GWR ALERT】${core}。日本対象可否・公式求人・鮮度を確認して追跡しています。次の変化もGWRで更新。 ${destinationUrl}`,275),
    bluesky:compact(`GWR ALERT｜${core}。日本対象可否・公式求人・鮮度を確認して継続追跡。 ${destinationUrl}`,295),
    linkedin:compact(`GWR Market Alert ${core}。採用結果の予測ではなく、GWRの検証済み求人スナップショットで確認できた変化です。 ${destinationUrl}`,900)
  }});
}

function buildShiftCandidate(momentum,records){
  const matching=records.filter(j=>j.employer===momentum.employer&&j.japan===true&&j.status==='VERIFIED ACTIVE').slice(0,4);if(!matching.length||!(momentum.delta>0))return null;
  const id=`gwr-shift-${hash(['SHIFT',momentum.employer,momentum.previous_count,momentum.current_count])}`;
  const destinationUrl=trackedUrl(id,{q:momentum.employer,intent:'general'}),core=`${momentum.employer}：GWR確認求人 ${momentum.previous_count}→${momentum.current_count}（+${momentum.delta}）`;
  return baseCandidate({id,type:'GWR_SHIFT',score:70+Math.min(25,momentum.delta*4)+Math.min(10,matching.length*2),scope:'verified_inventory_snapshot_delta_only',destinationUrl,evidence:matching.map(evidenceForJob),copy:{
    x:compact(`【GWR SHIFT】${core}。採用成否の予測ではなく、検証済み公開求人のスナップショット変化です。 ${destinationUrl}`,275),
    bluesky:compact(`GWR SHIFT｜${core}。検証済み公開求人のスナップショット変化として継続追跡。 ${destinationUrl}`,295),
    linkedin:compact(`GWR Market Shift ${core}。企業の採用意欲や採用成否を断定せず、VERIFIED ACTIVE求人の差分として追跡します。 ${destinationUrl}`,900)
  }});
}

function buildDataCandidate(category,stats,records){
  if(!stats||finite(stats.sample_count)===null||Number(stats.sample_count)<3||finite(stats.median_usd_hourly)===null)return null;
  const evidenceJobs=records.filter(j=>j.category===category&&j.currency==='USD'&&j.period==='hour'&&j.japan===true).slice(0,5);if(evidenceJobs.length<2)return null;
  const id=`gwr-data-${hash(['DATA',category,stats.sample_count,stats.median_usd_hourly])}`;
  const destinationUrl=trackedUrl(id,{category,intent:'highpay'}),core=`${category}｜GWR検証在庫 ${stats.sample_count}件｜時給下限中央値 $${stats.median_usd_hourly}`;
  return baseCandidate({id,type:'GWR_DATA',score:58+Math.min(22,Number(stats.sample_count)),scope:'gwr_verified_inventory_only_not_market_wide',destinationUrl,evidence:evidenceJobs.map(evidenceForJob),copy:{
    x:compact(`【GWR DATA】${core}。市場全体ではなくGWR検証在庫内の集計です。求人変化と一緒に継続更新。 ${destinationUrl}`,275),
    bluesky:compact(`GWR DATA｜${core}。市場全体ではなくGWR検証在庫内の集計。継続更新します。 ${destinationUrl}`,295),
    linkedin:compact(`GWR Data Snapshot ${core}。対象はGlobal Work Radarで検証できた公開求人のみで、市場全体の統計ではありません。 ${destinationUrl}`,900)
  }});
}

if(!fs.existsSync(INPUT))throw new Error(`Missing GWR input: ${INPUT}`);
const source=JSON.parse(fs.readFileSync(INPUT,'utf8')),records=Array.isArray(source.records)?source.records:[];if(!records.length)throw new Error('GWR verified inventory is empty');
const eligible=records.filter(j=>j.japan===true&&j.status==='VERIFIED ACTIVE'&&/^https:\/\//i.test(text(j.url))).sort((a,b)=>scoreJob(b)-scoreJob(a));
const candidates=[];
for(const job of eligible.slice(0,6))candidates.push(buildOpenCandidate(job));
for(const job of eligible.filter(j=>['NEW_24H','NEW_3D'].includes(j.freshness?.bucket)).slice(0,4))candidates.push(buildAlertCandidate(job));
for(const momentum of(source.intelligence?.employer_momentum||[]).filter(i=>i?.delta>0).slice(0,5)){const c=buildShiftCandidate(momentum,records);if(c)candidates.push(c)}
for(const[category,stats]of Object.entries(source.intelligence?.category_pay_usd_hourly||{})){const c=buildDataCandidate(category,stats,records);if(c)candidates.push(c)}
const deduped=[...new Map(candidates.map(c=>[c.candidate_id,c])).values()].sort((a,b)=>b.score-a.score).slice(0,12).map((c,i)=>({...c,source_generated_at:source.generated_at||null,rank:i+1}));
const output={generated_at:new Date().toISOString(),source_generated_at:source.generated_at||null,brand:'Global Work Radar',purpose:'Turn verified market changes into GWR-owned traffic, explicit buyer-reaction evidence, and revenue opportunities without fabricating publication state.',channel_policy:'GWR_CHANNEL_ONLY',publication_policy:'candidate_generation_only_until_a_GWR_owned_social_channel_is_verified',safety:{no_easy_hire_claims:true,no_income_guarantees:true,no_group_eligibility_inference:true,no_cross_brand_vector_account_use:true,official_apply_remains_external:true},kpi_order:[...KPI_ORDER],measurement_policy:{buyer_reaction_event:'gwr_buyer_reaction',reaction_types:['recurring','hiring_decision','client_advisory','more_detail'],revenue_first:true},candidate_count:deduped.length,candidates:deduped};
fs.mkdirSync(`${ROOT}/data`,{recursive:true});fs.writeFileSync(OUTPUT,`${JSON.stringify(output,null,2)}\n`);console.log(`GWR social growth candidates built: ${deduped.length}`);if(deduped[0])console.log(`GWR top candidate: ${deduped[0].candidate_id} score=${deduped[0].score}`);
