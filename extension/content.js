/*
 * SessionLightener content script
 *
 * This script runs on ChatGPT and Grok conversation pages.  Its purpose
 * is simple: monitor the page for new conversation turns and hide the
 * oldest ones once a configurable threshold is exceeded.  Hiding the
 * stale DOM nodes helps keep memory usage low and prevents the UI from
 * becoming sluggish in very long chats.  The trimming logic uses
 * conservative selectors with multiple fallbacks so that minor UI
 * changes on the target sites don't immediately break the extension.
 */

// Default number of messages to keep visible when no user preference is stored.
const DEFAULT_KEEP = 50;

/**
 * Retrieve the user-configured message retention limit from storage.
 * If no value has been set, the default is returned.
 *
 * @returns {Promise<number>} Promise resolving to the number of messages to keep.
 */
function getKeepValue() {
  return new Promise((resolve) => {
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      resolve(DEFAULT_KEEP);
      return;
    }
    chrome.storage.local.get({ keep: DEFAULT_KEEP }, (items) => {
      let val = items.keep;
      if (typeof val !== 'number' || Number.isNaN(val) || val <= 0) {
        val = DEFAULT_KEEP;
      }
      resolve(val);
    });
  });
}

/**
 * Attempt to find conversation message elements on the page.  Multiple
 * selectors are tried in succession.  The first non-empty NodeList is
 * returned.  Fallbacks are intentionally broad to accommodate UI
 * changes.
 *
 * @returns {NodeListOf<Element>} NodeList of message root elements.
 */
function findMessageNodes() {
  // ChatGPT as of early 2025 uses data-testid="conversation-turn" on
  // conversation turns.  Try this first.
  let nodes = document.querySelectorAll('[data-testid="conversation-turn"]');
  if (nodes && nodes.length) return nodes;

  // Next, try ChatGPT's older structure: groups with a "group" class.
  nodes = document.querySelectorAll('div.group');
  if (nodes && nodes.length) return nodes;

  // Try generically selecting direct children of the main conversation
  // container.  On ChatGPT and Grok, the main element often contains
  // the conversation.  This fallback may include other content; we
  // rely on trimming exclusively via index counting.
  const main = document.querySelector('main');
  if (main) {
    const children = main.querySelectorAll(':scope > div');
    if (children && children.length) return children;
  }

  // Absolute fallback: any immediate child of body with at least two
  // nested divs (likely conversation).  This is a catch-all to avoid
  // failing entirely.  It's conservative because we only hide by
  // index, not by content.
  const bodyDivs = document.querySelectorAll('body > div');
  return bodyDivs;
}

/**
 * Hide older message nodes when the total exceeds the keep limit.
 * Nodes are hidden rather than removed to avoid interfering with
 * frameworks that may expect them to exist.  Hidden nodes continue to
 * consume a small amount of memory but don't participate in layout or
 * rendering.
 *
 * @param {number} keep - Number of most recent messages to retain.
 */
function trimMessages(keep) {
  const messages = findMessageNodes();
  const total = messages.length;
  const toHide = total - keep;
  if (toHide <= 0) return;
  for (let i = 0; i < toHide; i++) {
    const node = messages[i];
    if (node && node.style.display !== 'none') {
      node.style.display = 'none';
    }
  }
}

/**
 * Set up observers and kick off initial trimming.  Observers watch for
 * DOM mutations (insertion of new nodes) and re-apply trimming after
 * each change.  We observe the entire body subtree to catch all
 * conversation updates.  Debouncing is employed to prevent rapid
 * retrimming during bursts of mutations.
 */
function setup() {
  let timeout = null;
  function scheduleTrim() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const keep = await getKeepValue();
      trimMessages(keep);
    }, 100);
  }
  // Initial trim as soon as possible
  scheduleTrim();
  const observer = new MutationObserver(() => {
    scheduleTrim();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Wait until the DOM is ready before initializing.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
