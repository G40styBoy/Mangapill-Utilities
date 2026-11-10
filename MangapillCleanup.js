// ==UserScript==
// @name         Mangapill Cleanup
// @namespace    https://github.com/G40styBoy
// @version      2.4
// @description  Removes ads and clutter across mangapill.com. Clean reader on chapter pages, tidy homepage.
// @author       G40sty
// @match        *://*.mangapill.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangapill.com
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // Written without backslashes, backticks or regex literals on purpose.
  // Some phone extensions damage those characters when they store a script.

  const CONFIG = {
    blockPopups: true,
    chapter: { focusMode: true, cleanReader: true, hideSummaryBar: true, pageWidth: '1200px' },
    home: {
      showFeatured: true,
      showTrending: true,
      trendingFirst: true,
      showNewChapters: true,
      hideNewsBox: true,
      hideNavExtras: true,
    },
  };
  const C = CONFIG.chapter, H = CONFIG.home;

  const path = location.pathname;
  const parts = path.split('/').filter(Boolean);
  const isChapter = parts.length >= 3 && parts[0] === 'chapters';
  const isHome = path === '/';

  if (CONFIG.blockPopups) window.open = () => null;

  // Ads: hidden on every page
  const css = [
    'ins.pubadx-slot, ins[class^="eas"], .pubadx-offer, .gfpl-wrapper,',
    '#radio_content, [class^="pax3v3c"], [class^="bg-ssp"], [class*="bg-container-"],',
    'a#dl-banner-300x250, iframe { display: none !important; }',
    'body > div.container:has(> p.text-yellow-600) { display: none !important; }',
  ];

  // Chapter pages only
  if (isChapter && C.focusMode) {
    css.push(
      'body > header,',
      'div.container .mb-3.flex.justify-between > div:first-child,',
      'body > div.container > div.my-3.flex.flex-col,',
      'body > div.container > div.grid.gap-3 { display: none !important; }',
      'div.container .mb-3.flex.justify-between { justify-content: center !important; }'
    );
  }
  if (isChapter && C.hideSummaryBar) {
    // The "PAGE 1/20" bar above each page
    css.push('chapter-page div[data-summary] { display: none !important; }');
  }
  if (isChapter && C.cleanReader) {
    css.push(
      'html, body { background: #000 !important; }',
      'body > div.container, body > div.container .text-primary { color: #ddd !important; }',
      'div[class~="lg:container"] { max-width: none !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }',
      'chapter-page > div.border { border: 0 !important; border-radius: 0 !important; background: transparent !important; }',
      'chapter-page div.bg-card { background: transparent !important; }'
    );
    if (C.pageWidth) {
      css.push('chapter-page picture, chapter-page img.js-page { width: ' + C.pageWidth +
               ' !important; max-width: 100% !important; height: auto !important; }');
    }
  }

  // Homepage only
  if (isHome) {
    if (H.hideNavExtras) {
      css.push('header a[href="/contact"], header a[href="/privacy"], header a[href*="myanimetwin"] { display: none !important; }');
    }
    if (!H.showFeatured) css.push('body > div.bg-card.py-4 { display: none !important; }');
    if (H.hideNewsBox) {
      css.push(
        'div.col-span-4[class~="lg:col-span-1"] { display: none !important; }',
        'div.grid.grid-cols-4.gap-3:has(> div.col-span-4[class~="lg:col-span-1"]) > div:first-child { grid-column: 1 / -1 !important; }'
      );
    }
  }

  const style = document.createElement('style');
  style.textContent = css.join(' ');
  document.documentElement.appendChild(style);

  const hide = (el) => el.style.setProperty('display', 'none', 'important');
  const has = (text, word) => text.toLowerCase().indexOf(word) !== -1;

  // Collapses runs of whitespace into one space
  function squash(s) {
    let out = '';
    let gap = false;
    for (const ch of s) {
      if (ch.trim() === '') { gap = true; }
      else { if (gap && out) out += ' '; out += ch; gap = false; }
    }
    return out;
  }

  function sweep() {
    // Ad frames and their "AD" label rows
    document.querySelectorAll('iframe, ins.pubadx-slot, a#dl-banner-300x250').forEach((el) => {
      const row = el.closest('div.flex.items-center.justify-between');
      const isAdRow = row && (row.innerText || '').trim().toUpperCase() === 'AD';
      (isAdRow ? row : el).remove();
    });

    // The yellow notice and the "mangapill.com / Report Content" strip.
    // Only short blocks are touched, so a big content area is never hidden by mistake.
    document.querySelectorAll('body > div.container').forEach((c) => {
      if (c.querySelector('chapter-page')) return;
      const text = squash(c.textContent);
      if (text.length > 200) return;
      if (has(text, 'discontinue supporting manhwa') || has(text, 'report content')) hide(c);
    });

    if (isHome) {
      const sections = [...document.body.children].filter((c) => c.matches('div.container.py-4'));
      const trending = sections.find((s) => has(s.textContent, 'trending mangas'));
      const fresh = sections.find((s) => s !== trending && has(s.textContent, 'new chapters'));
      if (trending && !H.showTrending) hide(trending);
      if (fresh && !H.showNewChapters) hide(fresh);
      if (H.trendingFirst && trending && fresh &&
          (fresh.compareDocumentPosition(trending) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        fresh.before(trending);
      }
    }
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sweep(); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep);
  else sweep();
})();
