// String function implementations
export function strlen(str) {
    return str.length;
}
export function strtoupper(str) {
    return str.toUpperCase();
}
export function strtolower(str) {
    return str.toLowerCase();
}
export function substr(str, start, length) {
    if (length !== undefined) {
        return str.substring(start, start + length);
    }
    return str.substring(start);
}
export function strpos(haystack, needle, offset = 0) {
    const index = haystack.indexOf(needle, offset);
    return index === -1 ? false : index;
}
export function str_replace(search, replace, subject) {
    if (typeof search === 'string' && typeof replace === 'string') {
        return subject.split(search).join(replace);
    }
    if (Array.isArray(search) && Array.isArray(replace)) {
        let result = subject;
        for (let i = 0; i < search.length; i++) {
            result = result.split(search[i]).join(replace[i] || '');
        }
        return result;
    }
    return subject;
}
export function trim(str) {
    return str.trim();
}
export function ucfirst(str) {
    if (str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function ucwords(str) {
    return str.split(' ').map(word => ucfirst(word)).join(' ');
}
export function explode(delimiter, str) {
    return str.split(delimiter);
}
export function implode(glue, pieces) {
    return pieces.join(glue);
}
// Map of function names to implementations
export const stringFunctions = {
    strlen,
    strtoupper,
    strtolower,
    substr,
    strpos,
    str_replace,
    trim,
    ucfirst,
    ucwords,
    explode,
    implode,
};
