"""
Добавление работы из Houdini в KPI-систему.
Запуск: exec(open("path/to/add_work.py").read()) или импорт add_work и вызов add_work(...)
"""
from datetime import date
from supabase_client import get_client


def load_projects():
    """Загружает активные проекты."""
    supabase = get_client()
    resp = (
        supabase.table("projects")
        .select("id, name, drone_count")
        .eq("status", "Active")
        .order("name")
        .execute()
    )
    return resp.data or []


def load_work_types():
    """Загружает типы работ."""
    supabase = get_client()
    resp = (
        supabase.table("work_types")
        .select("id, name, base_value")
        .order("name")
        .execute()
    )
    return resp.data or []


def add_work(
    project_id: str,
    work_type_id: str,
    quantity: int = 1,
    work_date: str | None = None,
):
    """
    Добавляет запись work_log в KPI-систему.

    Args:
        project_id: UUID проекта
        work_type_id: UUID типа работы
        quantity: количество (по умолчанию 1)
        work_date: дата в формате YYYY-MM-DD (по умолчанию сегодня)

    Returns:
        dict с полями id, date, project_id, work_type_id, quantity
    """
    if work_date is None:
        work_date = date.today().isoformat()

    supabase = get_client()
    user = supabase.auth.get_user()
    if not user or not user.user:
        raise ValueError("Пользователь не аутентифицирован")

    resp = (
        supabase.table("work_logs")
        .insert({
            "user_id": user.user.id,
            "project_id": project_id,
            "work_type_id": work_type_id,
            "quantity": quantity,
            "date": work_date,
        })
        .select()
        .execute()
    )

    if not resp.data:
        raise RuntimeError(f"Не удалось создать work_log: {resp}")

    return resp.data[0]


def main_interactive():
    """Интерактивное добавление работы (для запуска из консоли)."""
    projects = load_projects()
    work_types = load_work_types()

    if not projects:
        print("Нет активных проектов.")
        return None
    if not work_types:
        print("Нет типов работ.")
        return None

    print("Проекты:")
    for i, p in enumerate(projects, 1):
        print(f"  {i}. {p['name']} ({p.get('drone_count', 0)} дронов)")
    proj_idx = int(input("Номер проекта: ")) - 1
    project_id = projects[proj_idx]["id"]

    print("\nТипы работ:")
    for i, wt in enumerate(work_types, 1):
        print(f"  {i}. {wt['name']}")
    wt_idx = int(input("Номер типа работы: ")) - 1
    work_type_id = work_types[wt_idx]["id"]

    quantity = int(input("Количество (1): ") or "1")
    work_date = input("Дата (сегодня, YYYY-MM-DD): ").strip() or None

    result = add_work(project_id, work_type_id, quantity, work_date)
    print(f"Добавлено: work_log id={result['id']}")
    return result


if __name__ == "__main__":
    main_interactive()
