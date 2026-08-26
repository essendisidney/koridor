const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..", "..", "..");
const web = path.join(root, "apps", "web");

function load(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

load(".env");
load(path.join("apps", "api", ".env"));
load(path.join("apps", "web", ".env.local"));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", "db", "push"], {
  cwd: web,
  env: process.env,
  encoding: "utf8",
  shell: true,
});
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
process.exit(r.status || 0);
