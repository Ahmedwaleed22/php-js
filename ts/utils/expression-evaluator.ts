// Expression evaluator for arithmetic, comparison, and logical operations

import { getVariableValue } from './process-phpjs-tags.js';
import { parseFunctionCall, callFunction } from '../php-codes/functions.js';

export type ValueType = string | number | boolean | null | undefined;

// Get the actual value from a token (variable, string, or number)
export function getValue(token: string): ValueType {
  const trimmed = token.trim();
  
  // Variable reference
  if (trimmed.startsWith('$')) {
    const varName = trimmed.slice(1);
    const value = getVariableValue(varName);
    if (value !== undefined) {
      // Try to parse as number if it looks like one
      const num = Number(value);
      if (!isNaN(num) && value.trim() !== '') {
        return num;
      }
      return value;
    }
    return undefined;
  }
  
  // Quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  
  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return num;
  }
  
  // Boolean literals
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (trimmed.toLowerCase() === 'null') return null;
  
  return trimmed;
}

// Evaluate arithmetic expression
export function evaluateArithmetic(left: ValueType, operator: string, right: ValueType): ValueType {
  const leftNum = typeof left === 'string' ? Number(left) : left;
  const rightNum = typeof right === 'string' ? Number(right) : right;
  
  if (typeof leftNum !== 'number' || typeof rightNum !== 'number' || isNaN(leftNum) || isNaN(rightNum)) {
    return null;
  }
  
  switch (operator) {
    case '+': return leftNum + rightNum;
    case '-': return leftNum - rightNum;
    case '*': return leftNum * rightNum;
    case '/': return rightNum !== 0 ? leftNum / rightNum : null;
    case '%': return leftNum % rightNum;
    case '**': return Math.pow(leftNum, rightNum);
    default: return null;
  }
}

// Evaluate comparison expression
export function evaluateComparison(left: ValueType, operator: string, right: ValueType): boolean {
  switch (operator) {
    case '==':
    case '===':
      return left === right;
    case '!=':
    case '!==':
      return left !== right;
    case '<':
      return (left as number) < (right as number);
    case '>':
      return (left as number) > (right as number);
    case '<=':
      return (left as number) <= (right as number);
    case '>=':
      return (left as number) >= (right as number);
    default:
      return false;
  }
}

// Evaluate logical expression
export function evaluateLogical(left: boolean, operator: string, right: boolean): boolean {
  switch (operator) {
    case '&&':
    case 'and':
      return left && right;
    case '||':
    case 'or':
      return left || right;
    case '!':
    case 'not':
      return !right;
    default:
      return false;
  }
}

// Convert value to boolean
export function toBoolean(value: ValueType): boolean {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0 && !isNaN(value);
  if (typeof value === 'string') return value.length > 0 && value.toLowerCase() !== 'false';
  return true;
}

// Parse and evaluate a simple expression (handles basic arithmetic and comparisons)
export function evaluateExpression(expression: string): ValueType {
  const trimmed = expression.trim().replace(/;+$/, ''); // Strip trailing semicolons
  
  // Handle parentheses (simple case - just remove them for now)
  let expr = trimmed.replace(/^\(|\)$/g, '');
  
  // Check for PHP string concatenation operator (.) first
  // Need to handle carefully to avoid matching decimal numbers
  const concatParts: string[] = [];
  let currentPart = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      currentPart += char;
    } else if (inString && char === stringChar && expr[i - 1] !== '\\') {
      inString = false;
      currentPart += char;
    } else if (!inString && char === '.') {
      // Check if this is a decimal point in a number
      const beforeDot = currentPart.trim();
      const afterDot = expr.substring(i + 1).trim();
      const isDecimal = /\d$/.test(beforeDot) && /^\d/.test(afterDot);
      
      if (!isDecimal) {
        // This is a concatenation operator
        if (currentPart.trim()) {
          concatParts.push(currentPart.trim());
        }
        currentPart = '';
      } else {
        currentPart += char;
      }
    } else {
      currentPart += char;
    }
  }
  if (currentPart.trim()) {
    concatParts.push(currentPart.trim());
  }
  
  // If we have multiple parts, it's a concatenation
  if (concatParts.length > 1) {
    let result = '';
    for (const part of concatParts) {
      const value = getValue(part);
      result += value !== undefined && value !== null ? String(value) : '';
    }
    return result;
  }
  
  // Check for comparison operators
  const comparisonOps = ['===', '!==', '==', '!=', '<=', '>=', '<', '>'];
  for (const op of comparisonOps) {
    const parts = expr.split(op);
    if (parts.length === 2) {
      const left = getValue(parts[0].trim());
      const right = getValue(parts[1].trim());
      return evaluateComparison(left, op, right);
    }
  }
  
  // Check for logical operators
  const logicalOps = ['&&', '||', 'and', 'or'];
  for (const op of logicalOps) {
    const parts = expr.split(op);
    if (parts.length === 2) {
      const left = toBoolean(getValue(parts[0].trim()));
      const right = toBoolean(getValue(parts[1].trim()));
      return evaluateLogical(left, op, right);
    }
  }
  
  // Check for arithmetic operators (order matters: *, /, %, then +, -)
  const arithmeticOps = [['**'], ['*', '/', '%'], ['+', '-']];
  for (const ops of arithmeticOps) {
    for (const op of ops) {
      const parts = expr.split(op);
      if (parts.length === 2) {
        const left = getValue(parts[0].trim());
        const right = getValue(parts[1].trim());
        const result = evaluateArithmetic(left, op, right);
        if (result !== null) return result;
      }
    }
  }
  
  // Check for function calls
  const funcCall = parseFunctionCall(expr);
  if (funcCall) {
    const result = callFunction(
      funcCall.name,
      funcCall.args,
      () => {}, // Empty executor - function calls in expressions shouldn't execute code
      getVariableValue,
      () => {} // Empty setter
    );
    if (result !== undefined) {
      return result;
    }
  }
  
  // If no operator found, just return the value
  return getValue(expr);
}

