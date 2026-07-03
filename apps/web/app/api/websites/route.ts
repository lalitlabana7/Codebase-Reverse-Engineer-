import { NextRequest, NextResponse } from "next/server";

interface WebsiteAnalysis {
  url: string;
  title: string | null;
  description: string | null;
  language: string | null;
  techStack: Array<{ name: string; category: string; confidence: number }>;
  securityHeaders: Record<string, string>;
  ssl: { valid: boolean; issuer: string | null; expiresAt: string | null };
  serverInfo: { server: string | null; poweredBy: string | null; contentType: string | null };
  stats: { scripts: number; stylesheets: number; images: number; links: number; totalSize: string; loadTime: string };
  socialLinks: string[];
  frameworkDetected: boolean;
}

const TECH_PATTERNS: Array<{ name: string; category: string; patterns: RegExp[] }> = [
  { name: "React", category: "framework", patterns: [/react\.js|react\.min\.js|__NEXT_DATA__|data-reactroot/i] },
  { name: "Next.js", category: "framework", patterns: [/__NEXT_DATA__|next\.js|_next\/static/i] },
  { name: "Vue.js", category: "framework", patterns: [/vue\.js|vue\.min\.js|data-v-/i] },
  { name: "Angular", category: "framework", patterns: [/angular\.js|ng-app|ng-version/i] },
  { name: "Svelte", category: "framework", patterns: [/svelte\.js|svelte\.min\.js/i] },
  { name: "jQuery", category: "library", patterns: [/jquery\.js|jquery\.min\.js/i] },
  { name: "Bootstrap", category: "css", patterns: [/bootstrap\.css|bootstrap\.min\.css/i] },
  { name: "Tailwind CSS", category: "css", patterns: [/tailwindcss|tailwind\.css/i] },
  { name: "GSAP", category: "animation", patterns: [/gsap\.js|TweenMax|TimelineMax/i] },
  { name: "Three.js", category: "3d", patterns: [/three\.js|three\.min\.js/i] },
  { name: "D3.js", category: "visualization", patterns: [/d3\.js|d3\.min\.js/i] },
  { name: "Chart.js", category: "visualization", patterns: [/chart\.js|chart\.min\.js/i] },
  { name: "Google Analytics", category: "analytics", patterns: [/gtag|google-analytics|ga\.js/i] },
  { name: "Cloudflare", category: "cdn", patterns: [/cloudflare|cf-ray/i] },
  { name: "WordPress", category: "cms", patterns: [/wp-content|wp-includes|wordpress/i] },
  { name: "Shopify", category: "ecommerce", patterns: [/shopify|myshopify\.com/i] },
  { name: "Vercel", category: "hosting", patterns: [/vercel/i] },
  { name: "Netlify", category: "hosting", patterns: [/netlify/i] },
  { name: "Express", category: "framework", patterns: [/express/i] },
  { name: "Django", category: "framework", patterns: [/django|csrftoken/i] },
  { name: "Ruby on Rails", category: "framework", patterns: [/rails|ruby-on-rails/i] },
  { name: "Laravel", category: "framework", patterns: [/laravel|livewire/i] },
];

const SECURITY_HEADERS = [
  "Strict-Transport-Security",
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "X-XSS-Protection",
  "Referrer-Policy",
  "Permissions-Policy",
  "Access-Control-Allow-Origin",
  "Cross-Origin-Embedder-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
];

const SOCIAL_DOMAINS = [
  "github.com", "twitter.com", "x.com", "linkedin.com", "facebook.com",
  "instagram.com", "youtube.com", "tiktok.com", "discord.com", "slack.com",
  "reddit.com", "medium.com", "dev.to", "hashnode.com", "stackoverflow.com",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const startTime = Date.now();

    // Fetch the website
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ACRE-Analyzer/1.0 (Security Analysis)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();
    const loadTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
    const totalSize = formatSize(response.headers.get("content-length") ?? Buffer.byteLength(html, "utf-8").toString());

    // Parse page metadata
    const title = extractMetaContent(html, "og:title") ?? extractTitle(html);
    const description = extractMetaContent(html, "og:description") ?? extractMetaContent(html, "description");
    const lang = extractLanguage(html);

    // Detect technologies
    const techStack = detectTechnologies(html, response.headers);

    // Extract security headers
    const securityHeaders: Record<string, string> = {};
    for (const header of SECURITY_HEADERS) {
      const value = response.headers.get(header);
      if (value) {
        securityHeaders[header] = value;
      }
    }

    // Extract server info
    const serverInfo = {
      server: response.headers.get("server"),
      poweredBy: response.headers.get("x-powered-by") ?? response.headers.get("powered-by"),
      contentType: response.headers.get("content-type"),
    };

    // Check SSL
    const ssl = {
      valid: response.url.startsWith("https://"),
      issuer: null as string | null,
      expiresAt: null as string | null,
    };

    // Page stats
    const scripts = (html.match(/<script[\s>]/gi) ?? []).length;
    const stylesheets = (html.match(/<link[^>]*rel=["']stylesheet["']/gi) ?? []).length;
    const images = (html.match(/<img[\s>]/gi) ?? []).length;
    const links = (html.match(/<a[\s>]/gi) ?? []).length;

    // Extract social links
    const socialLinks = extractSocialLinks(html, url);

    const analysis: WebsiteAnalysis = {
      url,
      title,
      description,
      language: lang,
      techStack,
      securityHeaders,
      ssl,
      serverInfo,
      stats: {
        scripts,
        stylesheets,
        images,
        links,
        totalSize,
        loadTime,
      },
      socialLinks,
      frameworkDetected: techStack.some((t) => t.category === "framework"),
    };

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("Website analysis error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze website. Make sure the URL is accessible." },
      { status: 500 }
    );
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // og:title -> property="og:title"
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const match = html.match(regex);
  if (match) return decodeHtmlEntities(match[1]!);

  // Also try reversed attribute order
  const regex2 = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(property)}["']`,
    "i"
  );
  const match2 = html.match(regex2);
  return match2 ? decodeHtmlEntities(match2[1]!) : null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1]!.trim()) : null;
}

function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  return match ? match[1]! : null;
}

function detectTechnologies(html: string, headers: Headers): Array<{ name: string; category: string; confidence: number }> {
  const techs: Array<{ name: string; category: string; confidence: number }> = [];
  const combinedCheck = html + "\n" + [...headers.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");

  for (const tech of TECH_PATTERNS) {
    let matches = 0;
    for (const pattern of tech.patterns) {
      if (pattern.test(combinedCheck)) {
        matches++;
      }
    }
    if (matches > 0) {
      techs.push({
        name: tech.name,
        category: tech.category,
        confidence: Math.min(1, matches / tech.patterns.length + 0.1),
      });
    }
  }

  return techs;
}

function extractSocialLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const anchorRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    try {
      const href = match[1]!;
      let fullUrl: string;

      if (href.startsWith("http://") || href.startsWith("https://")) {
        fullUrl = href;
      } else if (href.startsWith("//")) {
        fullUrl = `https:${href}`;
      } else if (href.startsWith("/")) {
        fullUrl = new URL(href, baseUrl).href;
      } else {
        continue;
      }

      const hostname = new URL(fullUrl).hostname.replace(/^www\./, "").toLowerCase();
      if (SOCIAL_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        links.push(fullUrl);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return [...new Set(links)];
}

function formatSize(bytes: string | number): string {
  const num = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(num)) return "Unknown";
  if (num < 1024) return `${num}B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)}KB`;
  return `${(num / (1024 * 1024)).toFixed(1)}MB`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
