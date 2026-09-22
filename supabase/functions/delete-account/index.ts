// Supabase Edge Function: delete-account
// Полное удаление: profile soft/hard + auth.admin.deleteUser
// Вызов только с service role / после проверки никнейма с клиента (JWT пользователя).
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (есть по умолчанию в Edge)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Не авторизован" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const confirm = (body.confirm_username || "").toString().trim().toLowerCase().replace(/^@/, "");
    const profileId = body.profile_id;

    const { data: profile } = await admin
      .from("profiles")
      .select("id, username, auth_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!profile) return json({ error: "Профиль не найден" }, 404);
    if (profileId && String(profile.id) !== String(profileId)) {
      return json({ error: "profile_id не совпадает" }, 403);
    }

    const uname = (profile.username || "").toLowerCase();
    if (!confirm || confirm !== uname) {
      return json({ error: "Никнейм не совпадает" }, 400);
    }

    // Мягкая пометка + чистка чувствительных полей
    await admin.from("profiles").update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      username: `deleted_${profile.id}`,
      avatar_url: null,
    }).eq("id", profile.id);

    // Удалить auth-пользователя
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("deleteUser", delErr);
      return json({ error: delErr.message, partial: true }, 500);
    }

    return json({ ok: true, deleted: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
