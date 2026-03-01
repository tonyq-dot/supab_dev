# Style Guide

Соглашения по коду и стилю.

---

## Общее

- **Язык:** код и комментарии — английский; UI-тексты — русский
- **Форматирование:** Prettier/ESLint (если настроены)

## React / TypeScript

- **Компоненты:** функциональные, `export default` для страниц
- **Типы:** интерфейсы из `database.types.ts` для Supabase
- **State:** `useState`, `useEffect`; для сложной логики — `useCallback`

## Именование

- **Файлы:** PascalCase для компонентов (`Gallery.tsx`), camelCase для утилит (`scoreBreakdown.ts`)
- **Компоненты:** PascalCase
- **Хуки:** `use` prefix (`useAuth`, `useGalleryPoints`)
- **Таблицы БД:** snake_case (`gallery_work_categories`)

## SQL / миграции

- **Ключевые слова:** UPPERCASE (`CREATE TABLE`, `SELECT`)
- **Таблицы/колонки:** snake_case
- **Комментарии:** `--` для однострочных, `/* */` для блоков

## База данных

- **ID:** UUID primary key
- **Человекочитаемые коды:** `code` (slug) в дополнение к `name` (display)
- **RLS:** `DROP POLICY IF EXISTS` перед `CREATE POLICY` для идемпотентности
