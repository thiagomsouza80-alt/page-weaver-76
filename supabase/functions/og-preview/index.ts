import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const siteUrl = "https://page-weaver-76.lovable.app";
const defaultImage = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a8aae7c1-a507-4192-8129-e1155a52b7d7/id-preview-0947290a--a8ba4cbc-267b-43f1-9456-25138bf85080.lovable.app-1774117748381.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const responseHeaders = {
  ...corsHeaders,
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Vary: "User-Agent, Accept, Sec-Fetch-Mode, Sec-Fetch-Dest, Upgrade-Insecure-Requests",
  "X-Robots-Tag": "noindex, nofollow",
};

interface OGData {
  title: string;
  description: string;
  image: string;
  url: string;
}

const normalizeMetaText = (value: string) => value.replace(/\s+/g, " ").trim();

const sanitizeOGData = (data: OGData): OGData => ({
  ...data,
  title: normalizeMetaText(data.title),
  description: normalizeMetaText(data.description),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shouldRedirectToApp(req: Request): boolean {
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();
  const accept = (req.headers.get("accept") || "").toLowerCase();
  const secFetchMode = (req.headers.get("sec-fetch-mode") || "").toLowerCase();
  const secFetchDest = (req.headers.get("sec-fetch-dest") || "").toLowerCase();
  const upgradeInsecureRequests = req.headers.get("upgrade-insecure-requests") === "1";

  const isMozillaLike = userAgent.includes("mozilla/");
  const isWhatsApp = userAgent.includes("whatsapp");
  const hasNavigationHints = secFetchMode === "navigate" || secFetchDest === "document" || upgradeInsecureRequests;
  const isKnownCrawler = /(facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|telegrambot|pinterest|googlebot|bingbot|duckduckbot|applebot|crawler|spider|curl|wget|preview|fetch)/i.test(userAgent);

  if (isWhatsApp) {
    return isMozillaLike || hasNavigationHints;
  }

  if (isKnownCrawler) {
    return false;
  }

  if (hasNavigationHints) {
    return true;
  }

  return isMozillaLike && accept.includes("text/html");
}

async function getOGData(path: string): Promise<OGData> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const segments = path.replace(/^\//, "").split("/");
  const defaults = sanitizeOGData({
    title: "Amazônia Pop - HUB de Cultura Pop da Amazônia",
    description: "O principal HUB digital de cultura pop da Amazônia. Conheça artistas, cosplayers, ilustradores e empreendedores geek da região Norte.",
    image: defaultImage,
    url: `${siteUrl}${path}`,
  });

  if (segments.length < 2) return defaults;

  const [section, slug] = segments;

  try {
    if (section === "artistas") {
      const { data } = await supabase
        .from("artists")
        .select("name, bio, profile_image_url")
        .eq("approved", true);

      const match = data?.find((artist: any) => {
        const normalizedSlug = artist.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        return normalizedSlug === slug;
      });

      if (match) {
        return sanitizeOGData({
          title: `${match.name} - Amazônia Pop`,
          description: match.bio || `Conheça ${match.name} no Amazônia Pop`,
          image: match.profile_image_url || defaultImage,
          url: `${siteUrl}${path}`,
        });
      }
    }

    if (section === "noticias") {
      const { data } = await supabase
        .from("news")
        .select("title, summary, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (data) {
        return sanitizeOGData({
          title: `${data.title} - Amazônia Pop`,
          description: data.summary,
          image: data.image_url || defaultImage,
          url: `${siteUrl}${path}`,
        });
      }
    }

    if (section === "eventos") {
      const { data } = await supabase
        .from("events")
        .select("title, description, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (data) {
        return sanitizeOGData({
          title: `${data.title} - Amazônia Pop`,
          description: data.description,
          image: data.image_url || defaultImage,
          url: `${siteUrl}${path}`,
        });
      }
    }

    if (section === "empreendedores") {
      const { data } = await supabase
        .from("entrepreneurs")
        .select("name, description, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (data) {
        return sanitizeOGData({
          title: `${data.name} - Amazônia Pop`,
          description: data.description,
          image: data.image_url || defaultImage,
          url: `${siteUrl}${path}`,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching OG data:", error);
  }

  return defaults;
}

function renderHTML(og: OGData): string {
  const title = escapeHtml(og.title);
  const description = escapeHtml(og.description);
  const image = escapeHtml(og.image);
  const url = escapeHtml(og.url);
  const redirectUrl = JSON.stringify(og.url);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="Amazônia Pop" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p>Redirecionando para <a href="${url}">${title}</a>...</p>
  <script>window.location.replace("${redirectUrl}");</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: responseHeaders });
  }

  const requestUrl = new URL(req.url);
  const path = requestUrl.searchParams.get("path") || "/";
  const targetUrl = `${siteUrl}${path}`;
  const redirectToApp = shouldRedirectToApp(req);

  console.log(
    JSON.stringify({
      path,
      redirectToApp,
      userAgent: req.headers.get("user-agent"),
      accept: req.headers.get("accept"),
      secFetchMode: req.headers.get("sec-fetch-mode"),
      secFetchDest: req.headers.get("sec-fetch-dest"),
    }),
  );

  if (redirectToApp) {
    return new Response(null, {
      status: 302,
      headers: {
        ...responseHeaders,
        Location: targetUrl,
      },
    });
  }

  const og = await getOGData(path);

  return new Response(renderHTML(og), {
    status: 200,
    headers: {
      ...responseHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});
