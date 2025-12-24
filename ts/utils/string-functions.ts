// String function implementations

export function strlen(str: string): number {
  return str.length;
}

export function strtoupper(str: string): string {
  return str.toUpperCase();
}

export function strtolower(str: string): string {
  return str.toLowerCase();
}

export function substr(str: string, start: number, length?: number): string {
  if (length !== undefined) {
    return str.substring(start, start + length);
  }
  return str.substring(start);
}

export function strpos(haystack: string, needle: string, offset: number = 0): number | false {
  const index = haystack.indexOf(needle, offset);
  return index === -1 ? false : index;
}

export function str_replace(search: string | string[], replace: string | string[], subject: string): string {
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

export function trim(str: string): string {
  return str.trim();
}

export function ucfirst(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function ucwords(str: string): string {
  return str.split(' ').map(word => ucfirst(word)).join(' ');
}

export function explode(delimiter: string, str: string): string[] {
  return str.split(delimiter);
}

export function implode(glue: string, pieces: string[]): string {
  return pieces.join(glue);
}

// Map of function names to implementations
export const stringFunctions: Record<string, (...args: any[]) => any> = {
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

