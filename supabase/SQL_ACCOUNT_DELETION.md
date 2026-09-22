# Удаление аккаунта + письмо админу

## 1. Колонки в `profiles` (SQL Editor)

```sql
alter table public.profiles
  add column if not exists is_deleted boolean default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deletion_requested_at timestamptz;
```

## 2. Secrets в Supabase

Dashboard → **Project Settings → Edge Functions → Secrets** (или CLI):

| Secret | Пример |
|--------|--------|
| `RESEND_API_KEY` | `re_...` с https://resend.com |
| `ADMIN_EMAIL` | `daniel.waltern@outlook.com` |
| `FROM_EMAIL` | `IdeaNest <onboarding@resend.dev>` (для теста) или свой домен |
| `SITE_URL` | `https://ideanest.ru` |
| `ADMIN_DELETE_SECRET` | длинная случайная строка (опционально) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` Edge подставляет сам.

## 3. Деплой функций

```bash
# один раз: npm i -g supabase && supabase login && supabase link --project-ref hhwndrynnozllrqtcdct
supabase functions deploy notify-account-deletion
supabase functions deploy delete-account
```

Или через Dashboard: Edge Functions → Deploy from CLI / upload.

## 4. Что делает сайт сейчас

1. Пользователь вводит ник в модалке.
2. Клиент вызывает `delete-account` (hard, если функция задеплоена).
3. Если hard не вышло → soft-delete (`is_deleted`) + вызов `notify-account-deletion`.
4. Письмо на `ADMIN_EMAIL`: ник, email, profile id, время.

## 5. Resend

1. Зарегистрируйся на resend.com  
2. API Keys → Create  
3. Для продакшена добавь домен ideanest.ru и DNS-записи  
4. Пока можно `from: IdeaNest <onboarding@resend.dev>` только на свой email  

## 6. RLS

Soft-delete с anon-ключа работает, только если у пользователя есть policy:

```sql
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = auth_id)
  with check (auth.uid() = auth_id);
```

(имена колонок `auth_id` / `id` подставь как у тебя в таблице.)
