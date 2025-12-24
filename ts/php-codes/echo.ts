import { handleTemplateLiteral } from "../utils/process-phpjs-tags.js";

export function handleEcho(concatinatedString: string, preTemplateContainer: Element | null) {
  if (preTemplateContainer) {
    preTemplateContainer.innerHTML += concatinatedString;
  } else {
    // console.log(concatinatedString);
  }
}