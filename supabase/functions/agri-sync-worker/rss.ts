/**
 * Dependency-free RSS 2.0 / Atom parser tuned for official government feeds
 * (PIB etc.). Handles CDATA, entities, namespaces and common enclosure formats.
 * No deno imports so it stays unit-testable.
 */
import { stripHtml, pickImageUrl } from "./lib.ts";
import type { NewsItem } from "./types.ts";

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ENTITY_MAP[entity] ?? m;
  });
}

function decodeCdata(xml: string): string {
  return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (m, inner: string) => {
    return inner.replace(/]]>\s*<!\[CDATA\[/g, "");
  });
}

/** Extract the content of every `name` element at the top-level of an <item>. */
function childValue(xml: string, name: string): string | null {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${name}(?:[^>]*)>([\\s\\S]*?)</(?:[a-zA-Z0-9_-]+:)?${name}>`, "i");
  const m = xml.match(re);
  return m ? decodeEntities(decodeCdata(m[1].trim())) : null;
}

function childText(xml: string, name: string): string | null {
  const v = childValue(xml, name);
  return v ? v.trim() || null : null;
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(decodeEntities(raw.trim()));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function imageFromItem(xml: string): string | null {
  const enclosure = xml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  const media = xml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  const contentImage = xml.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
  let inner: string | null = null;
  if (contentImage) {
    const src = contentImage[1].match(/<img[^>]+src=["']([^"']+)["']/i);
    inner = src ? src[1] : null;
  }
  return pickImageUrl([
    enclosure ? enclosure[1] : null,
    media ? media[1] : null,
    inner,
  ]);
}

/** Split a feed <channel> into its <item> blocks. */
function splitItems(xml: string): string[] {
  const items: string[] = [];
  let rest = xml;
  const re = /<item\b[\s\S]*?<\/item\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rest)) !== null) {
    items.push(m[0]);
  }
  return items;
}

/** Split an Atom feed into <entry> blocks. */
function splitEntries(xml: string): string[] {
  const entries: string[] = [];
  const re = /<entry\b[\s\S]*?<\/entry\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    entries.push(m[0]);
  }
  return entries;
}

export function isRss(xml: string): boolean {
  return /<rss\b/i.test(xml) || /<rdf:RDF\b|<feed\b/i.test(xml);
}

/**
 * Parse RSS 2.0, RDF/RSS 1.0 or Atom XML into normalized NewsItem[].
 * Item-level images are preferred; channel-level enclosure is a fallback.
 */
export function parseFeed(xml: string): NewsItem[] {
  const channel = xml.match(/<channel\b[\s\S]*?<\/channel\s*>/i)?.[0] || "";
  if (channel || /<rss\b/i.test(xml)) {
    const items = splitItems(xml);
    if (items.length === 0 && channel) return [];
    const channelImage = childValue(channel, "url");
    return items.map((item): NewsItem => {
      const title = stripHtml(childText(item, "title") || "");
      const description = childValue(item, "description");
      const content = childValue(item, "encoded") || childValue(item, "content:encoded") || null;
      const link = childText(item, "link");
      const guid = childText(item, "guid");
      const pubDate = parseDate(childText(item, "pubDate") || childText(item, "date"));
      const summary = stripHtml(description || "") || null;
      return {
        title,
        summary: summary || null,
        content: content ? stripHtml(content) : null,
        link: guid && /^https?:\/\//i.test(guid) && !link ? guid : link,
        guid,
        publishedAt: pubDate,
        imageUrl: imageFromItem(item) || (channelImage ? decodeEntities(channelImage.trim()) : null),
      };
    });
  }

  if (/<feed\b/i.test(xml)) {
    const channelImage = defaultAtomThumb(xml);
    return splitEntries(xml).map((entry): NewsItem => {
      const title = stripHtml(childText(entry, "title") || "");
      let summary = childValue(entry, "summary");
      const content = childValue(entry, "content") || null;
      if (!summary && content) summary = content;
      const links = [...entry.matchAll(/<link\b[^>]*\/?>/gi)].map((m) => m[0]);
      const link = links.map((l) => l.match(/href=["']([^"']+)["']/i)?.[1]).find(Boolean) || null;
      const pubDate = parseDate(childText(entry, "published") || childText(entry, "updated"));
      return {
        title,
        summary: summary ? stripHtml(summary) : null,
        content: content ? stripHtml(content) : null,
        link,
        guid: null,
        publishedAt: pubDate,
        imageUrl: imageFromItem(entry) || channelImage,
      };
    });
  }

  return [];
}

/** Atom default thumbnail for the whole feed (first media:thumbnail). */
function defaultAtomThumb(xml: string): string | null {
  const t = xml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  return t ? decodeEntities(t[1]) : null;
}