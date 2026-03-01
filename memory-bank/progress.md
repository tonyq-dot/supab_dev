# Progress

История прогресса и ключевых вех проекта.

---

## Реализовано

### KPI / учёт работ
- Схема: project_types, work_types, projects, work_logs, period_configs
- View detailed_scores (расчёт баллов)
- RLS: animator (свои данные), manager (все)
- Страницы: Dashboard, AddWork, MyWorks, Projects, Admin, Reports
- Экспорт: CSV, Excel

### Галерея
- Таблицы: publications, publication_versions, publication_version_history
- View publication_latest
- gallery_work_categories, gallery_points_config (баллы по типам работ)
- Storage: Supabase, Local, S3 (абстракция)
- Версионирование: добавление новых версий

### API
- Edge Functions: gallery-ingest, gallery-update
- API keys для внешнего доступа

### Управление проектами (2025-02)
- **Клиенты** (`clients`) — справочник, выбор при создании проекта
- **Продавали** (`sellers`, `project_sellers`) — несколько продавцов на проект
- **Статусы**: ПРЕВЬЮ, ПРЕПРОДАКШН, СБОРКА, ФИНИШНАЯ ПРЯМАЯ, ШОУ, СТОП, ЖДЕМ ОТВЕТА
- **Дедлайны**: глобальный, подача (следующий)
- **Вехи** (`project_milestones`) — при смене даты подачи, с комментариями
- **Все комментарии** — отдельная вкладка со всеми комментариями по подачам
- **Таймлайн** — Gantt-диаграмма (gantt-task-react)

### Миграции
- `supabase/migrations/` — оригинальные
- `supabase/migrations_formatted/` — переформатированные (001–016)
- `supabase/migrations_manual.sql` — для ручного запуска (orioledb workaround)
- `20250227000001_project_management.sql` — клиенты, продавцы, вехи, дедлайны

---

## В планах

- Обработка ошибок и feedback во всех мутациях
- PointsConfigSelector (вынести общий компонент)
- Интеграция с Telegram
