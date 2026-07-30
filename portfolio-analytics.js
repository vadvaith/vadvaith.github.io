/**
 * PortfolioAnalytics - Ethical Telemetry Script for vadvaith.github.io
 * -------------------------------------------------------------------
 * Automatically captures non-intrusive portfolio engagement metrics 
 * (pageviews, resume downloads, project demo clicks, scroll depth, time on page).
 * Respects user Do-Not-Track settings and contains zero PII logging.
 */

(function () {
  'use strict';

  // Check Do Not Track (DNT) preference
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
    console.log('[PortfolioAnalytics] Respecting Do Not Track header. Telemetry disabled.');
    return;
  }

  // Configuration
  const CONFIG = {
    domain: 'vadvaith.github.io',
    debug: false,
  };

  // Helper to log in debug mode
  function log(...args) {
    if (CONFIG.debug) {
      console.log('[PortfolioAnalytics]', ...args);
    }
  }

  // Helper to send GA4 custom event safely
  function sendEvent(eventName, eventParams = {}) {
    log('Event Triggered:', eventName, eventParams);
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, eventParams);
    } else {
      log('gtag not found on window. Event queued in fallback dataLayer.');
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        ...eventParams
      });
    }
  }

  // 1. Detect Device Category
  function getDeviceCategory() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  // 2. Track Outbound & Resume Clicks
  function setupClickTracking() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href') || '';
      const text = (link.textContent || '').trim().substring(0, 50);

      // Track Resume Download
      if (href.toLowerCase().includes('resume') || href.toLowerCase().endsWith('.pdf') || link.id === 'resume-download') {
        sendEvent('file_download', {
          file_name: href.split('/').pop() || 'resume.pdf',
          file_extension: 'pdf',
          link_text: text,
          device_category: getDeviceCategory()
        });
        return;
      }

      // Track Outbound / Demo Clicks
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        let clickType = 'outbound_link';
        if (href.includes('github.com')) clickType = 'github_repo';
        else if (href.includes('linkedin.com')) clickType = 'linkedin_profile';
        else if (href.includes('demo') || link.dataset.type === 'demo') clickType = 'live_demo';

        sendEvent('click_outbound', {
          destination_url: href,
          link_text: text,
          click_type: clickType,
          device_category: getDeviceCategory()
        });
      }
    }, { capture: true });
  }

  // 3. Scroll Depth Milestones (25%, 50%, 75%, 100%)
  function setupScrollDepthTracking() {
    const milestones = [25, 50, 75, 100];
    const reached = new Set();

    function checkScroll() {
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight - winHeight;
      if (docHeight <= 0) return;

      const scrollPercent = Math.min(100, Math.round((window.scrollY / docHeight) * 100));

      milestones.forEach(m => {
        if (scrollPercent >= m && !reached.has(m)) {
          reached.add(m);
          sendEvent(`scroll_${m}`, {
            percent_scrolled: m,
            page_path: window.location.pathname
          });
        }
      });
    }

    let scrollTimeout;
    window.addEventListener('scroll', function () {
      if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
      scrollTimeout = requestAnimationFrame(checkScroll);
    }, { passive: true });
  }

  // 4. Time on Page / Read Time tracking
  function setupEngagementTimer() {
    const startTime = Date.now();

    window.addEventListener('beforeunload', function () {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      if (durationSeconds >= 5) {
        // Send engagement duration if user spent at least 5s
        sendEvent('user_engagement_time', {
          engagement_time_msec: durationSeconds * 1000,
          engagement_seconds: durationSeconds,
          page_path: window.location.pathname
        });
      }
    });
  }

  // Initialize all listeners when DOM is ready
  function init() {
    log('Initialized Portfolio Analytics for ' + CONFIG.domain);
    setupClickTracking();
    setupScrollDepthTracking();
    setupEngagementTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
