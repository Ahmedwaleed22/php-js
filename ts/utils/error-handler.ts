// Error handling utilities

export interface PhpJsError {
  message: string;
  line?: number;
  code?: string;
  context?: string;
}

export function createError(message: string, line?: number, code?: string, context?: string): PhpJsError {
  return { message, line, code, context };
}

export function formatError(error: PhpJsError): string {
  let errorMsg = `<span style='color: red; font-weight: bold; text-transform: uppercase; text-decoration: underline;'>Error`;
  
  if (error.line !== undefined) {
    errorMsg += ` (Line ${error.line})`;
  }
  
  if (error.code) {
    errorMsg += ` [${error.code}]`;
  }
  
  errorMsg += `: ${error.message}`;
  
  if (error.context) {
    errorMsg += `<br><small style='color: #666;'>Context: ${error.context}</small>`;
  }
  
  errorMsg += `</span>`;
  
  return errorMsg;
}

export function throwError(message: string, line?: number, code?: string, context?: string): never {
  const error = createError(message, line, code, context);
  throw new Error(formatError(error));
}

