// Function definition and calling

import { getVariableValue, setVariableValue, ReturnException } from '../utils/process-phpjs-tags.js';
import { stringFunctions } from '../utils/string-functions.js';
import { evaluateExpression } from '../utils/expression-evaluator.js';
import { getArrayElement } from '../utils/array-handler.js';

export interface PhpFunction {
  name: string;
  params: string[];
  code: string;
}

const userFunctions = new Map<string, PhpFunction>();

export function defineFunction(name: string, params: string[], code: string): void {
  userFunctions.set(name.toLowerCase(), { name, params, code });
  console.log('Function defined:', name, params, code);
}

export function getFunction(name: string): PhpFunction | undefined {
  return userFunctions.get(name.toLowerCase());
}

export function parseFunctionDefinition(header: string): { name: string; params: string[] } | null {
  // Format: function functionName($param1, $param2)
  const match = header.match(/function\s+(\w+)\s*\(\s*(.*?)\s*\)/i);
  if (!match) return null;
  
  const name = match[1];
  const paramsStr = match[2].trim();
  const params = paramsStr ? paramsStr.split(',').map(p => p.trim().replace(/^\$/, '')) : [];
  
  return { name, params };
}

export function parseFunctionCall(callStr: string): { name: string; args: string[] } | null {
  // Format: functionName($arg1, $arg2) or functionName("arg1", 123)
  const match = callStr.match(/(\w+)\s*\(\s*(.*?)\s*\)/);
  if (!match) return null;
  
  const name = match[1];
  const argsStr = match[2].trim();
  
  if (!argsStr) {
    return { name, args: [] };
  }
  
  // Parse arguments (handle nested parentheses and strings)
  const args: string[] = [];
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
    } else if (inString && char === stringChar && argsStr[i - 1] !== '\\') {
      inString = false;
      current += char;
    } else if (!inString) {
      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return { name, args };
}

export function callFunction(name: string, args: string[], executeCode: (code: string) => void, getVar: (name: string) => string | undefined, setVar: (name: string, value: string) => void): any {
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
  const savedVars = new Map<string, string | undefined>();
  func.params.forEach((param, index) => {
    savedVars.set(param, getVar(param));
    const argValue = index < args.length ? evaluateExpression(args[index]) : undefined;
    setVar(param, argValue !== undefined ? String(argValue) : '');
  });
  
  let returnValue: any = undefined;
  try {
    // Execute function code
    executeCode(func.code);
  } catch (e) {
    if (e instanceof ReturnException) {
      returnValue = e.value;
    } else {
      // Restore variable scope before re-throwing
      func.params.forEach(param => {
        const saved = savedVars.get(param);
        if (saved !== undefined) {
          setVar(param, saved);
        }
      });
      throw e;
    }
  }
  
  // Restore variable scope
  func.params.forEach(param => {
    const saved = savedVars.get(param);
    if (saved !== undefined) {
      setVar(param, saved);
    } else {
      // Remove the parameter variable
      // Note: We'd need a removeVariable function for this
    }
  });
  
  return returnValue;
}

