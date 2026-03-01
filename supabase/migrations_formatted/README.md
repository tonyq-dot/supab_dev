# Reformatted Migrations

Переформатированные миграции базы данных для KPI System. Структура упорядочена, с единообразным форматированием и комментариями.

## Структура

| # | Файл | Описание |
|---|------|----------|
| 001 | `001_schema.sql` | Ядро: project_types, work_types, projects, work_logs, period_configs, user_roles |
| 002 | `002_views_detailed_scores.sql` | View detailed_scores (расчёт баллов) |
| 003 | `003_rls_policies.sql` | RLS для основных таблиц |
| 004 | `004_storage_work_previews.sql` | Бакет work-previews |
| 005 | `005_user_scores_aggregate.sql` | Функция get_user_points, view user_scores_summary |
| 006 | `006_trigger_new_user.sql` | Триггер: новый пользователь → animator |
| 007 | `007_animator_projects.sql` | Политика: аниматоры могут создавать проекты |
| 008 | `008_user_profiles.sql` | Таблица user_profiles |
| 009 | `009_gallery_media.sql` | tags, media_items, media_tags, video_comments |
| 010 | `010_gallery_storage_bucket.sql` | Бакет gallery-media |
| 011 | `011_gallery_points_config.sql` | gallery_work_categories, gallery_points_config + seed |
| 012 | `012_storage_config.sql` | Таблица storage_config |
| 013 | `013_publications_versioning.sql` | publications, publication_versions, миграция media_items |
| 014 | `014_api_keys.sql` | Таблица api_keys |
| 015 | `015_publication_latest_view.sql` | View publication_latest |
| 016 | `016_seed.sql` | Seed: project_types, drone_ranges, work_types, rework_coefs, period_configs |

## Как запускать

### Вариант 1: Supabase CLI (если link работает)

```bash
# Скопировать в migrations и запустить
# Или использовать supabase db push
```

### Вариант 2: Supabase SQL Editor (ручной запуск)

Выполнять файлы **по порядку** (001 → 016) в Dashboard → SQL Editor → New query.

### Вариант 3: Один объединённый файл

```bash
npm run db:concat-migrations
```

Создаётся `run_all_combined.sql` — все миграции в одном файле. Выполнить в Supabase SQL Editor.

## Связь с migrations/

- `migrations/` — оригинальные миграции Supabase CLI (20240213…, 20240214…, 20240215…)
- `migrations_formatted/` — переформатированная версия для удобства чтения и ручного запуска
- `migrations_manual.sql` — монолитный скрипт для случаев, когда CLI не работает (orioledb и т.п.)

## Важно

- **Не запускать** `migrations_formatted/` и `migrations/` на одной БД — выберите один источник.
- 013 обрабатывает два сценария: миграция из media_items (Path A) и чистая установка (Path B).
- 011 и 016 используют ON CONFLICT / IF NOT EXISTS для идемпотентности.
