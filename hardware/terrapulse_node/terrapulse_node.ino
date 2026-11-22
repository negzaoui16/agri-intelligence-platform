// TerraPulse field node (ESP32 prototype)
// Sensors: DHT11 (air temp/humidity), capacitive soil moisture, water level.
// Outputs: 1.3" SH1106 OLED, traffic-light LED module (R/Y/G),
//          water pump through a relay module, and direct BLE telemetry.
// Uncomment the line below to also enable optional Wi-Fi HTTP batch uploads:
// #define ENABLE_WIFI_CLOUD
//
// Wiring and upload command: see README.md in this folder.
#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <DHT.h>
#include <BLE.h>

#ifdef ENABLE_WIFI_CLOUD
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif
#endif

// ---- Pins ----
#define OLED_SDA 21
#define OLED_SCL 22
#define DHT_PIN 27
#define DHT_TYPE DHT11
#define SOIL_PIN 34    // ADC1, input only
#define WATER_PIN 32   // ADC1 (keeps working alongside RF)
#define LED_RED 25
#define LED_YELLOW 26
#define LED_GREEN 33
#define RELAY_PIN 18   // relay module IN

// ---- Bluetooth Low Energy (BLE GATT Server, esp32 v4 BLE.h) ----
#define BLE_DEVICE_NAME "TerraPulse-Node"
#define BLE_SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define BLE_CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"

static const BLEUUID TERRAPULSE_SVC_UUID(BLE_SERVICE_UUID);
static const BLEUUID TERRAPULSE_CHR_UUID(BLE_CHAR_UUID);
BLEServer bleServer;
BLECharacteristic telemetryChar;
volatile bool bleConnected = false;

// Most relay modules switch on when IN is LOW. If the pump runs when it
// should be off (and the other way round), set this to true.
const bool RELAY_ACTIVE_HIGH = false;

// ---- Calibration (raw ADC, 0-4095) ----
// Soil values are provisional: taken while the probe was being moved.
// Re-measure with the probe held still in dry air (DRY) and in water (WET).
int SOIL_DRY = 2800;
int SOIL_WET = 1220;
// Water level: raw reading with the sensor dry (EMPTY) and fully submerged (FULL).
// Measured: 0 dry, ~2190 fully submerged.
int WATER_EMPTY = 0;
int WATER_FULL = 2050;

// ---- Traffic light: follows the water level ----
// Red when empty (0 %), green when full (100 %), yellow in between.

// ---- Pump rules (always run locally, never decided by the server) ----
// Starts when soil drops below PUMP_ON_BELOW and the tank is not empty.
// Once ON, stays ON until soil reaches at least PUMP_OFF_AT (50%), unless
// the tank runs empty or a soil sensor fault occurs; then waits PUMP_REST_MS.
// Never runs if the soil reading is pinned at the ADC maximum (loose wire).
const int PUMP_ON_BELOW = 30;          // soil %
const int PUMP_OFF_AT = 50;            // minimum soil % before turning pump off
const int SOIL_FAULT_RAW = 4000;       // raw soil reading treated as a fault
const unsigned long PUMP_REST_MS = 30000;

#ifdef ENABLE_WIFI_CLOUD
const unsigned long POST_INTERVAL_MS = 60000;       // upload every 60 s
const unsigned long WIFI_RETRY_INTERVAL_MS = 30000; // non-blocking reconnect check
const int MAX_BUFFERED_READINGS = 60;               // hold up to 60 readings offline
const int MAX_BATCH_SIZE = 50;                      // /api/devices/readings batch cap

struct BufferedReading {
  bool dhtOK;
  float airTempC;
  float airHumidityPct;
  int soilRaw;
  int soilMoisturePct;
  bool soilFault;
  int waterRaw;
  int waterLevelPct;
  bool pumpOn;
  unsigned long capturedAtMs;
};

BufferedReading readingBuffer[MAX_BUFFERED_READINGS];
int bufferHead = 0;
int bufferCount = 0;
unsigned long lastSampleSentAtMs = 0;
unsigned long lastWifiAttemptMs = 0;
#endif

DHT dht(DHT_PIN, DHT_TYPE);
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE, OLED_SCL, OLED_SDA);

enum Light { GREEN, YELLOW, RED };

void setLight(Light l) {
  digitalWrite(LED_RED, l == RED);
  digitalWrite(LED_YELLOW, l == YELLOW);
  digitalWrite(LED_GREEN, l == GREEN);
}

int toPercent(int raw, int at0, int at100) {
  return constrain(map(raw, at0, at100, 0, 100), 0, 100);
}

bool pumpOn = false;
unsigned long pumpChangedAt = 0;   // millis() when the pump last started or stopped
const char *pumpReason = "idle";

void setPump(bool on, const char *reason) {
  if (on != pumpOn) pumpChangedAt = millis();
  pumpOn = on;
  pumpReason = reason;
  digitalWrite(RELAY_PIN, on == RELAY_ACTIVE_HIGH ? HIGH : LOW);
}

// Decides whether the pump should run this cycle. Local hardware safety always takes priority.
void updatePump(int soilRaw, int soilPercent, int waterPercent) {
  unsigned long since = millis() - pumpChangedAt;
  if (soilRaw >= SOIL_FAULT_RAW) { setPump(false, "soil sensor fault"); return; }
  if (waterPercent <= 0)         { setPump(false, "tank empty"); return; }
  if (pumpOn) {
    if (soilPercent >= PUMP_OFF_AT) {
      setPump(false, "soil reached 50%");
    } else {
      pumpReason = "watering until 50%";
    }
    return;
  }
  bool resting = pumpChangedAt != 0 && since < PUMP_REST_MS;
  if (soilPercent < PUMP_ON_BELOW && !resting) setPump(true, "soil dry");
  else if (resting) pumpReason = "resting";
  else pumpReason = "idle";
}

String buildCompactBleJson(
    bool dhtOK,
    float temperature,
    float humidity,
    int soilRaw,
    int soilPercent,
    bool soilFault,
    int waterRaw,
    int waterPercent,
    bool isPumpOn) {
  String json = "{";
  if (dhtOK) {
    json += "\"t\":" + String(temperature, 1) + ",";
    json += "\"h\":" + String(humidity, 0) + ",";
  } else {
    json += "\"t\":null,\"h\":null,";
  }
  json += "\"sr\":" + String(soilRaw) + ",";
  json += "\"sm\":" + (soilFault ? String("null") : String(soilPercent)) + ",";
  json += "\"sf\":" + String(soilFault ? 1 : 0) + ",";
  json += "\"wr\":" + String(waterRaw) + ",";
  json += "\"wl\":" + String(waterPercent) + ",";
  json += "\"p\":" + String(isPumpOn ? 1 : 0);
  json += "}";
  return json;
}

#ifdef ENABLE_WIFI_CLOUD
bool hasConfiguredWifi() {
  return strcmp(WIFI_SSID, "YOUR_WIFI_SSID") != 0 && strlen(WIFI_SSID) > 0;
}

bool hasConfiguredKey() {
  return strncmp(DEVICE_KEY, "tp_dev_replace", 14) != 0 && strlen(DEVICE_KEY) > 10;
}

void ensureWifiConnected() {
  if (!hasConfiguredWifi()) return;
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (lastWifiAttemptMs != 0 && (now - lastWifiAttemptMs) < WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  lastWifiAttemptMs = now;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("Wi-Fi: attempting reconnect...");
}

void enqueueReading(const BufferedReading &r) {
  int writeIdx = (bufferHead + bufferCount) % MAX_BUFFERED_READINGS;
  if (bufferCount == MAX_BUFFERED_READINGS) {
    bufferHead = (bufferHead + 1) % MAX_BUFFERED_READINGS;
  } else {
    bufferCount++;
  }
  readingBuffer[writeIdx] = r;
}

String buildReadingJson(const BufferedReading &r, unsigned long nowMs) {
  unsigned long ageSeconds = (nowMs >= r.capturedAtMs) ? (nowMs - r.capturedAtMs) / 1000UL : 0UL;
  String json = "{";
  json += "\"ageSeconds\":" + String(ageSeconds) + ",";
  if (r.dhtOK) {
    json += "\"airTempC\":" + String(r.airTempC, 1) + ",";
    json += "\"airHumidityPct\":" + String(r.airHumidityPct, 1) + ",";
  }
  json += "\"soilRaw\":" + String(r.soilRaw) + ",";
  json += "\"soilFault\":" + String(r.soilFault ? "true" : "false") + ",";
  if (!r.soilFault) {
    json += "\"soilMoisturePct\":" + String(r.soilMoisturePct) + ",";
  }
  json += "\"waterRaw\":" + String(r.waterRaw) + ",";
  json += "\"waterLevelPct\":" + String(r.waterLevelPct) + ",";
  json += "\"pumpOn\":" + String(r.pumpOn ? "true" : "false");
  json += "}";
  return json;
}

bool postBatchToServer(int countToSend) {
  if (WiFi.status() != WL_CONNECTED || !hasConfiguredKey() || countToSend <= 0) {
    return false;
  }

  unsigned long nowMs = millis();
  String payload = "{\"readings\":[";
  for (int i = 0; i < countToSend; i++) {
    int idx = (bufferHead + i) % MAX_BUFFERED_READINGS;
    if (i > 0) payload += ",";
    payload += buildReadingJson(readingBuffer[idx], nowMs);
  }
  payload += "]}";

  HTTPClient http;
  http.setTimeout(6000);
  bool begun = false;
  WiFiClient plainClient;
  WiFiClientSecure secureClient;

  if (strncmp(API_URL, "https://", 8) == 0) {
    secureClient.setInsecure();
    begun = http.begin(secureClient, API_URL);
  } else {
    begun = http.begin(plainClient, API_URL);
  }
  if (!begun) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_KEY);
  int statusCode = http.POST(payload);
  http.end();
  Serial.printf("Telemetry POST (%d readings) -> HTTP %d\n", countToSend, statusCode);
  return statusCode >= 200 && statusCode < 300;
}

void flushTelemetryBuffer() {
  if (bufferCount == 0 || WiFi.status() != WL_CONNECTED || !hasConfiguredKey()) return;
  int batchSize = bufferCount < MAX_BATCH_SIZE ? bufferCount : MAX_BATCH_SIZE;
  if (postBatchToServer(batchSize)) {
    bufferHead = (bufferHead + batchSize) % MAX_BUFFERED_READINGS;
    bufferCount -= batchSize;
  }
}
#endif

void initBleServer() {
  BLE.begin(BLE_DEVICE_NAME);
  bleServer = BLE.createServer();
  bleServer.onConnect([](BLEServer &s, const BLEConnInfo &conn) {
    bleConnected = true;
    Serial.println("Bluetooth: client connected");
    (void)s;
    (void)conn;
  });
  bleServer.onDisconnect([](BLEServer &s, const BLEConnInfo &conn, uint8_t reason) {
    bleConnected = false;
    Serial.println("Bluetooth: client disconnected — restarting advertising");
    (void)s;
    (void)conn;
    (void)reason;
  });
  bleServer.advertiseOnDisconnect(true);

  BLEService svc = bleServer.createService(TERRAPULSE_SVC_UUID);
  telemetryChar = svc.createCharacteristic(
      TERRAPULSE_CHR_UUID,
      BLEProperty::Read | BLEProperty::Notify,
      BLEPermission::ReadOpen);
  telemetryChar.setValue("{\"t\":null,\"h\":null,\"sr\":0,\"sm\":0,\"sf\":0,\"wr\":0,\"wl\":0,\"p\":0}");
  bleServer.start();

  BLE.getAdvertising().addServiceUUID(TERRAPULSE_SVC_UUID);
  BLE.getAdvertising().setScanResponse(true);
  BLE.startAdvertising();
  Serial.println("Bluetooth BLE GATT ready: TerraPulse-Node");
}

// Lights each LED for a second so the wiring can be checked by eye.
void ledSelfTest() {
  const int pins[] = {LED_RED, LED_YELLOW, LED_GREEN};
  const char *names[] = {"RED", "YELLOW", "GREEN"};
  for (int i = 0; i < 3; i++) {
    digitalWrite(pins[i], HIGH);
    Serial.printf("LED self-test: %s (GPIO%d) on\n", names[i], pins[i]);
    display.clearBuffer();
    display.drawStr(10, 20, "LED SELF-TEST");
    display.setCursor(10, 40); display.print(names[i]); display.print(" on");
    display.sendBuffer();
    delay(1000);
    digitalWrite(pins[i], LOW);
  }
}

// Runs the pump for 2 seconds at boot so the relay and pump wiring can be
// checked without waiting for the soil to dry out.
void pumpSelfTest() {
  Serial.println("Pump self-test: ON for 2 s");
  display.clearBuffer();
  display.drawStr(10, 20, "PUMP SELF-TEST");
  display.drawStr(10, 40, "Pump ON 2 s");
  display.sendBuffer();
  setPump(true, "self-test");
  delay(2000);
  setPump(false, "idle");
  pumpChangedAt = 0;   // don't start the rest period after the test
  Serial.println("Pump self-test: OFF");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("TerraPulse node starting...");
  // Set the relay's off level before making it an output, so the pump
  // doesn't pulse on at boot.
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin();
  display.setFont(u8g2_font_6x12_tf);
  dht.begin();
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  analogSetPinAttenuation(WATER_PIN, ADC_11db);

  initBleServer();

#ifdef ENABLE_WIFI_CLOUD
  if (hasConfiguredWifi()) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lastWifiAttemptMs = millis();
  }
#endif

  ledSelfTest();
  pumpSelfTest();
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool dhtOK = !isnan(temperature) && !isnan(humidity);
  int soilRaw = analogRead(SOIL_PIN);
  bool soilFault = soilRaw >= SOIL_FAULT_RAW;
  int soilPercent = soilFault ? 0 : toPercent(soilRaw, SOIL_DRY, SOIL_WET);
  int waterRaw = analogRead(WATER_PIN);
  int waterPercent = toPercent(waterRaw, WATER_EMPTY, WATER_FULL);

  Light light = YELLOW;
  if (waterPercent <= 0) light = RED;
  else if (waterPercent >= 100) light = GREEN;
  setLight(light);
  const char *status = light == RED ? "RED" : light == YELLOW ? "YELLOW" : "GREEN";
  updatePump(soilRaw, soilPercent, waterPercent);

  String bleJson = buildCompactBleJson(
      dhtOK,
      temperature,
      humidity,
      soilRaw,
      soilPercent,
      soilFault,
      waterRaw,
      waterPercent,
      pumpOn);

  // Update BLE telemetry characteristic and push notification if browser/app is connected
  if (telemetryChar) {
    telemetryChar.setValue(bleJson);
    if (bleConnected) {
      telemetryChar.notify();
    }
  }

#ifdef ENABLE_WIFI_CLOUD
  ensureWifiConnected();
  unsigned long nowMs = millis();
  if (lastSampleSentAtMs == 0 || (nowMs - lastSampleSentAtMs) >= POST_INTERVAL_MS) {
    lastSampleSentAtMs = nowMs;
    BufferedReading sample = {
      dhtOK,
      temperature,
      humidity,
      soilRaw,
      soilPercent,
      soilFault,
      waterRaw,
      waterPercent,
      pumpOn,
      nowMs,
    };
    enqueueReading(sample);
    flushTelemetryBuffer();
  } else if (bufferCount > 0 && WiFi.status() == WL_CONNECTED) {
    flushTelemetryBuffer();
  }
#endif

  Serial.println("--------------------------");
  if (dhtOK) {
    Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" C");
    Serial.print("Air Humidity: "); Serial.print(humidity); Serial.println(" %");
  } else {
    Serial.println("DHT11: Read failed!");
  }
  Serial.printf("Soil ADC: %d -> %s\n", soilRaw, soilFault ? "FAULT" : (String(soilPercent) + " %").c_str());
  Serial.printf("Water ADC: %d -> %d %%\n", waterRaw, waterPercent);
  Serial.printf("Light: %s\n", status);
  Serial.printf("Pump: %s (%s)\n", pumpOn ? "ON" : "OFF", pumpReason);
  Serial.printf("Bluetooth BLE: %s\n", bleConnected ? "CONNECTED" : "WAITING");
  Serial.print("BLE_JSON:");
  Serial.println(bleJson);

  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(0, 10, "TERRAPULSE");
  display.setCursor(80, 10);
  display.print(bleConnected ? "BT:ON" : "BT:WAIT");
  display.drawHLine(0, 13, 128);
  display.setCursor(0, 26);
  if (dhtOK) {
    display.print("T:"); display.print(temperature, 1); display.print("C  H:");
    display.print(humidity, 0); display.print("%");
  } else {
    display.print("DHT11 ERROR");
  }
  display.setCursor(0, 38);
  if (soilFault) {
    display.print("Soil: FAULT ("); display.print(soilRaw); display.print(")");
  } else {
    display.print("Soil: "); display.print(soilPercent);
    display.print("% ("); display.print(soilRaw); display.print(")");
  }
  display.setCursor(0, 50); display.print("Water: "); display.print(waterPercent);
  display.print("% ("); display.print(waterRaw); display.print(")");
  display.setCursor(0, 62); display.print("L:"); display.print(status);
  display.print(" Pump:"); display.print(pumpOn ? "ON" : "OFF");
  display.sendBuffer();
  delay(2000);
}
