;(function () {
const DEFAULT_SPONSORS = [{
  id: 'redhorse',
  name: 'RedHorse',
  kicker: '贊助 · RedHorse',
  description: '香港賽馬 AI 預測 · HKJC 實時賠率 · EV 量化',
  url: 'https://redhorsehk.ai/',
  cta: '前往 redhorsehk.ai →',
  utm: {
    source: 'redfootball',
    medium: 'portal',
    campaign: 'redhorse',
    content: 'sponsor',
    term: 'redhorse'
  },
  slots: ['nav', 'overview_banner', 'bets_banner', 'footer_card', 'footer_banner', 'footer']
}];

function cloneSponsor(sponsor) {
  if (!sponsor) return null;
  return {
    ...sponsor,
    utm: sponsor.utm && typeof sponsor.utm === 'object' ? {
      ...sponsor.utm
    } : sponsor.utm,
    slots: Array.isArray(sponsor.slots) ? sponsor.slots.slice() : []
  };
}

function normalizeSponsor(raw, index) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `sponsor-${index + 1}`;
  const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim() : id;
  const kicker = typeof source.kicker === 'string' && source.kicker.trim() ? source.kicker.trim() : `贊助 · ${name}`;
  const description = typeof source.description === 'string' && source.description.trim() ? source.description.trim() : name;
  const url = typeof source.url === 'string' && source.url.trim() ? source.url.trim() : '';
  const cta = typeof source.cta === 'string' && source.cta.trim() ? source.cta.trim() : '前往 →';
  const utm = source.utm && typeof source.utm === 'object' ? {
    source: typeof source.utm.source === 'string' && source.utm.source.trim() ? source.utm.source.trim() : 'redfootball',
    medium: typeof source.utm.medium === 'string' && source.utm.medium.trim() ? source.utm.medium.trim() : 'portal',
    campaign: typeof source.utm.campaign === 'string' && source.utm.campaign.trim() ? source.utm.campaign.trim() : id,
    content: typeof source.utm.content === 'string' && source.utm.content.trim() ? source.utm.content.trim() : id,
    term: typeof source.utm.term === 'string' && source.utm.term.trim() ? source.utm.term.trim() : ''
  } : {
    source: 'redfootball',
    medium: 'portal',
    campaign: id,
    content: id,
    term: ''
  };
  return {
    ...source,
    id,
    name,
    kicker,
    description,
    url,
    cta,
    utm,
    slots: Array.isArray(source.slots) ? source.slots.filter(Boolean) : []
  };
}

function normalizeSponsorList(list) {
  const src = Array.isArray(list) && list.length ? list : DEFAULT_SPONSORS;
  return src.map(normalizeSponsor).filter(s => s && s.url);
}

function matchesSlot(sponsor, slot) {
  if (!slot) return true;
  const slots = Array.isArray(sponsor.slots) ? sponsor.slots : [];
  if (!slots.length) return true;
  return slots.includes(slot) || slots.includes('*') || slots.includes('all');
}

function buildSponsorHref(sponsor, slot) {
  const url = sponsor && sponsor.url ? sponsor.url : '';
  if (!url) return '';
  try {
    const href = new URL(url, window.location.href);
    const utm = sponsor.utm || {};
    const params = {
      utm_source: utm.source || 'redfootball',
      utm_medium: utm.medium || 'portal',
      utm_campaign: utm.campaign || sponsor.id || 'sponsor',
      utm_content: utm.content || slot || sponsor.id || 'sponsor',
      utm_term: utm.term || slot || ''
    };
    Object.entries(params).forEach(([key, value]) => {
      if (value) href.searchParams.set(key, value);
    });
    return href.toString();
  } catch (err) {
    return url;
  }
}

const RF_SPONSORS = normalizeSponsorList(window.RF_SPONSORS);
window.RF_SPONSORS = RF_SPONSORS.map(cloneSponsor);

window.RF_getSponsor = function (slot) {
  const sponsor = RF_SPONSORS.find(item => matchesSlot(item, slot)) || RF_SPONSORS[0];
  if (!sponsor) return null;
  const copy = cloneSponsor(sponsor);
  copy.slot = slot || '';
  copy.href = buildSponsorHref(copy, slot);
  return copy;
};

window.RF_trackSponsor = function (event, id, slot, extra) {
  const payload = {
    event: event || 'impression',
    id: id || '',
    slot: slot || '',
    path: window.location && window.location.pathname ? window.location.pathname : '',
    url: window.location && window.location.href ? window.location.href : '',
    ts: Date.now(),
    ...extra
  };
  const body = JSON.stringify(payload);
  let queued = false;
  try {
    const endpoint = window.RF_SPONSOR_TRACK_URL;
    if (endpoint && navigator.sendBeacon) {
      queued = navigator.sendBeacon(endpoint, new Blob([body], {
        type: 'application/json'
      }));
    }
  } catch (err) {
    queued = false;
  }
  if (!queued && window.console && console.info) {
    console.info('[RedFootball sponsor]', payload);
  }
  return queued;
};
})();
