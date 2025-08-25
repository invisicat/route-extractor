#!/usr/bin/env bun

import { extractSiteRoutes } from "./index";
import fs from "fs-extra";
import path from "path";

async function createSampleProject() {
  const projectDir = "./sample-nextjs-project";

  // Clean up existing demo project
  if (await fs.pathExists(projectDir)) {
    await fs.remove(projectDir);
  }

  // Create project structure
  await fs.ensureDir(projectDir);
  await fs.ensureDir(path.join(projectDir, "app"));
  await fs.ensureDir(path.join(projectDir, "app", "users"));
  await fs.ensureDir(path.join(projectDir, "app", "users", "[id]"));
  await fs.ensureDir(path.join(projectDir, "app", "blog"));
  await fs.ensureDir(path.join(projectDir, "app", "blog", "[...slug]"));
  await fs.ensureDir(path.join(projectDir, "app", "dashboard"));

  // Create package.json
  await fs.writeJson(path.join(projectDir, "package.json"), {
    name: "sample-nextjs-app",
    version: "1.0.0",
    dependencies: {
      next: "14.0.0",
      react: "18.0.0",
      "react-dom": "18.0.0",
    },
  });

  // Create app router files
  await fs.writeFile(
    path.join(projectDir, "app", "page.tsx"),
    `
export default function HomePage() {
  return (
    <div>
      <h1>Welcome to Sample Next.js App</h1>
      <p>This is the home page</p>
    </div>
  );
}
`
  );

  await fs.writeFile(
    path.join(projectDir, "app", "dashboard", "page.tsx"),
    `
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is the dashboard page</p>
    </div>
  );
}
`
  );

  await fs.writeFile(
    path.join(projectDir, "app", "users", "page.tsx"),
    `
export default function UsersPage() {
  return (
    <div>
      <h1>Users</h1>
      <p>List of all users</p>
    </div>
  );
}
`
  );

  await fs.writeFile(
    path.join(projectDir, "app", "users", "[id]", "page.tsx"),
    `
export default function UserPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>User Profile</h1>
      <p>User ID: {params.id}</p>
    </div>
  );
}
`
  );

  await fs.writeFile(
    path.join(projectDir, "app", "blog", "[...slug]", "page.tsx"),
    `
export default function BlogPage({ params }: { params: { slug: string[] } }) {
  return (
    <div>
      <h1>Blog Post</h1>
      <p>Slug: {params.slug.join('/')}</p>
    </div>
  );
}
`
  );

  await fs.writeFile(
    path.join(projectDir, "app", "layout.tsx"),
    `
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`
  );

  console.log("✅ Sample Next.js project created successfully!");
  return projectDir;
}

async function runDemo() {
  console.log("🚀 Route Extractor Demo\n");

  try {
    // Create a sample project
    const projectDir = await createSampleProject();

    // Extract routes
    console.log("🔍 Extracting routes...\n");
    const result = await extractSiteRoutes(projectDir);

    // Display results
    console.log("📊 Analysis Results:");
    console.log("====================");
    console.log(`Framework: ${result.framework.name}`);
    console.log(`Version: ${result.framework.version}`);
    console.log(`Routes Found: ${result.routes.length}\n`);

    if (result.routes.length > 0) {
      console.log("🛣️  Extracted Routes:");
      console.log("---------------------");
      result.routes.forEach((route, index) => {
        console.log(`${index + 1}. ${route.path}`);
        if (route.component) {
          console.log(`   📁 Component: ${route.component}`);
        }
        if (route.dynamic) {
          console.log(`   🔄 Dynamic: Yes`);
        }
        if (route.catchAll) {
          console.log(`   🌐 Catch-all: Yes`);
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

    console.log("✨ Demo completed successfully!");
    console.log(`💡 You can now explore the sample project at: ${projectDir}`);
  } catch (error) {
    console.error("💥 Demo failed:", error);
  }
}

// Run the demo if this file is executed directly
if (import.meta.main) {
  runDemo();
}

export { runDemo, createSampleProject };
