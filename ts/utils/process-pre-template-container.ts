export function processPreTemplateContainer(phpjsElement: Element) {
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
    phpjsElement.parentNode?.insertBefore(preTemplate, phpjsElement);
  }
}