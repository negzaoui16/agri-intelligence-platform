# TerraPulse field node (ESP32)

Prototype sensor node: reads air temperature/humidity, soil moisture and
water level, shows them on an OLED and sets a traffic-light LED, while
streaming live telemetry directly over **Bluetooth Low Energy (BLE)** to
the TerraPulse web app (plus optional Wi-Fi HTTP batch upload).

## Wiring

| Part | Part pin | ESP32 pin |
|---|---|---|
| DHT11 | DATA | GPIO27 |
| DHT11 | VCC / GND | 3V3 / GND |
| Soil moisture (capacitive) | AOUT | GPIO34 |
| Soil moisture | VCC / GND | 3V3 / GND |
| Water level sensor | S (signal) | GPIO32 |
| Water level sensor | + / − | 3V3 / GND |
| Traffic light module | R | GPIO25 |
| Traffic light module | Y | GPIO26 |
| Traffic light module | G | GPIO33 |
| Traffic light module | GND | GND |
| Relay module | IN | GPIO18 |
| Relay module | VCC / GND | VIN (5 V) / GND |
| Water pump | + | relay NO; relay COM to pump supply + |
| Water pump | − | pump supply − |
| SH1106 OLED 1.3" | SDA / SCL | GPIO21 / GPIO22 |
| SH1106 OLED | VCC / GND | 3V3 / GND |

Analog sensors use ADC1 pins only, because ADC2 pins stop working once Wi-Fi is on.
GPIO4 is not used: on this board it read a constant 3.3 V.

## Direct Bluetooth (BLE) Connection (Recommended)

With no Wi-Fi credentials or keys required, the ESP32 advertises as **`TerraPulse-Node`**:

- Service UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- Characteristic UUID: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- On the TerraPulse Home screen in **Chrome** or **Edge**, tap **Connect Bluetooth** inside the *"Right now in your field"* card and select **TerraPulse-Node**.
- The OLED top-right shows `BT:WAIT` while advertising and `BT:ON` when paired.
- Pump and traffic-light rules always run locally with zero phone/internet needed.

## Optional Wi-Fi, offline buffer, and secrets

Uncomment `#define ENABLE_WIFI_CLOUD` at the top of `terrapulse_node.ino` if you also want 60s Wi-Fi uploads:

1. Copy `secrets.example.h` to `secrets.h` in this folder (`secrets.h` is git-ignored):
   ```bash
   cp hardware/terrapulse_node/secrets.example.h hardware/terrapulse_node/secrets.h
   ```
2. In the TerraPulse app, open the Home screen, click **Add a sensor**, and copy
   the generated device key into `#define DEVICE_KEY "..."` in `secrets.h`.
3. Fill in `WIFI_SSID`, `WIFI_PASSWORD`, and `API_URL`.
4. Every 60 seconds the node records a sample and POSTs JSON with
   `Authorization: Bearer <DEVICE_KEY>`.
   - If Wi-Fi drops, up to **60 readings** are kept in memory and sent in batches
     of up to 50 when the connection returns.
   - The server never turns the pump on or off.

> **Local testing note:** For local testing the ESP32 cannot reach `localhost`
> (that refers to the ESP32 itself). Start the Next.js dev server bound to all
> network interfaces with `-H 0.0.0.0`:
> ```bash
> npx next dev -H 0.0.0.0
> ```
> Then use your Mac's or PC's LAN IP in `API_URL`, for example:
> `http://192.168.1.42:3000/api/devices/readings`.

## Traffic light

The light follows the water level only:

- **Red:** water empty (0 %)
- **Yellow:** anywhere in between
- **Green:** water full (100 %)

On boot the LEDs light red, yellow, green for one second each as a wiring check.
Thresholds are at the top of the sketch.

## Pump

The pump runs through a relay and has its own power supply: never power it
from the ESP32's pins.

- **Starts** when soil is below 30 % and the water level is above 0 %.
- **Stays ON** once started until the soil sensor reaches at least 50 %, or stops immediately for safety if the tank reads empty or the soil wire faults.
- **Rests** 30 seconds after stopping so the water can soak in before starting a new cycle.
- **Never runs** if the soil reading is 4000 or more: that means a loose
  soil wire, and pumping on a false "dry" reading would flood the pot.

On boot, after the LED test, the pump runs for 2 seconds as a wiring check.

Most relay modules switch on when IN is LOW (`RELAY_ACTIVE_HIGH = false`).
If the pump runs when the serial says `Pump: OFF`, set it to `true`.

## Calibration

All values are raw ADC readings (0–4095), read from the serial monitor.

- `SOIL_DRY` / `SOIL_WET`: probe held still in dry air, then in water up to its
  line. Current values (2800 / 1220) are provisional.
- `WATER_EMPTY` / `WATER_FULL`: sensor dry, then fully submerged.
  Set to 0 / 2050 (measured 0 dry, ~2070–2190 submerged).

## Build and upload

Needs `arduino-cli` with the `esp32:esp32` core and the libraries U8g2,
DHT sensor library (Adafruit) and Adafruit Unified Sensor.

```bash
arduino-cli compile --fqbn esp32:esp32:esp32 hardware/terrapulse_node
arduino-cli upload -p /dev/cu.usbserial-10 --fqbn esp32:esp32:esp32:UploadSpeed=115200 hardware/terrapulse_node
```

The default 921600 upload speed fails on this board; use 115200.
Serial monitor: 115200 baud.
