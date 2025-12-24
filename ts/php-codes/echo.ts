import { handleTemplateLiteral } from "../utils/process-phpjs-tags.js";

export function handleEcho(lineArr: Array<string>, preTemplateContainer: Element | null) {
  const templateLiteral = handleTemplateLiteral(lineArr[1] || '').trim();
  if (preTemplateContainer) {
    preTemplateContainer.innerHTML += templateLiteral;
  } else {
    console.log(templateLiteral);
  }
}