/**
 * Static configuration for Broke-O-Meter.
 *
 * Currency descriptors used by OCR detection, formatting, and the proof flow.
 * Each entry carries the display `symbol`, a canonical `name`, and a `regex`
 * used to spot amounts of that currency inside OCR output.
 */
export const CURRENCIES = {
  INR: { symbol: '₹', name: 'INR', regex: /₹\s?[\d,]+(?:\.\d{1,2})?/g },
  USD: { symbol: '$',  name: 'USD', regex: /\$\s?[\d,]+(?:\.\d{1,2})?/g },
  GBP: { symbol: '£', name: 'GBP', regex: /£\s?[\d,]+(?:\.\d{1,2})?/g },
  EUR: { symbol: '€', name: 'EUR', regex: /€\s?[\d,]+(?:\.\d{1,2})?/g },
};

/** Google Analytics measurement id (kept here for a single source of truth). */
export const GA_MEASUREMENT_ID = 'G-4V9WDJL603';

/** CDN fallbacks for the Tesseract.js OCR engine, tried in order. */
export const TESSERACT_CDNS = [
  'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://unpkg.com/tesseract.js@4/dist/tesseract.min.js',
];

/** Live FX rate endpoint (jsDelivr-hosted @fawazahmed0/currency-api). */
export const FX_API_BASE =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/';
