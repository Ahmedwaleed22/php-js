// Keep track of which <phpjs> elements we've already handled
const processedPhpjs = new WeakSet<Element>();

function handlePhpjsElement(el: Element) {
  if (processedPhpjs.has(el)) return;
  processedPhpjs.add(el);

  const phpCode = el.innerHTML;
  console.log(phpCode);
}

function scanForPhpjs(root: ParentNode | Document = document) {
  // Narrow to a type that definitely has getElementsByTagName
  const container = root as Document | Element;
  const phpjs = container.getElementsByTagName('phpjs');
  for (let i = 0; i < phpjs.length; i++) {
    handlePhpjsElement(phpjs[i]);
  }
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
      if (el.tagName.toLowerCase() === 'phpjs') {
        handlePhpjsElement(el);
      }

      // Also scan inside it for any nested <phpjs>
      scanForPhpjs(el);
    });
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});