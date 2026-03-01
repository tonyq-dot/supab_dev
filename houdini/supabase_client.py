"""
Supabase client для Houdini микроприложения.
Поддерживает аутентификацию по email/password для доступа к work_logs.
"""
import os
import sys

try:
    from supabase import create_client, Client
except ImportError:
    print("Install supabase: pip install supabase")
    sys.exit(1)

# Загружаем конфиг
try:
    from config import SUPABASE_URL, SUPABASE_ANON_KEY, USER_EMAIL, USER_PASSWORD
except ImportError:
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
    USER_EMAIL = os.environ.get("SUPABASE_USER_EMAIL", "")
    USER_PASSWORD = os.environ.get("SUPABASE_USER_PASSWORD", "")


def get_client(authenticate: bool = True) -> Client:
    """Создаёт Supabase клиент и при необходимости выполняет вход."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError(
            "Задайте SUPABASE_URL и SUPABASE_ANON_KEY в config.py или переменных окружения"
        )
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

    if authenticate and (USER_EMAIL and USER_PASSWORD):
        resp = client.auth.sign_in_with_password({"email": USER_EMAIL, "password": USER_PASSWORD})
        if resp.user is None:
            raise ValueError(f"Ошибка входа: {resp}")
    return client
