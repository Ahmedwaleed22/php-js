import { handleEcho } from "../php-codes/echo.js";
import { handleConcatination } from "../php-codes/concatination.js";
import { evaluateExpression, getValue } from "./expression-evaluator.js";
import { parseArrayLiteral, getArrayElement, setArrayElement, arrayToString, ArrayValue } from "./array-handler.js";
import { parseFunctionDefinition, parseFunctionCall, callFunction, defineFunction } from "../php-codes/functions.js";
import { parseForLoop, parseWhileLoop, parseForeachLoop, parseLoopBlock, executeForLoop, executeWhileLoop, executeForeachLoop } from "../php-codes/loops.js";
import { evaluateCondition } from "../php-codes/conditionals.js";
import { formatError } from "./error-handler.js";

// Keep track of which <phpjs> elements we've already handled
const processedPhpjs = new WeakSet<Element>();

// Variable scope management
interface Scope {
  variables: Map<string, string>;
  parent?: Scope;
}

// Global scope - shared across all templates to persist variables
const globalScope: Scope = { variables: new Map<string, string>() };
let currentScope: Scope = globalScope;

export function pushScope(): void {
  const newScope: Scope = {
    variables: new Map<string, string>(),
    parent: currentScope
  };
  currentScope = newScope;
}

export function popScope(): void {
  if (currentScope.parent) {
    currentScope = currentScope.parent;
  }
}

function getVariableFromScope(varName: string): string | undefined {
  let scope: Scope | undefined = currentScope;
  while (scope) {
    if (scope.variables.has(varName)) {
      return scope.variables.get(varName);
    }
    scope = scope.parent;
  }
  return undefined;
}

function setVariableInScope(varName: string, value: string): void {
  currentScope.variables.set(varName, value);
}

// Legacy functions for backward compatibility
export function getVariableValue(varName: string): string | undefined {
  return getVariableFromScope(varName);
}

export function setVariableValue(varName: string, value: string): void {
  setVariableInScope(varName, value);
}

export function handleTemplateLiteral(value: string) {
  const templateLiteral = getStringFromQuotes(value);
  if (!templateLiteral) return value; // If no quotes found, return as-is
  
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

export function handleVariable(variable: string, value: string) {
  const varName = variable.trim();
  const trimmedValue = value.trim();
  
  // Check if it's an array assignment like $arr[0] = value
  const arrayMatch = varName.match(/^(\w+)\[(\d+|\w+)\]$/);
  if (arrayMatch) {
    const arrayName = arrayMatch[1];
    const index = arrayMatch[2];
    const val = evaluateExpression(trimmedValue);
    setArrayElement(arrayName, index, val as ArrayValue);
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
  return formatError({ message: "Unrecognized variable value", code: "VAR_VALUE" });
}

// Remove comments from PHP code
function removeComments(code: string): string {
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
function parseCodeBlock(code: string, startIndex: number): { code: string; endIndex: number } | null {
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let i = startIndex;
  
  // Skip to opening brace
  while (i < code.length && code[i] !== '{') {
    i++;
  }
  
  if (i >= code.length) return null;
  
  const codeStart = i + 1;
  i++;
  braceCount = 1;
  
  // Find matching closing brace
  while (i < code.length && braceCount > 0) {
    const char = code[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && code[i - 1] !== '\\') {
      inString = false;
    } else if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    i++;
  }
  
  if (braceCount !== 0) return null;
  
  const blockCode = code.substring(codeStart, i - 1);
  return { code: blockCode, endIndex: i };
}

// Parse statements from code (handles multi-line constructs)
function parseStatements(code: string): Array<{ type: string; content: string; startPos: number; endPos: number }> {
  const statements: Array<{ type: string; content: string; startPos: number; endPos: number }> = [];
  let i = 0;
  let currentStatement = '';
  let startPos = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let inString = false;
  let stringChar = '';
  
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
    
    // Track braces and parentheses
    if (char === '{') braceDepth++;
    if (char === '}') braceDepth--;
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    
    // Statement separator (semicolon) when not in braces/parens
    if (char === ';' && braceDepth === 0 && parenDepth === 0) {
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

export function evalPhpJs(phpCode: string, preTemplateContainer: Element | null, lineOffset: number = 0) {
  // Remove comments first
  const codeWithoutComments = removeComments(phpCode.trim());
  const statements = parseStatements(codeWithoutComments);
  
  let currentLine = lineOffset;
  let i = 0;
  
  while (i < statements.length) {
    const stmt = statements[i];
    const line = stmt.content;
    currentLine = lineOffset + i + 1;
    
    try {
      // Handle if/elseif/else statements
      if (line.toLowerCase().startsWith('if')) {
        const ifMatch = line.match(/if\s*\(\s*(.+?)\s*\)/i);
        if (ifMatch) {
          const condition = ifMatch[1];
          // Find the opening brace after the condition
          let bracePos = stmt.endPos;
          while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
            bracePos++;
          }
          const block = parseCodeBlock(codeWithoutComments, bracePos);
          if (block) {
            if (evaluateCondition(condition)) {
              evalPhpJs(block.code, preTemplateContainer, currentLine);
            }
            // Skip to after the block
            i++;
            continue;
          }
        }
      }
      
      if (line.toLowerCase().startsWith('elseif')) {
        const elseifMatch = line.match(/elseif\s*\(\s*(.+?)\s*\)/i);
        if (elseifMatch) {
          const condition = elseifMatch[1];
          let bracePos = stmt.endPos;
          while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
            bracePos++;
          }
          const block = parseCodeBlock(codeWithoutComments, bracePos);
          if (block) {
            if (evaluateCondition(condition)) {
              evalPhpJs(block.code, preTemplateContainer, currentLine);
            }
            i++;
            continue;
          }
        }
      }
      
      if (line.toLowerCase().startsWith('else')) {
        let bracePos = stmt.endPos;
        while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
          bracePos++;
        }
        const block = parseCodeBlock(codeWithoutComments, bracePos);
        if (block) {
          evalPhpJs(block.code, preTemplateContainer, currentLine);
        }
        i++;
        continue;
      }
      
      // Handle for loops
      if (line.toLowerCase().startsWith('for')) {
        const forMatch = line.match(/for\s*\((.+?)\)/i);
        if (forMatch) {
          const loop = parseForLoop(line);
          let bracePos = stmt.endPos;
          while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
            bracePos++;
          }
          const block = parseCodeBlock(codeWithoutComments, bracePos);
          if (loop && block) {
            loop.code = block.code;
            executeForLoop(loop, (code) => {
              evalPhpJs(code, preTemplateContainer, currentLine);
            });
          }
          i++;
          continue;
        }
      }
      
      // Handle while loops
      if (line.toLowerCase().startsWith('while')) {
        const whileMatch = line.match(/while\s*\(\s*(.+?)\s*\)/i);
        if (whileMatch) {
          const loop = parseWhileLoop(line);
          let bracePos = stmt.endPos;
          while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
            bracePos++;
          }
          const block = parseCodeBlock(codeWithoutComments, bracePos);
          if (loop && block) {
            loop.code = block.code;
            executeWhileLoop(loop, (code) => {
              evalPhpJs(code, preTemplateContainer, currentLine);
            });
          }
          i++;
          continue;
        }
      }
      
      // Handle foreach loops
      if (line.toLowerCase().startsWith('foreach')) {
        const foreachMatch = line.match(/foreach\s*\((.+?)\)/i);
        if (foreachMatch) {
          const loop = parseForeachLoop(line);
          let bracePos = stmt.endPos;
          while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
            bracePos++;
          }
          const block = parseCodeBlock(codeWithoutComments, bracePos);
          if (loop && block) {
            loop.code = block.code;
            executeForeachLoop(loop, (code) => {
              evalPhpJs(code, preTemplateContainer, currentLine);
            });
          }
          i++;
          continue;
        }
      }
      
      // Handle function definitions
      if (line.toLowerCase().startsWith('function')) {
        const funcDef = parseFunctionDefinition(line);
        if (funcDef) {
          let bracePos = stmt.endPos;
          while (bracePos < codeWithoutComments.length && codeWithoutComments[bracePos] !== '{') {
            bracePos++;
          }
          const block = parseCodeBlock(codeWithoutComments, bracePos);
          if (block) {
            defineFunction(funcDef.name, funcDef.params, block.code);
          }
          i++;
          continue;
        }
      }
      
      // Handle function calls
      const funcCall = parseFunctionCall(line);
      if (funcCall) {
        const result = callFunction(
          funcCall.name,
          funcCall.args,
          (code) => evalPhpJs(code, preTemplateContainer, currentLine),
          getVariableFromScope,
          setVariableInScope
        );
        // If function returns a value and it's assigned to a variable
        const assignMatch = line.match(/^\$(\w+)\s*=\s*(.+)/);
        if (assignMatch && result !== undefined) {
          setVariableInScope(assignMatch[1], String(result));
        }
        i++;
        continue;
      }
      
      // Handle array access like $arr[0]
      const arrayAccessMatch = line.match(/^\$(\w+)\[(\d+|\w+)\]/);
      if (arrayAccessMatch && !line.includes('=')) {
        // Just reading array element, can be used in echo or expressions
        const arrayName = arrayAccessMatch[1];
        const index = arrayAccessMatch[2];
        const element = getArrayElement(arrayName, index);
        // This would be used in expressions, handled elsewhere
      }
      
      const lineArr = tokenizeLine(line);
      
      switch (lineArr[0].toLowerCase()) {
        case 'echo':
          const extractString = lineArr.splice(1, lineArr.length - 1);
          // Join tokens back into a string to preserve operators and expressions
          const joinedExpression = extractString.join(' ').trim();
          
          // Check if it's a pure expression (no concatenation operator)
          if (!joinedExpression.includes('.')) {
            // Single expression - evaluate it
            const evaluated = evaluateExpression(joinedExpression);
            const result = evaluated !== null && evaluated !== undefined ? String(evaluated) : joinedExpression;
            handleEcho(result, preTemplateContainer);
          } else {
            // Concatenation with . operator - use handleConcatination
            const concatinatedString = handleConcatination(extractString, preTemplateContainer) || '';
            handleEcho(concatinatedString, preTemplateContainer);
          }
          break;
        default:
          if (lineArr[0].startsWith('$')) {
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
    } catch (error: any) {
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

export function handlePhpjsElement(el: Element) {
  if (processedPhpjs.has(el)) return;
  processedPhpjs.add(el);

  const phpCode = el.innerHTML || '';

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
    } else {
      evalPhpJs(phpCode, null);
    }
  } finally {
    // Maintain global scope so variables persist across templates
    currentScope = globalScope;
  }
}
