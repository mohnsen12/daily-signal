/**
 * The Daily Signal — Exit Intent Popup
 * 
 * Triggers when user moves mouse toward browser close/back button.
 * Shows a popup to capture email before they leave.
 * 
 * Only shows once per session.
 */

(function() {
  const STORAGE_KEY = 'ds_exit_intent_shown';
  const SESSION_KEY = 'ds_exit_intent_session';
  
  // Check if already shown this session
  function shouldShow() {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    if (localStorage.getItem(STORAGE_KEY)) return false; // Already converted
    return true;
  }
  
  // Create the exit intent popup
  function createPopup() {
    const overlay = document.createElement('div');
    overlay.id = 'exit-intent-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000;
      background: rgba(0,0,0,0.6); display: flex; align-items: center;
      justify-content: center; animation: fadeIn 0.3s ease;
    `;
    
    const popup = document.createElement('div');
    popup.style.cssText = `
      background: white; border-radius: 16px; padding: 2.5rem; max-width: 480px;
      width: 90%; position: relative; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.4s ease;
    `;
    
    popup.innerHTML = `
      <button onclick="closeExitPopup()" style="
        position: absolute; top: 12px; right: 16px; background: none; border: none;
        cursor: pointer; font-size: 1.5rem; color: #6c757d; line-height: 1;
      ">✕</button>
      
      <div style="font-size: 3rem; margin-bottom: 1rem;">📡</div>
      
      <h2 style="
        font-family: 'Merriweather', Georgia, serif; font-size: 1.5rem;
        margin-bottom: 0.75rem; color: #1a1a2e;
      ">Vent — før du går!</h2>
      
      <p style="
        font-size: 1rem; color: #6c757d; margin-bottom: 1.5rem; line-height: 1.6;
      ">
        Få <strong>dagens vigtigste AI & tech nyheder</strong> leveret til din indbakke hver morgen.
        Kurateret af AI. Oversat til dansk. <strong>Helt gratis.</strong>
      </p>
      
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
        <input type="email" placeholder="din@email.dk" id="exit-email" style="
          flex: 1; padding: 0.875rem 1rem; border: 2px solid #dee2e6;
          border-radius: 8px; font-size: 1rem; outline: none;
        " onkeypress="if(event.key==='Enter')exitSignup()">
        <button onclick="exitSignup()" style="
          padding: 0.875rem 1.5rem; background: #e63946; color: white; border: none;
          border-radius: 8px; font-weight: 700; font-size: 1rem; cursor: pointer;
          white-space: nowrap;
        ">Tilmeld →</button>
      </div>
      
      <p id="exit-message" style="font-size: 0.85rem; min-height: 1.25rem;"></p>
      
      <p style="font-size: 0.75rem; color: #adb5bd; margin-top: 0.5rem;">
        Ingen spam. Kun signal. Afmeld når som helst.
      </p>
      
      <div style="
        display: flex; justify-content: center; gap: 1.5rem; margin-top: 1.25rem;
        padding-top: 1.25rem; border-top: 1px solid #dee2e6;
      ">
        <span style="font-size: 0.8rem; color: #6c757d;">⚡ 5 min læsning</span>
        <span style="font-size: 0.8rem; color: #6c757d;">🇩🇰 På dansk</span>
        <span style="font-size: 0.8rem; color: #6c757d;">🆓 Gratis</span>
      </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Mark as shown
    sessionStorage.setItem(SESSION_KEY, 'true');
    
    // Close on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeExitPopup();
    });
    
    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeExitPopup();
    });
  }
  
  // Close popup
  window.closeExitPopup = function() {
    const overlay = document.getElementById('exit-intent-overlay');
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => overlay.remove(), 300);
    }
  };
  
  // Signup from exit popup
  window.exitSignup = function() {
    const email = document.getElementById('exit-email').value.trim();
    const msg = document.getElementById('exit-message');
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      msg.textContent = '⚠️ Indtast en gyldig email-adresse';
      msg.style.color = '#e63946';
      return;
    }
    
    // Save locally
    try {
      const subs = JSON.parse(localStorage.getItem('ds_subscribers') || '[]');
      if (!subs.find(s => s.email === email)) {
        subs.push({ email, date: new Date().toISOString(), source: 'exit-intent' });
        localStorage.setItem('ds_subscribers', JSON.stringify(subs));
      }
    } catch(e) {}
    
    // Try Formspree
    fetch('https://formspree.io/f/xpwzgkqr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'exit-intent' })
    }).catch(() => {});
    
    // Mark as converted
    localStorage.setItem(STORAGE_KEY, 'true');
    
    msg.innerHTML = '✅ Perfekt! Du hører fra os snart.';
    msg.style.color = '#198754';
    
    // Also trigger referral recording if available
    if (window.DailySignalReferral) {
      window.DailySignalReferral.recordReferral(email);
    }
    
    // Close after delay
    setTimeout(closeExitPopup, 2000);
  };
  
  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `;
  document.head.appendChild(style);
  
  // Exit intent detection
  let exitIntentTriggered = false;
  
  document.addEventListener('mouseout', function(e) {
    if (exitIntentTriggered) return;
    if (!shouldShow()) return;
    
    // Only trigger when mouse leaves through the top of the page
    if (e.clientY <= 0 && e.relatedTarget === null) {
      exitIntentTriggered = true;
      setTimeout(createPopup, 200);
    }
  });
  
  // Also trigger on mobile when user scrolls back up quickly after scrolling down
  let lastScrollY = 0;
  let scrollDownStarted = false;
  
  window.addEventListener('scroll', function() {
    const currentY = window.scrollY;
    
    if (currentY > lastScrollY + 100) {
      scrollDownStarted = true;
    }
    
    if (scrollDownStarted && currentY < lastScrollY - 50 && currentY < 200) {
      if (!exitIntentTriggered && shouldShow()) {
        exitIntentTriggered = true;
        setTimeout(createPopup, 200);
      }
    }
    
    lastScrollY = currentY;
  });
  
})();
