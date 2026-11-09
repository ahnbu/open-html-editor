// Screen text dictionary (src/i18n/<lang>.json, inlined by build-single.mjs as window.HE_I18N).
// Language: saved choice > browser language (ko* -> ko, else en). Missing keys fall back to ko, then the key itself.
// Markup hooks:
//   data-i18n="key"                     innerHTML = text (dictionary values may contain <br>, <em>)
//   data-i18n-attr="attr:key;attr:key"  sets attributes (title, aria-label, placeholder, data-empty ...)
//   [data-lang] buttons                 switch language
(function () {
  'use strict';
  const D = window.HE_I18N || {};
  const LANGS = Object.keys(D);
  const saved = () => { try { return localStorage.getItem('he-lang'); } catch (e) { return null; } };
  const q = new URLSearchParams(location.search).get('lang');
  let lang = [q, saved(), /^ko\b/i.test(navigator.language || '') ? 'ko' : 'en'].find((l) => l && LANGS.includes(l)) || 'ko';
  const listeners = [];
  function t(key, vars) {
    let s = (D[lang] && D[lang][key]) ?? (D.ko && D.ko[key]) ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  // Plain-text version for places that cannot show markup (title, status bar).
  const tt = (key, vars) => t(key, vars).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  function apply(root) {
    const r = root || document;
    r.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = el.tagName === 'TITLE' ? tt(el.dataset.i18n) : t(el.dataset.i18n); });
    r.querySelectorAll('[data-i18n-attr]').forEach((el) => el.dataset.i18nAttr.split(';').forEach((p) => { const i = p.indexOf(':'); if (i > 0) el.setAttribute(p.slice(0, i).trim(), tt(p.slice(i + 1).trim())); }));
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach((b) => { b.classList.toggle('on', b.dataset.lang === lang); b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
  }
  function set(l) {
    if (!LANGS.includes(l) || l === lang) return;
    lang = l; try { localStorage.setItem('he-lang', l); } catch (e) { /* private mode */ }
    apply(); listeners.forEach((f) => { try { f(l); } catch (e) { /* keep others running */ } });
  }
  window.HE_T = t; window.HE_TT = tt;
  window.HE_LANG = { get: () => lang, set, apply, onChange: (f) => listeners.push(f), list: LANGS };
  apply();
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-lang]'); if (b) set(b.dataset.lang); });
})();
