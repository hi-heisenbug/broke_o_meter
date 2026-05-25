/**
 * Currency selection, formatting, OCR currency detection and live FX conversion.
 */
import { CURRENCIES, FX_API_BASE } from './config.js';
import { state } from './state.js';

/** In-memory rate cache: { 'INR->USD': 0.012, ... }. */
const rateCache = {};

/** Symbol for the currently selected currency. */
export function getCurrencySymbol() {
  return CURRENCIES[state.currentCurrency].symbol;
}

/** Format a number with the active currency symbol. */
export function formatAmount(n) {
  return getCurrencySymbol() + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** Legacy alias retained for compatibility. */
export function formatINR(n) {
  return formatAmount(n); // uses currentCurrency
}

/** Strip any currency symbol, commas and whitespace, then parse to a number. */
export function parseIndianAmount(str) {
  return parseFloat(str.replace(/[₹$£€,\s]/g, '').trim());
}

/**
 * Fetch a live conversion rate, caching results. Returns `null` on failure so
 * callers can fall back gracefully.
 */
export async function fetchRate(fromCode, toCode) {
  if (fromCode === toCode) return 1;
  const key = fromCode + '->' + toCode;
  if (rateCache[key] !== undefined) return rateCache[key];
  try {
    const from = fromCode.toLowerCase();
    const to   = toCode.toLowerCase();
    const url  = FX_API_BASE + from + '.json';
    const res  = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const rate = data[from] && data[from][to];
    if (!rate) throw new Error('rate not found');
    rateCache[key] = rate;
    return rate;
  } catch (e) {
    console.warn('Rate fetch failed:', e);
    return null; // caller handles null
  }
}

/** Convert the stored raw balance into `newCurrency` and update the display. */
export async function convertAndDisplay(newCurrency) {
  if (state.rawBalance === null) return;
  const ev     = document.getElementById('extracted-value');
  const note   = document.querySelector('#extracted-wrap .extracted-note');
  const prevNote = note ? note.textContent : '';

  if (state.rawCurrency === newCurrency) {
    state.extractedBalance = state.rawBalance;
    if (ev) ev.textContent = formatAmount(state.rawBalance);
    if (note) note.textContent = 'Only you can see this. Gone after proof is made.';
    return;
  }

  // Show loading state
  if (ev) ev.textContent = 'Converting...';
  if (note) note.textContent = 'Fetching live rate...';

  const rate = await fetchRate(state.rawCurrency, newCurrency);
  if (rate === null) {
    // Conversion failed — show original with warning
    state.extractedBalance = state.rawBalance;
    if (ev) ev.textContent = CURRENCIES[state.rawCurrency].symbol + state.rawBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    if (note) note.textContent = 'Live rate unavailable. Showing original ' + state.rawCurrency + ' value.';
    return;
  }

  const converted = parseFloat((state.rawBalance * rate).toFixed(2));
  state.extractedBalance = converted;
  if (ev) ev.textContent = formatAmount(converted);
  if (note) note.textContent = '1 ' + state.rawCurrency + ' = ' + rate.toFixed(4) + ' ' + newCurrency + '. Gone after proof is made.';
}

/** Handle a currency pill click: update state, button state, and conversion. */
export function setCurrency(btn, code) {
  state.currentCurrency = code;
  document.querySelectorAll('.c-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Update custom symbol
  const cs = document.getElementById('custom-symbol');
  if (cs) cs.textContent = getCurrencySymbol();
  // Convert and update extracted value if one exists
  if (state.rawBalance !== null) {
    convertAndDisplay(code);
  }
}

/** Auto-detect the dominant currency in OCR text and switch to it. */
export function detectCurrencyFromText(text) {
  const counts = { INR: 0, USD: 0, GBP: 0, EUR: 0 };
  counts.INR = (text.match(/₹/g) || []).length;
  counts.USD = (text.match(/\$/g) || []).length;
  counts.GBP = (text.match(/£/g) || []).length;
  counts.EUR = (text.match(/€/g) || []).length;
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (best[1] > 0 && best[0] !== state.currentCurrency) {
    const btn = document.querySelector('.c-btn[onclick*="' + best[0] + '"]');
    if (btn) {
      setCurrency(btn, best[0]);
      const badge = document.getElementById('currency-detected');
      if (badge) badge.classList.add('show');
      setTimeout(() => badge && badge.classList.remove('show'), 3000);
    }
  }
  return best[0];
}
