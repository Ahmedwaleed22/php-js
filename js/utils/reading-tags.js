var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { handlePhpjsElement, handlePhpjsCode } from './process-phpjs-tags.js';
import { processPreTemplateContainer } from './process-pre-template-container.js';
// Keep track of which script elements we've already processed
const processedScripts = new WeakSet();
// Helper function to ensure an element has a data-phpjs-tag-id
function ensurePhpjsTagId(el) {
    if (!el.getAttribute('data-phpjs-tag-id')) {
        el.setAttribute('data-phpjs-tag-id', crypto.randomUUID().slice(0, 8));
    }
}
// Fetch external PHP-JS file content
function fetchPhpjsFile(src) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(src);
            if (!response.ok) {
                throw new Error(`Failed to load PHP-JS file: ${src} (${response.status})`);
            }
            return yield response.text();
        }
        catch (error) {
            console.error(`Error loading PHP-JS file: ${src}`, error);
            throw error;
        }
    });
}
// Process a single script element (handles both inline and external)
function processPhpjsScript(el) {
    return __awaiter(this, void 0, void 0, function* () {
        if (processedScripts.has(el))
            return;
        processedScripts.add(el);
        ensurePhpjsTagId(el);
        processPreTemplateContainer(el);
        const src = el.getAttribute('src');
        if (src) {
            // External file - fetch and execute
            try {
                const code = yield fetchPhpjsFile(src);
                // Create a virtual script content for processing
                const tagId = el.getAttribute('data-phpjs-tag-id');
                const container = tagId ? document.querySelector(`div[data-phpjs-tag-id="${tagId}"]`) : null;
                handlePhpjsCode(code, container);
            }
            catch (error) {
                console.error('Failed to process external PHP-JS file:', error);
            }
        }
        else {
            // Inline code - process directly
            handlePhpjsElement(el);
        }
    });
}
// Exported so it can be imported from `phpjs.ts`
export function scanForPhpjs(root = document) {
    // Narrow to a type that definitely has querySelectorAll
    const container = root;
    // Select script tags with type="text/phpjs"
    const phpjsElements = container.querySelectorAll('script[type="text/phpjs"]');
    const results = [];
    phpjsElements.forEach(el => {
        if (!processedScripts.has(el)) {
            results.push(el);
        }
    });
    return results;
}
// Process all PHP-JS scripts in order (respects async loading for external files)
export function processAllPhpjs() {
    return __awaiter(this, arguments, void 0, function* (root = document) {
        const scripts = scanForPhpjs(root);
        // Process scripts sequentially to maintain execution order
        for (const script of scripts) {
            yield processPhpjsScript(script);
        }
    });
}
// Run once when the DOM is ready so we catch any scripts already in the page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processAllPhpjs());
}
else {
    processAllPhpjs();
}
// Watch for any new script[type="text/phpjs"] tags added after this script is loaded
const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        // Check newly added nodes
        mutation.addedNodes.forEach(node => {
            var _a;
            if (node.nodeType !== Node.ELEMENT_NODE)
                return;
            const el = node;
            // If the added node itself is a phpjs script, handle it
            if (el.tagName.toLowerCase() === 'script' && el.getAttribute('type') === 'text/phpjs') {
                processPhpjsScript(el);
            }
            // Also scan inside it for any nested phpjs scripts
            const nested = (_a = el.querySelectorAll) === null || _a === void 0 ? void 0 : _a.call(el, 'script[type="text/phpjs"]');
            nested === null || nested === void 0 ? void 0 : nested.forEach(nestedEl => processPhpjsScript(nestedEl));
        });
    }
});
observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
});
