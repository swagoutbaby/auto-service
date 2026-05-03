from flask import render_template
import connexion
from database import init_app
import os

# Создаем приложение Connexion
app = connexion.App(__name__, specification_dir="./")
app.add_api("swagger.yml")

# Инициализируем базу данных
init_app(app.app)

@app.route("/")
def home():
    return render_template("home.html")

if __name__ == "__main__":
    import uvicorn
    # Получаем порт из переменной окружения или используем 8000
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)