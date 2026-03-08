// Options page script for SessionLightener
// Mirrors the functionality of the popup but provides additional context.

const DEFAULT_KEEP = 50;

document.addEventListener('DOMContentLoaded', () => {
  const range = document.getElementById('range');
  const valueSpan = document.getElementById('value');
  chrome.storage.local.get({ keep: DEFAULT_KEEP }, (items) => {
    const current = items.keep;
    range.value = current;
    valueSpan.textContent = current;
  });
  range.addEventListener('input', () => {
    valueSpan.textContent = range.value;
  });
  range.addEventListener('change', () => {
    const newVal = parseInt(range.value, 10);
    chrome.storage.local.set({ keep: newVal });
  });
});
