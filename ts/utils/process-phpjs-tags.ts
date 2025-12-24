import { handleEcho } from "../php-codes/echo.js";
import { handleConcatination } from "../php-codes/concatination.js";

// Keep track of which <phpjs> elements we've already handled
const processedPhpjs = new WeakSet<Element>();
const variables = new Map<string, string>();

export function handleTemplateLiteral(value: string) {
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

export function handleVariable(variable: string, value: string) {
  variables.set(variable.trim(), handleVariableValue(value.trim()));
}

function tokenizeLine(line: string) {
  const lineArr: Array<string> = [];
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

function getStringFromQuotes(str: string) {
  return str.split('"')[1]?.split('"')[0] || str.split("'")[1]?.split("'")[0];
}

export function handleVariableValue(value: string) {
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
  return "<span style='color: red;font-weight: bold;text-transform: uppercase;text-decoration: underline;'>Error: Unrecognized variable value</span>";
}

export function evalPhpJs(phpCode: string, preTemplateContainer: Element | null) {
  const trimedPHPCode: string = phpCode.trim();
  
  trimedPHPCode.split(';').forEach((line: string) => {
    line = line.trim();
    if (!(line.length > 0)) return;

    const lineArr: Array<string> = tokenizeLine(line);
    // // console.log(lineArr);
    
    switch (lineArr[0].toLowerCase()) {
      case 'echo':
        const extractString = lineArr.splice(1, lineArr.length - 1);
        const concatinatedString = handleConcatination(extractString, preTemplateContainer) || '';
        handleEcho(concatinatedString, preTemplateContainer);
        break;
      default:
        if (lineArr[0].startsWith('$')) {
          handleVariable(lineArr[0].slice(1), lineArr.slice(2).join(' '));
        }
        break;
    }
  });
}

export function handlePhpjsElement(el: Element) {
  if (processedPhpjs.has(el)) return;
  processedPhpjs.add(el);

  const phpCode = el.innerHTML || '';

  const templateId = el.getAttribute('data-phpjs-tag-id');

  if (templateId) {
    const preTemplateContainer = document.querySelector(`div[data-phpjs-tag-id="${templateId}"]`);
    if (preTemplateContainer) {
      evalPhpJs(phpCode, preTemplateContainer);
    }
  } else {
    evalPhpJs(phpCode, null);
  }
}