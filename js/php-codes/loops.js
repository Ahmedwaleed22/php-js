// Loop handling (for, while, foreach)
import { evaluateExpression, toBoolean } from '../utils/expression-evaluator.js';
import { getVariableValue, setVariableValue } from '../utils/process-phpjs-tags.js';
export function parseLoopBlock(phpCode, startIndex) {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let i = startIndex;
    // Skip to opening brace
    while (i < phpCode.length && phpCode[i] !== '{') {
        i++;
    }
    if (i >= phpCode.length)
        return null;
    const codeStart = i + 1;
    i++;
    braceCount = 1;
    // Find matching closing brace
    while (i < phpCode.length && braceCount > 0) {
        const char = phpCode[i];
        if (!inString && (char === '"' || char === "'")) {
            inString = true;
            stringChar = char;
        }
        else if (inString && char === stringChar && phpCode[i - 1] !== '\\') {
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
    const code = phpCode.substring(codeStart, i - 1);
    return { code, endIndex: i };
}
export function parseForLoop(loopHeader) {
    // Format: for ($i = 0; $i < 10; $i++)
    const match = loopHeader.match(/for\s*\(\s*(.+?)\s*;\s*(.+?)\s*;\s*(.+?)\s*\)/i);
    if (!match)
        return null;
    return {
        init: match[1].trim(),
        condition: match[2].trim(),
        increment: match[3].trim(),
        code: ''
    };
}
export function parseWhileLoop(loopHeader) {
    // Format: while ($i < 10)
    const match = loopHeader.match(/while\s*\(\s*(.+?)\s*\)/i);
    if (!match)
        return null;
    return {
        condition: match[1].trim(),
        code: ''
    };
}
export function parseForeachLoop(loopHeader) {
    // Format: foreach ($array as $key => $value) or foreach ($array as $value)
    const match = loopHeader.match(/foreach\s*\(\s*\$(\w+)\s+as\s+(?:\$(\w+)\s*=>\s*)?\$(\w+)\s*\)/i);
    if (!match)
        return null;
    return {
        arrayVar: match[1],
        keyVar: match[2],
        valueVar: match[3],
        code: ''
    };
}
export function executeForLoop(loop, executeCode) {
    // Execute initialization
    if (loop.init) {
        executeCode(loop.init + ';');
    }
    // Execute loop
    while (true) {
        // Check condition
        const conditionResult = evaluateExpression(loop.condition);
        if (!toBoolean(conditionResult))
            break;
        // Execute loop body
        executeCode(loop.code);
        // Execute increment
        if (loop.increment) {
            executeCode(loop.increment + ';');
        }
    }
}
export function executeWhileLoop(loop, executeCode) {
    while (true) {
        const conditionResult = evaluateExpression(loop.condition);
        if (!toBoolean(conditionResult))
            break;
        executeCode(loop.code);
    }
}
export function executeForeachLoop(loop, executeCode) {
    const arrayStr = getVariableValue(loop.arrayVar);
    if (!arrayStr)
        return;
    let array;
    try {
        const parsed = JSON.parse(arrayStr);
        if (Array.isArray(parsed)) {
            array = parsed;
        }
        else {
            return;
        }
    }
    catch (_a) {
        return;
    }
    array.forEach((value, index) => {
        // Set value variable
        setVariableValue(loop.valueVar, typeof value === 'string' ? value : JSON.stringify(value));
        // Set key variable if specified
        if (loop.keyVar) {
            setVariableValue(loop.keyVar, String(index));
        }
        executeCode(loop.code);
    });
}
