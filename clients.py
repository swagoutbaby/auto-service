from flask import abort, request
from database import get_db


def get_timestamp():
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def read_all():
    """GET /api/clients - получить всех клиентов"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, surname, first_name, father_name, phone, visits
                        FROM clients
                        ORDER BY id
                        """)
    clients = [dict(row) for row in cursor.fetchall()]
    return clients


def read_one(client_id):
    """GET /api/clients/{client_id} - получить клиента по ID"""
    db = get_db()
    cursor = db.execute("""
                        SELECT id, surname, first_name, father_name, phone, visits
                        FROM clients
                        WHERE id = ?
                        """, (client_id,))
    client = cursor.fetchone()

    if client is None:
        abort(404, f"Client with id {client_id} not found")

    return dict(client)


def create():
    """POST /api/clients - добавить нового клиента"""
    data = request.get_json()

    required_fields = ['surname', 'first_name']
    for field in required_fields:
        if field not in data:
            abort(400, f"Missing required field: {field}")

    db = get_db()
    cursor = db.execute("""
                        INSERT INTO clients (surname, first_name, father_name, phone, visits)
                        VALUES (?, ?, ?, ?, ?)
                        """, (
                            data.get('surname'),
                            data.get('first_name'),
                            data.get('father_name'),
                            data.get('phone'),
                            data.get('visits', 0)
                        ))
    db.commit()
    new_id = cursor.lastrowid

    return read_one(new_id), 201


def update(client_id):
    """PUT /api/clients/{client_id} - обновить данные клиента"""
    data = request.get_json()

    db = get_db()

    # Проверяем, существует ли клиент
    cursor = db.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if cursor.fetchone() is None:
        abort(404, f"Client with id {client_id} not found")

    # Обновляем
    db.execute("""
               UPDATE clients
               SET surname     = ?,
                   first_name  = ?,
                   father_name = ?,
                   phone       = ?,
                   visits      = ?
               WHERE id = ?
               """, (
                   data.get('surname'),
                   data.get('first_name'),
                   data.get('father_name'),
                   data.get('phone'),
                   data.get('visits', 0),
                   client_id
               ))
    db.commit()

    return read_one(client_id)


def delete(client_id):
    """DELETE /api/clients/{client_id} - удалить клиента"""
    db = get_db()

    # Сначала удаляем связанные записи
    db.execute("DELETE FROM discounts WHERE client_id = ?", (client_id,))

    cursor = db.execute("DELETE FROM clients WHERE id = ?", (client_id,))
    db.commit()

    if cursor.rowcount == 0:
        abort(404, f"Client with id {client_id} not found")

    return "", 204