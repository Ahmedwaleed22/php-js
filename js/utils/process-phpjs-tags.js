import { handleEcho } from "../php-codes/echo.js";
import { handleConcatination } from "../php-codes/concatination.js";
import { evaluateExpression } from "./expression-evaluator.js";
import { parseArrayLiteral, setArrayElement } from "./array-handler.js";
import { parseFunctionDefinition, parseFunctionCall, callFunction, defineFunction } from "../php-codes/functions.js";
import { parseForLoop, parseWhileLoop, parseForeachLoop, executeForLoop, executeWhileLoop, executeForeachLoop } from "../php-codes/loops.js";
import { evaluateCondition } from "../php-codes/conditionals.js";
import { formatError } from "./error-handler.js";
// Keep track of which <phpjs> elements we've already handled
const processedPhpjs = new WeakSet();
// Return value exception for function returns
export class ReturnException extends Error {
    constructor(value) {
        super('return');
        this.value = value;
    }
}
// Global scope - shared across all templates to persist variables
const globalScope = { variables: new Map() };
let currentScope = globalScope;
export function pushScope() {
    const newScope = {
        variables: new Map(),
        parent: currentScope
    };
    currentScope = newScope;
}
export function popScope() {
    if (currentScope.parent) {
        currentScope = currentScope.parent;
    }
}
function getVariableFromScope(varName) {
    let scope = currentScope;
    while (scope) {
        if (scope.variables.has(varName)) {
            return scope.variables.get(varName);
        }
        scope = scope.parent;
    }
    return undefined;
}
function setVariableInScope(varName, value) {
    currentScope.variables.set(varName, value);
}
// Legacy functions for backward compatibility
export function getVariableValue(varName) {
    return getVariableFromScope(varName);
}
export function setVariableValue(varName, value) {
    setVariableInScope(varName, value);
}
export function handleTemplateLiteral(value) {
    const templateLiteral = getStringFromQuotes(value);
    if (!templateLiteral)
        return value; // If no quotes found, return as-is
    // First, replace escaped $ with a placeholder
    const withPlaceholder = templateLiteral.replace(/\\\$/g, '\u0000');
    // Then replace PHP-style variables $name with their values
    const replaced = withPlaceholder.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
        const varValue = getVariableFromScope(varName);
        // Return the variable value if found, otherwise keep the original match
        return varValue !== undefined ? varValue : match;
    });
    // Restore escaped $ signs
    return replaced.replace(/\u0000/g, '$');
}
export function handleVariable(variable, value) {
    const varName = variable.trim();
    const trimmedValue = value.trim();
    // Check if it's an array assignment like $arr[0] = value
    const arrayMatch = varName.match(/^(\w+)\[(\d+|\w+)\]$/);
    if (arrayMatch) {
        const arrayName = arrayMatch[1];
        const index = arrayMatch[2];
        const val = evaluateExpression(trimmedValue);
        setArrayElement(arrayName, index, val);
        return;
    }
    // Check if value is an array literal
    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        const array = parseArrayLiteral(trimmedValue);
        setVariableInScope(varName, JSON.stringify(array));
        return;
    }
    // Check if it's a simple quoted string or number (no operators)
    if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))) {
        // Simple string assignment - use handleVariableValue
        setVariableInScope(varName, handleVariableValue(trimmedValue));
        return;
    }
    // Check if it's a simple number (no operators)
    const numValue = Number(trimmedValue);
    if (!isNaN(numValue) && trimmedValue !== '' && !trimmedValue.match(/[+\-*\/%<>=!&|]/)) {
        // Simple number assignment
        setVariableInScope(varName, String(numValue));
        return;
    }
    // Check if it contains operators (arithmetic, comparison, logical)
    const hasOperators = /[+\-*\/%<>=!&|]/.test(trimmedValue);
    if (hasOperators) {
        // Try to evaluate as expression (arithmetic, etc.)
        const evaluated = evaluateExpression(trimmedValue);
        if (evaluated !== null && evaluated !== undefined) {
            setVariableInScope(varName, String(evaluated));
            return;
        }
    }
    // Fall back to original handling (for variables, function calls, etc.)
    setVariableInScope(varName, handleVariableValue(trimmedValue));
}
function tokenizeLine(line) {
    const lineArr = [];
    let currentToken = '';
    let inSingleQuotes = false;
    let inDoubleQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === "'" && !inDoubleQuotes) {
            inSingleQuotes = !inSingleQuotes;
            currentToken += char;
            continue;
        }
        if (char === '"' && !inSingleQuotes) {
            inDoubleQuotes = !inDoubleQuotes;
            currentToken += char;
            continue;
        }
        if (char === ' ' && !inSingleQuotes && !inDoubleQuotes) {
            if (currentToken.length > 0) {
                lineArr.push(currentToken);
                currentToken = '';
            }
            continue;
        }
        currentToken += char;
    }
    if (currentToken.length > 0) {
        lineArr.push(currentToken);
    }
    return lineArr;
}
function getStringFromQuotes(str) {
    var _a, _b;
    return ((_a = str.split('"')[1]) === null || _a === void 0 ? void 0 : _a.split('"')[0]) || ((_b = str.split("'")[1]) === null || _b === void 0 ? void 0 : _b.split("'")[0]);
}
export function handleVariableValue(value) {
    const trimmedValue = value.trim();
    // Check if it's a quoted string
    if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))) {
        return trimmedValue.slice(1, -1);
    }
    // Try to parse as a number
    const numValue = Number(trimmedValue);
    if (!isNaN(numValue) && trimmedValue !== '') {
        return String(numValue);
    }
    // If it's not a number and not quoted, it's an error
    return formatError({ message: "Unrecognized variable value", code: "VAR_VALUE" });
}
// Remove comments from PHP code
function removeComments(code) {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';
    while (i < code.length) {
        // Handle strings
        if (!inString && (code[i] === '"' || code[i] === "'")) {
            inString = true;
            stringChar = code[i];
            result += code[i];
            i++;
            continue;
        }
        if (inString && code[i] === stringChar && code[i - 1] !== '\\') {
            inString = false;
            result += code[i];
            i++;
            continue;
        }
        if (inString) {
            result += code[i];
            i++;
            continue;
        }
        // Handle single-line comments //
        if (code[i] === '/' && code[i + 1] === '/') {
            // Skip to end of line
            while (i < code.length && code[i] !== '\n') {
                i++;
            }
            continue;
        }
        // Handle multi-line comments /* */
        if (code[i] === '/' && code[i + 1] === '*') {
            i += 2;
            while (i < code.length - 1) {
                if (code[i] === '*' && code[i + 1] === '/') {
                    i += 2;
                    break;
                }
                i++;
            }
            continue;
        }
        result += code[i];
        i++;
    }
    return result;
}
// Parse code blocks (handles braces)
function parseCodeBlock(code, startIndex) {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let i = startIndex;
    // Skip to opening brace
    while (i < code.length && code[i] !== '{') {
        i++;
    }
    if (i >= code.length)
        return null;
    const codeStart = i + 1;
    i++;
    braceCount = 1;
    // Find matching closing brace
    while (i < code.length && braceCount > 0) {
        const char = code[i];
        if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
        }
        else if (inString && char === stringChar && code[i - 1] !== '\\') {
            inString = false;
        }
        else if (!inString) {
            if (char === '{')
                braceCount++;
            if (char === '}')
                braceCount--;
        }
        i++;
    }
    if (braceCount !== 0)
        return null;
    const blockCode = code.substring(codeStart, i - 1);
    return { code: blockCode, endIndex: i };
}
// Parse statements from code (handles multi-line constructs including blocks)
function parseStatements(code) {
    const statements = [];
    let i = 0;
    let currentStatement = '';
    let startPos = 0;
    let braceDepth = 0;
    let parenDepth = 0;
    let inString = false;
    let stringChar = '';
    let inBlockStatement = false; // Track if we're in a block statement (if, for, while, foreach, function)
    while (i < code.length) {
        const char = code[i];
        // Handle strings
        if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
            currentStatement += char;
            i++;
            continue;
        }
        if (inString && char === stringChar && code[i - 1] !== '\\') {
            inString = false;
            currentStatement += char;
            i++;
            continue;
        }
        if (inString) {
            currentStatement += char;
            i++;
            continue;
        }
        // Check if we're starting a block statement
        if (braceDepth === 0 && parenDepth === 0 && !inBlockStatement) {
            const trimmedSoFar = currentStatement.trim().toLowerCase();
            if (trimmedSoFar.match(/^(if|elseif|else|for|while|foreach|function)\b/)) {
                inBlockStatement = true;
            }
        }
        // Track braces and parentheses
        if (char === '{') {
            braceDepth++;
            currentStatement += char;
            i++;
            continue;
        }
        if (char === '}') {
            braceDepth--;
            currentStatement += char;
            // If we're closing the last brace of a block statement, end the statement
            if (inBlockStatement && braceDepth === 0) {
                const trimmed = currentStatement.trim();
                if (trimmed) {
                    statements.push({
                        type: 'block',
                        content: trimmed,
                        startPos,
                        endPos: i
                    });
                }
                currentStatement = '';
                startPos = i + 1;
                inBlockStatement = false;
            }
            i++;
            continue;
        }
        if (char === '(')
            parenDepth++;
        if (char === ')')
            parenDepth--;
        // Statement separator (semicolon) when not in braces/parens and not in a block statement
        if (char === ';' && braceDepth === 0 && parenDepth === 0 && !inBlockStatement) {
            const trimmed = currentStatement.trim();
            if (trimmed) {
                statements.push({
                    type: 'statement',
                    content: trimmed,
                    startPos,
                    endPos: i
                });
            }
            currentStatement = '';
            startPos = i + 1;
            i++;
            continue;
        }
        currentStatement += char;
        i++;
    }
    // Add final statement if any
    const trimmed = currentStatement.trim();
    if (trimmed) {
        statements.push({
            type: 'statement',
            content: trimmed,
            startPos,
            endPos: i
        });
    }
    return statements;
}
// Helper function to extract block code from a statement that contains { ... }
function extractBlockFromStatement(stmtContent) {
    const braceStart = stmtContent.indexOf('{');
    if (braceStart === -1)
        return null;
    // Find the matching closing brace
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    for (let i = braceStart; i < stmtContent.length; i++) {
        const char = stmtContent[i];
        if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
        }
        else if (inString && char === stringChar && stmtContent[i - 1] !== '\\') {
            inString = false;
        }
        else if (!inString) {
            if (char === '{')
                braceCount++;
            if (char === '}')
                braceCount--;
            if (braceCount === 0) {
                // Extract content between braces
                return stmtContent.substring(braceStart + 1, i);
            }
        }
    }
    return null;
}
export function evalPhpJs(phpCode, preTemplateContainer, lineOffset = 0) {
    // Remove comments first
    const codeWithoutComments = removeComments(phpCode.trim());
    const statements = parseStatements(codeWithoutComments);
    let currentLine = lineOffset;
    let i = 0;
    let conditionExecuted = false; // Track if an if/elseif condition was satisfied
    while (i < statements.length) {
        const stmt = statements[i];
        const line = stmt.content;
        currentLine = lineOffset + i + 1;
        try {
            // Handle if/elseif/else statements (block type)
            if (stmt.type === 'block' && line.toLowerCase().startsWith('if') && !line.toLowerCase().startsWith('if(')) {
                // Reset for new if chain
                conditionExecuted = false;
                const ifMatch = line.match(/if\s*\(\s*(.+?)\s*\)/i);
                if (ifMatch) {
                    const condition = ifMatch[1];
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        if (evaluateCondition(condition)) {
                            evalPhpJs(blockCode, preTemplateContainer, currentLine);
                            conditionExecuted = true;
                        }
                        i++;
                        continue;
                    }
                }
            }
            // Also handle "if(" without space
            if (stmt.type === 'block' && line.toLowerCase().startsWith('if(')) {
                // Reset for new if chain
                conditionExecuted = false;
                const ifMatch = line.match(/if\s*\(\s*(.+?)\s*\)/i);
                if (ifMatch) {
                    const condition = ifMatch[1];
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        if (evaluateCondition(condition)) {
                            evalPhpJs(blockCode, preTemplateContainer, currentLine);
                            conditionExecuted = true;
                        }
                        i++;
                        continue;
                    }
                }
            }
            if (stmt.type === 'block' && line.toLowerCase().startsWith('elseif')) {
                // Only evaluate if no previous condition in chain was true
                if (!conditionExecuted) {
                    const elseifMatch = line.match(/elseif\s*\(\s*(.+?)\s*\)/i);
                    if (elseifMatch) {
                        const condition = elseifMatch[1];
                        const blockCode = extractBlockFromStatement(line);
                        if (blockCode !== null) {
                            if (evaluateCondition(condition)) {
                                evalPhpJs(blockCode, preTemplateContainer, currentLine);
                                conditionExecuted = true;
                            }
                        }
                    }
                }
                i++;
                continue;
            }
            if (stmt.type === 'block' && line.toLowerCase().startsWith('else') && !line.toLowerCase().startsWith('elseif')) {
                // Only execute if no previous condition in chain was true
                if (!conditionExecuted) {
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        evalPhpJs(blockCode, preTemplateContainer, currentLine);
                    }
                }
                // Reset after else block (end of if chain)
                conditionExecuted = false;
                i++;
                continue;
            }
            // For any non-conditional statement, reset the conditionExecuted flag
            // This ensures that a new if chain starts fresh
            if (stmt.type !== 'block' || (!line.toLowerCase().startsWith('if') && !line.toLowerCase().startsWith('elseif') && !line.toLowerCase().startsWith('else'))) {
                conditionExecuted = false;
            }
            // Handle for loops
            if (stmt.type === 'block' && line.toLowerCase().startsWith('for') && !line.toLowerCase().startsWith('foreach')) {
                const loop = parseForLoop(line);
                if (loop) {
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        loop.code = blockCode;
                        executeForLoop(loop, (code) => {
                            evalPhpJs(code, preTemplateContainer, currentLine);
                        });
                    }
                    i++;
                    continue;
                }
            }
            // Handle while loops
            if (stmt.type === 'block' && line.toLowerCase().startsWith('while')) {
                const loop = parseWhileLoop(line);
                if (loop) {
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        loop.code = blockCode;
                        executeWhileLoop(loop, (code) => {
                            evalPhpJs(code, preTemplateContainer, currentLine);
                        });
                    }
                    i++;
                    continue;
                }
            }
            // Handle foreach loops
            if (stmt.type === 'block' && line.toLowerCase().startsWith('foreach')) {
                const loop = parseForeachLoop(line);
                if (loop) {
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        loop.code = blockCode;
                        executeForeachLoop(loop, (code) => {
                            evalPhpJs(code, preTemplateContainer, currentLine);
                        });
                    }
                    i++;
                    continue;
                }
            }
            // Handle function definitions
            if (stmt.type === 'block' && line.toLowerCase().startsWith('function')) {
                const funcDef = parseFunctionDefinition(line);
                if (funcDef) {
                    const blockCode = extractBlockFromStatement(line);
                    if (blockCode !== null) {
                        defineFunction(funcDef.name, funcDef.params, blockCode);
                    }
                    i++;
                    continue;
                }
            }
            // Handle return statements
            if (line.toLowerCase().startsWith('return')) {
                const returnMatch = line.match(/return\s+(.*)/i);
                if (returnMatch) {
                    const returnValue = returnMatch[1].trim();
                    const evaluated = evaluateExpression(returnValue);
                    throw new ReturnException(evaluated);
                }
            }
            const lineArr = tokenizeLine(line);
            switch (lineArr[0].toLowerCase()) {
                case 'echo':
                    const extractString = lineArr.splice(1, lineArr.length - 1);
                    // Check if this is a concatenation (contains . operator) or a single expression
                    const hasConcat = extractString.some(token => token === '.');
                    if (!hasConcat && extractString.length > 1) {
                        // No concatenation operator, but multiple tokens - join them as an expression
                        const expression = extractString.join(' ').trim();
                        const evaluated = evaluateExpression(expression);
                        const result = evaluated !== null && evaluated !== undefined ? String(evaluated) : expression;
                        handleEcho(result, preTemplateContainer);
                    }
                    else {
                        // Has concatenation operator or single token - use handleConcatination
                        const concatinatedString = handleConcatination(extractString, preTemplateContainer, (code) => evalPhpJs(code, preTemplateContainer, currentLine), setVariableInScope) || '';
                        handleEcho(concatinatedString, preTemplateContainer);
                    }
                    break;
                default:
                    // Handle increment/decrement operators ($i++ or $i--)
                    const incrMatch = line.match(/^\$(\w+)\s*\+\+/);
                    if (incrMatch) {
                        const varName = incrMatch[1];
                        const currentVal = Number(getVariableFromScope(varName) || 0);
                        setVariableInScope(varName, String(currentVal + 1));
                        break;
                    }
                    const decrMatch = line.match(/^\$(\w+)\s*--/);
                    if (decrMatch) {
                        const varName = decrMatch[1];
                        const currentVal = Number(getVariableFromScope(varName) || 0);
                        setVariableInScope(varName, String(currentVal - 1));
                        break;
                    }
                    // Handle prefix increment/decrement (++$i or --$i)
                    const prefixIncrMatch = line.match(/^\+\+\s*\$(\w+)/);
                    if (prefixIncrMatch) {
                        const varName = prefixIncrMatch[1];
                        const currentVal = Number(getVariableFromScope(varName) || 0);
                        setVariableInScope(varName, String(currentVal + 1));
                        break;
                    }
                    const prefixDecrMatch = line.match(/^--\s*\$(\w+)/);
                    if (prefixDecrMatch) {
                        const varName = prefixDecrMatch[1];
                        const currentVal = Number(getVariableFromScope(varName) || 0);
                        setVariableInScope(varName, String(currentVal - 1));
                        break;
                    }
                    // Handle function calls (only if not already handled by echo)
                    const funcCall = parseFunctionCall(line);
                    if (funcCall) {
                        const result = callFunction(funcCall.name, funcCall.args, (code) => evalPhpJs(code, preTemplateContainer, currentLine), getVariableFromScope, setVariableInScope);
                        // If function returns a value and it's assigned to a variable
                        const assignMatch = line.match(/^\$(\w+)\s*=\s*(.+)/);
                        if (assignMatch && result !== undefined) {
                            setVariableInScope(assignMatch[1], String(result));
                        }
                        // Otherwise, if result is not undefined and not assigned, we could echo it
                        // But for now, we'll just discard it (PHP behavior - function calls without echo don't output)
                    }
                    else if (lineArr[0].startsWith('$')) {
                        // Handle variable assignment
                        const varName = lineArr[0].slice(1);
                        // Join all tokens after the variable name and remove the '=' sign
                        let value = lineArr.slice(1).join(' ');
                        // Remove leading '=' and any whitespace
                        value = value.replace(/^=\s*/, '').trim();
                        if (value) {
                            handleVariable(varName, value);
                        }
                    }
                    break;
            }
            i++;
        }
        catch (error) {
            // Re-throw ReturnException so it can propagate to callFunction
            if (error instanceof ReturnException) {
                throw error;
            }
            const errorMsg = formatError({
                message: error.message || "Unknown error",
                line: currentLine,
                code: "RUNTIME_ERROR",
                context: line
            });
            if (preTemplateContainer) {
                preTemplateContainer.innerHTML += errorMsg;
            }
            i++;
        }
    }
}
// Decode HTML entities that browsers may encode in innerHTML
function decodeHtmlEntities(html) {
    return html
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}
export function handlePhpjsElement(el) {
    if (processedPhpjs.has(el))
        return;
    processedPhpjs.add(el);
    // For script tags, use textContent (no HTML encoding)
    // For template tags (legacy), use innerHTML with decoding
    const isScript = el.tagName.toLowerCase() === 'script';
    const phpCode = isScript
        ? (el.textContent || '')
        : decodeHtmlEntities(el.innerHTML || '');
    const templateId = el.getAttribute('data-phpjs-tag-id');
    // Use the global scope for this template
    // Variables set in one template will be available in subsequent templates
    currentScope = globalScope;
    try {
        if (templateId) {
            const preTemplateContainer = document.querySelector(`div[data-phpjs-tag-id="${templateId}"]`);
            if (preTemplateContainer) {
                evalPhpJs(phpCode, preTemplateContainer);
            }
        }
        else {
            evalPhpJs(phpCode, null);
        }
    }
    catch (error) {
        // Handle return statement outside function at the top level
        if (error instanceof ReturnException) {
            const preTemplateContainer = templateId
                ? document.querySelector(`div[data-phpjs-tag-id="${templateId}"]`)
                : null;
            const errorMsg = formatError({
                message: "return statement outside function",
                code: "SYNTAX_ERROR"
            });
            if (preTemplateContainer) {
                preTemplateContainer.innerHTML += errorMsg;
            }
        }
        else {
            throw error; // Re-throw other errors
        }
    }
    finally {
        // Maintain global scope so variables persist across templates
        currentScope = globalScope;
    }
}
// Handle raw PHP-JS code with an optional container (used for external file loading)
export function handlePhpjsCode(phpCode, preTemplateContainer) {
    // Use the global scope
    currentScope = globalScope;
    try {
        evalPhpJs(phpCode, preTemplateContainer);
    }
    catch (error) {
        // Handle return statement outside function at the top level
        if (error instanceof ReturnException) {
            const errorMsg = formatError({
                message: "return statement outside function",
                code: "SYNTAX_ERROR"
            });
            if (preTemplateContainer) {
                preTemplateContainer.innerHTML += errorMsg;
            }
        }
        else {
            throw error; // Re-throw other errors
        }
    }
    finally {
        // Maintain global scope so variables persist
        currentScope = globalScope;
    }
}
