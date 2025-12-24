import { handleTemplateLiteral } from "../utils/process-phpjs-tags.js";
export function handleEcho(lineArr, preTemplateContainer) {
    const templateLiteral = handleTemplateLiteral(lineArr[1] || '').trim();
    if (preTemplateContainer) {
        preTemplateContainer.innerHTML += templateLiteral;
    }
    else {
        console.log(templateLiteral);
    }
}
