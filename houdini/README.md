# Houdini микроприложение для KPI-системы

Микроприложение для загрузки и добавления работ из Houdini (Python) в KPI-систему студии.

## Минимальный вариант (без установки)

Открыть страницу приложения в браузере — без pip, без конфигов:

```python
import webbrowser
webbrowser.open("http://localhost:5173/works")  # Мои работы
# webbrowser.open("http://localhost:5173/add")   # Добавить работу
# webbrowser.open("http://localhost:5173/gallery")  # Галерея
```

Замените URL на ваш домен, если приложение развёрнуто. Пользователь должен быть залогинен в браузере.

## API для загрузки работ

Система использует **Supabase** как backend. Доступ к данным идёт через Supabase REST API (PostgREST):

| Таблица / View | Назначение |
|----------------|------------|
| `work_logs` | Записи о работах (user_id, project_id, work_type_id, quantity, date) |
| `projects` | Проекты (name, drone_count, status) |
| `work_types` | Типы работ (name, base_value) |
| `publications` | Публикации/медиа, связанные с work_log |
| `publication_latest` | View с последней версией каждой публикации |

**RLS:** Пользователь видит только свои `work_logs`. Для доступа нужна аутентификация (email + password).

**Edge Functions:**
- `gallery-ingest` — создание публикации с медиа (source: `houdini`), требует `X-API-Key`

## Установка

1. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

2. Создайте конфиг:
   ```bash
   cp config.example.py config.py
   ```

3. Заполните `config.py`:
   - `SUPABASE_URL` — URL проекта (как в веб-приложении)
   - `SUPABASE_ANON_KEY` — anon key (публичный ключ)
   - `USER_EMAIL` / `USER_PASSWORD` — учётные данные пользователя

   Либо задайте переменные окружения: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_USER_EMAIL`, `SUPABASE_USER_PASSWORD`.

## Использование в Houdini

### Вариант 1: Python Shell в Houdini

1. Откройте Python Shell в Houdini (Windows → Python Shell).
2. Добавьте путь к папке `houdini`:
   ```python
   import sys
   sys.path.insert(0, r"C:\path\to\supab_dev\houdini")
   ```
3. Загрузите работы:
   ```python
   from load_work import load_work_logs, main
   main()  # печатает в консоль
   # или
   rows = load_work_logs(limit=20)
   for r in rows:
       print(r["date"], r["project_name"], r["work_type_name"])
   ```

### Вариант 2: Запуск скрипта

```python
exec(open(r"C:\path\to\supab_dev\houdini\load_work.py").read())
```

### Вариант 3: Добавление работы

```python
import sys
sys.path.insert(0, r"C:\path\to\supab_dev\houdini")
from add_work import add_work, load_projects, load_work_types

# Список проектов и типов работ
projects = load_projects()
work_types = load_work_types()

# Добавить работу (project_id, work_type_id, quantity, date)
result = add_work(
    project_id=projects[0]["id"],
    work_type_id=work_types[0]["id"],
    quantity=1,
    work_date="2025-02-27"
)
print("Добавлено:", result["id"])
```

### Вариант 4: Интерактивное добавление

```bash
python add_work.py
```

## Публикация медиа через gallery-ingest

Для загрузки скриншотов/видео из Houdini используйте Edge Function `gallery-ingest`:

```python
import requests
import base64

url = "https://YOUR_PROJECT.supabase.co/functions/v1/gallery-ingest"
headers = {"X-API-Key": "YOUR_API_KEY", "Content-Type": "application/json"}

# Из файла
with open("render.png", "rb") as f:
    file_b64 = base64.b64encode(f.read()).decode()

body = {
    "author_id": "user-uuid",  # из supabase.auth.get_user().user.id
    "project_id": "project-uuid",
    "work_log_id": "work-log-uuid",  # опционально
    "file_base64": file_b64,
    "file_ext": "png",
    "source": "houdini",
}
resp = requests.post(url, json=body, headers=headers)
print(resp.json())
```

API key создаётся в Supabase и добавляется в таблицу `api_keys` (см. `supabase/functions/README.md`).
