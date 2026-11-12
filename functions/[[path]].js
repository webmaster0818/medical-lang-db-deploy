// 生成ファイル：scripts/shard.py が毎回書き出す。手で直さない（振り分けの式が deploy 側とずれる）
const N = 2;
const HOST = (s) => `https://medilingo-s${s}.pages.dev`;
const T = (() => { const t = []; for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
function crc32(str) { const b = new TextEncoder().encode(str); let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  let p = decodeURIComponent(url.pathname);
  if (N <= 1 || p.startsWith("/_next/") || p.startsWith("/api/")) return ctx.next();
  const last = p.split("/").pop();
  const isFile = last.includes(".");
  const key = (p.endsWith("/") ? p + "index.html" : isFile ? p : p + "/index.html").slice(1);
  if (!key.endsWith(".html")) return ctx.next();
  const s = crc32(key) % N;
  if (s === 0) return ctx.next();
  if (!p.endsWith("/") && !isFile) return Response.redirect(url.origin + url.pathname + "/" + url.search, 308);
  const r = await fetch(HOST(s) + url.pathname + url.search, { headers: { accept: ctx.request.headers.get("accept") || "text/html" } });
  if (r.status === 404) return ctx.next();
  const h = new Headers(r.headers);
  h.delete("x-robots-tag");
  return new Response(r.body, { status: r.status, headers: h });
}
