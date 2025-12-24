import { handlePhpjsElement } from './process-phpjs-tags.js';

// Counter for generating unique IDs
let tagIdCounter = 0;

// Helper function to ensure an element has a data-phpjs-tag-id
function ensurePhpjsTagId(el: Element): void {
  if (!el.getAttribute('data-phpjs-tag-id')) {
    el.setAttribute('data-phpjs-tag-id', crypto.randomUUID().slice(0, 8));
  }
}

// Exported so it can be imported from `phpjs.ts`
export function scanForPhpjs(root: ParentNode | Document = document) {
  // Narrow to a type that definitely has querySelectorAll
  const container = root as Document | Element;
  const phpjsElements = container.querySelectorAll('template[data-phpjs]');
  const results: Element[] = [];
  
  phpjsElements.forEach(el => {
    ensurePhpjsTagId(el);
    results.push(el);
  });
  
  return results;
}

// Run once when the DOM is ready so we catch any <phpjs> already in the page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scanForPhpjs());
} else {
  scanForPhpjs();
}

// Watch for any new <phpjs> tags added after this script is loaded
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    // Check newly added nodes
    mutation.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;

      // If the added node itself is <phpjs>, handle it
      if (el.tagName.toLowerCase() === 'template' && el.getAttribute('data-phpjs')) {
        ensurePhpjsTagId(el);
        handlePhpjsElement(el);
      }

      // Also scan inside it for any nested <phpjs>
      // scanForPhpjs will assign IDs to all found elements
      scanForPhpjs(el);
    });
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});