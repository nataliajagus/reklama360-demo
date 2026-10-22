/* =========================================================
   reklama360 — skrypt strony (wspólny dla wszystkich podstron)
   Każdy moduł uruchamia się tylko tam, gdzie znajdzie swoje elementy.
   Ceny kalkulatora i kalendarzy: blok CONFIG poniżej.
   ========================================================= */
(() => {
'use strict';

/* ---------------------------------------------------------
   CONFIG 1 — formularz
   send.php leży w katalogu głównym strony (wymaga hostingu z PHP).
   --------------------------------------------------------- */
const MAIL_TO = 'kontakt@reklama360.com';
const PHONE = '792 054 243';
const VAT = 0.23;

/* =========================================================
   Narzędzia
   ========================================================= */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const nf = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const zl = n => nf.format(n) + ' zł';
const num = n => new Intl.NumberFormat('pl-PL').format(n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round2 = n => Math.round(n * 100) / 100;
const root = (() => { const s = document.currentScript || $('script[src$="site.js"]'); return s ? s.getAttribute('src').replace('assets/js/site.js', '') : ''; })();
const formEndpoint = root + 'send.php';

/* =========================================================
   Nagłówek i menu
   ========================================================= */
const header = $('.site-header');
const nav = $('#nav');
const burger = $('#burger');
const setMenu = open => {
  nav.classList.toggle('open', open);
  document.documentElement.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
};
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); $$('.nav-item.open').forEach(n => n.classList.remove('open')); } });
$$('.sub-toggle').forEach(b => b.addEventListener('click', () => {
  const it = b.closest('.nav-item'); const o = !it.classList.contains('open');
  it.classList.toggle('open', o); b.setAttribute('aria-expanded', o);
}));

/* =========================================================
   Scroll: tarcza 360° + obrót znacznika rejestru
   ========================================================= */
const dial = $('#dial'), dialBar = $('#dialBar'), dialTxt = $('#dialTxt'), reg = $('#regTarget');
const CIRC = 2 * Math.PI * 27;
let ticking = false, burstDone = false;
const onScroll = () => {
  ticking = false;
  const y = scrollY;
  header.classList.toggle('is-stuck', y > 8);
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? clamp(y / max, 0, 1) : 0;
  const deg = Math.round(p * 360);
  dial.classList.toggle('show', y > 240);
  dial.classList.toggle('full', deg >= 358);
  if (deg >= 358 && !burstDone) { burstDone = true; burst(); }
  dialBar.style.strokeDashoffset = CIRC * (1 - p);
  dialTxt.textContent = deg + '°';
  if (reg && !reduce && y < 1400) reg.style.setProperty('--rot', (y * 0.22) + 'deg');
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();

const ticks = $('#regTicks');
if (ticks) {
  let s = '';
  for (let i = 0; i < 72; i++) {
    const a = i * 5, major = i % 6 === 0, mid = i % 3 === 0;
    const len = major ? 16 : mid ? 10 : 6;
    s += `<line x1="0" y1="-188" x2="0" y2="${-188 + len}" stroke="currentColor" stroke-width="${major ? 1.6 : 1}" transform="rotate(${a})"/>`;
  }
  [0, 90, 180, 270].forEach(a => { s += `<text x="0" y="-164" text-anchor="middle" transform="rotate(${a})">${a}°</text>`; });
  ticks.innerHTML = s;
}

/* =========================================================
   Reveal, hero, proces
   ========================================================= */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1, rootMargin: '0px 0px -5% 0px' });
$$('.reveal:not(.eyebrow)').forEach(el => io.observe(el));
/* etykiety mają clip-path (zerowy obszar), więc obserwujemy ich rodzica */
const eio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('.eyebrow.reveal', e.target).forEach(x => x.classList.add('in')); eio.unobserve(e.target); } }), { threshold: .1, rootMargin: '0px 0px -5% 0px' });
new Set($$('.eyebrow.reveal').map(el => el.parentElement)).forEach(p => eio.observe(p));

const ready = () => document.body.classList.add('is-ready');
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 700))]) : Promise.resolve()).then(() => requestAnimationFrame(ready));

const steps = $('#steps');
if (steps) {
  const lis = $$('li', steps);
  const so = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    so.disconnect();
    lis.forEach((li, i) => setTimeout(() => {
      li.classList.add('on');
      steps.style.setProperty('--prog', (i === lis.length - 1 ? 100 : ((i + 1) / lis.length * 100 - 100 / lis.length / 2)) + '%');
    }, reduce ? 0 : i * 320));
  }, { threshold: .35 });
  so.observe(steps);
}

/* =========================================================
   Modale
   ========================================================= */
const lockScroll = () => { document.documentElement.style.overflow = $$('dialog[open]').length ? 'hidden' : ''; };
const openDlg = id => { const d = document.getElementById(id); if (d && !d.open) { d.showModal(); lockScroll(); } return d; };
$$('dialog').forEach(d => {
  d.addEventListener('close', lockScroll);
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  $$('[data-close]', d).forEach(b => b.addEventListener('click', () => d.close()));
});
/* „Do góry”: nagłówek jest przyklejony, więc kotwica #top sama by nie przewinęła strony */
document.addEventListener('click', e => {
  const t = e.target.closest('a[href="#top"]');
  if (!t) return;
  e.preventDefault();
  scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  history.replaceState(null, '', location.pathname + location.search);
});
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) { e.preventDefault(); openDlg(o.dataset.open); return; }
  const q = e.target.closest('[data-open-quote]');
  if (q) {
    e.preventDefault();
    const summary = q.dataset.summary ? q.dataset.summary.split(';;').map(x => x.split('|')) : null;
    openQuote({ topic: q.dataset.topic, summary });
  }
});

/* =========================================================
   Formularz (jeden szablon: modal + strona kontaktu)
   ========================================================= */
const tpl = $('#tpl-form');
const mailtoHref = (f, summary) => {
  const body = `Imię i nazwisko: ${f.name || ''}\nFirma: ${f.company || ''}\nTelefon: ${f.phone || ''}\nTemat: ${f.topic || ''}\n\n${f.message || ''}\n\n${summary || ''}`;
  return `mailto:${MAIL_TO}?subject=${encodeURIComponent('Zapytanie ze strony: ' + (f.topic || 'wycena'))}&body=${encodeURIComponent(body)}`;
};

function mountForm(host, { topic, summary } = {}) {
  host.innerHTML = '';
  const form = tpl.content.firstElementChild.cloneNode(true);
  host.appendChild(form);
  const sel = form.elements.topic;
  const t = topic || host.dataset.topic;
  if (t) {
    if (![...sel.options].some(o => o.value === t || o.text === t)) sel.add(new Option(t, t));
    sel.value = t;
  }
  form.elements.summary.value = summary || '';
  if (summary) { // wycena z kalkulatora/konfiguratora: parametry są już wybrane, więc pytamy tylko o resztę
    form.elements.message.placeholder = 'Dodatkowe uwagi (opcjonalnie): oczekiwany termin, dostawa, projekt, pytania. Parametry z wyceny dołączymy automatycznie.';
    const lbl = form.elements.message.closest('label').firstElementChild; if (lbl) lbl.textContent = 'Dodatkowe uwagi';
  }
  const msg = $('.form-msg', form);
  const showMsg = (html, ok) => { msg.innerHTML = html; msg.classList.toggle('ok', !!ok); msg.hidden = false; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.hidden = true;
    const el = form.elements;
    if (!el.name.value.trim()) { showMsg('Podaj imię i nazwisko.'); el.name.focus(); return; }
    if (!el.email.validity.valid || !el.email.value.trim()) { showMsg('Podaj poprawny adres e-mail, na który wyślemy odpowiedź.'); el.email.focus(); return; }
    if (!el.consent.checked) { showMsg('Zaznacz zgodę na kontakt w sprawie zapytania.'); el.consent.focus(); return; }
    const data = Object.fromEntries(new FormData(form).entries());
    form.classList.add('is-sending');
    $('.btn-t', form).textContent = 'Wysyłam…';
    try {
      const res = await fetch(formEndpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'send failed');
      host.innerHTML = `<div class="form-done" role="status"><span class="tick"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg></span><h3>Wysłane. Dziękujemy!</h3><p>Odpowiemy na adres <b></b> w dni robocze. Jeśli sprawa jest pilna, zadzwoń: <a href="tel:+48${PHONE.replace(/\s/g, '')}">${PHONE}</a>.</p></div>`;
      $('b', host).textContent = data.email;
    } catch (err) {
      form.classList.remove('is-sending');
      $('.btn-t', form).textContent = 'Wyślij zapytanie';
      showMsg(`Nie udało się wysłać formularza. Spróbuj ponownie albo <a href="${mailtoHref(data, data.summary)}">otwórz wiadomość w programie pocztowym</a>, napisz na ${MAIL_TO} lub zadzwoń: ${PHONE}.`);
    }
  });
  return form;
}

function openQuote({ topic, summary } = {}) {
  const box = $('#quoteSummary');
  if (summary && summary.length) {
    box.innerHTML = summary.map(([k, v]) => `<span><b>${k}</b> ${v}</span>`).join('');
    box.hidden = false;
  } else { box.hidden = true; box.innerHTML = ''; }
  const text = (summary || []).map(([k, v]) => `${k}: ${v}`).join('\n');
  const form = mountForm($('#quoteFormHost'), { topic, summary: text });
  openDlg('dlg-quote');
  requestAnimationFrame(() => form.elements.name.focus({ preventScroll: true }));
}
const contactHost = $('#contactFormHost');
if (contactHost) mountForm(contactHost);

/* =========================================================
   REALIZACJE — zakładki i miniatury (treść jest w HTML)
   ========================================================= */
const caseTabs = $('#caseTabs');
if (caseTabs) (() => {
  const tabs = $$('[role=tab]', caseTabs), panels = $$('.case');
  const select = (id, focus, updateHash = true) => {
    tabs.forEach(t => { const on = t.dataset.id === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    panels.forEach(p => { p.hidden = p.id !== 'case-' + id; });
    if (updateHash) history.replaceState(null, '', '#' + id);
  };
  caseTabs.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) select(b.dataset.id); });
  caseTabs.addEventListener('keydown', e => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!k) return;
    e.preventDefault();
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    select(tabs[(i + k + tabs.length) % tabs.length].dataset.id, true);
  });
  $('#caseView').addEventListener('click', e => {
    const t = e.target.closest('.case-thumbs button'); if (!t) return;
    const panel = t.closest('.case'), img = $('[data-main]', panel);
    if (img.tagName === 'IMG') { img.src = t.dataset.src; img.alt = t.dataset.alt; }
    else { const sub = $('.ph-sub', img); if (sub) sub.textContent = t.dataset.alt; img.setAttribute('aria-label', 'Miejsce na zdjęcie: ' + t.dataset.alt); }
    img.classList.remove('fade'); void img.offsetWidth; img.classList.add('fade');
    $$('.case-thumbs button', panel).forEach(b => b === t ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'));
  });
  const h = location.hash.slice(1);
  if (h && tabs.some(t => t.dataset.id === h)) select(h, false, false);
})();

/* =========================================================
   ZESPÓŁ — slider (przyciski, przeciąganie myszą, klawiatura)
   ========================================================= */
const teamEl = $('#team');
if (teamEl) (() => {
  const el = teamEl, prev = $('#teamPrev'), next = $('#teamNext');
  const step = () => { const c = el.firstElementChild; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || 16) : 300; };
  const upd = () => { prev.disabled = el.scrollLeft < 8; next.disabled = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8; };
  const go = d => el.scrollBy({ left: d * step() * (innerWidth > 980 ? 2 : 1), behavior: reduce ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => go(-1)); next.addEventListener('click', () => go(1));
  el.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
  addEventListener('resize', upd);
  el.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
  let down = false, sx = 0, sl = 0, moved = false;
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; el.classList.add('drag'); } if (moved) el.scrollLeft = sl - dx; });
  addEventListener('pointerup', () => { if (!down) return; down = false; el.classList.remove('drag'); });
  upd();
})();

/* =========================================================
   FAQ — płynne rozwijanie (Web Animations API)
   ========================================================= */
$$('.faq details').forEach(d => {
  const s = $('summary', d), body = d.lastElementChild;
  s.addEventListener('click', e => {
    e.preventDefault();
    if (reduce) { d.open = !d.open; return; }
    if (d.dataset.busy) return;
    d.dataset.busy = '1';
    const wasOpen = d.open, start = d.offsetHeight;
    if (!wasOpen) d.open = true;
    const end = wasOpen ? s.offsetHeight : d.offsetHeight;
    const anim = d.animate([{ height: start + 'px' }, { height: end + 'px' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
    if (!wasOpen) body.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    anim.onfinish = anim.oncancel = () => { if (wasOpen) d.open = false; delete d.dataset.busy; };
  });
});

/* =========================================================
   SMACZKI: przechył hero, magnetyczne przyciski, poświata kart,
   rysowanie ikon, litery stopki, konfetti CMYK, powitanie w konsoli
   ========================================================= */
function burst() {
  if (reduce || !dial) return;
  const r = dial.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const cols = ['#00aeef', '#ec008c', '#ffe600', '#21201e', '#aece00'];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('i'); el.className = 'confetti';
    const ang = (-80 + Math.random() * 160) * Math.PI / 180, dist = 90 + Math.random() * 230;
    el.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;background:' + cols[i % cols.length] + ';--dx:' + (Math.cos(ang) * dist) + 'px;--dy:' + (-Math.sin(ang) * dist - 40) + 'px;--rot:' + (Math.random() * 540 - 270) + 'deg';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}
(() => {
  /* ikony rysowane linią */
  $$('.ic svg path, .ic svg circle, .ic svg rect, .ic svg line').forEach(el => el.setAttribute('pathLength', '1'));

  /* poświata podążająca za kursorem */
  $$('.ic-card, .cc-item, .qt-tile, .case-card, .foot-pills a').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* litery napisu w stopce */
  const fw = $('.foot-word span');
  if (fw) {
    let i = 0;
    const wrap = node => [...node.textContent].map(ch => { const s = document.createElement('span'); s.className = 'l'; s.style.setProperty('--i', i++); s.textContent = ch; return s; });
    [...fw.childNodes].forEach(n => {
      if (n.nodeType === 3) n.replaceWith(...wrap(n));
      else if (n.nodeName === 'B') { const kids = wrap(n); n.textContent = ''; n.append(...kids); }
    });
    const fo = new IntersectionObserver(es => { if (es[0].isIntersecting) { fw.parentElement.classList.add('in'); fo.disconnect(); } }, { threshold: .25 });
    fo.observe(fw.parentElement);
  }

  console.log('%c360', 'background:#aece00;color:#21201e;font:800 24px Arial;padding:4px 12px;border-radius:4px', '\nSzukasz kogoś, kto zaprojektuje, wydrukuje i zamontuje? kontakt@reklama360.com');

  if (reduce || matchMedia('(hover: none)').matches) return;

  /* hero: przechył zdjęcia i paralaksa znacznika rejestru */
  const art = $('.hero-art'), frame = $('.frame');
  if (art && frame) {
    art.addEventListener('pointermove', e => {
      const r = art.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      frame.style.setProperty('--ry', (nx * 14) + 'deg');
      frame.style.setProperty('--rx', (-ny * 12) + 'deg');
      if (reg) { reg.style.setProperty('--px', (-nx * 22) + 'px'); reg.style.setProperty('--py', (-ny * 22) + 'px'); }
    });
    art.addEventListener('pointerleave', () => {
      ['--ry', '--rx'].forEach(p => frame.style.setProperty(p, '0deg'));
      if (reg) { reg.style.setProperty('--px', '0px'); reg.style.setProperty('--py', '0px'); }
    });
  }

  /* magnetyczne przyciski główne */
  $$('.hero-actions .btn, .cta-actions .btn, .season .btn, .quote-tease .btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      b.style.transform = 'translate(' + (dx * 12) + 'px,' + (dy * 9) + 'px)';
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
})();

})();
