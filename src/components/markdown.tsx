import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* Minimal mdast types — enough for our two transforms. */
type MdNode = {
  type: string;
  value?: string;
  url?: string;
  depth?: number;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};

const CALLOUT_RE = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i;
const VIDEO_RE = /(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/\d+|\.mp4$|\.webm$)/i;

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function textOf(node: MdNode): string {
  if (node.value) return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/**
 * - `> [!TIP]` blockquotes → callouts
 * - a paragraph containing only a YouTube / Vimeo / mp4 link → video embed
 * - h2 / h3 get ids for the table of contents
 */
function remarkLab() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      for (const child of node.children ?? []) {
        if (child.type === "blockquote") {
          const first = child.children?.[0];
          const firstText = first?.type === "paragraph" ? first.children?.[0] : undefined;
          const m = firstText?.type === "text" ? firstText.value?.match(CALLOUT_RE) : null;
          if (m && firstText) {
            firstText.value = firstText.value!.replace(CALLOUT_RE, "");
            child.data = { hProperties: { dataCallout: m[1].toLowerCase() } };
          }
        }
        if (child.type === "paragraph" && child.children?.length === 1) {
          const only = child.children[0];
          if (only.type === "link" && only.url && VIDEO_RE.test(only.url)) {
            child.data = { hName: "figure", hProperties: { dataVideo: only.url } };
            child.children = [];
          }
        }
        if (child.type === "heading" && (child.depth === 2 || child.depth === 3)) {
          child.data = { hProperties: { id: slugify(textOf(child)) } };
        }
        walk(child);
      }
    };
    walk(tree);
  };
}

function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

const CALLOUTS = {
  note: { icon: Info, label: "Заметка", cls: "border-border-strong bg-muted", iconCls: "text-fg-2" },
  important: { icon: Info, label: "Важно", cls: "border-accent/25 bg-accent-soft", iconCls: "text-accent" },
  tip: { icon: Lightbulb, label: "Совет", cls: "border-success/25 bg-success-soft", iconCls: "text-success" },
  warning: { icon: TriangleAlert, label: "Внимание", cls: "border-warning/25 bg-warning-soft", iconCls: "text-warning" },
  caution: { icon: TriangleAlert, label: "Осторожно", cls: "border-danger/25 bg-danger-soft", iconCls: "text-danger" },
} as const;

const components: Components = {
  blockquote({ node, children, ...props }) {
    const kind = (node?.properties?.dataCallout as keyof typeof CALLOUTS | undefined) ?? null;
    if (!kind || !CALLOUTS[kind]) return <blockquote {...props}>{children}</blockquote>;
    const c = CALLOUTS[kind];
    const Icon = c.icon;
    return (
      <aside className={cn("not-prose flex gap-3 rounded-lg border px-4 py-3.5 text-[15px] leading-relaxed", c.cls)}>
        <Icon className={cn("mt-1 size-4 shrink-0", c.iconCls)} />
        <div className="min-w-0 [&>p+p]:mt-2">
          <span className={cn("mb-0.5 block text-xs font-semibold tracking-wide uppercase", c.iconCls)}>{c.label}</span>
          {children}
        </div>
      </aside>
    );
  },
  figure({ node, children, ...props }) {
    const video = node?.properties?.dataVideo as string | undefined;
    if (!video) return <figure {...props}>{children}</figure>;
    const embed = embedUrl(video);
    return (
      <figure className="overflow-hidden rounded-lg border border-border bg-muted">
        {embed ? (
          <iframe
            src={embed}
            className="aspect-video w-full"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            title="Видео"
          />
        ) : (
          <video src={video} controls className="aspect-video w-full" preload="metadata" />
        )}
      </figure>
    );
  },
  img({ src, alt }) {
    if (!src || typeof src !== "string") return null;
    return (
      <span className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} loading="lazy" />
        {alt && <span className="mt-2 block text-center text-sm text-fg-3">{alt}</span>}
      </span>
    );
  },
  a({ href, children }) {
    const external = href?.startsWith("http");
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    );
  },
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-lab", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkLab]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** h2 headings for the lecture's table of contents. */
export function extractToc(markdown: string) {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)].map((m) => {
    const text = m[1].replace(/[*_`]/g, "").trim();
    return { text, id: slugify(text) };
  });
}
