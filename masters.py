from flask import abort, request
from database import get_db


def read_all():
    """GET /api/masters - получить всех мастеров"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, surname, first_name, father_name, specialty
                        FROM masters
                        ORDER BY id
                        """)
    masters = [dict(row) for row in cursor.fetchall()]
    return masters


def read_one(master_id):
    """GET /api/masters/{master_id} - получить мастера по ID"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, surname, first_name, father_name, specialty
                        FROM masters
                        WHERE id = ?
                        """, (master_id,))
    master = cursor.fetchone()

    if master is None:
        abort(404, f"Master with id {master_id} not found")

    return dict(master)


def create():
    """POST /api/masters - добавить мастера"""
    data = request.get_json()

    required_fields = ['surname', 'first_name', 'specialty']
    for field in required_fields:
        if field not in data:
            abort(400, f"Missing required field: {field}")

    db = get_db()
    cursor = db.execute("""
                        INSERT INTO masters (surname, first_name, father_name, specialty)
                        VALUES (?, ?, ?, ?)
                        """, (
                            data.get('surname'),
                            data.get('first_name'),
                            data.get('father_name'),
                            data.get('specialty')
                        ))
    db.commit()
    new_id = cursor.lastrowid

    return read_one(new_id), 201


def update(master_id):
    """PUT /api/masters/{master_id} - обновить данные мастера"""
    data = request.get_json()

    db = get_db()

    cursor = db.execute("SELECT id FROM masters WHERE id = ?", (master_id,))
    if cursor.fetchone() is None:
        abort(404, f"Master with id {master_id} not found")

    db.execute("""
               UPDATE masters
               SET surname     = ?,
                   first_name  = ?,
                   father_name = ?,
                   specialty   = ?
               WHERE id = ?
               """, (
                   data.get('surname'),
                   data.get('first_name'),
                   data.get('father_name'),
                   data.get('specialty'),
                   master_id
               ))
    db.commit()

    return read_one(master_id)


def delete(master_id):
    """DELETE /api/masters/{master_id} - удалить мастера"""
    db = get_db()

    cursor = db.execute("DELETE FROM masters WHERE id = ?", (master_id,))
    db.commit()

    if cursor.rowcount == 0:
        abort(404, f"Master with id {master_id} not found")

    return "", 204