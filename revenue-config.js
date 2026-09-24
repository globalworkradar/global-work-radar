window.GWR_REVENUE = Object.freeze({
  enabled: false,
  partner: 'Deel',
  affiliateUrl: '',
  disclosure: 'このリンク経由で申込みが成立した場合、Global Work Radarが紹介料を受け取ることがあります。',
  campaign: 'gwr_deel_2026_09'
});

window.GWR_INTELLIGENCE_SIGNAL = Object.freeze({
  id: 'remote-vs-japan-eligibility-2026-09-25',
  theme: 'Remote vs Japan Eligibility',
  asOf: '2026-09-24T16:30:17.781Z',
  activeJobs: 166653,
  remoteJobs: 47500,
  japanEligibleJobs: 630,
  japaneseRelatedJobs: 768,
  remoteSharePct: 28.50,
  japanEligibleSharePct: 0.38,
  source: 'Workable market snapshot',
  scope: 'GWR-observed Workable market only',
  score: 94,
  route: 'PAID_CONTRACT_CANDIDATE'
});

(function setupBuyerAttribution() {
  const buyers = Object.freeze({
    jobasia: 'JOBAsia',
    japan_hire: 'Japan Hire',
    advanced_talent: 'ADVANCED Talent',
    jac_international: 'JAC International',
    beacon_associates: 'BEACON Associates',
    hrog: 'HRog'
  });
  const storageKey = 'gwr_buyer_attribution_v1';
  const ttlMs = 30 * 24 * 60 * 60 * 1000;
  const params = new URLSearchParams(window.location.search);
  const requestedBuyer = String(params.get('gwr_buyer') || params.get('buyer') || '').trim().toLowerCase();
  const now = Date.now();
  let current = null;

  if (buyers[requestedBuyer]) {
    current = {
      buyer_key: requestedBuyer,
      buyer_label: buyers[requestedBuyer],
      attribution_source: 'url_param',
      attribution_campaign: params.get('utm_campaign') || 'gwr_buyer_reaction',
      attribution_channel: params.get('utm_source') || 'qualified_buyer_exposure',
      captured_at: new Date(now).toISOString()
    };
    try { localStorage.setItem(storageKey, JSON.stringify(current)); } catch (_) {}
  } else {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const capturedAt = stored?.captured_at ? Date.parse(stored.captured_at) : NaN;
      if (stored && buyers[stored.buyer_key] && Number.isFinite(capturedAt) && now - capturedAt <= ttlMs) {
        current = { ...stored, attribution_source: 'persisted' };
      } else if (stored) {
        localStorage.removeItem(storageKey);
      }
    } catch (_) {}
  }

  const base = `${window.location.origin}${window.location.pathname}`;
  const campaign = 'gwr_buyer_reaction_202609';
  const links = Object.freeze(Object.fromEntries(Object.keys(buyers).map((buyerKey) => [
    buyerKey,
    `${base}?gwr_buyer=${encodeURIComponent(buyerKey)}&utm_source=qualified_buyer_exposure&utm_campaign=${encodeURIComponent(campaign)}`
  ])));

  window.GWR_BUYER_ATTRIBUTION = Object.freeze({
    buyers,
    current: current ? Object.freeze(current) : null,
    links
  });
}());

function gwrAttributionProperties() {
  const qa = new URLSearchParams(window.location.search).get('gwr_qa') === '1';
  const current = window.GWR_BUYER_ATTRIBUTION?.current;
  return {
    gwr_qa: qa,
    buyer_attributed: Boolean(current),
    buyer_key: current?.buyer_key || null,
    buyer_label: current?.buyer_label || null,
    attribution_source: current?.attribution_source || 'unattributed',
    attribution_campaign: current?.attribution_campaign || null,
    attribution_channel: current?.attribution_channel || null
  };
}

(function setupCommercialStyles() {
  if (document.querySelector('#gwrCommercialStyles')) return;
  const style = document.createElement('style');
  style.id = 'gwrCommercialStyles';
  style.textContent = `
    #laborIntelligenceSignal.gwr-intelligence-offer{max-width:calc(var(--max) - 104px);margin:10px auto 30px;grid-template-columns:minmax(0,1fr) 300px;gap:32px;border-color:#50614c;background:radial-gradient(circle at 85% 25%,rgba(244,201,107,.13),transparent 28%),radial-gradient(circle at 10% 85%,rgba(104,226,194,.09),transparent 30%),linear-gradient(135deg,#102133,#0a1927)}
    #laborIntelligenceSignal.gwr-intelligence-offer:before{content:'GWR PRO';position:absolute;right:22px;top:18px;color:rgba(244,201,107,.18);font:800 42px/1 Inter,sans-serif;letter-spacing:-.06em;pointer-events:none}
    .gwr-commercial-badge{display:inline-flex;align-items:center;gap:7px;margin-bottom:13px;padding:6px 8px;border:1px solid #655c38;border-radius:7px;background:rgba(89,71,30,.18);color:#e8c56e;font-size:8px;font-weight:800;letter-spacing:.14em}.gwr-commercial-badge:before{content:'◆';font-size:6px}
    #laborIntelligenceSignal .gwr-intelligence-copy h2{max-width:780px;font-size:clamp(25px,3vw,40px);margin-top:7px}#laborIntelligenceSignal .gwr-intelligence-copy p strong{color:#f1d48c}
    .gwr-offer-points{display:flex;flex-wrap:wrap;gap:7px;margin:15px 0 4px}.gwr-offer-points span{padding:6px 8px;border:1px solid #30475a;border-radius:7px;background:rgba(8,22,35,.65);color:#91a9bf;font-size:8px;font-weight:700;letter-spacing:.04em}
    .gwr-intelligence-action{position:relative;z-index:2;display:flex;flex-direction:column;align-items:stretch;padding:18px;border:1px solid #4d5139;border-radius:16px;background:linear-gradient(160deg,rgba(30,36,36,.94),rgba(13,26,36,.96));box-shadow:0 16px 40px rgba(0,0,0,.18)}
    .gwr-intelligence-action>strong{color:#e5c872;font-size:8px;letter-spacing:.14em}.gwr-intelligence-action>span{margin:8px 0 12px;color:#a9b9c7;font-size:11px;line-height:1.55}
    .gwr-reaction-options{display:grid;gap:7px}.gwr-reaction-option{min-height:38px;padding:8px 10px;border:1px solid #4c5660;border-radius:10px;background:#101923;color:#dce7ef;font:700 10px/1.3 'Noto Sans JP',sans-serif;text-align:left;cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}.gwr-reaction-option:hover,.gwr-reaction-option:focus-visible{transform:translateY(-1px);border-color:#8d7435;background:#17212a;outline:none}.gwr-reaction-option[aria-pressed='true']{border-color:#8de6c0;background:rgba(31,78,65,.45);color:#dffbef}.gwr-reaction-option:disabled{cursor:default;opacity:.82;transform:none}
    .gwr-reaction-status{min-height:18px;margin-top:9px;color:#8de6c0!important;font-size:9px!important;line-height:1.45;text-align:left!important}.gwr-intelligence-action>small{margin-top:7px;color:#687b8c;font-size:8px;text-align:left}
    .gwr-inquiry-step{margin-top:13px;padding-top:13px;border-top:1px solid #34414b}.gwr-inquiry-step[hidden]{display:none}.gwr-inquiry-step>strong{display:block;color:#f0d37c;font-size:8px;letter-spacing:.14em}.gwr-inquiry-step>p{margin:7px 0 10px;color:#93a4b3;font-size:9px;line-height:1.55}.gwr-inquiry-options{display:grid;gap:7px}.gwr-inquiry-option{min-height:42px;padding:9px 10px;border:1px solid #6a623f;border-radius:10px;background:linear-gradient(145deg,#171c20,#111923);color:#f0e7c7;font:800 10px/1.35 'Noto Sans JP',sans-serif;text-align:left;cursor:pointer}.gwr-inquiry-option:hover,.gwr-inquiry-option:focus-visible{border-color:#d7b95f;background:#20231f;outline:3px solid #b7f4da;outline-offset:2px}.gwr-inquiry-option[aria-pressed='true']{border-color:#8de6c0;background:rgba(31,78,65,.45);color:#e1fff2}.gwr-inquiry-option:disabled{cursor:default;opacity:.9}.gwr-inquiry-status{min-height:18px;margin-top:9px;color:#8de6c0;font-size:9px;line-height:1.5}
    @media(max-width:820px){#laborIntelligenceSignal.gwr-intelligence-offer{max-width:calc(100% - 40px);grid-template-columns:1fr}#laborIntelligenceSignal .gwr-intelligence-action{grid-column:1}}
    @media(max-width:430px){#laborIntelligenceSignal.gwr-intelligence-offer{max-width:calc(100% - 28px);padding:20px}#laborIntelligenceSignal.gwr-intelligence-offer:before{font-size:30px}}
  `;
  document.head.appendChild(style);
}());

(async function setupIntelligencePreview() {
  let signal = window.GWR_INTELLIGENCE_SIGNAL;
  try {
    const response = await fetch('./data/workable-market.json', { cache: 'no-store' });
    if (response.ok) {
      const market = await response.json();
      const activeJobs = Number(market.active_jobs);
      const remoteJobs = Number(market.remote_jobs);
      const japanEligibleJobs = Number(market.verified_japan_eligible_jobs);
      const japaneseRelatedJobs = Number(market.japanese_jobs);
      if ([activeJobs, remoteJobs, japanEligibleJobs, japaneseRelatedJobs].every(Number.isFinite) && activeJobs > 0) {
        signal = Object.freeze({
          ...signal,
          id: `remote-vs-japan-eligibility-${String(market.snapshot_at || '').slice(0, 10) || 'current'}`,
          asOf: market.snapshot_at || signal.asOf,
          activeJobs,
          remoteJobs,
          japanEligibleJobs,
          japaneseRelatedJobs,
          remoteSharePct: Number(((remoteJobs / activeJobs) * 100).toFixed(2)),
          japanEligibleSharePct: Number(((japanEligibleJobs / activeJobs) * 100).toFixed(2))
        });
        window.GWR_INTELLIGENCE_SIGNAL = signal;
      }
    }
  } catch (_) {
    // Keep the last verified embedded snapshot when live market data cannot be loaded.
  }
  const summary = document.querySelector('#marketSummary');
  if (!summary || document.querySelector('#laborIntelligenceSignal')) return;

  const section = document.createElement('section');
  section.id = 'laborIntelligenceSignal';
  section.className = 'partner-section gwr-intelligence-offer';
  section.setAttribute('aria-label', 'Global Work Radar labor intelligence buyer reaction');
  section.innerHTML = `
    <div class="gwr-intelligence-copy">
      <div class="gwr-commercial-badge">B2B LABOR INTELLIGENCE</div>
      <span class="kicker">LABOR INTELLIGENCE · SCORE ${signal.score}/100</span>
      <h2>Remote求人と「日本から応募可能」を、同じ数字として扱わない。</h2>
      <p>GWRが2026年9月25日JST時点で観測したWorkable市場では、Active <strong>${signal.activeJobs.toLocaleString()}件</strong>のうちRemoteは <strong>${signal.remoteJobs.toLocaleString()}件（${signal.remoteSharePct}%）</strong>。一方、日本から応募可能と明示確認できた求人は <strong>${signal.japanEligibleJobs.toLocaleString()}件（${signal.japanEligibleSharePct}%）</strong>でした。Remote表記とJapan-eligibleは別のEvidence Layerとして扱います。</p>
      <div class="gwr-offer-points" aria-label="Intelligence scope examples"><span>JAPAN ELIGIBILITY</span><span>REMOTE GAP</span><span>LANGUAGE DEMAND</span><span>CUSTOM SEGMENT</span><span>FRESH SIGNALS</span></div>
      <small class="partner-disclosure">対象はGWRが観測したWorkable市場のSnapshotであり、世界求人市場全体を代表する統計ではありません。求人掲載の存在から採用確率・応募受理・収入は推定しません。As of 2026-09-25 JST.</small>
    </div>
    <div class="gwr-intelligence-action">
      <strong>WHAT WOULD MAKE THIS USEFUL?</strong>
      <span>メール送信なし。欲しい使い方を1つ選ぶだけで、GWRの次の改善に反映します。</span>
      <div class="gwr-reaction-options" role="group" aria-label="Buyer reaction options">
        <button type="button" class="gwr-reaction-option" data-reaction="recurring">定期的に欲しい</button>
        <button type="button" class="gwr-reaction-option" data-reaction="hiring_decision">採用判断に使いたい</button>
        <button type="button" class="gwr-reaction-option" data-reaction="client_advisory">Client Advisoryに使いたい</button>
        <button type="button" class="gwr-reaction-option" data-reaction="more_detail">もっと詳しいデータが欲しい</button>
      </div>
      <div class="gwr-reaction-status" id="gwrReactionStatus" aria-live="polite"></div>
      <div class="gwr-inquiry-step" id="gwrInquiryStep" hidden>
        <strong>NEXT · COMMERCIAL INQUIRY</strong>
        <p>ここからは単なるReactionではなく、GWR Paid Intelligenceへの明示的な問い合わせとして記録します。</p>
        <div class="gwr-inquiry-options" role="group" aria-label="Commercial inquiry options">
          <button type="button" class="gwr-inquiry-option" data-inquiry="paid_pilot">Paid Pilotを検討したい</button>
          <button type="button" class="gwr-inquiry-option" data-inquiry="custom_sample">自社向けSampleを見たい</button>
          <button type="button" class="gwr-inquiry-option" data-inquiry="commercial_terms">契約条件を確認したい</button>
        </div>
        <div class="gwr-inquiry-status" id="gwrInquiryStatus" aria-live="polite"></div>
      </div>
      <small>Reaction / inquiry evidence only · no email · no account required</small>
    </div>
  `;
  summary.insertAdjacentElement('afterend', section);

  const reactionEventMap = Object.freeze({
    recurring: 'gwr_reaction_recurring',
    hiring_decision: 'gwr_reaction_hiring_decision',
    client_advisory: 'gwr_reaction_client_advisory',
    more_detail: 'gwr_reaction_more_detail'
  });

  section.querySelectorAll('.gwr-reaction-option').forEach((button) => {
    button.addEventListener('click', () => {
      const reaction = button.dataset.reaction || 'unknown';
      const properties = {
        product: 'global-work-radar',
        signal_id: signal.id,
        theme: signal.theme,
        score: signal.score,
        route: signal.route,
        source: signal.source,
        scope: signal.scope,
        reaction,
        commercial_intent: true,
        evidence_stage: 'buyer_reaction',
        ...gwrAttributionProperties()
      };
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture('gwr_buyer_reaction', properties);
        window.posthog.capture('gwr_intelligence_interest_click', properties);
        if (reactionEventMap[reaction]) window.posthog.capture(reactionEventMap[reaction], properties);
      }
      section.querySelectorAll('.gwr-reaction-option').forEach((item) => {
        const selected = item === button;
        item.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      const status = section.querySelector('#gwrReactionStatus');
      if (status) status.textContent = '反応を記録しました。商談意向がある場合は次の1項目だけ選べます。';
      const inquiryStep = section.querySelector('#gwrInquiryStep');
      if (inquiryStep) {
        inquiryStep.hidden = false;
        inquiryStep.dataset.reactionContext = reaction;
      }
    });
  });

  let inquirySubmitted = false;
  section.querySelectorAll('.gwr-inquiry-option').forEach((button) => {
    button.addEventListener('click', () => {
      if (inquirySubmitted) return;
      inquirySubmitted = true;
      const inquiry = button.dataset.inquiry || 'unknown';
      const inquiryStep = section.querySelector('#gwrInquiryStep');
      const reactionContext = inquiryStep?.dataset.reactionContext || null;
      const attribution = gwrAttributionProperties();
      const recoveryQualified = attribution.buyer_attributed === true;
      const evidence = {
        product: 'global-work-radar',
        signal_id: signal.id,
        theme: signal.theme,
        score: signal.score,
        route: signal.route,
        source: signal.source,
        scope: signal.scope,
        inquiry,
        reaction_context: reactionContext,
        commercial_intent: true,
        evidence_stage: 'buyer_inquiry',
        evidence_timestamp: new Date().toISOString(),
        evidence_channel: attribution.attribution_channel || 'site_direct',
        evidence_action: inquiry,
        evidence_asset: 'laborIntelligenceSignal',
        evidence_url: window.location.href.split('#')[0],
        recovery_qualified: recoveryQualified,
        recovery_status: recoveryQualified ? 'explicit_inquiry' : 'unattributed_intent',
        revenue_distance: 'inquiry_to_contract',
        ...attribution
      };
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture('gwr_buyer_inquiry', evidence);
        if (inquiry === 'paid_pilot') window.posthog.capture('gwr_paid_pilot_request', evidence);
        if (inquiry === 'custom_sample') window.posthog.capture('gwr_custom_sample_request', evidence);
        if (inquiry === 'commercial_terms') window.posthog.capture('gwr_commercial_terms_request', evidence);
        if (recoveryQualified) window.posthog.capture('gwr_buyer_reaction_recovered', evidence);
      }
      section.querySelectorAll('.gwr-inquiry-option').forEach((item) => {
        const selected = item === button;
        item.setAttribute('aria-pressed', selected ? 'true' : 'false');
        item.disabled = true;
      });
      const status = section.querySelector('#gwrInquiryStatus');
      if (status) status.textContent = recoveryQualified
        ? '明示的な問い合わせを記録しました。Buyer identity・時刻・Channel・Action・URLをRecovery evidenceとして保存しました。'
        : '問い合わせ意向を記録しました。Buyer identityがないためRecovery Completeにはしません。';
    });
  });

  if (window.posthog && typeof window.posthog.capture === 'function' && 'IntersectionObserver' in window) {
    let sent = false;
    const observer = new IntersectionObserver((entries) => {
      if (sent || !entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) return;
      sent = true;
      window.posthog.capture('gwr_intelligence_signal_view', {
        product: 'global-work-radar', signal_id: signal.id, theme: signal.theme, score: signal.score,
        route: signal.route, source: signal.source, scope: signal.scope, buyer_reaction_available: true,
        ...gwrAttributionProperties()
      });
      observer.disconnect();
    }, { threshold: [0.35] });
    observer.observe(section);
  }
}());

(function setupRevenuePump() {
  const qa = new URLSearchParams(window.location.search).get('gwr_qa') === '1';
  const toNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

  function selectNextAction(metrics = {}) {
    const verifiedRevenue = toNumber(metrics.verifiedRevenue);
    const revenueClicks = toNumber(metrics.revenueClicks);
    const buyerInquiries = toNumber(metrics.buyerInquiries);
    const buyerReactions = toNumber(metrics.buyerReactions);
    const intelligenceLeadClicks = toNumber(metrics.intelligenceLeadClicks);
    const officialApplyClicks = toNumber(metrics.officialApplyClicks);
    const jobCardViews = toNumber(metrics.jobCardViews);
    const jobsSectionViews = toNumber(metrics.jobsSectionViews);
    const searches = toNumber(metrics.searches);
    const visits = toNumber(metrics.visits);
    const partnerEnabled = metrics.partnerEnabled === true;

    if (verifiedRevenue > 0) return Object.freeze({ state: 'WINNER_AMPLIFICATION', priority: 100 });
    if (revenueClicks > 0) return Object.freeze({ state: 'MONETIZATION_VERIFY', priority: 97 });
    if (buyerInquiries > 0) return Object.freeze({ state: 'BUYER_INQUIRY_VERIFY', priority: 96 });
    if (buyerReactions > 0) return Object.freeze({ state: 'BUYER_REACTION_VERIFY', priority: 94 });
    if (intelligenceLeadClicks > 0) return Object.freeze({ state: 'PAID_INTELLIGENCE_VERIFY', priority: 93 });
    if (officialApplyClicks > 0 && !partnerEnabled) return Object.freeze({ state: 'MONETIZATION_GATE', priority: 90 });
    if (jobCardViews > 0 && officialApplyClicks === 0) return Object.freeze({ state: 'CARD_TO_APPLY', priority: 86 });
    if (jobsSectionViews > 0 && jobCardViews === 0) return Object.freeze({ state: 'SECTION_TO_CARD', priority: 83 });
    if (visits > 0 && jobsSectionViews === 0) return Object.freeze({ state: 'VISIT_TO_JOBS', priority: 80 });
    if (searches > 0 && officialApplyClicks === 0) return Object.freeze({ state: 'SEARCH_TO_APPLY', priority: 78 });
    return Object.freeze({ state: 'QUALIFIED_ACQUISITION', priority: 70 });
  }

  window.GWR_REVENUE_PUMP = Object.freeze({
    selectNextAction,
    priorityOrder: Object.freeze(['WINNER_AMPLIFICATION','MONETIZATION_VERIFY','BUYER_INQUIRY_VERIFY','BUYER_REACTION_VERIFY','PAID_INTELLIGENCE_VERIFY','MONETIZATION_GATE','CARD_TO_APPLY','SECTION_TO_CARD','VISIT_TO_JOBS','SEARCH_TO_APPLY','QUALIFIED_ACQUISITION'])
  });

  if (!window.posthog || typeof window.posthog.capture !== 'function') return;
  let meaningfulAction = false;
  let stallTimer = null;
  const seen = new Set();

  function capture(event, properties = {}) {
    window.posthog.capture(event, {...properties, product:'global-work-radar', source:'global-work-radar', referrer:document.referrer || '$direct', ...gwrAttributionProperties()});
  }
  function markMeaningfulAction(){meaningfulAction=true;if(stallTimer){window.clearTimeout(stallTimer);stallTimer=null}}
  function observeOnce(selector,event){const element=document.querySelector(selector);if(!element||!('IntersectionObserver' in window))return;const observer=new IntersectionObserver((entries)=>{for(const entry of entries){if(!entry.isIntersecting||entry.intersectionRatio<0.35||seen.has(event))continue;seen.add(event);capture(event,{selector});observer.disconnect();break}},{threshold:[0.35]});observer.observe(element)}
  function observeJobCards(){const jobsList=document.querySelector('#jobsList');if(!jobsList||!('IntersectionObserver' in window))return;const cardObserver=new IntersectionObserver((entries)=>{for(const entry of entries){if(!entry.isIntersecting||entry.intersectionRatio<0.5)continue;const card=entry.target;const link=card.querySelector('.official-apply');const jobId=link?.dataset.jobId||null;const jobSource=link?.dataset.source||null;const position=card.parentElement?[...card.parentElement.children].indexOf(card)+1:null;const key=`gwr_job_card_view:${jobId||jobSource||position}`;if(!seen.has(key)){seen.add(key);capture('gwr_job_card_view',{job_id:jobId,job_source:jobSource,position})}cardObserver.unobserve(card)}},{threshold:[0.5]});const bindCards=()=>{jobsList.querySelectorAll('.job-card:not([data-gwr-observed])').forEach((card)=>{card.dataset.gwrObserved='1';cardObserver.observe(card)})};bindCards();new MutationObserver(bindCards).observe(jobsList,{childList:true})}

  document.addEventListener('click',(event)=>{if(!(event.target instanceof Element))return;const target=event.target.closest('#searchButton,[data-filter],.official-apply,#marketSignalLink,#eligibilityGapLink,#revenuePartnerLink,.gwr-reaction-option,.gwr-inquiry-option,#resetFilters,#loadMore');if(!target)return;markMeaningfulAction()},true);
  document.addEventListener('input',(event)=>{if(!(event.target instanceof Element))return;if(!event.target.closest('#keyword,#category,#minPay,#english,#onlyJapan,#onlyRemote'))return;markMeaningfulAction()},true);

  observeOnce('#laborIntelligenceSignal','gwr_intelligence_section_view');
  observeOnce('#marketSignal','gwr_market_signal_view');
  observeOnce('#jobs .section-head','gwr_jobs_section_view');
  observeJobCards();

  stallTimer=window.setTimeout(()=>{if(meaningfulAction||document.visibilityState!=='visible')return;capture('gwr_activation_stall',{stage:'visit_to_action',wait_ms:20000,visible_job_cards:document.querySelectorAll('.job-card').length,market_signal_ready:Boolean(document.querySelector('#marketSignalLink[href]'))})},20000);
}());
