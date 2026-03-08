// Popup script for SessionLightener
// Provides a simple slider to adjust the number of messages to retain.

const DEFAULT_KEEP = 50;

document.addEventListener('DOMContentLoaded', () => {
  const range = document.getElementById('range');
  const valueSpan = document.getElementById('value');
  // Load current value from storage
  chrome.storage.local.get({ keep: DEFAULT_KEEP }, (items) => {
    const current = items.keep;
    range.value = current;
    valueSpan.textContent = current;
  });
  // Update label when sliding
  range.addEventListener('input', () => {
    valueSpan.textContent = range.value;
  });
  // Persist value on change (when slider released)
  range.addEventListener('change', () => {
    const newVal = parseInt(range.value, 10);
    chrome.storage.local.set({ keep: newVal });
  });
});
