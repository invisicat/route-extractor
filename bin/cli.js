#!/usr/bin/env node

import { extractSiteRoutes } from "../dist/index.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

function printUsage() {
  console.log(`
${colors.bright}${colors.cyan}Route Extractor CLI${colors.reset}
${colors.bright}Extract routes from React projects${colors.reset}

${colors.bright}Usage:${colors.reset}
  route-extractor <project-path> [options]

${colors.bright}Arguments:${colors.reset}
  project-path    Path to the React project directory

${colors.bright}Options:${colors.reset}
  --json          Output results in JSON format
  --pretty        Pretty print the results (default)
  --help, -h      Show this help message
  --version, -v   Show version information

${colors.bright}Examples:${colors.reset}
  route-extractor ./my-nextjs-app
  route-extractor /path/to/react-project --json
  route-extractor . --pretty

${colors.bright}Supported Frameworks:${colors.reset}
  • Next.js (App Router & Pages Router)
  • Vite + React Router DOM
  • React Router DOM standalone
`);
}

async function printVersion() {
  try {
    const packageJson = JSON.parse(
      await Bun.file(resolve(__dirname, "../package.json")).text()
    );
    console.log(`route-extractor v${packageJson.version}`);
  } catch (error) {
    console.log("route-extractor v1.0.0");
  }
}

function printResults(result, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Pretty print results
  console.log("\n" + "=".repeat(60));
  console.log(
    `${colors.bright}${colors.cyan}Route Extraction Results${colors.reset}`
  );
  console.log("=".repeat(60));

  // Framework info
  console.log(
    `\n${colors.bright}Framework:${colors.reset} ${colors.green}${result.framework.name}${colors.reset}`
  );
  if (result.framework.version) {
    console.log(
      `${colors.bright}Version:${colors.reset} ${colors.yellow}${result.framework.version}${colors.reset}`
    );
  }

  // Routes
  console.log(
    `\n${colors.bright}Routes Found:${colors.reset} ${colors.cyan}${result.routes.length}${colors.reset}`
  );

  if (result.routes.length > 0) {
    console.log("\n" + "-".repeat(60));
    result.routes.forEach((route, index) => {
      const routeNumber = `${colors.bright}${index + 1}.${colors.reset}`;
      const routePath = `${colors.green}${route.path}${colors.reset}`;

      console.log(`${routeNumber} ${routePath}`);

      if (route.component) {
        console.log(
          `   ${colors.dim}📁 Component:${colors.reset} ${colors.blue}${route.component}${colors.reset}`
        );
      }

      if (
        route.resolvedComponentPath &&
        route.resolvedComponentPath !== route.component
      ) {
        console.log(
          `   ${colors.dim}📍 Resolved:${colors.reset} ${colors.blue}${route.resolvedComponentPath}${colors.reset}`
        );
      }

      if (route.importedComponent) {
        console.log(
          `   ${colors.dim}📦 Imported:${colors.reset} ${colors.cyan}${route.importedComponent.name}${colors.reset} from ${colors.yellow}${route.importedComponent.path}${colors.reset}`
        );
        if (
          route.importedComponent.fullPath &&
          route.importedComponent.fullPath !== route.importedComponent.path
        ) {
          console.log(
            `   ${colors.dim}📍 File:${colors.reset} ${colors.blue}${route.importedComponent.fullPath}${colors.reset}`
          );
        }
      }

      if (route.dynamic) {
        console.log(
          `   ${colors.dim}🔄 Dynamic:${colors.reset} ${colors.yellow}Yes${colors.reset}`
        );
      }

      if (route.catchAll) {
        console.log(
          `   ${colors.dim}🌐 Catch-all:${colors.reset} ${colors.magenta}Yes${colors.reset}`
        );
      }

      if (route.children && route.children.length > 0) {
        console.log(
          `   ${colors.dim}📂 Children:${colors.reset} ${colors.cyan}${route.children.length}${colors.reset}`
        );
      }

      console.log("");
    });
  }

  // Errors
  if (result.errors.length > 0) {
    console.log(`${colors.red}${colors.bright}Errors:${colors.reset}`);
    console.log("-".repeat(60));
    result.errors.forEach((error) => {
      console.log(`${colors.red}❌ ${error}${colors.reset}`);
    });
  }

  console.log("=".repeat(60));
}

async function main() {
  const args = process.argv.slice(2);

  // Parse options
  const options = {
    json: false,
    pretty: true,
    help: false,
    version: false,
  };

  let projectPath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--json") {
      options.json = true;
      options.pretty = false;
    } else if (arg === "--pretty") {
      options.pretty = true;
      options.json = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--version" || arg === "-v") {
      options.version = true;
    } else if (!projectPath && !arg.startsWith("-")) {
      projectPath = arg;
    }
  }

  // Handle help and version
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (options.version) {
    await printVersion();
    process.exit(0);
  }

  // Validate project path
  if (!projectPath) {
    console.error(
      `${colors.red}Error:${colors.reset} Project path is required`
    );
    console.error(`Use --help for usage information`);
    process.exit(1);
  }

  // Resolve project path
  const resolvedPath = resolve(process.cwd(), projectPath);

  try {
    if (!options.json) {
      console.log(
        `${colors.cyan}🔍 Analyzing project at:${colors.reset} ${resolvedPath}\n`
      );
    }

    const result = await extractSiteRoutes(resolvedPath);

    if (options.pretty || !options.json) {
      printResults(result, options);
    } else {
      printResults(result, options);
    }

    // Exit with error code if there are errors
    if (result.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    if (options.json) {
      const errResult = {
        framework: { name: "unknown" },
        routes: [],
        errors: [error?.message || String(error)],
      };
      console.log(JSON.stringify(errResult));
      process.exit(1);
    } else {
      console.error(
        `${colors.red}💥 Fatal error:${colors.reset} ${error.message}`
      );
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run the CLI
if (import.meta.main) {
  main().catch((error) => {
    console.error(
      `${colors.red}💥 Unhandled error:${colors.reset} ${error.message}`
    );
    process.exit(1);
  });
}

export { main };
