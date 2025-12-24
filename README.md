# PHP.js

A lightweight PHP-to-JavaScript transpiler that allows you to write PHP-like code directly in your HTML templates and execute it in the browser.

## Features

- **PHP-like Syntax**: Write PHP code using familiar syntax
- **Variable Support**: Declare and use variables with `$` prefix
- **String Concatenation**: Use `.` operator for string concatenation
- **Functions**: Define and call custom functions
- **Built-in Functions**: Support for common string functions
- **Conditionals**: `if`, `else`, `elseif` statements
- **Loops**: `for`, `while`, `foreach` loops
- **Arrays**: Array creation and manipulation
- **Expression Evaluation**: Complex expressions with operators
- **External Files**: Load PHP-JS code from external `.phpjs` files
- **Script-based**: Use familiar `<script>` tags with `type="text/phpjs"`

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Ahmedwaleed22/php-js
cd php-js
```

2. Install dependencies:
```bash
yarn install
```

3. Compile TypeScript to JavaScript:
```bash
yarn build
```

### Usage

1. Include the compiled JavaScript file in your HTML:
```html
<script type="module" src="./js/phpjs.js"></script>
```

2. Write PHP-like code in `<script type="text/phpjs">` tags:
```html
<script type="text/phpjs">
  $name = "John Doe";
  echo "<h1>Hello $name</h1>";
  echo 'Hi ' . $name;
</script>
```

3. Or load PHP-JS code from an external file:
```html
<script type="text/phpjs" src="./path/to/file.phpjs"></script>
```

4. The code will be executed and the output will be rendered in place of the script tag.

## Examples

### Variables and Echo
```html
<script type="text/phpjs">
  $name = "Jane Doe";
  $age = 25;
  echo "My name is $name and I am $age years old";
</script>
```

### String Concatenation
```html
<script type="text/phpjs">
  $greeting = "Hello";
  $name = "World";
  echo $greeting . " " . $name;
</script>
```

### Functions
```html
<script type="text/phpjs">
  function greet($name) {
    return "Hello, " . $name;
  }
  
  echo greet("John");
</script>
```

### Conditionals
```html
<script type="text/phpjs">
  $age = 18;
  if ($age >= 18) {
    echo "You are an adult";
  } else {
    echo "You are a minor";
  }
</script>
```

### Loops
```html
<script type="text/phpjs">
  for ($i = 1; $i <= 5; $i++) {
    echo "Number: $i<br />";
  }
</script>
```

### Arrays
```html
<script type="text/phpjs">
  $fruits = ["apple", "banana", "orange"];
  foreach ($fruits as $fruit) {
    echo $fruit . "<br />";
  }
</script>
```

### External Files
Create a `.phpjs` file:
```php
// greet.phpjs
function greet($name) {
  return "Hello, " . $name;
}

echo greet("John");
```

Then include it in your HTML:
```html
<script type="text/phpjs" src="./greet.phpjs"></script>
```

## Project Structure

```
php-js/
├── ts/                    # TypeScript source files
│   ├── phpjs.ts          # Main entry point
│   ├── php-codes/        # PHP feature implementations
│   │   ├── concatination.ts
│   │   ├── conditionals.ts
│   │   ├── echo.ts
│   │   ├── functions.ts
│   │   └── loops.ts
│   └── utils/            # Utility functions
│       ├── array-handler.ts
│       ├── error-handler.ts
│       ├── expression-evaluator.ts
│       ├── process-phpjs-tags.ts
│       ├── reading-tags.ts
│       └── string-functions.ts
├── js/                   # Compiled JavaScript files
├── examples/             # Example PHP-JS files
├── index.html            # Example HTML file
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## Development

### Build
Compile TypeScript to JavaScript:
```bash
yarn build
```

### Watch Mode
Watch for changes and automatically rebuild:
```bash
yarn watch
```

## How It Works

1. The library scans the DOM for `<script type="text/phpjs">` elements
2. For inline scripts, the content is parsed as PHP-like code
3. For external scripts (with `src` attribute), the file is fetched and parsed
4. The code is executed in a JavaScript context with PHP-like semantics
5. Output from `echo` statements is inserted before the script element
6. Variables are shared across all scripts on the page (global scope)

## Supported Features

- ✅ Variable declaration and assignment
- ✅ String interpolation with `$variable`
- ✅ String concatenation with `.` operator
- ✅ Arithmetic operations (`+`, `-`, `*`, `/`, `%`, `**`)
- ✅ Comparison operators (`==`, `!=`, `===`, `!==`, `<`, `>`, `<=`, `>=`)
- ✅ Logical operators (`&&`, `||`, `!`)
- ✅ `if`, `else`, `elseif` conditionals
- ✅ `for`, `while`, `foreach` loops
- ✅ Function definition and calling
- ✅ Built-in string functions
- ✅ Array creation and access
- ✅ Return statements

## Browser Support

This library uses ES6 modules and modern JavaScript features. It requires a browser that supports:
- ES6 Modules
- Template literals
- Arrow functions
- Map and Set data structures

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created with ❤️ for bringing PHP-like syntax to the browser.

