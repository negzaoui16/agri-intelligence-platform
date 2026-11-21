// TerraPulse field node (ESP32 prototype)
// Sensors: DHT11 (air temp/humidity), capacitive soil moisture, water level.
// Outputs: 1.3" SH1106 OLED, traffic-light LED module (R/Y/G),
//          water pump through a relay module.
// Wiring and upload command: see README.md in this folder.
#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <DHT.h>

// ---- Pins ----
#define OLED_SDA 21
#define OLED_SCL 22
#define DHT_PIN 27
#define DHT_TYPE DHT11
#define SOIL_PIN 34    // ADC1, input only
#define WATER_PIN 32   // ADC1 (keeps working when Wi-Fi is on)
#define LED_RED 25
#define LED_YELLOW 26
#define LED_GREEN 33
#define RELAY_PIN 18   // relay module IN

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

// ---- Pump rules ----
// Starts when soil drops below PUMP_ON_BELOW and the tank is not empty.
// Stops when soil reaches PUMP_OFF_AT, the tank runs empty, or after
// PUMP_MAX_RUN_MS; then waits PUMP_REST_MS so water can soak in.
// Never runs if the soil reading is pinned at the ADC maximum (loose wire).
const int PUMP_ON_BELOW = 30;          // soil %
const int PUMP_OFF_AT = 60;            // soil %
const int SOIL_FAULT_RAW = 4000;       // raw soil reading treated as a fault
const unsigned long PUMP_MAX_RUN_MS = 10000;
const unsigned long PUMP_REST_MS = 30000;

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

// Decides whether the pump should run this cycle.
void updatePump(int soilRaw, int soilPercent, int waterPercent) {
  unsigned long since = millis() - pumpChangedAt;
  if (soilRaw >= SOIL_FAULT_RAW) { setPump(false, "soil sensor fault"); return; }
  if (waterPercent <= 0)         { setPump(false, "tank empty"); return; }
  if (pumpOn) {
    if (soilPercent >= PUMP_OFF_AT)  setPump(false, "soil wet enough");
    else if (since >= PUMP_MAX_RUN_MS) setPump(false, "max run time, resting");
    return;
  }
  bool resting = pumpChangedAt != 0 && since < PUMP_REST_MS;
  if (soilPercent < PUMP_ON_BELOW && !resting) setPump(true, "soil dry");
  else if (resting) pumpReason = "resting";
  else pumpReason = "idle";
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
  ledSelfTest();
  pumpSelfTest();
}

void loop() {
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool dhtOK = !isnan(temperature) && !isnan(humidity);
  int soilRaw = analogRead(SOIL_PIN);
  int soilPercent = toPercent(soilRaw, SOIL_DRY, SOIL_WET);
  int waterRaw = analogRead(WATER_PIN);
  int waterPercent = toPercent(waterRaw, WATER_EMPTY, WATER_FULL);

  Light light = YELLOW;
  if (waterPercent <= 0) light = RED;
  else if (waterPercent >= 100) light = GREEN;
  setLight(light);
  const char *status = light == RED ? "RED" : light == YELLOW ? "YELLOW" : "GREEN";
  updatePump(soilRaw, soilPercent, waterPercent);

  Serial.println("--------------------------");
  if (dhtOK) {
    Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" C");
    Serial.print("Air Humidity: "); Serial.print(humidity); Serial.println(" %");
  } else {
    Serial.println("DHT11: Read failed!");
  }
  Serial.printf("Soil ADC: %d -> %d %%\n", soilRaw, soilPercent);
  Serial.printf("Water ADC: %d -> %d %%\n", waterRaw, waterPercent);
  Serial.printf("Light: %s\n", status);
  Serial.printf("Pump: %s (%s)\n", pumpOn ? "ON" : "OFF", pumpReason);

  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(0, 10, "TERRAPULSE NODE");
  display.drawHLine(0, 13, 128);
  display.setCursor(0, 26);
  if (dhtOK) {
    display.print("T:"); display.print(temperature, 1); display.print("C  H:");
    display.print(humidity, 0); display.print("%");
  } else {
    display.print("DHT11 ERROR");
  }
  display.setCursor(0, 38); display.print("Soil: "); display.print(soilPercent);
  display.print("% ("); display.print(soilRaw); display.print(")");
  display.setCursor(0, 50); display.print("Water: "); display.print(waterPercent);
  display.print("% ("); display.print(waterRaw); display.print(")");
  display.setCursor(0, 62); display.print("L:"); display.print(status);
  display.print(" Pump:"); display.print(pumpOn ? "ON" : "OFF");
  display.sendBuffer();
  delay(2000);
}
