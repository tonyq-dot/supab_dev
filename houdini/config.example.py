# Скопируйте в config.py и заполните значения
# cp config.example.py config.py

SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_ANON_KEY = "your-anon-key"

# Для загрузки/добавления работ нужна аутентификация пользователя
USER_EMAIL = "your-email@example.com"
USER_PASSWORD = "your-password"

# Опционально: API key для gallery-ingest (публикация медиа из Houdini)
# Создаётся в Supabase Dashboard → API Keys или через api_keys таблицу
GALLERY_API_KEY = ""
