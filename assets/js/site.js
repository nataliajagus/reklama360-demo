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

/* ---------------------------------------------------------
   CONFIG 2 — CENY (netto, PLN). >>> PRZYKŁADOWE, DO ZATWIERDZENIA <<<
   --------------------------------------------------------- */
const PRICES = {
  wizytowki: {
    base: { 100: 49, 250: 69, 500: 99, 1000: 149, 2000: 249 }, // cena za cały nakład, kreda 350 g, 4+0
    paper: { kreda: 1, soft: 1.45, ozd: 1.6 },
    sides: { 1: 1, 2: 1.3 },
    design: 90
  },
  ulotki: {
    unitA5: { 100: 0.65, 250: 0.38, 500: 0.26, 1000: 0.19, 2500: 0.13 }, // zł/szt. A5, 130 g, 4+4
    format: { A6: 0.6, DL: 0.75, A5: 1, A4: 1.8 },
    paper: { 130: 1, 170: 1.15, 250: 1.5 },
    sides: { 1: 0.75, 2: 1 },
    min: 39,
    design: 150
  },
  banery: {
    rate: { 440: 38, 510: 46, mesh: 52 },       // zł / m²
    minPerPiece: 45,
    pocketPerMeter: 8,                          // kieszeń na maszt, zł / mb szerokości
    qtyDisc: { 1: 1, 2: 0.95, 3: 0.92, 5: 0.88, 10: 0.82 },
    design: 120
  },
  plakaty: {
    sheet: { A3: 6, A2: 14, A1: 26, A0: 42, B1: 38 }, // zł / arkusz, papier 135 g
    paper: { 135: 1, 200: 1.6 },
    qtyDisc: { 1: 1, 5: 0.88, 10: 0.8, 25: 0.7, 50: 0.62 },
    design: 120
  },
  kalendarze: {
    // cena za sztukę przy nakładzie 50 / 100 / 500 (pomiędzy: interpolacja; powyżej 500: cena z 500)
    single: { flat: { 50: 9.8, 100: 7.9, 500: 6.0 }, convex: { 50: 11.4, 100: 9.2, 500: 7.2 } },
    triple: { flat: { 50: 14.5, 100: 11.2, 500: 7.8 }, convex: { 50: 18.0, 100: 14.8, 500: 11.4 } },
    extras: [
      { id: 'env-paper', label: 'Koperty papierowe', unit: 1.0 },
      { id: 'env-card', label: 'Koperty kartonowe', unit: 2.0 },
      { id: 'own-cal', label: 'Indywidualne kalendarium', unit: 2.5 },
      { id: 'adapt', label: 'Dostosowanie projektu', flat: 50, group: 'design' },
      { id: 'design', label: 'Projekt od podstaw', flat: 300, group: 'design' }
    ],
    quick: [50, 100, 250, 500, 1000]
  }
};

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
   KALKULATOR (strona /wycena/)
   ========================================================= */
const calcRoot = $('#calc');
if (calcRoot) (() => {
  const tabsEl = $('.calc-tabs');
  const ctrlEl = $('#calcControls');
  const ticketEl = $('#calcTicket');

  const chips = (id, label, opts, val, fmtFn = v => v) => `
    <fieldset class="fld"><legend>${label}</legend><div class="chips">${opts.map(o => `
      <label class="chip"><input type="radio" name="${id}" value="${o}" ${String(o) === String(val) ? 'checked' : ''}><span>${fmtFn(o)}</span></label>`).join('')}
    </div></fieldset>`;
  const radios = (id, label, opts, val) => `
    <fieldset class="fld"><legend>${label}</legend><div class="opt-row">${opts.map(([v, l, s]) => `
      <label><input type="radio" name="${id}" value="${v}" ${String(v) === String(val) ? 'checked' : ''}><span>${l}${s ? `<small>${s}</small>` : ''}</span></label>`).join('')}
    </div></fieldset>`;
  const check = (id, label, small, val) => `
    <label class="check-line"><input type="checkbox" name="${id}" ${val ? 'checked' : ''}><span>${label}${small ? `<small>${small}</small>` : ''}</span></label>`;
  const numField = (id, label, val, min, max, unit) => `
    <div class="fld"><span class="fld-l">${label}</span><div class="num"><input type="number" name="${id}" value="${val}" min="${min}" max="${max}" step="0.1" inputmode="decimal" aria-label="${label}"><span>${unit}</span></div></div>`;

  const CALC = {
    wizytowki: {
      label: 'Wizytówki', topic: 'Druk (wizytówki, ulotki, plakaty...)',
      def: { qty: 250, paper: 'kreda', sides: '2', design: false },
      form: v => [
        chips('qty', 'Nakład', [100, 250, 500, 1000, 2000], v.qty, n => num(n) + ' szt.'),
        radios('paper', 'Papier i wykończenie', [['kreda', 'Kreda mat 350 g'], ['soft', 'Kreda + folia soft-touch', 'premium'], ['ozd', 'Papier ozdobny 300 g']], v.paper),
        radios('sides', 'Druk', [['1', 'Jednostronny'], ['2', 'Dwustronny']], v.sides),
        check('design', 'Potrzebuję projektu graficznego', `+${PRICES.wizytowki.design} zł`, v.design)
      ].join(''),
      calc(v) {
        const p = PRICES.wizytowki;
        const body = p.base[v.qty] * p.paper[v.paper] * p.sides[v.sides];
        const net = round2(body + (v.design ? p.design : 0));
        const paper = { kreda: 'kreda mat 350 g', soft: 'kreda 350 g + soft-touch', ozd: 'papier ozdobny 300 g' }[v.paper];
        return { net, unit: net / v.qty, rows: [['Produkt', 'Wizytówki 90 × 50 mm'], ['Nakład', num(v.qty) + ' szt.'], ['Papier', paper], ['Druk', v.sides === '2' ? 'dwustronny' : 'jednostronny'], ['Projekt', v.design ? 'tak, od nas' : 'dostarczam plik']] };
      }
    },
    ulotki: {
      label: 'Ulotki', topic: 'Druk (wizytówki, ulotki, plakaty...)',
      def: { format: 'A5', qty: 500, paper: '130', sides: '2', design: false },
      form: v => [
        chips('format', 'Format', ['A6', 'DL', 'A5', 'A4'], v.format),
        chips('qty', 'Nakład', [100, 250, 500, 1000, 2500], v.qty, n => num(n) + ' szt.'),
        radios('paper', 'Papier', [['130', 'Kreda 130 g', 'standard'], ['170', 'Kreda 170 g'], ['250', 'Kreda 250 g', 'sztywniejsza']], v.paper),
        radios('sides', 'Druk', [['1', 'Jednostronny (4+0)'], ['2', 'Dwustronny (4+4)']], v.sides),
        check('design', 'Potrzebuję projektu graficznego', `+${PRICES.ulotki.design} zł`, v.design)
      ].join(''),
      calc(v) {
        const p = PRICES.ulotki;
        const body = Math.max(p.min, p.unitA5[v.qty] * v.qty * p.format[v.format] * p.paper[v.paper] * p.sides[v.sides]);
        const net = round2(body + (v.design ? p.design : 0));
        return { net, unit: net / v.qty, rows: [['Produkt', 'Ulotki ' + v.format], ['Nakład', num(v.qty) + ' szt.'], ['Papier', 'kreda ' + v.paper + ' g'], ['Druk', v.sides === '2' ? '4+4, dwustronny' : '4+0, jednostronny'], ['Projekt', v.design ? 'tak, od nas' : 'dostarczam plik']] };
      }
    },
    banery: {
      label: 'Banery', topic: 'Banery, szyldy i reklama zewnętrzna',
      def: { w: 3, h: 1, mat: '440', finish: 'oczka', qty: 1, design: false },
      form: v => `
        <div class="num-row">${numField('w', 'Szerokość', v.w, 0.3, 50, 'm')}${numField('h', 'Wysokość', v.h, 0.3, 10, 'm')}</div>
        ${radios('mat', 'Materiał', [['440', 'Banner PVC 440 g', `${PRICES.banery.rate[440]} zł/m²`], ['510', 'Banner PVC 510 g, matowy', `${PRICES.banery.rate[510]} zł/m²`], ['mesh', 'Siatka mesh (przepuszcza wiatr)', `${PRICES.banery.rate.mesh} zł/m²`]], v.mat)}
        ${radios('finish', 'Wykończenie', [['oczka', 'Zgrzew i oczka co 50 cm', 'w cenie'], ['kieszen', 'Zgrzew i kieszeń na maszt', `+${PRICES.banery.pocketPerMeter} zł/mb`]], v.finish)}
        ${chips('qty', 'Sztuk', [1, 2, 3, 5, 10], v.qty)}
        ${check('design', 'Potrzebuję projektu graficznego', `+${PRICES.banery.design} zł`, v.design)}`,
      calc(v) {
        const p = PRICES.banery;
        const w = clamp(+v.w || 0.3, 0.3, 50), h = clamp(+v.h || 0.3, 0.3, 10);
        const area = w * h;
        const one = Math.max(p.minPerPiece, area * p.rate[v.mat]) + (v.finish === 'kieszen' ? p.pocketPerMeter * w : 0);
        const net = round2(one * v.qty * p.qtyDisc[v.qty] + (v.design ? p.design : 0));
        const mats = { 440: 'Banner PVC 440 g', 510: 'Banner PVC 510 g, matowy', mesh: 'Siatka mesh' };
        return { net, unit: net / v.qty, rows: [['Produkt', 'Baner'], ['Wymiar', `${nf.format(w).replace(',00', '')} × ${nf.format(h).replace(',00', '')} m (${nf.format(area)} m²)`], ['Materiał', mats[v.mat]], ['Wykończenie', v.finish === 'kieszen' ? 'kieszeń na maszt' : 'oczka co 50 cm'], ['Sztuk', String(v.qty)], ['Projekt', v.design ? 'tak, od nas' : 'dostarczam plik']] };
      }
    },
    plakaty: {
      label: 'Plakaty', topic: 'Druk (wizytówki, ulotki, plakaty...)',
      def: { format: 'A2', qty: 5, paper: '135', design: false },
      form: v => [
        chips('format', 'Format', ['A3', 'A2', 'A1', 'A0', 'B1'], v.format),
        chips('qty', 'Sztuk', [1, 5, 10, 25, 50], v.qty),
        radios('paper', 'Papier', [['135', 'Papier satynowy 135 g'], ['200', 'Papier fotograficzny 200 g', 'intensywniejszy kolor']], v.paper),
        check('design', 'Potrzebuję projektu graficznego', `+${PRICES.plakaty.design} zł`, v.design)
      ].join(''),
      calc(v) {
        const p = PRICES.plakaty;
        const net = round2(p.sheet[v.format] * p.paper[v.paper] * v.qty * p.qtyDisc[v.qty] + (v.design ? p.design : 0));
        return { net, unit: net / v.qty, rows: [['Produkt', 'Plakaty ' + v.format], ['Sztuk', String(v.qty)], ['Papier', v.paper === '135' ? 'satynowy 135 g' : 'fotograficzny 200 g'], ['Projekt', v.design ? 'tak, od nas' : 'dostarczam plik']] };
      }
    }
  };

  const param = new URLSearchParams(location.search).get('p');
  let calcKey = CALC[param] ? param : 'wizytowki';
  const calcState = {};
  Object.keys(CALC).forEach(k => calcState[k] = { ...CALC[k].def });

  function renderTabs() {
    tabsEl.innerHTML = Object.entries(CALC).map(([k, c]) =>
      `<button type="button" role="tab" id="tab-${k}" data-k="${k}" aria-selected="${k === calcKey}" aria-controls="calcControls" tabindex="${k === calcKey ? 0 : -1}">${c.label}</button>`).join('');
  }
  function renderControls() {
    ctrlEl.setAttribute('role', 'tabpanel');
    ctrlEl.setAttribute('aria-labelledby', 'tab-' + calcKey);
    ctrlEl.innerHTML = CALC[calcKey].form(calcState[calcKey]);
  }
  function renderTicket(pop) {
    const c = CALC[calcKey], r = c.calc(calcState[calcKey]);
    const gross = r.net * (1 + VAT);
    const dl = r.rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    ticketEl.innerHTML = `
      <div class="ticket-in">
        <div class="ticket-head"><span class="mono">Karta zlecenia</span><span class="mono">Wycena orientacyjna</span></div>
        <div class="price-wrap">
          <div class="price-big ${pop ? 'price-pop' : ''}" aria-live="polite">${nf.format(r.net)}<small>zł netto</small></div>
          <div class="price-sub"><span><b>${zl(gross)}</b> brutto (VAT ${VAT * 100}%)</span><span>${zl(r.unit)} / szt.</span></div>
        </div>
        <dl>${dl}</dl>
        <button class="btn btn-lime" type="button" id="calcAsk">Poproś o ofertę na tę wycenę</button>
        <p class="ticket-note">Cena orientacyjna. Potwierdzamy ją po sprawdzeniu pliku lub projektu. Wolisz zadzwonić? <a href="tel:+48792054243">${PHONE}</a></p>
      </div>`;
    $('#calcAsk').addEventListener('click', () => openQuote({
      topic: c.topic,
      summary: [...r.rows, ['Cena orientacyjna', `${zl(r.net)} netto (${zl(gross)} brutto)`]]
    }));
  }
  function readControls() {
    const s = calcState[calcKey];
    $$('input', ctrlEl).forEach(i => {
      if (i.type === 'checkbox') s[i.name] = i.checked;
      else if (i.type === 'radio') { if (i.checked) s[i.name] = i.name === 'qty' ? +i.value : i.value; }
      else if (i.type === 'number') s[i.name] = i.value === '' ? '' : +i.value;
    });
  }
  ctrlEl.addEventListener('input', () => { readControls(); renderTicket(true); });
  ctrlEl.addEventListener('change', () => { readControls(); renderTicket(true); });

  function selectCalc(k) {
    if (!CALC[k]) return;
    calcKey = k;
    renderTabs(); renderControls(); renderTicket(false);
    history.replaceState(null, '', '?p=' + k);
  }
  tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) selectCalc(b.dataset.k); });
  tabsEl.addEventListener('keydown', e => {
    const keys = Object.keys(CALC), i = keys.indexOf(calcKey);
    let n = null;
    if (e.key === 'ArrowRight') n = keys[(i + 1) % keys.length];
    if (e.key === 'ArrowLeft') n = keys[(i - 1 + keys.length) % keys.length];
    if (n) { e.preventDefault(); selectCalc(n); $('#tab-' + n).focus(); }
  });
  renderTabs(); renderControls(); renderTicket(false);
})();

/* =========================================================
   KALENDARZE 2027 (strona /kalendarze-2027/)
   ========================================================= */
const calMock = $('#calMock');
if (calMock) (() => {
  const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  const YEAR = 2027;
  const holidays = (() => {
    const y = YEAR, a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(y, month - 1, day);
    const add = n => { const t = new Date(easter); t.setDate(t.getDate() + n); return `${t.getMonth()}-${t.getDate()}`; };
    const set = new Set(['0-1', '0-6', '4-1', '4-3', '7-15', '10-1', '10-11', '11-24', '11-25', '11-26']);
    [0, 1, 49, 60].forEach(n => set.add(add(n)));
    return set;
  })();

  const calState = { type: 'single', head: 'flat', qty: 100, extras: new Set(), m0: 0 };
  const K = PRICES.kalendarze;

  function monthHTML(mi) {
    const first = new Date(YEAR, mi, 1), days = new Date(YEAR, mi + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    let cells = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(d => `<b>${d}</b>`).join('');
    for (let i = 0; i < lead; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const wd = (lead + d - 1) % 7;
      cells += `<span class="${wd === 6 || holidays.has(`${mi}-${d}`) ? 'sun' : ''}">${d}</span>`;
    }
    return `<div class="cal-m"><h4>${MONTHS[mi]}<span>${YEAR}</span></h4><div class="cal-g">${cells}</div></div>`;
  }
  function renderMock(animate) {
    const t = calState.type, mi = calState.m0;
    calMock.className = `cal cal--${t} cal--${calState.head}`;
    const head = `<div class="cal-head"><span class="cal-logo">Twoje logo</span><span class="cal-year">${YEAR}</span></div>`;
    const body = t === 'single'
      ? `<div class="cal-strip">Twoja reklama tutaj</div>${monthHTML(mi)}<div class="cal-window">okienko na datę</div>`
      : [0, 1, 2].map(i => `<div class="cal-strip">${i === 0 ? 'Twoja reklama tutaj' : 'Twoje dane · www · tel.'}</div>${monthHTML(mi + i)}`).join('');
    calMock.innerHTML = head + body;
    if (animate) { calMock.classList.remove('cal-swap'); void calMock.offsetWidth; calMock.classList.add('cal-swap'); }
    $('#calMonthLabel').textContent = t === 'single' ? `${MONTHS[mi]} ${YEAR}` : `${MONTHS[mi]} – ${MONTHS[mi + 2]} ${YEAR}`;
  }
  function stepMonth(dir) {
    const max = calState.type === 'single' ? 11 : 9;
    calState.m0 = clamp(calState.m0 + dir * (calState.type === 'single' ? 1 : 3), 0, max);
    renderMock(true);
  }
  $('#calPrev').addEventListener('click', () => stepMonth(-1));
  $('#calNext').addEventListener('click', () => stepMonth(1));

  const unitFor = (type, head, qty) => {
    const t = K[type][head];
    if (qty <= 50) return t[50];
    if (qty >= 500) return t[500];
    if (qty <= 100) return t[50] + (t[100] - t[50]) * (qty - 50) / 50;
    return t[100] + (t[500] - t[100]) * (qty - 100) / 400;
  };
  function calcCal() {
    const { type, head, qty } = calState;
    const base = unitFor(type, head, qty);
    let unitExtras = 0, flat = 0; const lines = [];
    K.extras.forEach(x => {
      if (!calState.extras.has(x.id)) return;
      if (x.unit) unitExtras += x.unit; else flat += x.flat;
      lines.push(x.label);
    });
    const unit = round2(base) + unitExtras;
    return { unit, net: round2(unit * qty + flat), lines };
  }
  function renderPrice(pop) {
    const r = calcCal(), { type, head, qty } = calState;
    const gross = r.net * (1 + VAT);
    const rows = [50, 100, 500].map(n => { const u = round2(unitFor(type, head, n)); return `<tr><td>${n} szt.</td><td>${zl(u)}</td><td>${zl(u * n)}</td></tr>`; }).join('');
    $('#calPrice').innerHTML = `
      <div>
        <div class="price-big ${pop ? 'price-pop' : ''}" aria-live="polite">${nf.format(r.net)}<small>zł netto</small></div>
        <div class="price-sub"><span><b>${zl(gross)}</b> brutto</span><span>${zl(r.unit)} / szt. · ${num(qty)} szt.</span></div>
      </div>
      <table class="ptable"><thead><tr><th>Nakład</th><th>Cena / szt.</th><th>Razem netto</th></tr></thead><tbody>${rows}</tbody></table>
      <button class="btn btn-lime" type="button" id="calOrder">Zamów kalendarze</button>
      <p class="ticket-note">Ceny netto, bez dodatków w tabeli. Ostateczną wycenę i proformę wystawiamy po omówieniu projektu.</p>`;
    $('#calOrder').addEventListener('click', () => {
      const typeL = type === 'single' ? 'jednodzielny' : 'trójdzielny', headL = head === 'flat' ? 'płaska' : 'wypukła';
      openQuote({
        topic: 'Kalendarze 2027',
        summary: [['Produkt', `Kalendarz ${typeL} 2027`], ['Główka', headL], ['Nakład', num(qty) + ' szt.'], ['Dodatki', r.lines.length ? r.lines.join(', ') : 'brak'], ['Cena orientacyjna', `${zl(r.net)} netto (${zl(gross)} brutto)`]]
      });
    });
  }
  const syncQty = v => { $('#calQty').value = v; $$('input[name=calQty]').forEach(i => i.checked = +i.value === v); };
  $('#calQtyChips').innerHTML = K.quick.map(n => `<label class="chip"><input type="radio" name="calQty" value="${n}" ${n === calState.qty ? 'checked' : ''}><span>${num(n)}</span></label>`).join('');
  $('#calExtras').innerHTML = K.extras.map(x => `<label class="check-line"><input type="checkbox" value="${x.id}"><span>${x.label}<small>${x.unit ? '+' + nf.format(x.unit) + ' zł/szt.' : '+' + x.flat + ' zł jednorazowo'}</small></span></label>`).join('');

  $('#calType').addEventListener('change', e => {
    calState.type = e.target.value;
    calState.m0 = clamp(calState.m0 - (calState.m0 % 3), 0, calState.type === 'single' ? 11 : 9);
    renderMock(true); renderPrice(true);
  });
  $('#calHead').addEventListener('change', e => { calState.head = e.target.value; renderMock(false); renderPrice(true); });
  $('#calQtyChips').addEventListener('change', e => { calState.qty = +e.target.value; $('#calQty').value = calState.qty; renderPrice(true); });
  $('#calQty').addEventListener('input', e => {
    const v = clamp(Math.round(+e.target.value) || 0, 0, 5000);
    if (v >= 50) { calState.qty = v; $$('input[name=calQty]').forEach(i => i.checked = +i.value === v); renderPrice(true); }
  });
  $('#calQty').addEventListener('change', e => { const v = clamp(Math.round(+e.target.value) || 50, 50, 5000); calState.qty = v; syncQty(v); renderPrice(true); });
  $('#calExtras').addEventListener('change', e => {
    const x = K.extras.find(a => a.id === e.target.value);
    if (e.target.checked) {
      calState.extras.add(x.id);
      if (x.group) K.extras.filter(o => o.group === x.group && o.id !== x.id).forEach(o => { calState.extras.delete(o.id); const el = $(`#calExtras input[value="${o.id}"]`); if (el) el.checked = false; });
    } else calState.extras.delete(x.id);
    renderPrice(true);
  });
  renderMock(false); renderPrice(false); syncQty(calState.qty);
})();

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

/* =========================================================
   SEZON 2027: odliczanie i delikatna paralaksa
   ========================================================= */
(() => {
  const nyBox = $('#nyCount');
  if (nyBox) {
    const days = Math.ceil((new Date(2027, 0, 1) - new Date()) / 86400000);
    if (days > 0 && days < 400) { $('#nyDays').textContent = days; nyBox.hidden = false; }
  }
  const stack = $('#calStack');
  if (!stack) return;
  if (!reduce) {
    // lekka paralaksa: kalendarze przesuwają się w przeciwnych kierunkach przy przewijaniu
    const front = $('.cs-front', stack), back = $('.cs-back', stack);
    let raf = 0;
    addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = stack.getBoundingClientRect(), p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        front.style.translate = '0 ' + (p * 26) + 'px';
        back.style.translate = '0 ' + (-p * 34) + 'px';
      });
    }, { passive: true });
  }
})();
})();
