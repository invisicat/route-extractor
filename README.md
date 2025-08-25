# Route Extractor

A powerful library to extract routes from React projects supporting multiple frameworks including Next.js, Vite, and React Router DOM.

## Features

- **Multi-Framework Support**: Automatically detects and extracts routes from:
  - Next.js (App Router & Pages Router)
  - Vite + React Router DOM
  - React Router DOM standalone
- **Smart Detection**: Automatically identifies the framework being used
- **Comprehensive Route Parsing**: Extracts dynamic routes, catch-all routes, and nested routes
- **Babel AST Traversal**: Uses advanced parsing for React Router DOM projects
- **TypeScript Support**: Full TypeScript definitions included
- **CLI Tool**: Command-line interface for easy integration

## Installation

```bash
bun add route-extractor
```

## Usage

### Command Line Interface (CLI)

The library includes a CLI tool that you can use directly from the command line:

```bash
# Basic usage
route-extractor ./my-react-project

# Output in JSON format
route-extractor ./my-react-project --json

# Show help
route-extractor --help

# Show version
route-extractor --version
```

#### CLI Options

- `--json`: Output results in JSON format
- `--pretty`: Pretty print the results (default)
- `--help, -h`: Show help message
- `--version, -v`: Show version information

#### CLI Examples

```bash
# Analyze current directory
route-extractor .

# Analyze specific project
route-extractor /path/to/nextjs-app

# Get JSON output for scripting
route-extractor ./my-app --json > routes.json
```

### Programmatic Usage

```typescript
import { extractSiteRoutes } from "route-extractor";

// Extract routes from a React project
const result = await extractSiteRoutes("/path/to/your/react/project");

console.log("Framework:", result.framework.name);
console.log("Routes:", result.routes);
console.log("Errors:", result.errors);
```

### Example Output

```typescript
{
  framework: { name: "nextjs", version: "14.0.0" },
  routes: [
    {
      path: "/",
      component: "index.tsx",
      dynamic: false,
      catchAll: false
    },
    {
      path: "/users/:id",
      component: "users/[id]/page.tsx",
      dynamic: true,
      catchAll: false
    },
    {
      path: "/blog/*",
      component: "blog/[...slug]/page.tsx",
      dynamic: true,
      catchAll: true
    }
  ],
  errors: []
}
```

## Supported Frameworks

### Next.js

**App Router (Next.js 13+)**

- Detects `app/` directory
- Parses `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Supports dynamic routes `[id]` and catch-all routes `[...slug]`

**Pages Router**

- Detects `pages/` directory
- Converts file paths to route paths
- Supports dynamic and catch-all routes

### Vite + React Router DOM

- Scans for React Router usage in project files
- Uses Babel AST traversal to parse route definitions
- Supports both JSX `<Route>` elements and `createBrowserRouter` configuration

### React Router DOM

- Comprehensive parsing of React Router configurations
- AST-based analysis for accurate route extraction
- Supports nested routes and complex configurations

## API Reference

### `extractSiteRoutes(projectPath: string): Promise<ExtractionResult>`

The main function that extracts routes from a React project.

**Parameters:**

- `projectPath` (string): Absolute or relative path to the React project directory

**Returns:**

- `Promise<ExtractionResult>`: Object containing framework info, routes, and any errors

### Types

```typescript
interface RouteInfo {
  path: string; // The route path (e.g., '/users/:id')
  component?: string; // Component file path (if available)
  children?: RouteInfo[]; // Nested routes
  dynamic?: boolean; // Whether the route is dynamic
  catchAll?: boolean; // Whether the route is a catch-all route
}

interface FrameworkInfo {
  name: "nextjs" | "vite" | "react-router-dom" | "unknown";
  version?: string;
}

interface ExtractionResult {
  framework: FrameworkInfo;
  routes: RouteInfo[];
  errors: string[];
}
```

## Examples

### Next.js Project

```typescript
import { extractSiteRoutes } from "route-extractor";

const result = await extractSiteRoutes("./my-nextjs-app");

if (result.framework.name === "nextjs") {
  console.log("Next.js routes found:");
  result.routes.forEach((route) => {
    console.log(`${route.path} -> ${route.component}`);
  });
}
```

### React Router DOM Project

```typescript
import { extractSiteRoutes } from "route-extractor";

const result = await extractSiteRoutes("./my-react-app");

if (result.framework.name === "react-router-dom") {
  console.log("React Router routes found:");
  result.routes.forEach((route) => {
    console.log(`Route: ${route.path}`);
    if (route.children) {
      route.children.forEach((child) => {
        console.log(`  └─ ${child.path}`);
      });
    }
  });
}
```

### CLI Integration

```bash
#!/bin/bash
# Extract routes and save to file
route-extractor ./my-app --json > routes.json

# Process routes in a script
ROUTES=$(route-extractor ./my-app --json)
echo "Found $(echo $ROUTES | jq '.routes | length') routes"
```

## Error Handling

The library provides comprehensive error handling:

```typescript
const result = await extractSiteRoutes("./invalid-path");

if (result.errors.length > 0) {
  console.error("Extraction errors:");
  result.errors.forEach((error) => console.error(`- ${error}`));
}
```

Common errors include:

- Project path does not exist
- Unsupported framework
- File parsing errors
- Missing dependencies

## Development

### Building

```bash
bun run build
```

### Development Mode

```bash
bun run dev
```

### Testing

```bash
bun test
```

### CLI Development

```bash
# Make CLI executable
chmod +x bin/cli.js

# Test CLI locally
bun run bin/cli.js --help
```

## Dependencies

- `@babel/parser` - JavaScript/TypeScript parsing
- `@babel/traverse` - AST traversal
- `@babel/types` - AST type definitions
- `glob` - File pattern matching
- `fs-extra` - Enhanced file system operations

## License

MIT
