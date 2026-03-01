// src/components/SEO.jsx
import { Helmet } from "react-helmet-async";

export default function SEO({
  title,
  description,
  canonical,
  noindex = false,
  jsonLd,
  ogImage = "https://mindmines.eu/static/media/BlackLogo.5bca70d1f51039db05b5.webp",
}) {
  const robots = noindex ? "noindex,nofollow" : "index,follow";

  return (
    <Helmet>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}

      {/* Robots */}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />

      {/* canonical */}
      {canonical ? <link rel="canonical" href={canonical} /> : null}

      {/* OpenGraph */}
      <meta property="og:site_name" content="MindMines" />
      <meta property="og:type" content="website" />
      {canonical ? <meta property="og:url" content={canonical} /> : null}
      <meta property="og:title" content={title} />
      {description ? (
        <meta property="og:description" content={description} />
      ) : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}

      {/* Structured data */}
      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
