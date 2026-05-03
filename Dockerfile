# Базовый образ с Python 3.9
FROM python:3.9-slim

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файл с зависимостями
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект в контейнер
COPY . .

# Создаем папку для базы данных (если нужно)
RUN mkdir -p /app/data

# Открываем порт (ваш API работает на 8000)
EXPOSE 8000

# Команда для запуска приложения
CMD ["python", "app.py"]