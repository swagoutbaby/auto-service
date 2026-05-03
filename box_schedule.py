from flask import abort, request
from database import get_db


def read_all():
    """GET /api/box_schedule - получить все записи в боксах"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, box_num, date, hour, order_id
                        FROM box_schedule
                        ORDER BY date DESC, hour DESC
                        """)
    schedules = [dict(row) for row in cursor.fetchall()]
    return schedules


def read_one(schedule_id):
    """GET /api/box_schedule/{schedule_id} - получить запись по ID"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, box_num, date, hour, order_id
                        FROM box_schedule
                        WHERE id = ?
                        """, (schedule_id,))
    schedule = cursor.fetchone()

    if schedule is None:
        abort(404, f"Schedule with id {schedule_id} not found")

    return dict(schedule)


def create():
    """POST /api/box_schedule - добавить запись в бокс"""
    data = request.get_json()

    required_fields = ['box_num', 'date', 'hour', 'order_id']
    for field in required_fields:
        if field not in data:
            abort(400, f"Missing required field: {field}")

    db = get_db()
    cursor = db.execute("""
                        INSERT INTO box_schedule (box_num, date, hour, order_id)
                        VALUES (?, ?, ?, ?)
                        """, (
                            data['box_num'],
                            data['date'],
                            data['hour'],
                            data['order_id']
                        ))
    db.commit()

    new_id = cursor.lastrowid
    return read_one(new_id), 201


def update(schedule_id):
    """PUT /api/box_schedule/{schedule_id} - изменить запись в боксе"""
    data = request.get_json()

    db = get_db()

    existing = db.execute("SELECT id FROM box_schedule WHERE id = ?", (schedule_id,)).fetchone()
    if existing is None:
        abort(404, f"Schedule with id {schedule_id} not found")

    db.execute("""
               UPDATE box_schedule
               SET box_num  = ?,
                   date     = ?,
                   hour     = ?,
                   order_id = ?
               WHERE id = ?
               """, (
                   data.get('box_num'),
                   data.get('date'),
                   data.get('hour'),
                   data.get('order_id'),
                   schedule_id
               ))
    db.commit()

    return read_one(schedule_id)


def delete(schedule_id):
    """DELETE /api/box_schedule/{schedule_id} - удалить запись из бокса"""
    db = get_db()

    cursor = db.execute("DELETE FROM box_schedule WHERE id = ?", (schedule_id,))
    db.commit()

    if cursor.rowcount == 0:
        abort(404, f"Schedule with id {schedule_id} not found")

    return "", 204