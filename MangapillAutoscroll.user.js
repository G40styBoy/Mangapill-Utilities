// ==UserScript==
// @name         Mangapill Autoscroll
// @namespace    https://github.com/G40styBoy
// @version      1.1
// @description  S starts/stops. = and - change speed. Moves on to the next chapter by itself.
// @author       G40sty
// @match        *://*.mangapill.com/chapters/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangapill.com
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const STEP = 0.5;
  const MIN_SPEED = 0.5;
  const MAX_SPEED = 20;
  const AUTO_ADVANCE = true;   // go to the next chapter when this one ends
  const END_WAIT_MS = 1500;    // time spent at the bottom before moving on
  const GIVE_UP_MS = 15000;    // give up if images never finish loading
  const CHECK_EVERY_MS = 100;  // how often to look at the bottom of the page
  const PX_PER_SECOND = 60;    // speed 1 = 60 pixels a second, so speeds feel the same on any screen
  const KEY = 'mpAutoscrollNext';

  let speed = GM_getValue('speed', 2);
  let running = false;
  let y = 0;               // our own position, so slow speeds do not get rounded away
  let lastSet = 0;         // the last position we asked for
  let lastFrame = 0;
  let lastCheck = 0;
  let bottomMs = 0;
  let rafId = null;
  let resync = false;      // set when you scroll by hand, so we pick up from where you are
  let resumeTimer = null;

  const badge = document.createElement('div');
  badge.style.cssText =
    'position:fixed;bottom:12px;right:12px;z-index:99999;padding:6px 10px;' +
    'background:rgba(0,0,0,.7);color:#fff;font:12px sans-serif;border-radius:6px;' +
    'pointer-events:none;opacity:0;transition:opacity .2s';
  document.body.appendChild(badge);

  let badgeTimer;
  function showBadge(text) {
    badge.textContent = text || ((running ? 'Scrolling' : 'Paused') + ' | speed ' + speed.toFixed(1));
    badge.style.opacity = '1';
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => (badge.style.opacity = '0'), 1500);
  }

  const nextLink = () => document.querySelector('a[data-hotkey="ArrowRight"][href]');
  const allPagesLoaded = () => document.querySelectorAll('.js-page:not(.loaded)').length === 0;

  // Round to a whole screen pixel. On screens with scaling (125%, 150%) this keeps every step even.
  function pixelAlign(value) {
    const dpr = window.devicePixelRatio || 1;
    return Math.round(value * dpr) / dpr;
  }

  // If the site turns on smooth scrolling, every small step would restart an animation and look jerky
  function smoothOff(off) {
    const root = document.documentElement;
    if (off) root.style.setProperty('scroll-behavior', 'auto', 'important');
    else root.style.removeProperty('scroll-behavior');
  }

  function tick(now) {
    if (!running) return;

    // Move by elapsed time, not by frame count, so 60 Hz and 144 Hz screens scroll at the same speed
    // and a slow frame does not cause a visible hitch. Capped so a long pause never makes a big jump.
    const dt = Math.min(now - lastFrame, 100);
    lastFrame = now;

    if (resync) { y = window.scrollY; resync = false; }

    y += speed * PX_PER_SECOND * dt / 1000;
    lastSet = pixelAlign(y);
    window.scrollTo(0, lastSet);

    // Reading the page height is costly, so do it a few times a second instead of every frame
    const sinceCheck = now - lastCheck;
    if (sinceCheck >= CHECK_EVERY_MS) {
      lastCheck = now;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atBottom) { y = window.scrollY; bottomMs += sinceCheck; } else { bottomMs = 0; }

      // Only move on once every page image has loaded, so a slow image never ends the chapter early
      if (bottomMs > END_WAIT_MS && allPagesLoaded()) { finish(); return; }
      if (bottomMs > GIVE_UP_MS) { stop('Gave up: images did not load'); return; }
    }

    rafId = requestAnimationFrame(tick);
  }

  function finish() {
    const next = nextLink();
    if (AUTO_ADVANCE && next) {
      cancelAnimationFrame(rafId);
      running = false;
      smoothOff(false);
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      showBadge('Next chapter...');
      location.href = next.href;
    } else {
      stop(next ? 'End of chapter' : 'Last chapter reached');
    }
  }

  function start() {
    running = true;
    y = window.scrollY;
    lastSet = y;
    bottomMs = 0;
    resync = false;
    lastFrame = lastCheck = performance.now();
    smoothOff(true);
    rafId = requestAnimationFrame(tick);
    showBadge();
  }

  function stop(message) {
    running = false;
    cancelAnimationFrame(rafId);
    smoothOff(false);
    showBadge(message);
  }

  function setSpeed(value) {
    speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
    GM_setValue('speed', speed);
    showBadge();
  }

  // You scrolled by hand (wheel, scrollbar, keys)? Pick up from where you are.
  window.addEventListener('scroll', () => {
    if (running && Math.abs(window.scrollY - lastSet) > 2) resync = true;
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 's' || e.key === 'S') {
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; showBadge('Paused'); return; }
      running ? stop() : start();
    } else if (e.key === '=' || e.key === '+') setSpeed(speed + STEP);
    else if (e.key === '-') setSpeed(speed - STEP);
  });

  // Arrived here from an auto-advance a moment ago? Keep going.
  let cameFromAdvance = false;
  try {
    const stamp = Number(sessionStorage.getItem(KEY) || 0);
    sessionStorage.removeItem(KEY);
    cameFromAdvance = AUTO_ADVANCE && stamp && Date.now() - stamp < 30000;
  } catch (e) {}

  if (cameFromAdvance) {
    window.scrollTo(0, 0);
    showBadge('Resuming...');
    resumeTimer = setTimeout(() => { resumeTimer = null; start(); }, 1500);
  }
})();
