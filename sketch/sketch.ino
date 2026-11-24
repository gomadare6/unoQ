// SPDX-FileCopyrightText: Copyright (C) Arduino s.r.l. and/or its affiliated companies
//
// SPDX-License-Identifier: MPL-2.0

#include <Arduino_RouterBridge.h>

// UNO Q のオンボードRGB LED(LED3)。アクティブLOW(LOWで点灯)
const int LED_R = LED3_R;
const int LED_G = LED3_G;
const int LED_B = LED3_B;

void set_color(bool r, bool g, bool b) {
  digitalWrite(LED_R, r ? LOW : HIGH);
  digitalWrite(LED_G, g ? LOW : HIGH);
  digitalWrite(LED_B, b ? LOW : HIGH);
}

// person = true  → 赤(人を検知中)
// person = false → 緑(人なし)
void set_led_state(bool person) {
  set_color(person, !person, false);
}

void setup() {
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  set_led_state(false);

  Bridge.begin();
  Bridge.provide("set_led_state", set_led_state);
}

void loop() {
}
