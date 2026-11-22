// Copy this file to `secrets.h` in the same folder (`secrets.h` is git-ignored)
// and fill in your farm Wi-Fi credentials, API endpoint, and device key.
#pragma once

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Production example:
// #define API_URL "https://your-terrapulse-domain.com/api/devices/readings"
// Local dev example (use your Mac/PC LAN IP, NEVER localhost):
#define API_URL "http://192.168.1.42:3000/api/devices/readings"

// Shown once when you click "Add a sensor" on the TerraPulse Home screen.
#define DEVICE_KEY "tp_dev_replace_with_your_device_key"
