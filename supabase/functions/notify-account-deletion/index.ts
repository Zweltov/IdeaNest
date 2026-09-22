// Supabase Edge Function: notify-account-deletion
// Вызывается с клиента после soft-delete.
// Шлёт админу письмо: кто запросил удаление + ссылка/инструкция для hard-delete.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — ключ Resend (https://resend.com)
//   ADMIN_EMAIL      — куда слать, напр. daniel.waltern@outlook.com
//   FROM_EMAIL       — verified sender, напр. IdeaNest <onboarding@resend.dev>
//   SITE_URL         — https://ideanest.ru
//   ADMIN_DELETE_SECRET — длинный случайный токен для ссылки подтверждения (опционально)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const profile_id = body.profile_id;
    const username = (body.username || "").toString();
    const email = (body.email || "").toString();
    const full_name = (body.full_name || "").toString();

    if (!profile_id && !email && !username) {
      return json({ error: "Нет данных аккаунта" }, 400);
    }

    // Записать факт запроса в БД (если колонки есть)
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (profile_id) {
      await sb.from("profiles").update({
        is_deleted: true,
        deletion_requested_at: new Date().toISOString(),
      }).eq("id", profile_id);
    }

    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "daniel.waltern@outlook.com";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "IdeaNest <onboarding@resend.dev>";
    const site = (Deno.env.get("SITE_URL") || "https://ideanest.ru").replace(/\/$/, "");
    const secret = Deno.env.get("ADMIN_DELETE_SECRET") || "";
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const when = new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
    const hardLink = secret
      ? `${site}/api/admin-delete?profile_id=${encodeURIComponent(profile_id || "")}&token=${encodeURIComponent(secret)}`
      : "";

    const text = [
      "Запрос на удаление аккаунта IdeaNest",
      "",
      `Время (МСК): ${when}`,
      `Profile ID: ${profile_id || "—"}`,
      `Никнейм: @${username || "—"}`,
      `Имя: ${full_name || "—"}`,
      `Email: ${email || "—"}`,
      "",
      "Пользователь уже soft-delete (is_deleted = true) и разлогинен.",
      "Чтобы удалить auth-пользователя полностью — в Supabase Dashboard → Authentication",
      "найди email и удали, либо вызови Edge Function delete-account с service role.",
      hardLink ? `\nСсылка hard-delete (если настроена): ${hardLink}` : "",
    ].filter(Boolean).join("\n");

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">
        <h2 style="margin:0 0 12px">Запрос на удаление аккаунта</h2>
        <p style="color:#555;margin:0 0 16px">${when} (МСК)</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 0;color:#666">Profile ID</td><td style="padding:6px 0"><code>${esc(profile_id)}</code></td></tr>
          <tr><td style="padding:6px 0;color:#666">Никнейм</td><td style="padding:6px 0"><strong>@${esc(username)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666">Имя</td><td style="padding:6px 0">${esc(full_name)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0">${esc(email)}</td></tr>
        </table>
        <p style="margin:20px 0 8px">Аккаунт уже <strong>деактивирован</strong> (soft-delete). Пользователь разлогинен.</p>
        <p style="margin:0 0 20px;color:#666;font-size:14px">
          Полное удаление из Auth: Dashboard → Authentication → Users, либо функция <code>delete-account</code>.
        </p>
        ${hardLink ? `<p><a href="${hardLink}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Удалить полностью (admin)</a></p>` : ""}
      </div>`;

    if (!resendKey) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, emailed: false, reason: "no_resend_key", preview: text });
    }

    const mailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `IdeaNest: удаление @${username || profile_id || "user"}`,
        text,
        html,
      }),
    });

    const mailJson = await mailRes.json().catch(() => ({}));
    if (!mailRes.ok) {
      console.error("Resend error", mailJson);
      return json({ ok: false, emailed: false, error: mailJson }, 502);
    }

    return json({ ok: true, emailed: true, id: mailJson.id });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function esc(s: unknown) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
