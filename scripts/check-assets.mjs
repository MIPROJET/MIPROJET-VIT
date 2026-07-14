#!/usr/bin/env node
/**
 * check-assets.mjs
 * Vérifie que toutes les images/logos référencés dans le projet répondent en 200
 * avant un déploiement Vercel.
 *
 * Usage:
 *   node scripts/check-assets.mjs                # utilise BASE_URL par défaut
 *   BASE_URL=https://miprojet.agricapital.ci node scripts/check-assets.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const BASE = process.env.BASE_URL || "https://kind-idea-hub.lovable.app";
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".avif"]);
const urls = new Set();

// 1. Lire tous les .asset.json
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (name.endsWith(".asset.json")) {
      try {
        const j = JSON.parse(readFileSync(p, "utf8"));
        if (j.url) urls.add(j.url);
      } catch {}
    }
  }
}
walk("src/assets");

// 2. Lister les fichiers de public/
for (const name of readdirSync("public")) {
  if (IMG_EXT.has(extname(name).toLowerCase())) urls.add("/" + name);
}

// 3. Vérifier chaque URL
const results = await Promise.all(
  [...urls].map(async (u) => {
    const full = u.startsWith("http") ? u : BASE + u;
    try {
      const r = await fetch(full, { method: "HEAD" });
      return { url: u, status: r.status, ok: r.ok };
    } catch (e) {
      return { url: u, status: 0, ok: false, error: e.message };
    }
  })
);

const broken = results.filter((r) => !r.ok);
console.log(`Checked ${results.length} assets against ${BASE}`);
if (broken.length) {
  console.error(`\n❌ ${broken.length} broken:`);
  broken.forEach((r) => console.error(`  [${r.status}] ${r.url}${r.error ? " — " + r.error : ""}`));
  process.exit(1);
}
console.log("✅ All assets reachable.");
