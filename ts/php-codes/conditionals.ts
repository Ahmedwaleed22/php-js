// Conditional statement handling (if/else/elseif)

import { evaluateExpression, toBoolean } from '../utils/expression-evaluator.js';
import { formatError } from '../utils/error-handler.js';

export interface ConditionalBlock {
  condition: string;
  code: string;
  line: number;
}

export function parseConditional(phpCode: string, startIndex: number): { block: ConditionalBlock; endIndex: number } | null {
  // Find the opening brace
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let i = startIndex;
  
  // Skip to opening brace
  while (i < phpCode.length && phpCode[i] !== '{') {
    i++;
  }
  
  if (i >= phpCode.length) return null;
  
  const codeStart = i + 1;
  i++;
  braceCount = 1;
  
  // Find matching closing brace
  while (i < phpCode.length && braceCount > 0) {
    const char = phpCode[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && phpCode[i - 1] !== '\\') {
      inString = false;
    } else if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    
    i++;
  }
  
  if (braceCount !== 0) return null;
  
  const code = phpCode.substring(codeStart, i - 1);
  return { block: { condition: '', code, line: 0 }, endIndex: i };
}

export function evaluateCondition(condition: string): boolean {
  const result = evaluateExpression(condition);
  return toBoolean(result);
}

