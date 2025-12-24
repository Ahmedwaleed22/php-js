import { processAllPhpjs } from './utils/reading-tags.js';
// Process all PHP-JS scripts (handles both inline and external files)
// The reading-tags module auto-runs on DOMContentLoaded, but we can also trigger manually
processAllPhpjs();
