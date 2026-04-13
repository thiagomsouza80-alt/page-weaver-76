import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const siteUrl = "https://page-weaver-76.lovable.app";
const defaultImage = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a8aae7c1-a507-4192-8129-e1155a52b7d7/id-preview-0947290a--a8ba4cbc-267b-43f1-9456-25138bf85080.lovable.app-1774117748381.png";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface OGData {
  title: string;
  description: string;
  image: string;
  url: string;
}

async function getOGData(path: string): Promise<OGData> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const segments = path.replace(/^\//, "").split("/");
  const defaults: OGData = {
    title: "Amazônia Pop - HUB de Cultura Pop da Amazônia",
    description: "O principal HUB digital de cultura pop da Amazônia. Conheça artistas, cosplayers, ilustradores e empreendedores geek da região Norte.",
    image: defaultImage,
    url: `${siteUrl}${path}`,
  };

  if (segments.length < 2) return defaults;

  const [section, slug] = segments;

  try {
    if (section === "artistas") {
      const { data } = await supabase
        .from("artists")
        .select("name, bio, profile_image_url, segment")
        .eq("approved", true)
        .then((res: any) => {
          // Match by slug-like name
          if (res.data) {
            const match = res.data.find((a: any) => {
              const s = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              return s === slug;
            });
            return { data: match || null };
          }
          return { data: null };
        });
      if (data) {
        return {
          title: `${data.name} - Amazônia Pop`,
          description: data.bio || `Conheça ${data.name} no Amazônia Pop`,
          image: data.profile_image_url || defaultImage,
          url: `${siteUrl}${path}`,
        };
      }
    } else if (section === "noticias") {
      const { data } = await supabase
        .from("news")
        .select("title, summary, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (data) {
        return {
          title: `${data.title} - Amazônia Pop`,
          description: data.summary,
          image: data.image_url || defaultImage,
          url: `${siteUrl}${path}`,
        };
      }
    } else if (section === "eventos") {
      const { data } = await supabase
        .from("events")
        .select("title, description, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (data) {
        return {
          title: `${data.title} - Amazônia Pop`,
          description: data.description,
          image: data.image_url || defaultImage,
          url: `${siteUrl}${path}`,
        };
      }
    } else if (section === "empreendedores") {
      const { data } = await supabase
        .from("entrepreneurs")
        .select("name, description, image_url")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (data) {
        return {
          title: `${data.name} - Amazônia Pop`,
          description: data.description,
          image: data.image_url || defaultImage,
          url: `${siteUrl}${path}`,
        };
      }
    }
  } catch (e) {
    console.error("Error fetching OG data:", e);
  }

  return defaults;
}

function renderHTML(og: OGData): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(og.title)}</title>
  <meta name="description" content="${esc(og.description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(og.title)}" />
  <meta property="og:description" content="${esc(og.description)}" />
  <meta property="og:image" content="${esc(og.image)}" />
  <meta property="og:url" content="${esc(og.url)}" />
  <meta property="og:site_name" content="Amazônia Pop" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(og.title)}" />
  <meta name="twitter:description" content="${esc(og.description)}" />
  <meta name="twitter:image" content="${esc(og.image)}" />
  <meta http-equiv="refresh" content="0;url=${esc(og.url)}" />
</head>
<body>
  <p>Redirecionando para <a href="${esc(og.url)}">${esc(og.title)}</a>...</p>
  <script>window.location.replace("${og.url.replace(/"/g, '\\"')}");</script>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  const og = await getOGData(path);

  return new Response(renderHTML(og), {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
