/**
 * Shared, mutable application state.
 *
 * A single object instance is exported so every module observes and mutates the
 * same values (ES module bindings are live, and the object reference is shared).
 * This mirrors the original single-script globals one-to-one:
 *
 *   extractedBalance — working value, always in `currentCurrency` units
 *   rawBalance       — original OCR value in `rawCurrency` units
 *   rawCurrency      — currency the OCR value was detected in
 *   currentThreshold — selected "broke below" threshold
 *   currentCurrency  — currently selected display currency
 */
export const state = {
  extractedBalance: null,
  rawBalance: null,
  rawCurrency: null,
  currentThreshold: 50,
  currentCurrency: 'INR',
};
