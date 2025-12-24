// Function definition and calling
import { stringFunctions } from '../utils/string-functions.js';
import { evaluateExpression } from '../utils/expression-evaluator.js';
const userFunctions = new Map();
export function defineFunction(name, params, code) {
    userFunctions.set(name.toLowerCase(), { name, params, code });
}
export function getFunction(name) {
    return userFunctions.get(name.toLowerCase());
}
export function parseFunctionDefinition(header) {
    // Format: function functionName($param1, $param2)
    const match = header.match(/function\s+(\w+)\s*\(\s*(.*?)\s*\)/i);
    if (!match)
        return null;
    const name = match[1];
    const paramsStr = match[2].trim();
    const params = paramsStr ? paramsStr.split(',').map(p => p.trim().replace(/^\$/, '')) : [];
    return { name, params };
}
export function parseFunctionCall(callStr) {
    // Format: functionName($arg1, $arg2) or functionName("arg1", 123)
    const match = callStr.match(/(\w+)\s*\(\s*(.*?)\s*\)/);
    if (!match)
        return null;
    const name = match[1];
    const argsStr = match[2].trim();
    if (!argsStr) {
        return { name, args: [] };
    }
    // Parse arguments (handle nested parentheses and strings)
    const args = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    for (let i = 0; i < argsStr.length; i++) {
        const char = argsStr[i];
        if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
            current += char;
        }
        else if (inString && char === stringChar && argsStr[i - 1] !== '\\') {
            inString = false;
            current += char;
        }
        else if (!inString) {
            if (char === '(') {
                depth++;
                current += char;
            }
            else if (char === ')') {
                depth--;
                current += char;
            }
            else if (char === ',' && depth === 0) {
                args.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        else {
            current += char;
        }
    }
    if (current.trim()) {
        args.push(current.trim());
    }
    return { name, args };
}
export function callFunction(name, args, executeCode, getVar, setVar) {
    // Check built-in string functions
    if (stringFunctions[name.toLowerCase()]) {
        const func = stringFunctions[name.toLowerCase()];
        const evaluatedArgs = args.map(arg => {
            const value = evaluateExpression(arg);
            return typeof value === 'string' ? value : String(value);
        });
        return func(...evaluatedArgs);
    }
    // Check user-defined functions
    const func = getFunction(name);
    if (!func) {
        return undefined;
    }
    // Save current variable scope
    const savedVars = new Map();
    func.params.forEach((param, index) => {
        savedVars.set(param, getVar(param));
        const argValue = index < args.length ? evaluateExpression(args[index]) : undefined;
        setVar(param, argValue !== undefined ? String(argValue) : '');
    });
    // Execute function code
    executeCode(func.code);
    // Restore variable scope
    func.params.forEach(param => {
        const saved = savedVars.get(param);
        if (saved !== undefined) {
            setVar(param, saved);
        }
        else {
            // Remove the parameter variable
            // Note: We'd need a removeVariable function for this
        }
    });
    return undefined;
}
