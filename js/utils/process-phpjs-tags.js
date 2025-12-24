// Keep track of which <phpjs> elements we've already handled
const processedPhpjs = new WeakSet();
const variables = new Map();
export function handleTemplateLiteral(value) {
    const templateLiteral = getStringFromQuotes(value);
    // First, replace escaped $ with a placeholder
    const withPlaceholder = templateLiteral.replace(/\\\$/g, '\u0000');
    // Then replace PHP-style variables $name with their values
    const replaced = withPlaceholder.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
        return variables.get(varName) || match;
    });
    // Restore escaped $ signs
    return replaced.replace(/\u0000/g, '$');
}
export function handleVariable(variable, value) {
    variables.set(variable.trim(), getStringFromQuotes(value));
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
export function evalPhpJs(phpCode) {
    const trimedPHPCode = phpCode.trim();
    trimedPHPCode.split(';').forEach((line) => {
        line = line.trim();
        if (!(line.length > 0))
            return;
        const lineArr = tokenizeLine(line);
        // console.log(lineArr);
        switch (lineArr[0].toLowerCase()) {
            case 'echo':
                // console.log(handleTemplateLiteral(lineArr[1] || '').trim());
                const templateLiteral = handleTemplateLiteral(lineArr[1] || '').trim();
                console.log(templateLiteral);
                break;
            default:
                if (lineArr[0].startsWith('$')) {
                    handleVariable(lineArr[0].slice(1), lineArr.slice(2).join(' '));
                }
                break;
        }
    });
}
export function handlePhpjsElement(el) {
    if (processedPhpjs.has(el))
        return;
    processedPhpjs.add(el);
    const phpCode = el.innerHTML || '';
    evalPhpJs(phpCode);
}
