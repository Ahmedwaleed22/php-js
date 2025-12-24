import { handlePhpjsElement } from './process-phpjs-tags.js';
// Exported so it can be imported from `phpjs.ts`
export function scanForPhpjs(root = document) {
    // Narrow to a type that definitely has getElementsByTagName
    const container = root;
    const phpjs = container.querySelector('template[data-phpjs]');
    return phpjs ? [phpjs] : [];
}
// Run once when the DOM is ready so we catch any <phpjs> already in the page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanForPhpjs());
}
else {
    scanForPhpjs();
}
// Watch for any new <phpjs> tags added after this script is loaded
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        // Check newly added nodes
        mutation.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE)
                return;
            const el = node;
            // If the added node itself is <phpjs>, handle it
            if (el.tagName.toLowerCase() === 'template' && el.getAttribute('data-phpjs')) {
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
