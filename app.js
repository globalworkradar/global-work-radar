let jobs=[];

const $=s=>document.querySelector(s);
const state={quick:new Set(['japan']),visibleLimit:30,intent:'general'};
const ranks={A2:0,B1:1,B2:2,C1:3,C2:4};
const category=$('#category');
let searchTrackTimer=null;
const POSTHOG_KEY='phc_oTYapRSNXDtn8aY7wMNHfCDexRTkfb2H44MDVXwoUMSN';
const POSTHOG_CAPTURE='https://us.i.posthog.com/capture/';
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const uiState={dataset:'idle',invalidRecords:0};

const INTENTS=Object.freeze({
  general:{label:'General opportunity',terms:[]},
  ai:{label:'AI work',terms:['ai','人工知能','llm','agent','annotation','data labeling','prompt','machine learning']},
  remote:{label:'Global remote',terms:['remote','リモート','海外','worldwide','global']},
  side:{label:'Side work',terms:['副業','side','part-time','part time','contract','freelance']},
  fast:{label:'Fast income',terms:['短期','単発','すぐ','urgent','quick','bounty','task']},
  highpay:{label:'High pay',terms:['高単価','高収入','high pay','senior','lead','principal']},
  beginner:{label:'Beginner',terms:['未経験','初心者','entry','junior','no experience']}
});

function gwrDistinctId(){
  try{
    const sdkId=window.posthog?.get_distinct_id?.();
    if(sdkId)return sdkId;
    const key='gwr_distinct_id';
    let id=localStorage.getItem(key);
    if(!id){id=crypto.randomUUID?.()||`gwr-${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(key,id)}
    return id;
  }catch{return `gwr-${Date.now()}-${Math.random().toString(36).slice(2)}`}
}

function track(event,properties={}){
  const payload={
    api_key:POSTHOG_KEY,
    event,
    properties:{
      distinct_id:gwrDistinctId(),
      product:'global-work-radar',
      '$current_url':location.href,
      '$host':location.host,
      '$pathname':location.pathname,
      '$referrer':document.referrer||'$direct',
      ...(new URLSearchParams(location.search).get('gwr_qa')==='1'?{gwr_qa:true,gwr_qa_source:'github_actions_live'}:{}),
      ...properties
    }
  };
  try{
    fetch(POSTHOG_CAPTURE,{
      method:'POST',mode:'cors',keepalive:true,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    }).catch(()=>{});
  }catch{}
}

function installCapabilityUI(){
  if(document.getElementById('gwrCapabilityUi'))return;
  const style=document.createElement('style');
  style.id='gwrCapabilityUi';
  style.textContent=`
    .gwr-skip-link{position:fixed;left:16px;top:10px;z-index:300;transform:translateY(-180%);padding:10px 14px;border:2px solid var(--accent);border-radius:10px;background:#07100d;color:#fff;font-weight:800;text-decoration:none;transition:transform .16s ease}.gwr-skip-link:focus{transform:none}
    #top:focus{outline:none}.decision-bridge{display:grid;grid-template-columns:minmax(150px,.9fr) minmax(210px,1.15fr) minmax(250px,1.35fr) auto;gap:1px;margin-top:12px;border:1px solid #202a34;border-radius:16px;overflow:hidden;background:#202a34}.decision-cell,.decision-action{min-width:0;padding:14px 16px;background:#0b1117}.decision-cell span{display:block;color:#70808d;font-size:8px;font-weight:800;letter-spacing:.13em}.decision-cell strong,.decision-cell p{display:block;margin:6px 0 0;color:#c9d3d9;font-size:11px;line-height:1.55;overflow-wrap:anywhere}.decision-cell p{color:#8f9ca6}.decision-action{display:flex;align-items:center;justify-content:center;min-height:64px;color:#dff5ec;text-decoration:none;font-size:10px;font-weight:800;background:#10201c}.decision-action:hover{background:#152a24}.decision-action:focus-visible{outline:2px solid var(--focus-ring,#8de6c0);outline-offset:-4px}
    .jobs-status{display:flex;align-items:center;gap:9px;min-height:42px;margin:0 0 9px;padding:9px 12px;border:1px solid #202a34;border-radius:12px;background:#0a1016;color:#8998a3;font-size:10px;line-height:1.45}.jobs-status-mark{display:grid;place-items:center;flex:0 0 22px;width:22px;height:22px;border:1px solid #33414c;border-radius:50%;color:#9fb0bb;font-size:9px;font-weight:900}.jobs-status[data-state="loading"] .jobs-status-mark{border-style:dashed;animation:gwrStatusSpin 1s linear infinite}.jobs-status[data-state="success"] .jobs-status-mark{border-color:#466c5e;color:#a7e5ca}.jobs-status[data-state="partial"] .jobs-status-mark{border-color:#776b42;color:#e5cf83}.jobs-status[data-state="error"]{border-color:#603e3b;background:#160f10;color:#d8b4af}.jobs-status[data-state="error"] .jobs-status-mark{border-color:#82504b;color:#f0a79d}.jobs-status[data-state="empty"] .jobs-status-mark{border-color:#48535d;color:#b7c1c8}.status-retry{margin-left:auto;min-height:40px;padding:0 13px;border:1px solid #5d4946;border-radius:999px;background:#191112;color:#efc9c4;font-size:9px;font-weight:800}.status-retry:hover{border-color:#8a615b;background:#211617}.status-retry:focus-visible{outline:2px solid var(--focus-ring,#8de6c0);outline-offset:2px}
    @keyframes gwrStatusSpin{to{transform:rotate(360deg)}}
    .skeleton-card{pointer-events:none}.skeleton-line,.skeleton-pill{display:block;border-radius:999px;background:linear-gradient(90deg,#111820 20%,#1a242d 45%,#111820 70%);background-size:220% 100%;animation:gwrSkeleton 1.35s ease-in-out infinite}.skeleton-pill{width:82px;height:18px}.skeleton-line{height:10px;margin-top:10px}.skeleton-line.title{width:min(82%,520px);height:18px}.skeleton-line.mid{width:min(62%,380px)}.skeleton-line.short{width:42%}.skeleton-action{min-height:44px;width:150px;margin-left:auto;border-radius:999px;background:#111820}@keyframes gwrSkeleton{to{background-position:-220% 0}}
    .job-card h3,.employer,.signal-copy h2,.signal-copy p,.partner-disclosure,.pay,.verified{overflow-wrap:anywhere}.check{min-height:44px;padding:8px 0}.check input{min-width:18px;min-height:18px}.quick-filters button:active,.ghost:active,.search-panel button:active,.official-apply:active,.partner-cta:active,.hero-action:active,.decision-action:active{transform:translateY(0)!important}.search-panel button:disabled,.quick-filters button:disabled,.filters select:disabled,.ghost:disabled{cursor:not-allowed;opacity:.48;filter:saturate(.5)}
    @media(max-width:980px){body{padding-bottom:calc(76px + env(safe-area-inset-bottom))}.mobile-dock{position:fixed;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:calc(10px + env(safe-area-inset-bottom));z-index:70;display:grid!important;grid-template-columns:repeat(3,1fr);padding:6px 8px;border:1px solid #303b46;border-radius:15px;background:rgba(10,14,19,.96);backdrop-filter:blur(18px);box-shadow:0 12px 36px rgba(0,0,0,.35)}.mobile-dock a{display:flex;min-height:44px;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px;text-decoration:none;color:#89949f;font-size:8px;font-weight:700}.mobile-dock a span{color:var(--accent);font-size:10px}.filters{grid-template-columns:repeat(2,minmax(0,1fr))!important;overflow:visible!important}.decision-bridge{grid-template-columns:1fr 1fr}.decision-action{grid-column:1/-1}.verified{max-width:none!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}.signal-card .partner-disclosure{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}.job-meta div{white-space:normal!important;overflow:visible!important;text-overflow:clip!important}}
    @media(max-width:720px){.filters{grid-template-columns:1fr!important}.signal-card .signal-copy p{display:block!important;-webkit-line-clamp:unset!important;overflow:visible!important}.signal-card .partner-disclosure{display:block!important}.gwr-intelligence-copy p{display:block!important;-webkit-line-clamp:unset!important;overflow:visible!important}.gwr-offer-points{display:flex!important;flex-wrap:wrap!important}.decision-bridge{grid-template-columns:1fr}.decision-action{grid-column:auto}.jobs-status{align-items:flex-start;flex-wrap:wrap}.status-retry{width:100%;margin-left:0}.skeleton-action{width:100%;margin-left:0}.job-meta{grid-template-columns:1fr!important}}
    @media(max-width:560px){.metrics{grid-template-columns:1fr!important}.metric-card{min-height:92px!important}.quick-filters{grid-template-columns:1fr!important}.daily-route{grid-template-columns:1fr!important}.market-rule{width:100%!important}.decision-cell,.decision-action{padding:13px 14px}}
    @media(prefers-contrast:more){.metric-card,.job-card,.partner-section,.search-dock,.filters,.jobs-status,.decision-bridge{border-color:#596b79!important}.muted,.verified,.partner-disclosure,.signal-copy p{color:#aab5bd!important}.official-apply,.partner-cta,.hero-action.primary{border-width:2px!important}}
    @media(forced-colors:active){.gwr-skip-link,.decision-action,.official-apply,.partner-cta,.hero-action,.status-retry{forced-color-adjust:auto}.live-dot,.zone-tag span,.results-toolbar i{border:1px solid CanvasText}.skeleton-line,.skeleton-pill,.skeleton-action{background:CanvasText;opacity:.18}}
    @media(prefers-reduced-motion:reduce){.jobs-status[data-state="loading"] .jobs-status-mark,.skeleton-line,.skeleton-pill{animation:none!important}.gwr-skip-link{transition:none!important}}
  `;
  document.head.appendChild(style);

  const main=document.getElementById('top');
  if(main){main.setAttribute('tabindex','-1');main.setAttribute('aria-label','Global Work Radar main content')}
  const skip=document.createElement('a');
  skip.className='gwr-skip-link';skip.href='#top';skip.textContent='本文へスキップ';
  document.body.insertBefore(skip,document.body.firstChild);

  const rule=document.querySelector('.market-rule');
  if(rule&&!document.getElementById('decisionBridge')){
    rule.insertAdjacentHTML('afterend',`<div id="decisionBridge" class="decision-bridge" aria-label="今日の判断ガイド"><div class="decision-cell"><span>SIGNAL</span><strong id="decisionSignal">確認済み市場データを読み込み中</strong></div><div class="decision-cell"><span>MEANING</span><p id="decisionMeaning">Japan eligibleを応募判断の中心にします。</p></div><div class="decision-cell"><span>RISK</span><p id="decisionRisk">Remote表記だけでは日本から応募できるとは限りません。</p></div><a id="decisionAction" class="decision-action" href="#jobs">ACTION · 応募可能性が高い求人を見る →</a></div>`);
  }

  const toolbar=document.querySelector('.results-toolbar');
  if(toolbar&&!document.getElementById('jobsStatus')){
    toolbar.insertAdjacentHTML('afterend',`<div id="jobsStatus" class="jobs-status" role="status" aria-live="polite" aria-atomic="true" data-state="loading"><span id="jobsStatusMark" class="jobs-status-mark" aria-hidden="true">↻</span><span id="jobsStatusText">求人データを読み込み中…</span><button id="retryJobs" class="status-retry" type="button" hidden>再試行</button></div>`);
  }
  $('#jobsList')?.setAttribute('aria-live','off');
  $('#jobsList')?.setAttribute('aria-busy','true');
  $('#resultCount')?.setAttribute('aria-live','polite');
  $('#resultCount')?.setAttribute('aria-atomic','true');
  $('#keyword')?.setAttribute('aria-keyshortcuts','/ Enter');
  ['keyword','category','minPay','english','onlyJapan','onlyRemote','searchButton','resetFilters','loadMore'].forEach(id=>$('#'+id)?.setAttribute('aria-controls','jobsList'));
  document.querySelectorAll('[data-filter]').forEach(btn=>btn.setAttribute('aria-controls','jobsList'));

  const navLinks=[...document.querySelectorAll('.site-header nav a[href^="#"]')];
  const syncCurrent=()=>navLinks.forEach(link=>link.classList.contains('is-current')?link.setAttribute('aria-current','location'):link.removeAttribute('aria-current'));
  navLinks.forEach(link=>new MutationObserver(syncCurrent).observe(link,{attributes:true,attributeFilter:['class']}));
  syncCurrent();

  $('#decisionAction')?.addEventListener('click',event=>{
    event.preventDefault();
    state.quick.add('japan');
    state.visibleLimit=30;
    updateQuickUI();
    render();
    marketSignal();
    syncUrl();
    track('gwr_decision_action_click',{intent:state.intent,result_count:filtered().length});
    scrollToJobs();
  });

  $('#keyword')?.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();$('#searchButton')?.click()}
  });
}

function scrollToJobs(){
  document.querySelector('#jobs')?.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});
}

function renderSkeleton(count=5){
  const list=$('#jobsList');
  if(!list)return;
  list.innerHTML=Array.from({length:count},()=>`<article class="job-card skeleton-card" aria-hidden="true"><div><div class="job-top"><span class="skeleton-pill"></span></div><span class="skeleton-line title"></span><span class="skeleton-line mid"></span><div class="job-meta"><div><span class="skeleton-line short"></span></div><div><span class="skeleton-line short"></span></div></div></div><div class="job-action"><span class="skeleton-line mid"></span><span class="skeleton-line short"></span><span class="skeleton-action"></span></div></article>`).join('');
  $('#emptyState').hidden=true;
  $('#loadMore').hidden=true;
}

function setDatasetState(next,message,{retry=false,trackState=true}={}){
  uiState.dataset=next;
  const status=$('#jobsStatus');
  const text=$('#jobsStatusText');
  const mark=$('#jobsStatusMark');
  const retryButton=$('#retryJobs');
  if(status)status.dataset.state=next;
  if(text)text.textContent=message;
  if(mark)mark.textContent=({loading:'↻',success:'✓',partial:'△',error:'!',empty:'○'}[next]||'•');
  if(retryButton)retryButton.hidden=!retry;
  $('#jobsList')?.setAttribute('aria-busy',next==='loading'?'true':'false');
  if(trackState)track('gwr_ui_state',{state:next,invalid_records:uiState.invalidRecords});
}

function trackVisitQuality(){
  const now=Date.now();
  let previous=0;
  try{previous=Number(localStorage.getItem('gwr_last_visit')||0);localStorage.setItem('gwr_last_visit',String(now))}catch{}
  track('gwr_visit',{intent:state.intent});
  if(previous&&now-previous>21600000&&now-previous<2592000000){
    track('gwr_return_visit',{hours_since_previous:Math.round((now-previous)/3600000),intent:state.intent});
  }
}

function parseTimestamp(value){
  if(!value)return 0;
  const ts=Date.parse(value);
  return Number.isFinite(ts)?ts:0;
}

function verifiedTimestamp(j){
  return parseTimestamp(j.lastVerifiedAt)||parseTimestamp(j.verified);
}

function ageDays(j){
  const ts=verifiedTimestamp(j);
  return ts?Math.max(0,(Date.now()-ts)/86400000):999;
}

function freshnessText(j){
  const ts=verifiedTimestamp(j);
  if(!ts)return '確認時刻 要確認';
  const diff=Math.max(0,Date.now()-ts);
  const hour=3600000;
  const day=24*hour;
  if(diff<hour)return '最終確認 1時間以内';
  if(diff<day)return `最終確認 ${Math.floor(diff/hour)}時間前`;
  if(diff<7*day)return `最終確認 ${Math.floor(diff/day)}日前`;
  return `最終確認 ${new Date(ts).toLocaleDateString('ja-JP')}`;
}

function latestCheckText(){
  const latest=Math.max(0,...jobs.map(verifiedTimestamp));
  if(!latest)return '—';
  const diff=Math.max(0,Date.now()-latest);
  const hour=3600000;
  const day=24*hour;
  if(diff<hour)return '<1h';
  if(diff<day)return `${Math.floor(diff/hour)}h`;
  return `${Math.floor(diff/day)}d`;
}

function validOfficialDestination(j){
  try{
    const u=new URL(j.url||'');
    return u.protocol==='https:'&&Boolean(u.hostname)&&!['localhost','127.0.0.1'].includes(u.hostname);
  }catch{return false}
}

function jobText(j){
  return `${j.title||''} ${j.employer||''} ${j.category||''} ${j.location||''} ${j.description||''}`.toLowerCase();
}

function inferIntent(){
  const p=new URLSearchParams(location.search);
  const explicit=(p.get('intent')||'').toLowerCase();
  if(INTENTS[explicit])return explicit;
  const q=($('#keyword')?.value||p.get('q')||'').trim().toLowerCase();
  const scores={general:1,ai:0,remote:0,side:0,fast:0,highpay:0,beginner:0};
  Object.entries(INTENTS).forEach(([name,def])=>{
    if(name==='general')return;
    def.terms.forEach(term=>{if(q.includes(term))scores[name]+=3});
  });
  if(state.quick.has('remote'))scores.remote+=3;
  if(state.quick.has('japanese'))scores.remote+=1;
  if(Number($('#minPay')?.value||0)>=30)scores.highpay+=3;
  const cat=category?.value||'all';
  if(/ai|data|machine|software|engineer/i.test(cat))scores.ai+=2;
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}

function intentMatchScore(j,intent=state.intent){
  const text=jobText(j);
  let score=0;
  if(intent==='ai'&&/(\bai\b|artificial intelligence|llm|agent|machine learning|annotation|data label|prompt)/i.test(text))score+=2400;
  if(intent==='remote'&&j.remote==='remote')score+=2200;
  if(intent==='side'&&/(contract|freelance|part[- ]?time|temporary|project|hourly)/i.test(text))score+=1900;
  if(intent==='fast'&&/(bounty|task|temporary|contract|project|hourly|immediate|urgent)/i.test(text))score+=1800;
  if(intent==='highpay')score+=Math.min(2600,Number(j.payMin||0)*45);
  if(intent==='beginner'&&/(entry|junior|associate|trainee|no experience|beginner)/i.test(text))score+=2100;
  return score;
}

function actionabilityScore(j,intent=state.intent){
  let score=0;
  const official=validOfficialDestination(j);
  const active=(j.status||'').includes('ACTIVE');
  const age=ageDays(j);
  if(j.japan)score+=100000;
  if(official)score+=15000;else score-=30000;
  if(active)score+=7000;else score-=12000;
  if(j.remote==='remote')score+=600;
  if(j.japanese)score+=180;
  if(j.payMin)score+=Math.min(900,Number(j.payMin)*15);
  if(age<=1)score+=5000;
  else if(age<=7)score+=3500;
  else if(age<=14)score+=1800;
  else if(age<=30)score+=400;
  else if(age>45)score-=8000;
  score+=intentMatchScore(j,intent);
  return score;
}

function sortActionable(data){
  state.intent=inferIntent();
  return [...data].sort((a,b)=>
    actionabilityScore(b,state.intent)-actionabilityScore(a,state.intent)||
    verifiedTimestamp(b)-verifiedTimestamp(a)||
    Number(b.payMin||0)-Number(a.payMin||0)
  );
}

function searchProperties(trigger='search_button'){
  state.intent=inferIntent();
  const data=filtered();
  return {
    trigger,
    intent:state.intent,
    keyword:$('#keyword').value.trim()||null,
    category:category.value,
    min_pay:Number($('#minPay').value)||0,
    english:$('#english').value,
    japan_only:$('#onlyJapan').checked||state.quick.has('japan'),
    remote_only:$('#onlyRemote').checked||state.quick.has('remote'),
    result_count:data.length
  };
}

function trackSearch(trigger='filter_change'){
  clearTimeout(searchTrackTimer);
  searchTrackTimer=setTimeout(()=>track('gwr_search',searchProperties(trigger)),350);
}

function rebuildCategories(){
  category.querySelectorAll('option:not([value="all"])').forEach(o=>o.remove());
  [...new Set(jobs.map(j=>j.category).filter(Boolean))].sort().forEach(v=>{
    const o=document.createElement('option');o.value=v;o.textContent=v;category.appendChild(o);
  });
}

function updateQuickUI(){
  document.querySelectorAll('[data-filter]').forEach(btn=>{
    const active=state.quick.has(btn.dataset.filter);
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-pressed',active?'true':'false');
  });
}

function applyUrlState(){
  const p=new URLSearchParams(location.search);
  if(p.has('japan'))p.get('japan')==='0'?state.quick.delete('japan'):state.quick.add('japan');
  if(p.get('remote')==='1')state.quick.add('remote');
  if(p.get('japanese')==='1')state.quick.add('japanese');
  if(p.get('usd')==='1')state.quick.add('usd');
  if(p.get('q'))$('#keyword').value=p.get('q').slice(0,120);
  if(p.get('category')&&[...category.options].some(o=>o.value===p.get('category')))category.value=p.get('category');
  if(p.get('min_pay')&&[...$('#minPay').options].some(o=>o.value===p.get('min_pay')))$('#minPay').value=p.get('min_pay');
  if(p.get('english')&&[...$('#english').options].some(o=>o.value===p.get('english')))$('#english').value=p.get('english');
  state.intent=inferIntent();
}

function syncUrl(){
  state.intent=inferIntent();
  const p=new URLSearchParams(location.search);
  const setOrDelete=(key,value,defaultValue='')=>value&&value!==defaultValue?p.set(key,value):p.delete(key);
  setOrDelete('q',$('#keyword').value.trim());
  setOrDelete('category',category.value,'all');
  setOrDelete('min_pay',$('#minPay').value,'0');
  setOrDelete('english',$('#english').value,'all');
  p.set('japan',($('#onlyJapan').checked||state.quick.has('japan'))?'1':'0');
  state.quick.has('remote')||$('#onlyRemote').checked?p.set('remote','1'):p.delete('remote');
  state.quick.has('japanese')?p.set('japanese','1'):p.delete('japanese');
  state.quick.has('usd')?p.set('usd','1'):p.delete('usd');
  state.intent!=='general'?p.set('intent',state.intent):p.delete('intent');
  const query=p.toString();
  history.replaceState(null,'',`${location.pathname}${query?`?${query}`:''}${location.hash}`);
}

function payText(j){
  if(!j.payMin)return '報酬要確認';
  const symbol=j.currency==='USD'?'$':'';
  const max=j.payMax&&j.payMax!==j.payMin?`–${symbol}${j.payMax}`:'';
  return `${symbol}${j.payMin}${max}/${j.period==='hour'?'hr':j.period||''}`;
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
}

function card(j){
  const official=validOfficialDestination(j);
  const cta=j.japan?'Japan eligible確認済み → 公式求人':'公式求人で条件を確認';
  const accessibleCta=`${cta}：${j.title||'求人'}（新しいタブで公式サイトを開く）`;
  const link=official
    ?`<a class="official-apply" href="${escapeHtml(j.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(accessibleCta)}" data-job-id="${escapeHtml(j.id||'')}" data-source="${escapeHtml(j.source||'')}" data-score="${actionabilityScore(j,state.intent)}">${cta} ↗</a>`
    :'<span class="verified">Official destination 要確認</span>';
  const source=j.source?`Source: ${escapeHtml(j.source)}`:'Official source';
  return `<article class="job-card" data-intent="${escapeHtml(state.intent)}"><div><div class="job-top">${j.japan?'<span class="pill good">JAPAN ELIGIBLE</span>':''}${j.remote==='remote'?'<span class="pill">REMOTE</span>':''}${j.japanese?'<span class="pill">JAPANESE</span>':''}<span class="pill">${escapeHtml(j.category||'Other')}</span></div><h3>${escapeHtml(j.title)}</h3><div class="employer">${escapeHtml(j.employer)} · ${escapeHtml(j.location||'Location not specified')}</div><div class="job-meta"><div><span>English</span> ${escapeHtml(j.english||'要確認')}</div><div><span>Currency</span> ${escapeHtml(j.currency||'—')}</div><div><span>Status</span> ${escapeHtml(j.status||'VERIFIED ACTIVE')}</div></div></div><div class="job-action"><div class="pay">${payText(j)}</div><span class="freshness">${escapeHtml(freshnessText(j))}</span><span class="verified">${source}</span>${link}</div></article>`;
}

function filtered(){
  const q=$('#keyword').value.trim().toLowerCase();
  const cat=category.value;
  const min=Number($('#minPay').value);
  const eng=$('#english').value;
  const onlyJapan=$('#onlyJapan').checked||state.quick.has('japan');
  const onlyRemote=$('#onlyRemote').checked||state.quick.has('remote');
  return jobs.filter(j=>{
    if(q&&!jobText(j).includes(q))return false;
    if(cat!=='all'&&j.category!==cat)return false;
    if(min&&(!j.payMin||j.payMin<min))return false;
    if(eng!=='all'&&(!j.english||(ranks[j.english]??-1)<ranks[eng]))return false;
    if(onlyJapan&&!j.japan)return false;
    if(onlyRemote&&j.remote!=='remote')return false;
    if(state.quick.has('japanese')&&!j.japanese)return false;
    if(state.quick.has('usd')&&j.currency!=='USD')return false;
    return true;
  });
}

function render(){
  const data=sortActionable(filtered());
  const visible=data.slice(0,state.visibleLimit);
  $('#jobsList').innerHTML=visible.map(card).join('');
  $('#resultCount').textContent=data.length;
  const failed=uiState.dataset==='error'||uiState.dataset==='loading';
  const empty=$('#emptyState');
  empty.hidden=failed||data.length>0;
  if(!empty.hidden){
    const datasetEmpty=jobs.length===0;
    empty.querySelector('strong').textContent=datasetEmpty?'現在、確認済み求人はありません':'一致する求人がありません';
    empty.querySelector('p').textContent=datasetEmpty?'データ更新後に再確認してください。':'条件を広げてください。';
  }
  const loadMore=$('#loadMore');
  loadMore.hidden=failed||data.length<=visible.length;
  if(!loadMore.hidden)loadMore.textContent=`さらに${Math.min(30,data.length-visible.length)}件を見る（残り${data.length-visible.length}件）`;
}

function metrics(){
  const active=jobs.filter(j=>(j.status||'').includes('ACTIVE')).length;
  const jp=jobs.filter(j=>j.japan).length;
  const remote=jobs.filter(j=>j.remote==='remote').length;
  $('#metricJobs').textContent=active;
  $('#metricJapan').textContent=jp;
  $('#metricRemote').textContent=remote;
  $('#metricFresh').textContent=latestCheckText();
  decisionGuide();
}

function decisionGuide(){
  const signal=$('#decisionSignal');
  const meaning=$('#decisionMeaning');
  const risk=$('#decisionRisk');
  if(!signal||!meaning||!risk)return;
  const active=jobs.filter(j=>(j.status||'').includes('ACTIVE')).length;
  const jp=jobs.filter(j=>j.japan&&(j.status||'').includes('ACTIVE')).length;
  const remote=jobs.filter(j=>j.remote==='remote'&&(j.status||'').includes('ACTIVE')).length;
  const remoteUnconfirmed=jobs.filter(j=>j.remote==='remote'&&!j.japan&&(j.status||'').includes('ACTIVE')).length;
  signal.textContent=active?`確認済みActive ${active}件 / Japan eligible ${jp}件`:'確認済み求人データを確認中';
  meaning.textContent=jp?`日本から応募できる根拠を確認した ${jp}件を優先表示。`:'Japan eligibleの確認を応募判断の中心にします。';
  risk.textContent=remote?`Remote ${remote}件のうちJapan eligible未確認 ${remoteUnconfirmed}件。Remote表記だけでは応募可否を判断しません。`:'Remote・Worldwide・Japan eligibleは別条件として扱います。';
}

function marketSignal(){
  const section=$('#marketSignal');
  const title=$('#marketSignalTitle');
  const body=$('#marketSignalBody');
  const meta=$('#marketSignalMeta');
  const link=$('#marketSignalLink');
  if(!section||!title||!body||!meta||!link)return;
  const candidates=sortActionable(jobs.filter(j=>j.japan&&validOfficialDestination(j)&&(j.status||'').includes('ACTIVE')));
  if(!candidates.length){section.hidden=true;return;}
  const top=candidates[0];
  title.textContent=`直近確認：${top.employer}「${top.title}」`;
  const pay=top.payMin?`・${payText(top)}`:'';
  body.textContent=`Japan eligible${top.remote==='remote'?'・Remote':''}${top.japanese?'・Japanese':''}${pay}。応募可否・公式応募先・確認鮮度・現在Intentを優先して表示しています。`;
  meta.textContent=`${freshnessText(top)} · ${top.source?`Source ${top.source}`:'official-source route'} · Intent ${INTENTS[state.intent]?.label||state.intent}`;
  link.href=top.url;
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.textContent='この求人を公式で確認する ↗';
  link.setAttribute('aria-label',`この求人を公式で確認する：${top.title}（新しいタブで公式サイトを開く）`);
  link.dataset.jobId=top.id||'';
  link.dataset.source=top.source||'';
  link.dataset.score=String(actionabilityScore(top,state.intent));
  section.hidden=false;
}

function eligibilityGap(){
  const section=$('#eligibilityGap');
  const title=$('#eligibilityGapTitle');
  const body=$('#eligibilityGapBody');
  const meta=$('#eligibilityGapMeta');
  if(!section||!title||!body||!meta)return;
  const remote=jobs.filter(j=>j.remote==='remote');
  const japanRemote=remote.filter(j=>j.japan);
  const remoteHourly=remote.filter(j=>j.currency==='USD'&&j.period==='hour'&&Number(j.payMin)>0);
  const japanHourly=remoteHourly.filter(j=>j.japan);
  const unconfirmedHourly=remoteHourly.filter(j=>!j.japan);
  if(!remote.length||!japanRemote.length){section.hidden=true;return;}
  const japanTop=japanHourly.sort((a,b)=>Number(b.payMin)-Number(a.payMin))[0];
  const unconfirmedTop=unconfirmedHourly.sort((a,b)=>Number(b.payMin)-Number(a.payMin))[0];
  const remoteWithoutJapan=Math.max(0,remote.length-japanRemote.length);
  title.textContent=`Remote ${remote.length}件のうち、Japan eligible確認済みは ${japanRemote.length}件`;
  if(unconfirmedTop&&japanTop&&Number(unconfirmedTop.payMin)>Number(japanTop.payMin)){
    const gap=Number(unconfirmedTop.payMin)-Number(japanTop.payMin);
    body.textContent=`「Remote」だけでは日本から応募できるとは限りません。Japan eligible未確認のRemote時給案件には最高 $${unconfirmedTop.payMin}/hr のSignalがありますが、確認済みJapan eligible側の最高は $${japanTop.payMin}/hr。見かけの高単価と実際に応募できる高単価を分けて測ります。`;
    meta.textContent=`Japan eligible未確認Remote ${remoteWithoutJapan}件 · observed pay gap $${gap}/hr · GWR verified dataset only`;
  }else{
    body.textContent='「Remote」表記だけで日本から応募できると判断せず、勤務地・応募地域・公式ソースを分けて確認します。GWRはRemoteとJapan eligibleを別のSignalとして扱います。';
    meta.textContent=`Japan eligible未確認Remote ${remoteWithoutJapan}件 · GWR verified dataset only`;
  }
  section.hidden=false;
}

function setupRevenuePartner(){
  const config=window.GWR_REVENUE;
  const section=$('#revenuePartner');
  const link=$('#revenuePartnerLink');
  const disclosure=$('#revenueDisclosure');
  if(!section||!link||!config?.enabled||!config.affiliateUrl)return;
  try{
    const url=new URL(config.affiliateUrl);
    if(url.protocol!=='https:')return;
    link.href=url.toString();
  }catch{return;}
  disclosure.textContent=config.disclosure||'';
  section.hidden=false;
  link.addEventListener('click',()=>{
    const event={event:'gwr_revenue_click',partner:config.partner,campaign:config.campaign,ts:new Date().toISOString()};
    try{
      const prior=JSON.parse(localStorage.getItem('gwr_revenue_clicks')||'[]');
      prior.push(event);
      localStorage.setItem('gwr_revenue_clicks',JSON.stringify(prior.slice(-50)));
    }catch{}
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push(event);
    track('gwr_revenue_click',{partner:config.partner,campaign:config.campaign,intent:state.intent});
  });
}

function refreshFromControl(trigger){
  state.visibleLimit=30;
  state.intent=inferIntent();
  render();
  marketSignal();
  syncUrl();
  trackSearch(trigger);
}

installCapabilityUI();

['keyword','category','minPay','english','onlyJapan','onlyRemote'].forEach(id=>$('#'+id).addEventListener('input',()=>refreshFromControl('filter_change')));

$('#searchButton').addEventListener('click',()=>{
  state.visibleLimit=30;
  state.intent=inferIntent();
  render();
  marketSignal();
  syncUrl();
  clearTimeout(searchTrackTimer);
  track('gwr_search',searchProperties('search_button'));
  scrollToJobs();
});

document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  const f=btn.dataset.filter;
  state.quick.has(f)?state.quick.delete(f):state.quick.add(f);
  updateQuickUI();
  refreshFromControl('quick_filter');
}));

$('#resetFilters').addEventListener('click',()=>{
  $('#keyword').value='';category.value='all';$('#minPay').value='0';$('#english').value='all';$('#onlyJapan').checked=false;$('#onlyRemote').checked=false;
  state.quick=new Set(['japan']);
  state.intent='general';
  state.visibleLimit=30;
  updateQuickUI();
  render();
  marketSignal();
  syncUrl();
  trackSearch('reset_filters');
});

$('#loadMore').addEventListener('click',()=>{
  state.visibleLimit+=30;
  render();
  setDatasetState(uiState.dataset,`表示件数を ${Math.min(filtered().length,state.visibleLimit)}件まで拡大しました。`,{trackState:false});
});

function trackOfficialApply(link,trigger='job_card'){
  const props={
    trigger,
    intent:state.intent,
    job_id:link.dataset.jobId||null,
    source:link.dataset.source||null,
    actionability_score:Number(link.dataset.score)||null,
    destination_host:(()=>{try{return new URL(link.href).host}catch{return null}})()
  };
  track('gwr_outbound_click',props);
  track('gwr_official_apply_click',props);
}

$('#jobsList').addEventListener('click',event=>{
  const link=event.target.closest('.official-apply');
  if(!link)return;
  trackOfficialApply(link,'job_card');
});

$('#marketSignalLink')?.addEventListener('click',event=>{
  const link=event.currentTarget;
  if(!link?.href||link.getAttribute('href')==='#jobs')return;
  trackOfficialApply(link,'market_signal');
});

$('#eligibilityGapLink')?.addEventListener('click',event=>{
  event.preventDefault();
  state.quick.add('japan');
  state.quick.add('remote');
  state.intent='remote';
  state.visibleLimit=30;
  updateQuickUI();
  render();
  marketSignal();
  syncUrl();
  clearTimeout(searchTrackTimer);
  track('gwr_search',searchProperties('eligibility_gap'));
  scrollToJobs();
});

async function loadJobsData({retry=false}={}){
  uiState.invalidRecords=0;
  setDatasetState('loading',retry?'求人データを再読み込み中…':'求人データを読み込み中…');
  renderSkeleton();
  try{
    const res=await fetch('./data/verified-jobs.json',{cache:'no-store'});
    if(!res.ok)throw new Error(`verified jobs fetch failed: ${res.status}`);
    const payload=await res.json();
    const raw=Array.isArray(payload.records)?payload.records:[];
    const usable=raw.filter(j=>j&&typeof j==='object'&&String(j.title||'').trim());
    uiState.invalidRecords=Math.max(0,raw.length-usable.length);
    jobs=usable;
    track('gwr_jobs_loaded',{
      job_count:jobs.length,
      generated_at:payload.generated_at||null,
      official_destination_count:jobs.filter(validOfficialDestination).length,
      fresh_7d_count:jobs.filter(j=>ageDays(j)<=7).length,
      invalid_record_count:uiState.invalidRecords
    });
    rebuildCategories();
    if(!retry)applyUrlState();
    updateQuickUI();
    metrics();
    render();
    marketSignal();
    eligibilityGap();
    if(uiState.invalidRecords){
      setDatasetState('partial',`確認済み求人 ${jobs.length}件を表示。形式不備 ${uiState.invalidRecords}件は安全のため除外しました。`);
    }else if(!jobs.length){
      setDatasetState('empty','現在、表示できる確認済み求人は0件です。データ更新後に再確認してください。');
    }else{
      setDatasetState('success',`確認済み求人 ${jobs.length}件を読み込みました。Japan eligible・公式Source・鮮度を優先表示しています。`);
    }
    return true;
  }catch(error){
    console.error(error);
    jobs=[];
    rebuildCategories();
    metrics();
    setDatasetState('error','求人データを取得できませんでした。通信状態を確認して再試行してください。',{retry:true});
    render();
    marketSignal();
    eligibilityGap();
    track('gwr_jobs_load_failed',{message:String(error?.message||error),retry});
    return false;
  }
}

$('#retryJobs')?.addEventListener('click',()=>{
  track('gwr_jobs_retry',{previous_state:uiState.dataset});
  loadJobsData({retry:true});
});

async function init(){
  await loadJobsData();
  setupRevenuePartner();
  trackVisitQuality();
  track('gwr_intent_resolved',{intent:state.intent,result_count:filtered().length});
}

init();