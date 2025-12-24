import { handleTemplateLiteral } from "../utils/process-phpjs-tags.js";

export function handleEcho(stringToEcho: string, preTemplateContainer: Element | null) {
  if (preTemplateContainer) {
    preTemplateContainer.innerHTML += stringToEcho;
  } else {
    // console.log(stringToEcho);
  }
}