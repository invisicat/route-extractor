import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import { parse } from "@babel/parser";
import traverseModule, * as babelTraverse from "@babel/traverse";
import type { NodePath } from "@babel/traverse";
const traverse: typeof babelTraverse.default = // Handle ESM/CJS/bundler interop
  ((traverseModule as any)?.default ??
    (babelTraverse as any)?.default ??
    (traverseModule as any) ??
    (babelTraverse as any)) as any;
import * as t from "@babel/types";

export interface RouteInfo {
  path: string;
  component?: string;
  children?: RouteInfo[];
  dynamic?: boolean;
  catchAll?: boolean;
  // Resolved component file path relative to project root, if available
  resolvedComponentPath?: string;
  importedComponent?: {
    name: string;
    path: string;
    fullPath?: string;
  };
}

export interface FrameworkInfo {
  name: "nextjs" | "vite" | "react-router-dom" | "unknown";
  version?: string;
}

export interface ExtractionResult {
  framework: FrameworkInfo;
  routes: RouteInfo[];
  errors: string[];
}

/**
 * Main function to extract routes from a React project
 * @param projectPath - Path to the React project directory
 * @returns Promise<ExtractionResult> - Framework info and extracted routes
 */
export async function extractSiteRoutes(
  projectPath: string
): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    framework: { name: "unknown" },
    routes: [],
    errors: [],
  };

  try {
    // Check if path exists
    if (!(await fs.pathExists(projectPath))) {
      result.errors.push(`Project path does not exist: ${projectPath}`);
      return result;
    }

    // Detect framework
    result.framework = await detectFramework(projectPath);

    // Extract routes based on framework
    switch (result.framework.name) {
      case "nextjs":
        result.routes = await extractNextJSRoutes(projectPath);
        break;
      case "vite":
        result.routes = await extractViteRoutes(projectPath);
        break;
      case "react-router-dom":
        result.routes = await extractReactRouterRoutes(projectPath);
        break;
      default:
        result.errors.push("Unsupported or unknown framework");
    }
  } catch (error) {
    result.errors.push(
      `Error during extraction: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return result;
}

/**
 * Detect the framework used in the project
 */
async function detectFramework(projectPath: string): Promise<FrameworkInfo> {
  const packageJsonPath = path.join(projectPath, "package.json");

  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (dependencies.next) {
      return { name: "nextjs", version: dependencies.next };
    }

    if (dependencies.vite) {
      return { name: "vite", version: dependencies.vite };
    }

    if (dependencies["react-router-dom"]) {
      return {
        name: "react-router-dom",
        version: dependencies["react-router-dom"],
      };
    }
  }

  // Check for framework-specific files
  if (
    (await fs.pathExists(path.join(projectPath, "next.config.js"))) ||
    (await fs.pathExists(path.join(projectPath, "next.config.ts")))
  ) {
    return { name: "nextjs" };
  }

  if (
    (await fs.pathExists(path.join(projectPath, "vite.config.js"))) ||
    (await fs.pathExists(path.join(projectPath, "vite.config.ts")))
  ) {
    return { name: "vite" };
  }

  return { name: "unknown" };
}

/**
 * Extract routes from Next.js project
 */
async function extractNextJSRoutes(projectPath: string): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];
  const pagesDir = path.join(projectPath, "pages");
  const appDir = path.join(projectPath, "app");

  // Check for App Router (Next.js 13+)
  if (await fs.pathExists(appDir)) {
    routes.push(...(await extractNextJSAppRoutes(appDir, projectPath)));
  }

  // Check for Pages Router
  if (await fs.pathExists(pagesDir)) {
    routes.push(...(await extractNextJSPagesRoutes(pagesDir, projectPath)));
  }

  return routes;
}

/**
 * Extract routes from Next.js App Router
 */
async function extractNextJSAppRoutes(
  appDir: string,
  projectPath: string
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  try {
    const files = await glob("**/*.{tsx,ts,jsx,js}", {
      cwd: appDir,
      absolute: true,
    });

    for (const file of files) {
      const relativePath = path.relative(appDir, file);
      const routePath = convertNextJSAppPathToRoute(relativePath);

      if (routePath) {
        routes.push({
          path: routePath,
          component: relativePath,
          resolvedComponentPath: path.relative(projectPath, file),
          dynamic: routePath.includes("[") || routePath.includes("..."),
          catchAll: routePath.includes("..."),
        });
      }
    }
  } catch (error) {
    console.error("Error extracting Next.js App Router routes:", error);
  }

  return routes;
}

/**
 * Extract routes from Next.js Pages Router
 */
async function extractNextJSPagesRoutes(
  pagesDir: string,
  projectPath: string
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  try {
    const files = await glob("**/*.{tsx,ts,jsx,js}", {
      cwd: pagesDir,
      absolute: true,
    });

    for (const file of files) {
      const relativePath = path.relative(pagesDir, file);
      const routePath = convertNextJSPagesPathToRoute(relativePath);

      if (routePath) {
        routes.push({
          path: routePath,
          component: relativePath,
          resolvedComponentPath: path.relative(projectPath, file),
          dynamic: routePath.includes("[") || routePath.includes("..."),
          catchAll: routePath.includes("..."),
        });
      }
    }
  } catch (error) {
    console.error("Error extracting Next.js Pages Router routes:", error);
  }

  return routes;
}

/**
 * Convert Next.js App Router file path to route path
 */
function convertNextJSAppPathToRoute(filePath: string): string | null {
  // Remove file extensions
  let route = filePath.replace(/\.(tsx|ts|jsx|js)$/, "");

  // Handle special files
  if (route.endsWith("/page")) {
    route = route.replace(/\/page$/, "");
  } else if (route.endsWith("/layout")) {
    route = route.replace(/\/layout$/, "");
  } else if (route.endsWith("/loading")) {
    route = route.replace(/\/loading$/, "");
  } else if (route.endsWith("/error")) {
    route = route.replace(/\/error$/, "");
  } else if (route.endsWith("/not-found")) {
    route = route.replace(/\/not-found$/, "");
  }

  // Handle dynamic routes
  route = route.replace(/\[([^\]]+)\]/g, ":$1");
  route = route.replace(/\[\.\.\.([^\]]+)\]/g, "*");

  // Handle index routes
  if (route === "index") {
    route = "/";
  } else if (route.startsWith("/")) {
    route = route;
  } else {
    route = "/" + route;
  }

  return route || "/";
}

/**
 * Convert Next.js Pages Router file path to route path
 */
function convertNextJSPagesPathToRoute(filePath: string): string | null {
  // Remove file extensions
  let route = filePath.replace(/\.(tsx|ts|jsx|js)$/, "");

  // Handle index files
  if (route === "index") {
    return "/";
  }

  // Handle dynamic routes
  route = route.replace(/\[([^\]]+)\]/g, ":$1");
  route = route.replace(/\[\.\.\.([^\]]+)\]/g, "*");

  return "/" + route;
}

/**
 * Extract routes from Vite project
 */
async function extractViteRoutes(projectPath: string): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  try {
    // Look for router configuration files
    const routerFiles = await glob("**/*.{tsx,ts,jsx,js}", {
      cwd: projectPath,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    });

    for (const file of routerFiles) {
      const content = await fs.readFile(file, "utf-8");

      // Look for React Router patterns
      if (
        content.includes("react-router-dom") ||
        content.includes("BrowserRouter") ||
        content.includes("Routes")
      ) {
        const fileRoutes = await extractReactRouterRoutesFromFile(
          file,
          content,
          projectPath
        );
        routes.push(...fileRoutes);
      }
    }
  } catch (error) {
    console.error("Error extracting Vite routes:", error);
  }

  return routes;
}

/**
 * Extract routes from React Router DOM project
 */
async function extractReactRouterRoutes(
  projectPath: string
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];
  const seenRoutes = new Set<string>(); // Track seen routes to avoid duplicates

  try {
    const routerFiles = await glob("**/*.{tsx,ts,jsx,js}", {
      cwd: projectPath,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    });

    for (const file of routerFiles) {
      const content = await fs.readFile(file, "utf-8");

      if (
        content.includes("react-router-dom") ||
        content.includes("BrowserRouter") ||
        content.includes("Routes")
      ) {
        const fileRoutes = await extractReactRouterRoutesFromFile(
          file,
          content,
          projectPath
        );

        // Add routes, avoiding duplicates
        for (const route of fileRoutes) {
          const routeKey = `${route.path}|${route.component || "no-component"}`;
          if (!seenRoutes.has(routeKey)) {
            seenRoutes.add(routeKey);
            routes.push(route);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error extracting React Router routes:", error);
  }

  return routes;
}

/**
 * Extract routes from a specific file using Babel AST traversal
 */
async function extractReactRouterRoutesFromFile(
  filePath: string,
  content: string,
  projectPath: string
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];
  const imports = new Map<string, string>(); // Track component imports

  try {
    const ast = parse(content, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });

    // First pass: collect all imports (default and named)
    traverse(ast, {
      ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
        const source = path.node.source.value;
        path.node.specifiers.forEach((specifier) => {
          if (
            t.isImportDefaultSpecifier(specifier) &&
            t.isIdentifier(specifier.local)
          ) {
            const componentName = specifier.local.name;
            imports.set(componentName, source);
          } else if (
            t.isImportSpecifier(specifier) &&
            t.isIdentifier(specifier.local)
          ) {
            const localName = specifier.local.name;
            imports.set(localName, source);
          }
        });
      },
    });

    // Second pass: extract routes (collect promises then resolve)
    const jsxPromises: Array<Promise<RouteInfo | null>> = [];
    const routerArrayPromises: Array<Promise<RouteInfo[]>> = [];
    traverse(ast, {
      JSXElement(path: NodePath<t.JSXElement>) {
        const { node } = path;

        if (
          t.isJSXIdentifier(node.openingElement.name) &&
          node.openingElement.name.name === "Route"
        ) {
          jsxPromises.push(
            extractRouteFromJSXElement(node, filePath, projectPath, imports)
          );
        }
      },

      CallExpression(path: NodePath<t.CallExpression>) {
        const { node } = path;

        if (
          t.isIdentifier(node.callee) &&
          node.callee.name === "createBrowserRouter"
        ) {
          routerArrayPromises.push(
            extractRoutesFromCreateBrowserRouter(
              node,
              filePath,
              projectPath,
              imports
            )
          );
        }
      },
    });

    const jsxResults = await Promise.all(jsxPromises);
    jsxResults.forEach((ri) => {
      if (ri) routes.push(ri);
    });
    const routerArrays = await Promise.all(routerArrayPromises);
    routerArrays.forEach((arr) => {
      routes.push(...arr);
    });
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
  }

  return routes;
}

/**
 * Extract route information from JSX Route element
 */
async function extractRouteFromJSXElement(
  node: t.JSXElement,
  filePath: string,
  projectPath: string,
  imports: Map<string, string>
): Promise<RouteInfo | null> {
  const routeInfo: RouteInfo = {
    path: "/",
    component: getRelativePath(filePath, projectPath),
    children: [],
  };

  for (const attr of node.openingElement.attributes) {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      if (attr.name.name === "path" && t.isStringLiteral(attr.value)) {
        routeInfo.path = attr.value.value;
        routeInfo.dynamic = attr.value.value.includes(":");
        routeInfo.catchAll = attr.value.value.includes("*");
      } else if (
        attr.name.name === "component" &&
        t.isJSXExpressionContainer(attr.value)
      ) {
        const expr = attr.value.expression;
        if (t.isIdentifier(expr)) {
          const componentName = expr.name;
          const importPath = imports.get(componentName);
          if (importPath) {
            const fullPath = await resolveImportPath(
              importPath,
              filePath,
              projectPath
            );
            routeInfo.importedComponent = {
              name: componentName,
              path: importPath,
              fullPath,
            };
            routeInfo.resolvedComponentPath = fullPath;
          }
        }
      } else if (
        attr.name.name === "element" &&
        t.isJSXExpressionContainer(attr.value)
      ) {
        const expr = attr.value.expression;
        if (
          t.isJSXElement(expr) &&
          t.isJSXIdentifier(expr.openingElement.name)
        ) {
          const componentName = expr.openingElement.name.name;
          const importPath = imports.get(componentName);
          if (importPath) {
            const fullPath = await resolveImportPath(
              importPath,
              filePath,
              projectPath
            );
            routeInfo.importedComponent = {
              name: componentName,
              path: importPath,
              fullPath,
            };
            routeInfo.resolvedComponentPath = fullPath;
          }
        }
      }
    }
  }

  return routeInfo;
}

/**
 * Extract routes from createBrowserRouter call
 */
async function extractRoutesFromCreateBrowserRouter(
  node: t.CallExpression,
  filePath: string,
  projectPath: string,
  imports: Map<string, string>
): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  if (node.arguments.length > 0 && t.isArrayExpression(node.arguments[0])) {
    for (const element of node.arguments[0].elements) {
      if (element && t.isObjectExpression(element)) {
        const routeInfo = await extractRouteFromObjectExpression(
          element,
          filePath,
          projectPath,
          imports
        );
        if (routeInfo) {
          routes.push(routeInfo);
        }
      }
    }
  }

  return routes;
}

/**
 * Extract route information from object expression
 */
async function extractRouteFromObjectExpression(
  node: t.ObjectExpression,
  filePath: string,
  projectPath: string,
  imports: Map<string, string>
): Promise<RouteInfo | null> {
  const routeInfo: RouteInfo = {
    path: "/",
    component: getRelativePath(filePath, projectPath),
    children: [],
  };

  for (const prop of node.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
      if (prop.key.name === "path" && t.isStringLiteral(prop.value)) {
        routeInfo.path = prop.value.value;
        routeInfo.dynamic = prop.value.value.includes(":");
        routeInfo.catchAll = prop.value.value.includes("*");
      } else if (prop.key.name === "component" && t.isIdentifier(prop.value)) {
        // Track the imported component
        const componentName = prop.value.name;
        const importPath = imports.get(componentName);
        if (importPath) {
          const fullPath = await resolveImportPath(
            importPath,
            filePath,
            projectPath
          );
          routeInfo.importedComponent = {
            name: componentName,
            path: importPath,
            fullPath,
          };
          routeInfo.resolvedComponentPath = fullPath;
        }
      } else if (prop.key.name === "element" && t.isJSXElement(prop.value)) {
        const jsx = prop.value;
        if (t.isJSXIdentifier(jsx.openingElement.name)) {
          const componentName = jsx.openingElement.name.name;
          const importPath = imports.get(componentName);
          if (importPath) {
            const fullPath = await resolveImportPath(
              importPath,
              filePath,
              projectPath
            );
            routeInfo.importedComponent = {
              name: componentName,
              path: importPath,
              fullPath,
            };
            routeInfo.resolvedComponentPath = fullPath;
          }
        }
      } else if (
        prop.key.name === "children" &&
        t.isArrayExpression(prop.value)
      ) {
        const childrenPromises = prop.value.elements
          .filter(
            (element): element is t.ObjectExpression =>
              element !== null && t.isObjectExpression(element)
          )
          .map((element) =>
            extractRouteFromObjectExpression(
              element,
              filePath,
              projectPath,
              imports
            )
          );

        routeInfo.children = (await Promise.all(childrenPromises)).filter(
          (route): route is RouteInfo => route !== null
        );
      }
    }
  }

  return routeInfo;
}

/**
 * Resolve import path to full file path
 */
async function resolveImportPath(
  importPath: string,
  currentFile: string,
  projectPath: string
): Promise<string> {
  // Handle relative imports
  if (importPath.startsWith(".")) {
    const currentDir = path.dirname(currentFile);
    const resolvedPath = path.resolve(currentDir, importPath);

    // Add common extensions if the import doesn't have one
    if (!path.extname(importPath)) {
      const extensions = [".tsx", ".ts", ".jsx", ".js"];
      for (const ext of extensions) {
        const fullPath = resolvedPath + ext;
        if (await fs.pathExists(fullPath)) {
          return getRelativePath(fullPath, projectPath);
        }
      }
      // If no extension found, return the path with .tsx
      return getRelativePath(resolvedPath + ".tsx", projectPath);
    }

    return getRelativePath(resolvedPath, projectPath);
  }

  // Handle absolute imports (from src/, etc.)
  if (importPath.startsWith("/") || importPath.startsWith("src/")) {
    const resolvedPath = path.resolve(projectPath, importPath);
    return getRelativePath(resolvedPath, projectPath);
  }

  // For node_modules imports, just return the import path
  return importPath;
}

/**
 * Get relative path from project root
 */
function getRelativePath(filePath: string, projectPath: string): string {
  return path.relative(projectPath, filePath);
}

// Export the main function as default
export default extractSiteRoutes;
