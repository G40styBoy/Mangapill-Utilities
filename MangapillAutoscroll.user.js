// ==UserScript==
// @name         Mangapill Autoscroll
// @namespace    https://github.com/G40styBoy
// @version      1.0
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
  const END_WAIT_FRAMES = 90;  // about 1.5 seconds at the bottom before moving on
  const GIVE_UP_FRAMES = 900;  // about 15 seconds. Give up if images never finish loading.
  const KEY = 'mpAutoscrollNext';

  let speed = GM_getValue('speed', 2);
  let running = false;
  let y = 0;
  let lastSet = 0;
  let rafId = null;
  let bottomFrames = 0;
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

  function tick() {
    // If you scrolled by hand (wheel, scrollbar, keys), pick up from there
    if (Math.abs(window.scrollY - lastSet) > 2) y = window.scrollY;

    y += speed;
    window.scrollTo(0, y);
    lastSet = window.scrollY;

    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    bottomFrames = atBottom ? bottomFrames + 1 : 0;
    if (atBottom) y = window.scrollY;

    // Only move on once every page image has loaded, so a slow image never ends the chapter early
    if (bottomFrames > END_WAIT_FRAMES && allPagesLoaded()) { finish(); return; }
    if (bottomFrames > GIVE_UP_FRAMES) { stop('Gave up: images did not load'); return; }

    rafId = requestAnimationFrame(tick);
  }

  function finish() {
    const next = nextLink();
    if (AUTO_ADVANCE && next) {
      cancelAnimationFrame(rafId);
      running = false;
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      showBadge('Next chapter...');
      location.href = next.href;
    } else {
      stop(next ? 'End of chapter' : 'Last chapter reached');
    }
  }

  function start() {
    running = true;
    y = lastSet = window.scrollY;
    bottomFrames = 0;
    rafId = requestAnimationFrame(tick);
    showBadge();
  }

  function stop(message) {
    running = false;
    cancelAnimationFrame(rafId);
    showBadge(message);
  }

  function setSpeed(value) {
    speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
    GM_setValue('speed', speed);
    showBadge();
  }

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
