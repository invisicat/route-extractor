import { describe, test, expect, beforeAll } from "bun:test";
import { extractSiteRoutes } from "./index";
import fs from "fs-extra";
import path from "path";

describe("Route Extractor", () => {
  const testDir = "./test-project";

  beforeAll(async () => {
    // Create a test project structure
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, "pages"));
    await fs.ensureDir(path.join(testDir, "app"));

    // Create package.json for Next.js
    await fs.writeJson(path.join(testDir, "package.json"), {
      name: "test-nextjs-app",
      dependencies: { next: "14.0.0" },
    });

    // Create Next.js pages
    await fs.writeFile(
      path.join(testDir, "pages", "index.tsx"),
      "export default function Home() { return <div>Home</div>; }"
    );
    await fs.writeFile(
      path.join(testDir, "pages", "users", "[id].tsx"),
      "export default function User() { return <div>User</div>; }"
    );
    await fs.writeFile(
      path.join(testDir, "pages", "blog", "[...slug].tsx"),
      "export default function Blog() { return <div>Blog</div>; }"
    );

    // Create Next.js app router files
    await fs.writeFile(
      path.join(testDir, "app", "page.tsx"),
      "export default function Home() { return <div>Home</div>; }"
    );
    await fs.writeFile(
      path.join(testDir, "app", "dashboard", "page.tsx"),
      "export default function Dashboard() { return <div>Dashboard</div>; }"
    );
    await fs.writeFile(
      path.join(testDir, "app", "users", "[id]", "page.tsx"),
      "export default function User() { return <div>User</div>; }"
    );
  });

  test("should detect Next.js framework", async () => {
    const result = await extractSiteRoutes(testDir);
    expect(result.framework.name).toBe("nextjs");
    expect(result.framework.version).toBe("14.0.0");
    expect(result.errors).toHaveLength(0);
  });

  test("should extract Next.js pages routes", async () => {
    const result = await extractSiteRoutes(testDir);
    const pagesRoutes = result.routes.filter(
      (route) => route.component && route.component.includes("pages")
    );

    expect(pagesRoutes.length).toBeGreaterThan(0);
    expect(pagesRoutes.some((route) => route.path === "/")).toBe(true);
    expect(pagesRoutes.some((route) => route.path === "/users/:id")).toBe(true);
    expect(pagesRoutes.some((route) => route.path === "/blog/*")).toBe(true);
  });

  test("should extract Next.js app routes", async () => {
    const result = await extractSiteRoutes(testDir);
    const appRoutes = result.routes.filter(
      (route) => route.component && route.component.includes("app")
    );

    expect(appRoutes.length).toBeGreaterThan(0);
    expect(appRoutes.some((route) => route.path === "/")).toBe(true);
    expect(appRoutes.some((route) => route.path === "/dashboard")).toBe(true);
    expect(appRoutes.some((route) => route.path === "/users/:id")).toBe(true);
  });

  test("should handle non-existent path", async () => {
    const result = await extractSiteRoutes("./non-existent-path");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("does not exist");
  });

  test("should detect dynamic routes", async () => {
    const result = await extractSiteRoutes(testDir);
    const dynamicRoutes = result.routes.filter((route) => route.dynamic);
    expect(dynamicRoutes.length).toBeGreaterThan(0);
  });

  test("should detect catch-all routes", async () => {
    const result = await extractSiteRoutes(testDir);
    const catchAllRoutes = result.routes.filter((route) => route.catchAll);
    expect(catchAllRoutes.length).toBeGreaterThan(0);
  });
});
