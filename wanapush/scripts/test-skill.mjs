import { spawn } from "node:child_process";
import path from "node:path";

const SKILL = path.join(process.cwd(), "skills/ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py");

function search(query, domain) {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [SKILL, query, "--domain", domain, "-n", "1"], { timeout: 10000 });
    let out = "", err = "";
    proc.stdout.on("data", (d) => out += d);
    proc.stderr.on("data", (d) => err += d);
    proc.on("close", (code) => code === 0 ? resolve(out) : reject(err));
  });
}

console.log("--- Test : plombier urgence ---\n");
const product = await search("plumbing emergency local service", "product");
console.log(product.slice(0, 600));
console.log("\n--- Test : color palette ---\n");
const color = await search("plumbing emergency", "color");
console.log(color.slice(0, 600));
