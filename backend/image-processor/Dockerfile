FROM python:3.13.0a6-bullseye

COPY . .

RUN apt-get update && apt-get install ffmpeg libsm6 libxext6 -y

RUN pip install -r requirements.txt

CMD ["python", "car_detector.py"]
