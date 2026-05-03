from flask import abort, request
from database import get_db


def read_all():
    """GET /api/orders - получить все заказы"""
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
                   SELECT id,
                          client_id,
                          master_id,
                          box_num,
                          car,
                          service_type,
                          status,
                          booking_type,
                          created_at,
                          completed_at
                   FROM orders
                   ORDER BY id DESC
                   """)
    orders = [dict(row) for row in cursor.fetchall()]
    return orders


def read_one(order_id):
    """GET /api/orders/{order_id} - получить заказ по ID"""
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
                   SELECT id,
                          client_id,
                          master_id,
                          box_num,
                          car,
                          service_type,
                          status,
                          booking_type,
                          created_at,
                          completed_at
                   FROM orders
                   WHERE id = %s
                   """, (order_id,))
    order = cursor.fetchone()

    if order is None:
        abort(404, f"Order with id {order_id} not found")

    return dict(order)


def create():
    """POST /api/orders - добавить заказ (триггер увеличит визиты)"""
    data = request.get_json()

    required_fields = ['client_id', 'master_id', 'box_num', 'service_type', 'booking_type']
    for field in required_fields:
        if field not in data:
            abort(400, f"Missing required field: {field}")

    from datetime import datetime

    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
                   INSERT INTO orders (client_id, master_id, box_num, car, service_type,
                                       status, booking_type, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
                   """, (
                       data.get('client_id'),
                       data.get('master_id'),
                       data.get('box_num'),
                       data.get('car'),
                       data.get('service_type'),
                       data.get('status', 'В работе'),
                       data.get('booking_type'),
                       datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                   ))
    new_id = cursor.fetchone()[0]
    db.commit()

    return read_one(new_id), 201


def update(order_id):
    """PUT /api/orders/{order_id} - обновить заказ"""
    data = request.get_json()

    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT id FROM orders WHERE id = %s", (order_id,))
    if cursor.fetchone() is None:
        abort(404, f"Order with id {order_id} not found")

    cursor.execute("""
                   UPDATE orders
                   SET client_id    = %s,
                       master_id    = %s,
                       box_num      = %s,
                       car          = %s,
                       service_type = %s,
                       status       = %s,
                       booking_type = %s,
                       completed_at = %s
                   WHERE id = %s
                   """, (
                       data.get('client_id'),
                       data.get('master_id'),
                       data.get('box_num'),
                       data.get('car'),
                       data.get('service_type'),
                       data.get('status'),
                       data.get('booking_type'),
                       data.get('completed_at'),
                       order_id
                   ))
    db.commit()

    return read_one(order_id)


def delete(order_id):
    """DELETE /api/orders/{order_id} - удалить заказ"""
    db = get_db()
    cursor = db.cursor()

    # Удаляем связанные записи в box_schedule
    cursor.execute("DELETE FROM box_schedule WHERE order_id = %s", (order_id,))
    cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
    db.commit()

    if cursor.rowcount == 0:
        abort(404, f"Order with id {order_id} not found")

    return "", 204