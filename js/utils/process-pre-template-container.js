export function processPreTemplateContainer(phpjsElement) {
    var _a;
    const phpjsTagId = phpjsElement.getAttribute('data-phpjs-tag-id');
    if (phpjsTagId) {
        // Check if a div with this ID already exists as a previous sibling
        let previousSibling = phpjsElement.previousElementSibling;
        if (previousSibling &&
            previousSibling.tagName.toLowerCase() === 'div' &&
            previousSibling.getAttribute('data-phpjs-tag-id') === phpjsTagId) {
            // Div already exists, don't create a duplicate
            return;
        }
        const preTemplate = document.createElement('div');
        preTemplate.setAttribute('data-phpjs-tag-id', phpjsTagId);
        (_a = phpjsElement.parentNode) === null || _a === void 0 ? void 0 : _a.insertBefore(preTemplate, phpjsElement);
    }
}
