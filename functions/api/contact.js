// MediLingo Japan 問い合わせフォームの受信（Cloudflare Pages Functions）
// 必要な環境変数：DISCORD_WEBHOOK_URL（Cloudflare Pages > Settings > Environment variables・Secret）
// 公開リポジトリのため、Webhook の URL はコードに書かない。
// 通知の書式（1行目の「問い合わせ」・「**メール:**」・「**お名前:**」）は gsc-api/unreplied-report.py の未返答チェックが読むので変えない。

const MEDIAXAI = "1477147915003760690";
const TOMOMI2 = "1490725600401428551";

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const type = str(data.type, 60);
  const facility = str(data.facility, 200);
  const name = str(data.name, 60);
  const email = str(data.email, 254);
  const message = str(data.message, 4000);
  // honeypot に入力がある＝bot。成功を装って捨てる
  if (str(data.website, 200)) return json({ ok: true }, 200);
  if (!type || !name || !email || message.length < 10) return json({ error: "missing fields" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid email" }, 400);
  if (!env.DISCORD_WEBHOOK_URL) return json({ error: "notification not configured" }, 503);

  const content = [
    `📨 **MediLingo Japan 問い合わせ** <@${MEDIAXAI}> <@${TOMOMI2}>`,
    `**種類:** ${type}`,
    `**医療機関・ページ:** ${facility || "（記入なし）"}`,
    `**お名前:** ${name}`,
    `**メール:** ${email}`,
    `**内容:**`,
    "```",
    message.replace(/```/g, "'''").slice(0, 1500),
    "```",
    `国: ${request.headers.get("cf-ipcountry") || "?"}`,
  ].join("\n");

  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { users: [MEDIAXAI, TOMOMI2] } }),
  });
  if (!res.ok) return json({ error: "notify failed" }, 502);
  return json({ ok: true }, 200);
}

function str(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
