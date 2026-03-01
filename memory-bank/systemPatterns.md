# System Patterns

Архитектурные паттерны и соглашения проекта.

---

## Frontend

- **React + Vite + TypeScript**
- **Роутинг:** React Router v6
- **Стили:** CSS modules / глобальный index.css
- **Auth:** Supabase Auth, `useAuth` hook
- **Роли:** `useUserRole`, проверка `isManager`

## Структура src

```
src/
├── pages/          # Страницы (Dashboard, AddWork, Gallery, MyWorks, Admin, Reports)
├── components/     # UI компоненты (Layout, gallery/*)
├── hooks/          # useAuth, useProjects, useGalleryPoints, useUserRole
├── lib/            # supabase, database.types, storage/*
├── utils/          # bonus, scoreBreakdown
└── services/       # imageEffectsService, watermarkService
```

## Storage

- **Абстракция:** `IStorageProvider`, `getStorageProvider()`, `buildStoragePath()`
- **Провайдеры:** SupabaseStorageProvider, LocalStorageProvider, S3StorageProvider
- **Путь:** `{authorId}/{projectId}/{publicationId}/v{version}/{filename}`

## База данных

- **Supabase:** PostgreSQL, Auth, Storage
- **RLS:** по умолчанию включён для всех таблиц
- **Миграции:** `supabase/migrations/` или `migrations_formatted/` или `migrations_manual.sql`

## API

- **Edge Functions:** `gallery-ingest` (POST), `gallery-update` (PATCH)
- **Auth:** заголовок `X-API-Key`
