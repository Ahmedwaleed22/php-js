// handle concatination of strings
import { handleTemplateLiteral, getVariableValue } from "../utils/process-phpjs-tags.js";
import { getArrayElement } from "../utils/array-handler.js";
import { parseFunctionCall, callFunction } from "./functions.js";
import { evaluateExpression } from "../utils/expression-evaluator.js";
export function handleConcatination(extractString, preTemplateContainer) {
    let resultString = '';
    extractString.forEach((string) => {
        if (string !== '' && string !== '.') {
            // Handle function calls
            const funcCall = parseFunctionCall(string);
            if (funcCall) {
                const result = callFunction(funcCall.name, funcCall.args, () => { }, // Empty executor for function calls in echo
                getVariableValue, () => { } // Empty setter for function calls in echo
                );
                if (result !== undefined) {
                    resultString += String(result);
                }
                return;
            }
            // Handle array access like $arr[0]
            const arrayAccessMatch = string.match(/^\$(\w+)\[(\d+|\w+)\]/);
            if (arrayAccessMatch) {
                const arrayName = arrayAccessMatch[1];
                const index = arrayAccessMatch[2];
                const element = getArrayElement(arrayName, index);
                if (element !== undefined) {
                    resultString += String(element);
                }
                return;
            }
            if (string.startsWith('$')) {
                // Extract variable name and look it up
                const varName = string.slice(1); // Remove the $ prefix
                resultString += getVariableValue(varName) || string; // Use variable value or keep original if not found
            }
            else if ((string.startsWith('"') && string.endsWith('"')) ||
                (string.startsWith("'") && string.endsWith("'"))) {
                // Handle quoted strings - use handleTemplateLiteral for variable interpolation
                resultString += handleTemplateLiteral(string);
            }
            else {
                // Try to evaluate as expression
                const evaluated = evaluateExpression(string);
                if (evaluated !== null && evaluated !== undefined && evaluated !== string) {
                    resultString += String(evaluated);
                }
                else {
                    resultString += handleTemplateLiteral(string);
                }
            }
        }
    });
    // console.log(resultString);
    return resultString;
}
