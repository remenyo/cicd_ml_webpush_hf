# src: https://github.com/Akkmr111/Vehicle-Car-detection-in-real-time/tree/main

from flask import Flask, request, jsonify
import cv2
import base64
import numpy as np
import logging

app = Flask(__name__)


car_cascade = cv2.CascadeClassifier("cars.xml")  # Load the car cascade file

# Disable the default Flask request logging
log = logging.getLogger("werkzeug")
log.setLevel(logging.ERROR)  # Set to ERROR to suppress INFO and DEBUG messages


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"health": "ok"})


@app.route("/detect_cars", methods=["POST"])
def detect_cars():
    print("New image to detect cars on...")
    # Get image data from request
    image_data = request.get_json()["image"]
    image_bytes = base64.b64decode(image_data.encode("utf-8"))
    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cars = car_cascade.detectMultiScale(gray, 1.1, 1)

    for x, y, w, h in cars:
        cv2.rectangle(image, (x, y), (x + w, y + h), (0, 0, 255), 2)

    # Encode image for response
    _, buffer = cv2.imencode(".jpg", image)
    image_base64 = base64.b64encode(buffer).decode("utf-8")

    print("Car detection done.")
    return jsonify({"image": image_base64})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=3000)
