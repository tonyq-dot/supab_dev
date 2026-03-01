# Tech Context

Технический контекст: стек, зависимости, окружение.

---

## Стек

| Слой | Технология |
|------|------------|
| Frontend | React 18, Vite 5, TypeScript 5.6 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Storage | Supabase Storage, S3 (AWS SDK), Local |

## Ключевые зависимости

- `@supabase/supabase-js` — клиент Supabase
- `react-router-dom` — роутинг
- `xlsx` — экспорт в Excel
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` — S3 (опционально)

## Переменные окружения

- `VITE_SUPABASE_URL` — URL проекта Supabase
- `VITE_SUPABASE_ANON_KEY` — anon key
- `VITE_STORAGE_BACKEND` — local | supabase | s3 (опционально)
- `VITE_S3_BUCKET`, `VITE_S3_REGION`, `VITE_S3_ENDPOINT` — для S3 (опционально)

## Supabase CLI

- `supabase link` может падать с `orioledb` на некоторых проектах
- Обход: выполнять `migrations_manual.sql` в SQL Editor

## Сборка

- `npm run dev` — dev-сервер
- `npm run build` — `vite build` (без `tsc -b` из-за Supabase types)
- `npm run db:concat-migrations` — объединить миграции в один файл
