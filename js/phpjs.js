import { handlePhpjsElement } from './utils/process-tags.js';
import { scanForPhpjs } from './utils/reading-tags.js';
const phpjs = scanForPhpjs(document.body);
for (let i = 0; i < phpjs.length; i++) {
    const phjsElement = phpjs[i];
    handlePhpjsElement(phjsElement);
}
