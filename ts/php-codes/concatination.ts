// handle concatination of strings

import { handleTemplateLiteral, getVariableValue } from "../utils/process-phpjs-tags.js";

export function handleConcatination(extractString: Array<string>, preTemplateContainer: Element | null) {
  let resultString = '';
  
  extractString.forEach((string) => {
    if (string !== '' && string !== '.') {
      if (string.startsWith('$')) {
        // Extract variable name and look it up
        const varName = string.slice(1); // Remove the $ prefix
        resultString += getVariableValue(varName) || string; // Use variable value or keep original if not found
      } else {
        resultString += handleTemplateLiteral(string);
      }
    }
  });
  // console.log(resultString);

  return resultString;
}