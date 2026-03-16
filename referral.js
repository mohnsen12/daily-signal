/**
 * The Daily Signal — Referral System
 * 
 * How it works:
 * 1. Each subscriber gets a unique referral link: ?ref=UNIQUE_CODE
 * 2. When someone signs up via a referral link, the referrer gets credit
 * 3. Milestones unlock rewards (future: premium content, shoutouts, etc.)
 * 
 * Storage: localStorage (MVP) — upgrade to backend when we have one
 */

const REFERRAL_STORAGE_KEY = 'ds_referrals';
const REFERRAL_CODE_KEY = 'ds_my_referral_code';

// Generate a short unique code
function generateReferralCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Get or create user's referral code
function getMyReferralCode() {
  let code = localStorage.getItem(REFERRAL_CODE_KEY);
  if (!code) {
    code = generateReferralCode();
    localStorage.setItem(REFERRAL_CODE_KEY, code);
  }
  return code;
}

// Get referral data
function getReferralData() {
  try {
    return JSON.parse(localStorage.getItem(REFERRAL_STORAGE_KEY) || '{"referrals":[],"count":0}');
  } catch(e) {
    return { referrals: [], count: 0 };
  }
}

// Save referral data
function saveReferralData(data) {
  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(data));
}

// Check URL for referral code on page load
function checkReferralCode() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get('ref');
  
  if (refCode) {
    // Store the referral code for when user signs up
    sessionStorage.setItem('ds_referred_by', refCode);
    
    // Show a subtle notification
    showReferralBanner(refCode);
  }
}

// Show banner for referred visitors
function showReferralBanner(refCode) {
  const banner = document.createElement('div');
  banner.id = 'referral-banner';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    background: linear-gradient(135deg, #e63946 0%, #c1121f 100%);
    color: white; text-align: center; padding: 0.75rem 1rem;
    font-size: 0.9rem; font-family: 'Inter', sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;
  banner.innerHTML = `
    🎉 Du blev henvist af en ven! Tilmeld dig og begge får noget ekstra.
    <button onclick="this.parentElement.remove()" style="
      background: none; border: none; color: white; cursor: pointer;
      font-size: 1.2rem; margin-left: 1rem; opacity: 0.8;
    ">✕</button>
  `;
  document.body.prepend(banner);
}

// Record a referral (called after signup)
function recordReferral(newEmail) {
  const referrerCode = sessionStorage.getItem('ds_referred_by');
  
  if (referrerCode && referrerCode !== getMyReferralCode()) {
    const data = getReferralData();
    data.referrals.push({
      referredBy: referrerCode,
      email: newEmail,
      date: new Date().toISOString()
    });
    data.count = data.referrals.length;
    saveReferralData(data);
    
    // Clean up
    sessionStorage.removeItem('ds_referred_by');
    
    return true;
  }
  return false;
}

// Get referral stats
function getReferralStats() {
  const data = getReferralData();
  const myCode = getMyReferralCode();
  
  // Count how many times MY code was used
  // (In MVP, this is just local — in production, this would be server-side)
  const myReferrals = data.referrals.filter(r => r.referredBy === myCode).length;
  
  return {
    myCode: myCode,
    myReferralLink: `${window.location.origin}${window.location.pathname}?ref=${myCode}`,
    totalReferrals: data.count,
    myReferrals: myReferrals,
    milestones: getMilestones(myReferrals)
  };
}

// Referral milestones
function getMilestones(count) {
  return [
    { target: 1, label: 'Første henvisning!', unlocked: count >= 1 },
    { target: 3, label: '3 henvisninger — du er aktiv!', unlocked: count >= 3 },
    { target: 5, label: '5 henvisninger — top promoter!', unlocked: count >= 5 },
    { target: 10, label: '10 henvisninger — legend! 🏆', unlocked: count >= 10 },
  ];
}

// Create referral widget (to show on page)
function createReferralWidget() {
  const stats = getReferralStats();
  
  const widget = document.createElement('div');
  widget.id = 'referral-widget';
  widget.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 999;
    background: white; border: 2px solid #e63946; border-radius: 12px;
    padding: 1.25rem; max-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    font-family: 'Inter', sans-serif; display: none;
  `;
  
  widget.innerHTML = `
    <button onclick="this.parentElement.style.display='none'" style="
      position: absolute; top: 8px; right: 12px; background: none; border: none;
      cursor: pointer; font-size: 1.2rem; color: #6c757d;
    ">✕</button>
    <h4 style="margin: 0 0 0.5rem; font-size: 1rem;">🎯 Del dit link</h4>
    <p style="font-size: 0.85rem; color: #6c757d; margin: 0 0 0.75rem;">
      Del The Daily Signal med venner — begge får noget ekstra!
    </p>
    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
      <input type="text" value="${stats.myReferralLink}" readonly style="
        flex: 1; padding: 0.5rem; border: 1px solid #dee2e6; border-radius: 6px;
        font-size: 0.8rem; background: #f8f9fa;
      " id="referral-link-input">
      <button onclick="copyReferralLink()" style="
        padding: 0.5rem 1rem; background: #e63946; color: white; border: none;
        border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;
      ">Kopiér</button>
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <a href="https://twitter.com/intent/tweet?text=Jeg%20følger%20The%20Daily%20Signal%20%E2%80%94%20dagligt%20AI%20%26%20tech%20nyhedsbrev%20på%20dansk.%20Tilmeld%20dig%20gratis!&url=${encodeURIComponent(stats.myReferralLink)}" target="_blank" style="
        flex: 1; text-align: center; padding: 0.5rem; background: #1da1f2; color: white;
        text-decoration: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
      ">🐦 Twitter</a>
      <a href="https://wa.me/?text=Prøv%20The%20Daily%20Signal%20—%20AI%20nyhedsbrev%20på%20dansk:%20${encodeURIComponent(stats.myReferralLink)}" target="_blank" style="
        flex: 1; text-align: center; padding: 0.5rem; background: #25d366; color: white;
        text-decoration: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
      ">💬 WhatsApp</a>
    </div>
    <p style="font-size: 0.75rem; color: #6c757d; margin: 0.75rem 0 0; text-align: center;">
      Dine henvisninger: <strong>${stats.myReferrals}</strong>
    </p>
  `;
  
  document.body.appendChild(widget);
}

// Copy referral link
function copyReferralLink() {
  const input = document.getElementById('referral-link-input');
  input.select();
  document.execCommand('copy');
  
  const btn = input.nextElementSibling;
  btn.textContent = 'Kopieret! ✓';
  setTimeout(() => btn.textContent = 'Kopiér', 2000);
}

// Toggle referral widget
function toggleReferralWidget() {
  const widget = document.getElementById('referral-widget');
  if (widget) {
    widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
  } else {
    createReferralWidget();
    document.getElementById('referral-widget').style.display = 'block';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  checkReferralCode();
  
  // Add "Del dit link" button after signup success
  // This will be called from the main signup function
});

// Export for use in main page
window.DailySignalReferral = {
  getMyReferralCode,
  getReferralStats,
  recordReferral,
  toggleReferralWidget,
  checkReferralCode
};
