# SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import App, Bridge
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.video_imageclassification import VideoImageClassification
from datetime import datetime, UTC
import json
import threading
import time

# 人が検出されなくなってからLEDを緑に戻すまでの秒数
LED_OFF_DELAY_SEC = 1.0
# 画面への送信間隔(秒)。毎フレーム送るとブラウザと通信が重くなるため間引く
UI_SEND_INTERVAL_SEC = 0.5

ui = WebUI()
detection_stream = VideoImageClassification(confidence=0.5, debounce_sec=0.0)

ui.on_message("override_th", lambda sid, threshold: detection_stream.override_threshold(threshold))

last_person_time = 0.0
last_ui_send_time = 0.0


def person_detected():
  global last_person_time
  last_person_time = time.monotonic()

detection_stream.on_detect("person", person_detected)


# LEDを操作するのはこのスレッドだけ。状態が変わったときだけマイコンに通知する
def led_loop():
  led_on = False
  while True:
    person = time.monotonic() - last_person_time < LED_OFF_DELAY_SEC
    if person != led_on:
      try:
        Bridge.call("set_led_state", person)
        led_on = person
      except Exception as e:
        print(f"Failed to set LED state: {e}")
    time.sleep(0.1)

threading.Thread(target=led_loop, daemon=True).start()


def send_detections_to_ui(classifications: dict):
  global last_ui_send_time
  now = time.monotonic()
  if not classifications or now - last_ui_send_time < UI_SEND_INTERVAL_SEC:
    return
  last_ui_send_time = now

  timestamp = datetime.now(UTC).isoformat()
  entries = [
    {"content": key, "confidence": value, "timestamp": timestamp}
    for key, value in classifications.items()
  ]
  ui.send_message("classifications", message=json.dumps(entries))

detection_stream.on_detect_all(send_detections_to_ui)

App.run()
