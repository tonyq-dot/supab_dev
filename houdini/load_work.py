"""
Загрузка работ пользователя из KPI-системы.
Запуск из Houdini: exec(open(r"C:\path\to\supab_dev\houdini\load_work.py").read())

Или в Python shell Houdini:
  import sys
  sys.path.insert(0, r"C:\\path\\to\\supab_dev\\houdini")
  from load_work import load_work_logs, main
  main()
"""
from supabase_client import get_client


def load_work_logs(limit: int = 50):
    """
    Загружает work_logs текущего пользователя с проектами и типами работ.
    Возвращает список dict с полями: id, date, project_id, project_name, work_type_name, quantity, publication_title.
    """
    supabase = get_client()
    user = supabase.auth.get_user()
    if not user or not user.user:
        raise ValueError("Пользователь не аутентифицирован")

    # work_logs с join на projects и work_types
    resp = (
        supabase.table("work_logs")
        .select("id, date, project_id, quantity, projects(name), work_types(name)")
        .eq("user_id", user.user.id)
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )

    rows = []
    for r in resp.data or []:
        proj = r.get("projects") or {}
        wt = r.get("work_types") or {}
        rows.append({
            "id": r["id"],
            "date": r["date"],
            "project_id": r["project_id"],
            "project_name": proj.get("name"),
            "work_type_name": wt.get("name"),
            "quantity": r.get("quantity", 1),
            "publication_title": None,
        })

    if not rows:
        return rows

    # Загружаем заголовки публикаций для work_log_id
    ids = [x["id"] for x in rows]
    pubs = (
        supabase.table("publications")
        .select("work_log_id, title")
        .in_("work_log_id", ids)
        .order("created_at", desc=True)
        .execute()
    )

    title_by_wl = {}
    for p in (pubs.data or []):
        wlid = p.get("work_log_id")
        title = p.get("title")
        if wlid and title and wlid not in title_by_wl:
            title_by_wl[wlid] = title

    for row in rows:
        row["publication_title"] = title_by_wl.get(row["id"])

    return rows


def main():
    """Печатает загруженные работы в консоль."""
    try:
        rows = load_work_logs()
        if not rows:
            print("Нет записей о работах.")
            return []

        print(f"Загружено {len(rows)} работ:\n")
        for r in rows:
            parts = [r["date"], r.get("project_name") or "-", r.get("work_type_name") or "-", f"x{r.get('quantity', 1)}"]
            if r.get("publication_title"):
                parts.append(f"«{r['publication_title']}»")
            print(" | ".join(parts))
        return rows
    except Exception as e:
        print(f"Ошибка: {e}")
        raise


if __name__ == "__main__":
    main()
