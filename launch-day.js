// Launch Day Enhancements for The Daily Signal
// Include this script on launch day (March 18) to boost conversions

(function() {
  'use strict';
  
  const LAUNCH_DATE = new Date('2026-03-18T09:00:00+01:00'); // 09:00 CET
  const PH_URL = 'https://www.producthunt.com/'; // Update with real PH link
  
  function timeUntilLaunch() {
    const now = new Date();
    const diff = LAUNCH_DATE - now;
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  }
  
  function isLaunchDay() {
    const now = new Date();
    return now >= LAUNCH_DATE && now < new Date('2026-03-19T00:00:00+01:00');
  }
  
  // Update the badge based on timing
  function updateBadge() {
    const badge = document.querySelector('.badge');
    if (!badge) return;
    
    if (isLaunchDay()) {
      badge.innerHTML = '🚀 VI ER LIVE PÅ PRODUCT HUNT NU! <a href="' + PH_URL + '" target="_blank" style="color: #856404; text-decoration: underline;">Støt os →</a>';
      badge.style.background = '#d4edda';
      badge.style.color = '#155724';
      badge.style.borderColor = '#c3e6cb';
      badge.style.animation = 'pulse 2s infinite';
      
      // Add pulse animation
      const style = document.createElement('style');
      style.textContent = '@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }';
      document.head.appendChild(style);
    } else {
      const t = timeUntilLaunch();
      if (t) {
        badge.innerHTML = '🚀 Product Hunt launch om <strong>' + t.hours + 't ' + t.minutes + 'm</strong>';
      }
    }
  }
  
  // Create a sticky launch banner
  function createStickyBanner() {
    if (!isLaunchDay()) return;
    
    const banner = document.createElement('div');
    banner.id = 'ph-launch-banner';
    banner.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
        background: linear-gradient(90deg, #ff6154, #ff3d00);
        color: white; padding: 0.75rem 1rem; text-align: center;
        font-family: 'Inter', sans-serif; font-size: 0.95rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        display: flex; align-items: center; justify-content: center; gap: 1rem;
      ">
        <span>🚀 <strong>Vi er live på Product Hunt!</strong> Et upvote hjælper os enormt</span>
        <a href="${PH_URL}" target="_blank" style="
          background: white; color: #ff3d00; padding: 0.5rem 1.25rem;
          border-radius: 6px; font-weight: 700; text-decoration: none;
          font-size: 0.85rem; white-space: nowrap;
        ">Støt os på PH →</a>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none; border: none; color: rgba(255,255,255,0.7);
          cursor: pointer; font-size: 1.25rem; padding: 0 0.5rem;
        ">×</button>
      </div>
    `;
    document.body.prepend(banner);
    
    // Push page content down
    document.body.style.paddingTop = '52px';
  }
  
  // Update subscriber count animation
  function animateSubscriberCount() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(el => {
      const text = el.textContent;
      if (text.includes('50+')) {
        el.style.animation = 'pulse 2s infinite';
      }
    });
  }
  
  // Update hero text for launch day
  function updateHeroForLaunchDay() {
    if (!isLaunchDay()) return;
    
    const heroH2 = document.querySelector('.hero h2');
    if (heroH2) {
      heroH2.textContent = '🚀 Vi er på Product Hunt i dag — hjælp os på forsiden!';
    }
    
    const heroP = document.querySelector('.hero p');
    if (heroP) {
      heroP.textContent = 'Dagens vigtigste AI & tech nyheder — kurateret af en autonom AI-agent. Helt gratis.';
    }
  }
  
  // Init
  document.addEventListener('DOMContentLoaded', function() {
    updateBadge();
    createStickyBanner();
    animateSubscriberCount();
    updateHeroForLaunchDay();
    
    // Update badge every minute
    setInterval(updateBadge, 60000);
  });
  
})();
