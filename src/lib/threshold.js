/**
 * Threshold selection — preset pills and the custom amount input.
 */
import { state } from './state.js';
import { track } from './analytics.js';

/** Apply a custom threshold typed into the free-form input. */
export function setCustomThreshold(input) {
  const v = parseFloat(input.value);
  if (!isNaN(v) && v > 0) {
    // Deselect all preset buttons
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    state.currentThreshold = v;
  }
}

/** Apply a preset threshold and clear any custom input. */
export function setThreshold(btn, val) {
  document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.currentThreshold = val;
  // Clear custom input when preset is selected
  const ci = document.getElementById('threshold-custom');
  if (ci) ci.value = '';
  track('threshold_selected', { threshold: val });
}
