// ==UserScript==
// @name         Automatic Page Summary Removal
// @namespace    https://github.com/G40styBoy
// @version      2025-07-11
// @description  Automatically hides page summary info when loading a manga.
// @author       G40sty
// @match        *://mangapill.com/chapters/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mangapill.com
// @run-at       document-idle
// ==/UserScript==

const toggleState = false;
const toggleSummary = 'input[name="chapter-page-toggle-summary"]';
const summaryDataContainer = 'chapter-page div[data-summary]';
const toggleContainer = 'relative inline-flex items-center cursor-pointer';

function HideSummaryInfo(){
    document.querySelectorAll(toggleSummary).forEach(GetAndHideInfo(toggleState));
}

function GetAndHideInfo(checked) {
    document.querySelectorAll(summaryDataContainer).forEach(t => {
        t.style.display = checked ? '' : 'none';
    });
}

(function (){
  HideSummaryInfo();
})
();
