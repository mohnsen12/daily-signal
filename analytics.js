/**
 * The Daily Signal — Launch Day Analytics
 * Lightweight client-side analytics for tracking PH launch performance.
 * 
 * Tracks:
 * - Page views with referrer/UTM params
 * - Signup conversions
 * - Time on page
 * - Scroll depth
 * 
 * Data stored in localStorage + optional webhook endpoint.
 * Dashboard: run `node scripts/launch-dashboard.mjs` to see stats.
 */

(function() {
  const STORAGE_KEY = 'ds_launch_analytics';
  const SESSION_KEY = 'ds_session_id';
  // Collect analytics via Formspree (same account as email)
  const ENDPOINT = 'https://formspree.io/f/xpwzgkqr';
  
  // Generate or retrieve session ID
  function getSessionId() {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }
  
  // Parse UTM parameters
  function getUTM() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || getReferrerSource(),
      medium: params.get('utm_medium') || 'organic',
      campaign: params.get('utm_campaign') || 'none',
      content: params.get('utm_content') || null,
      term: params.get('utm_term') || null
    };
  }
  
  // Detect referrer source
  function getReferrerSource() {
    const ref = document.referrer;
    if (!ref) return 'direct';
    try {
      const host = new URL(ref).hostname;
      if (host.includes('producthunt.com')) return 'producthunt';
      if (host.includes('reddit.com')) return 'reddit';
      if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
      if (host.includes('linkedin.com')) return 'linkedin';
      if (host.includes('news.ycombinator.com')) return 'hackernews';
      if (host.includes('google.com')) return 'google';
      if (host.includes('github.io') || host.includes('github.com')) return 'github';
      return host;
    } catch(e) {
      return 'unknown';
    }
  }
  
  // Store event
  function track(event, data = {}) {
    try {
      const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"events":[],"sessions":{}}');
      const sid = getSessionId();
      
      // Record session
      if (!store.sessions[sid]) {
        store.sessions[sid] = {
          firstSeen: new Date().toISOString(),
          utm: getUTM(),
          userAgent: navigator.userAgent.substring(0, 100),
          screen: `${screen.width}x${screen.height}`,
          language: navigator.language
        };
      }
      
      // Record event
      store.events.push({
        session: sid,
        event,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
        ...data
      });
      
      // Keep last 1000 events
      if (store.events.length > 1000) {
        store.events = store.events.slice(-1000);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      
      // Send to Formspree as analytics event
      if (ENDPOINT && event !== 'pageview') { // Don't spam with every pageview
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            _subject: `Analytics: ${event}`,
            _format: 'plain',
            event, 
            session: sid,
            source: getUTM().source,
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
            ...data 
          }),
          keepalive: true
        }).catch(() => {});
      }
    } catch(e) {}
  }
  
  // Track page view
  track('pageview', {
    title: document.title,
    referrer: document.referrer || 'direct'
  });
  
  // Track scroll depth
  let maxScroll = 0;
  const scrollMilestones = [25, 50, 75, 100];
  const trackedMilestones = new Set();
  
  window.addEventListener('scroll', function() {
    const scrollPct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (scrollPct > maxScroll) {
      maxScroll = scrollPct;
      for (const m of scrollMilestones) {
        if (scrollPct >= m && !trackedMilestones.has(m)) {
          trackedMilestones.add(m);
          track('scroll_depth', { depth: m });
        }
      }
    }
  }, { passive: true });
  
  // Track time on page (beacon on unload)
  const startTime = Date.now();
  window.addEventListener('beforeunload', function() {
    const duration = Math.round((Date.now() - startTime) / 1000);
    track('time_on_page', { seconds: duration });
  });
  
  // Track signup (intercept form submissions)
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.querySelector('input[type="email"]')) {
      track('signup', {
        source: getUTM().source,
        form_id: form.id || form.className || 'unknown'
      });
    }
  });
  
  // Track PH badge clicks
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;
    
    const href = link.href || '';
    if (href.includes('producthunt.com')) {
      track('ph_click', { href, text: link.textContent.trim().substring(0, 50) });
    }
    if (href.includes('twitter.com') || href.includes('x.com')) {
      track('twitter_click', { href });
    }
    if (href.includes('linkedin.com')) {
      track('linkedin_click', { href });
    }
  });
  
  // Expose for dashboard
  window.DailySignalAnalytics = {
    track,
    getStats: function() {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"events":[],"sessions":{}}');
    },
    exportStats: function() {
      const data = this.getStats();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'daily-signal-analytics.json';
      a.click();
    }
  };
  
  console.log('📊 Daily Signal Analytics loaded — window.DailySignalAnalytics.getStats()');
})();
