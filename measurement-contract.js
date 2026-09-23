/*
 * GWR Applicant Evidence Measurement Contract v1
 *
 * Purpose:
 * Preserve the existing GWR application surface while closing the evidence gaps
 * between Job Card exposure, eligibility/intelligence interaction, official-source
 * navigation, apply intent, and revenue-bearing actions.
 *
 * This file is appended to the public app.js by the GWR deploy workflow.
 * Existing event names remain untouched for backward compatibility.
 */

(()=>{
  if(window.__gwrMeasurementContractV1)return;
  window.__gwrMeasurementContractV1=true;

  const viewedJobs=new Set();
  const viewedSignals=new Set();
  const pendingViewTimers=new WeakMap();

  function safeTrack(event,properties={}){
    try{
      if(typeof track==='function')track(event,{measurement_contract:'applicant_evidence_v1',...properties});
    }catch{}
  }

  function jobProps(link,trigger='job_card'){
    const card=link?.closest?.('.job-card');
    const cards=card?.parentElement?[...card.parentElement.querySelectorAll('.job-card')]:[];
    return {
      trigger,
      intent:card?.dataset?.intent||((typeof state!=='undefined'&&state?.intent)?state.intent:null),
      job_id:link?.dataset?.jobId||null,
      source:link?.dataset?.source||null,
      actionability_score:Number(link?.dataset?.score)||null,
      result_position:card?cards.indexOf(card)+1:null,
      destination_host:(()=>{try{return link?.href?new URL(link.href).host:null}catch{return null}})()
    };
  }

  function observeJobCards(root=document){
    if(!('IntersectionObserver'in window))return;
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        const card=entry.target;
        const link=card.querySelector('.official-apply');
        const jobId=link?.dataset?.jobId||null;
        if(!jobId||viewedJobs.has(jobId))return;
        if(entry.isIntersecting&&entry.intersectionRatio>=0.5){
          if(pendingViewTimers.has(card))return;
          const timer=setTimeout(()=>{
            if(!card.isConnected)return;
            const rect=card.getBoundingClientRect();
            const viewport=Math.max(document.documentElement.clientHeight||0,window.innerHeight||0);
            const visible=Math.min(rect.bottom,viewport)-Math.max(rect.top,0);
            if(visible>0&&visible>=Math.min(rect.height,viewport)*0.5){
              viewedJobs.add(jobId);
              safeTrack('gwr_job_view',{
                ...jobProps(link,'job_card'),
                view_threshold:0.5,
                minimum_view_ms:600
              });
            }
            pendingViewTimers.delete(card);
          },600);
          pendingViewTimers.set(card,timer);
        }else{
          const timer=pendingViewTimers.get(card);
          if(timer){clearTimeout(timer);pendingViewTimers.delete(card)}
        }
      });
    },{threshold:[0.5]});

    const attach=scope=>scope.querySelectorAll?.('.job-card').forEach(card=>{
      if(card.dataset.gwrViewObserved==='1')return;
      card.dataset.gwrViewObserved='1';
      observer.observe(card);
    });

    attach(root);
    const jobsList=document.querySelector('#jobsList');
    if(jobsList){
      new MutationObserver(()=>attach(jobsList)).observe(jobsList,{childList:true,subtree:true});
    }
  }

  function observeSignal(selector,signal){
    const el=document.querySelector(selector);
    if(!el||!('IntersectionObserver'in window))return;
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting||entry.intersectionRatio<0.5||viewedSignals.has(signal)||el.hidden)return;
        viewedSignals.add(signal);
        safeTrack('gwr_intelligence_signal_view',{
          signal,
          intent:(typeof state!=='undefined'&&state?.intent)?state.intent:null,
          view_threshold:0.5
        });
        observer.disconnect();
      });
    },{threshold:[0.5]});
    observer.observe(el);
  }

  document.addEventListener('click',event=>{
    const official=event.target.closest?.('.official-apply,#marketSignalLink');
    if(official&&official.href&&official.getAttribute('href')!=='#jobs'){
      const trigger=official.id==='marketSignalLink'?'market_signal':'job_card';
      const props=jobProps(official,trigger);
      safeTrack('gwr_official_source_click',props);
      safeTrack('gwr_apply_click',props);
    }

    const eligibility=event.target.closest?.('#eligibilityGapLink,[data-filter="japan"]');
    if(eligibility){
      setTimeout(()=>safeTrack('gwr_eligibility_check',{
        trigger:eligibility.id==='eligibilityGapLink'?'eligibility_gap':'quick_filter',
        intent:(typeof state!=='undefined'&&state?.intent)?state.intent:null,
        japan_filter_active:(typeof state!=='undefined'&&state?.quick)?state.quick.has('japan'):null
      }),0);
    }

    const intelligence=event.target.closest?.('#eligibilityGapLink,#marketSignalLink');
    if(intelligence){
      safeTrack('gwr_intelligence_interest_click',{
        signal:intelligence.id==='eligibilityGapLink'?'eligibility_gap':'market_signal',
        intent:(typeof state!=='undefined'&&state?.intent)?state.intent:null
      });
    }

    const revenue=event.target.closest?.('#revenuePartnerLink');
    if(revenue){
      safeTrack('gwr_revenue_bearing_action',{
        trigger:'revenue_partner',
        intent:(typeof state!=='undefined'&&state?.intent)?state.intent:null,
        destination_host:(()=>{try{return new URL(revenue.href).host}catch{return null}})()
      });
    }
  },true);

  document.querySelector('#onlyJapan')?.addEventListener('change',event=>{
    safeTrack('gwr_eligibility_check',{
      trigger:'japan_checkbox',
      intent:(typeof state!=='undefined'&&state?.intent)?state.intent:null,
      japan_filter_active:Boolean(event.currentTarget.checked)
    });
  });

  const start=()=>{
    observeJobCards(document);
    observeSignal('#marketSignal','market_signal');
    observeSignal('#eligibilityGap','eligibility_gap');
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
