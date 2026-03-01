// src/scripts/generate-sitemap.mjs
import fs from "fs";
import path from "path";

const SITE = "https://mindmines.eu";
const API = "https://mindmines.eu/api/products/list/"; // ✅ FIXED
const OUT = path.join(process.cwd(), "build", "sitemap.xml");

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
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      // some servers behave better with user-agent
      "User-Agent": "MindMinesSitemapBot/1.0",
    },
  });

  const text = await res.text(); // ✅ read body even on error
  if (!res.ok) {
    throw new Error(
      `Fetch failed ${res.status} for ${url}\n${text.slice(0, 500)}`,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response for ${url}\n${text.slice(0, 500)}`);
  }
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
    urlXml(`${SITE}/`, {
      changefreq: "daily",
      priority: "1.0",
      lastmod: today,
    }),
  );
  urls.push(
    urlXml(`${SITE}/decorative-products`, {
      changefreq: "weekly",
      priority: "0.9",
      lastmod: today,
    }),
  );
  urls.push(
    urlXml(`${SITE}/natural-stone`, {
      changefreq: "weekly",
      priority: "0.9",
      lastmod: today,
    }),
  );
  urls.push(
    urlXml(`${SITE}/about`, {
      changefreq: "monthly",
      priority: "0.6",
      lastmod: today,
    }),
  );

  // Products (paginate)
  try {
    let nextUrl = `${API}?page=1&page_size=100`;
    const seen = new Set();

    while (nextUrl) {
      const data = await fetchJson(nextUrl);

      const items = Array.isArray(data)
        ? data
        : data.results || data.items || [];
      for (const p of items) {
        if (!p?.id) continue;

        const title = p.title_en || p.title_de || p.name || `product-${p.id}`;
        const slug = slugify(title);
        const loc = `${SITE}/products/${p.id}/${slug}`;

        if (seen.has(loc)) continue;
        seen.add(loc);

        urls.push(
          urlXml(loc, {
            changefreq: "weekly",
            priority: "0.7",
            lastmod: today,
          }),
        );
      }

      nextUrl = data?.next || null;
      if (nextUrl && nextUrl.startsWith("/")) nextUrl = `${SITE}${nextUrl}`;
    }
  } catch (e) {
    console.error(
      "⚠️ Products API failed, generating sitemap without product URLs.",
    );
    console.error(String(e).slice(0, 500));
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
