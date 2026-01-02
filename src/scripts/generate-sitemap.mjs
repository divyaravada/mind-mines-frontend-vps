// scripts/generate-sitemap.mjs
import fs from "fs";
import path from "path";

const SITE = "https://mindmines.eu";

// ✅ change this to your real list endpoint
// examples: "https://mindmines.eu/api/products/" or "/api/products/"
const API = "https://mindmines.eu/api/products/";

const OUT = path.join(process.cwd(), "public", "sitemap.xml");

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.json();
}

function urlXml(loc, { changefreq, priority, lastmod } = {}) {
  return `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ""}
    ${priority ? `<priority>${priority}</priority>` : ""}
  </url>`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [];

  // Static pages
  urls.push(
    urlXml(`${SITE}/`, { changefreq: "daily", priority: "1.0", lastmod: today })
  );
  urls.push(
    urlXml(`${SITE}/decorative-products`, {
      changefreq: "weekly",
      priority: "0.9",
      lastmod: today,
    })
  );
  urls.push(
    urlXml(`${SITE}/natural-stone`, {
      changefreq: "weekly",
      priority: "0.9",
      lastmod: today,
    })
  );
  urls.push(
    urlXml(`${SITE}/about`, {
      changefreq: "monthly",
      priority: "0.6",
      lastmod: today,
    })
  );

  // Products (paginate)
  let nextUrl = `${API}?page=1&page_size=100`;
  const seen = new Set();

  while (nextUrl) {
    const data = await fetchJson(nextUrl);

    const items = Array.isArray(data) ? data : data.results || data.items || [];
    for (const p of items) {
      if (!p?.id) continue;

      // ✅ choose title for slug
      const title = p.title_en || p.title_de || p.name || `product-${p.id}`;
      const slug = slugify(title);

      // ✅ NEW SEO URL: /products/:slug-:id
      const loc = `${SITE}/products/${slug}-${p.id}`;

      if (seen.has(loc)) continue;
      seen.add(loc);

      urls.push(
        urlXml(loc, { changefreq: "weekly", priority: "0.7", lastmod: today })
      );
    }

    // DRF pagination usually gives "next"
    nextUrl = data?.next || null;
    if (nextUrl && nextUrl.startsWith("/")) nextUrl = `${SITE}${nextUrl}`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  fs.writeFileSync(OUT, xml, "utf8");
  console.log(`✅ sitemap written: ${OUT} (${urls.length} urls)`);
}

main().catch((e) => {
  console.error("❌ sitemap generation failed:", e);
  process.exit(1);
});
