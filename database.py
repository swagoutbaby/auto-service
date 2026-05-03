import sqlite3
from flask import g
import os

# Путь к вашей БД на хосте (не меняется)
# В контейнере будет смонтирована папка C:/database в /app/data
DATABASE_PATH = "/app/data/auto_service22.db"

def get_db():
    """Получение подключения к базе данных SQLite"""
    if '_database' not in g:
        g._database = sqlite3.connect(DATABASE_PATH)
        g._database.row_factory = sqlite3.Row
    return g._database

def close_db(exception):
    db = g.pop('_database', None)
    if db is not None:
        db.close()

def init_app(app):
    app.teardown_appcontext(close_db)