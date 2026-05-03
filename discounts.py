from flask import abort, request
from database import get_db


def read_all():
    """GET /api/discounts - получить все скидки"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, client_id, percent
                        FROM discounts
                        ORDER BY id
                        """)
    discounts = [dict(row) for row in cursor.fetchall()]
    return discounts


def read_one(discount_id):
    """GET /api/discounts/{discount_id} - получить скидку по ID"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, client_id, percent
                        FROM discounts
                        WHERE id = ?
                        """, (discount_id,))
    discount = cursor.fetchone()

    if discount is None:
        abort(404, f"Discount with id {discount_id} not found")

    return dict(discount)


def create():
    """POST /api/discounts - добавить скидку"""
    data = request.get_json()

    required_fields = ['client_id', 'percent']
    for field in required_fields:
        if field not in data:
            abort(400, f"Missing required field: {field}")

    if data['percent'] < 0 or data['percent'] > 30:
        abort(400, "Percent must be between 0 and 30")

    db = get_db()

    # Проверяем, нет ли уже скидки у этого клиента
    existing = db.execute("SELECT id FROM discounts WHERE client_id = ?", (data['client_id'],)).fetchone()
    if existing:
        abort(409, f"Discount for client {data['client_id']} already exists")

    cursor = db.execute("""
                        INSERT INTO discounts (client_id, percent)
                        VALUES (?, ?)
                        """, (data['client_id'], data['percent']))
    db.commit()

    new_id = cursor.lastrowid
    return read_one(new_id), 201


def update(discount_id):
    """PUT /api/discounts/{discount_id} - изменить скидку"""
    data = request.get_json()

    if 'percent' in data and (data['percent'] < 0 or data['percent'] > 30):
        abort(400, "Percent must be between 0 and 30")

    db = get_db()

    existing = db.execute("SELECT id FROM discounts WHERE id = ?", (discount_id,)).fetchone()
    if existing is None:
        abort(404, f"Discount with id {discount_id} not found")

    db.execute("""
               UPDATE discounts
               SET percent = ?
               WHERE id = ?
               """, (data.get('percent'), discount_id))
    db.commit()

    return read_one(discount_id)


def delete(discount_id):
    """DELETE /api/discounts/{discount_id} - удалить скидку"""
    db = get_db()

    cursor = db.execute("DELETE FROM discounts WHERE id = ?", (discount_id,))
    db.commit()

    if cursor.rowcount == 0:
        abort(404, f"Discount with id {discount_id} not found")

    return "", 204