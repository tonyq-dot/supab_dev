# KPI System — Студия анимации

Система учёта работ и расчёта KPI/бонусов для студии анимации.

## Стек

- **Frontend:** React + Vite + TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Storage)

## Настройка

1. Создайте проект в [Supabase](https://supabase.com)
2. Скопируйте `.env.example` в `.env` и заполните:
   - `VITE_SUPABASE_URL` — URL проекта
   - `VITE_SUPABASE_ANON_KEY` — anon key
3. В Supabase Dashboard → SQL Editor выполните миграции по порядку:
   - `supabase/migrations/20240213000001_create_schema.sql`
   - `supabase/migrations/20240213000002_create_detailed_scores_view.sql`
   - `supabase/migrations/20240213000003_create_rls_policies.sql`
   - `supabase/migrations/20240213000004_storage_bucket.sql`
   - `supabase/migrations/20240213000005_user_scores_aggregate.sql`
   - `supabase/migrations/20240213000006_trigger_new_user_role.sql`
   - `supabase/migrations/20240214000001_user_profiles.sql`
   - `supabase/migrations/20240214000002_gallery_media.sql`
   - `supabase/migrations/20240214000003_gallery_storage.sql`
4. Выполните seed: `supabase/seed.sql`
5. В Supabase: Authentication → Providers → Email включите Email и при необходимости отключите "Confirm email"
6. Установите зависимости и запустите:
   ```bash
   npm install
   npm run dev
   ```

## Роли

- **animator** — вносит работы, видит свои баллы и прогноз премии (роль по умолчанию для новых пользователей)
- **manager** — управляет проектами, настройками, просматривает и редактирует все работы, экспортирует отчёты

Чтобы назначить менеджера:

```sql
UPDATE user_roles SET role = 'manager' WHERE user_id = 'user-uuid';
-- или для нового пользователя:
INSERT INTO user_roles (user_id, role) VALUES ('user-uuid', 'manager');
```

## Структура

- `supabase/migrations/` — SQL миграции
- `supabase/seed.sql` — начальные справочники
- `src/pages/` — страницы приложения (Dashboard, AddWork, MyWorks, Projects, Admin, Reports)
- `src/hooks/` — хуки для данных
