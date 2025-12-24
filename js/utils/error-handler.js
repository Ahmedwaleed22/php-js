// Error handling utilities
export function createError(message, line, code, context) {
    return { message, line, code, context };
}
export function formatError(error) {
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
export function throwError(message, line, code, context) {
    const error = createError(message, line, code, context);
    throw new Error(formatError(error));
}
