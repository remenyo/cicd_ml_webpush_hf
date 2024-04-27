FROM python:3.13.0a6-bullseye

WORKDIR /app

COPY requirements.txt requirements.txt
RUN apt-get update && apt-get install ffmpeg libsm6 libxext6 -y
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "car_detector.py"]
