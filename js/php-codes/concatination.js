// handle concatination of strings
import { handleTemplateLiteral } from "../utils/process-phpjs-tags.js";
export function handleConcatination(extractString, preTemplateContainer) {
    let resultString = '';
    extractString.forEach((string) => {
        if (string !== '' && string !== '.') {
            resultString += handleTemplateLiteral(string);
        }
    });
    // console.log(resultString);
    return resultString;
}
