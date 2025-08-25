import { extractSiteRoutes } from "./index";

async function main() {
  // Example usage of the route extractor
  console.log("🔍 Route Extractor Example\n");

  // You can test this with any React project path
  const projectPath = process.argv[2] || "./example-project";

  console.log(`📁 Analyzing project at: ${projectPath}\n`);

  try {
    const result = await extractSiteRoutes(projectPath);

    console.log("📊 Analysis Results:");
    console.log("====================");
    console.log(`Framework: ${result.framework.name}`);
    if (result.framework.version) {
      console.log(`Version: ${result.framework.version}`);
    }
    console.log(`Routes Found: ${result.routes.length}`);

    if (result.routes.length > 0) {
      console.log("\n🛣️  Routes:");
      console.log("--------");
      result.routes.forEach((route, index) => {
        console.log(`${index + 1}. ${route.path}`);
        if (route.component) {
          console.log(`   Component: ${route.component}`);
        }
        if (route.dynamic) {
          console.log(`   Dynamic: Yes`);
        }
        if (route.catchAll) {
          console.log(`   Catch-all: Yes`);
        }
        if (route.children && route.children.length > 0) {
          console.log(`   Children: ${route.children.length}`);
        }
        console.log("");
      });
    }

    if (result.errors.length > 0) {
      console.log("❌ Errors:");
      console.log("-----------");
      result.errors.forEach((error) => {
        console.log(`- ${error}`);
      });
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the example if this file is executed directly
if (import.meta.main) {
  main();
}

export { main };
