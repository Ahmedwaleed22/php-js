// Array handling utilities

import { getVariableValue, setVariableValue } from './process-phpjs-tags.js';

export type ArrayValue = string | number | boolean | null | ArrayValue[];

// Parse array literal like [1, 2, 3] or ["a", "b"]
export function parseArrayLiteral(arrayStr: string): ArrayValue[] {
  const trimmed = arrayStr.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }
  
  const content = trimmed.slice(1, -1).trim();
  if (!content) return [];
  
  const items: ArrayValue[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      current += char;
    } else if (inString && char === stringChar && content[i - 1] !== '\\') {
      inString = false;
      current += char;
    } else if (!inString && char === '[') {
      depth++;
      current += char;
    } else if (!inString && char === ']') {
      depth--;
      current += char;
    } else if (!inString && depth === 0 && char === ',') {
      items.push(parseValue(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    items.push(parseValue(current.trim()));
  }
  
  return items;
}

function parseValue(value: string): ArrayValue {
  const trimmed = value.trim();
  
  // String
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  
  // Number
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return num;
  }
  
  // Boolean/null
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (trimmed.toLowerCase() === 'null') return null;
  
  // Array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return parseArrayLiteral(trimmed);
  }
  
  // Variable
  if (trimmed.startsWith('$')) {
    const varName = trimmed.slice(1);
    const varValue = getVariableValue(varName);
    if (varValue) {
      // Try to parse as array if it looks like one
      try {
        const parsed = JSON.parse(varValue);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return varValue;
    }
  }
  
  return trimmed;
}

// Get array element by index
export function getArrayElement(arrayName: string, index: string | number): ArrayValue | undefined {
  const arrayStr = getVariableValue(arrayName);
  if (!arrayStr) return undefined;
  
  try {
    const array = JSON.parse(arrayStr);
    if (Array.isArray(array)) {
      const idx = typeof index === 'string' ? parseInt(index) : index;
      return array[idx];
    }
  } catch {}
  
  return undefined;
}

// Set array element by index
export function setArrayElement(arrayName: string, index: string | number, value: ArrayValue): void {
  const arrayStr = getVariableValue(arrayName);
  let array: ArrayValue[] = [];
  
  if (arrayStr) {
    try {
      const parsed = JSON.parse(arrayStr);
      if (Array.isArray(parsed)) {
        array = parsed;
      }
    } catch {}
  }
  
  const idx = typeof index === 'string' ? parseInt(index) : index;
  array[idx] = value;
  setVariableValue(arrayName, JSON.stringify(array));
}

// Convert array to string representation
export function arrayToString(array: ArrayValue[]): string {
  return JSON.stringify(array);
}

