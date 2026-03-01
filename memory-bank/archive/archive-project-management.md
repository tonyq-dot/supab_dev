# Архив: Улучшение блока проектов (менеджмент)

**Дата:** 27 февраля 2025

---

## Задача

Расширить систему проектов: клиенты, продавцы, статусы, дедлайны, вехи с комментариями, таймлайн в стиле Ганта.

---

## Что сделано

### 1. База данных (миграция)

**Файл:** `supabase/migrations/20250227000001_project_management.sql`

- **Таблица `clients`** — справочник клиентов (id, name, created_at)
- **Таблица `sellers`** — справочник продавцов (id, name, created_at)
- **Enum `project_workflow_status`** — ПРЕВЬЮ, ПРЕПРОДАКШН, СБОРКА, ФИНИШНАЯ ПРЯМАЯ, ШОУ, СТОП, ЖДЕМ ОТВЕТА
- **Таблица `project_sellers`** — связь проект ↔ продавцы (many-to-many)
- **Таблица `project_milestones`** — вехи проекта (project_id, pitch_date, comment, sort_order)
- **Изменения в `projects`** — добавлены: client_id, workflow_status, global_deadline, pitch_deadline
- **Изменения в `work_logs`** — добавлен milestone_id (опциональная привязка работ к вехе)
- RLS-политики для новых таблиц

### 2. Обновление типов

**Файл:** `src/lib/database.types.ts`

- Добавлены типы для clients, sellers, project_sellers, project_milestones
- Расширен тип projects (client_id, workflow_status, global_deadline, pitch_deadline)
- Расширен тип work_logs (milestone_id)

### 3. Константы

**Файл:** `src/constants/projectStatus.ts`

- WORKFLOW_STATUSES — массив статусов с русскими подписями
- getWorkflowStatusLabel() — функция для отображения статуса

### 4. Хуки

| Файл | Назначение |
|------|------------|
| `src/hooks/useClients.ts` | Список клиентов, addClient() |
| `src/hooks/useSellers.ts` | Список продавцов, addSeller() |
| `src/hooks/useProjectSellers.ts` | Продавцы проекта, addSeller(), removeSeller() |
| `src/hooks/useProjectMilestones.ts` | Вехи проекта, addMilestone(), updateMilestone(), deleteMilestone() |
| `src/hooks/useAllMilestones.ts` | Все вехи с проектами (для страницы комментариев) |
| `src/hooks/useProjects.ts` | Обновлён: добавлен join с clients |

### 5. Компоненты

| Файл | Назначение |
|------|------------|
| `src/components/projects/ClientSelector.tsx` | Выбор клиента с автодополнением и добавлением нового |
| `src/components/projects/SellersSelector.tsx` | Мультивыбор продавцов (теги) с добавлением новых |
| `src/components/projects/ProjectForm.tsx` | Форма создания/редактирования проекта (все поля) |
| `src/components/projects/ProjectDetailsBlock.tsx` | Расширен: вкладки (Работы, Вехи и комментарии, Участники), блок проекта (клиент, продавцы, статус, дедлайны), добавление вех |
| `src/components/projects/AllCommentsView.tsx` | Страница «Все комментарии» — агрегация комментариев по подачам |
| `src/components/projects/ProjectTimelineView.tsx` | Gantt-диаграмма (gantt-task-react) |

### 6. Страница Projects

**Файл:** `src/pages/Projects.tsx`

- Вкладки: Список | Все комментарии | Таймлайн
- Форма создания проекта с полями: клиент, продавцы, статус, глобальный дедлайн, подача
- Редактирование проекта (кнопка «Изменить»)
- При смене pitch_deadline при редактировании — создаётся новая веха
- При создании проекта с pitch_deadline — создаётся первая веха
- Таблица: колонки Клиент, Статус, Дедлайны

### 7. Стили

**Файл:** `src/index.css`

- .client-selector, .client-selector-dropdown, .client-selector-item
- .sellers-selector, .sellers-selector-tags, .sellers-selector-tag
- .project-milestones-list, .project-milestone-item, .project-milestone-add
- .project-deadlines, .project-deadline-item
- .project-details-tabs

### 8. Зависимости

- **gantt-task-react** — добавлен в package.json

---

## Логика

- **Клиент** — выбирается из справочника или добавляется на лету
- **Продавали** — несколько человек на проект, выбираются из справочника
- **Веха** — создаётся при смене даты подачи (в форме редактирования) или вручную в блоке «Вехи и комментарии»
- **Комментарий к вехе** — сохраняется в project_milestones.comment

---

## Запуск миграции

```bash
supabase db push
```

или

```bash
supabase migration up
```

---

## Структура файлов (созданные/изменённые)

```
supabase/migrations/20250227000001_project_management.sql  [новый]
src/lib/database.types.ts                                   [изменён]
src/constants/projectStatus.ts                               [новый]
src/hooks/useClients.ts                                     [новый]
src/hooks/useSellers.ts                                     [новый]
src/hooks/useProjectSellers.ts                              [новый]
src/hooks/useProjectMilestones.ts                           [новый]
src/hooks/useAllMilestones.ts                               [новый]
src/hooks/useProjects.ts                                    [изменён]
src/components/projects/ClientSelector.tsx                  [новый]
src/components/projects/SellersSelector.tsx                  [новый]
src/components/projects/ProjectForm.tsx                    [новый]
src/components/projects/ProjectDetailsBlock.tsx             [изменён]
src/components/projects/AllCommentsView.tsx                [новый]
src/components/projects/ProjectTimelineView.tsx             [новый]
src/pages/Projects.tsx                                      [изменён]
src/index.css                                                [изменён]
package.json                                                 [изменён — gantt-task-react]
memory-bank/progress.md                                      [изменён]
```
