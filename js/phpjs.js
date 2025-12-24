// Keep track of which <phjs> elements we've already handled
const processedPhjs = new WeakSet();
function handlePhjsElement(el) {
    if (processedPhjs.has(el))
        return;
    processedPhjs.add(el);
    const phpCode = el.innerHTML;
    console.log(phpCode);
}
function scanForPhjs(root = document) {
    // Narrow to a type that definitely has getElementsByTagName
    const container = root;
    const phjs = container.getElementsByTagName('phjs');
    for (let i = 0; i < phjs.length; i++) {
        handlePhjsElement(phjs[i]);
    }
}
// Run once when the DOM is ready so we catch any <phjs> already in the page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanForPhjs());
}
else {
    scanForPhjs();
}
// Watch for any new <phjs> tags added after this script is loaded
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        // Check newly added nodes
        mutation.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE)
                return;
            const el = node;
            // If the added node itself is <phjs>, handle it
            if (el.tagName.toLowerCase() === 'phjs') {
                handlePhjsElement(el);
            }
            // Also scan inside it for any nested <phjs>
            scanForPhjs(el);
        });
    }
});
observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
});
