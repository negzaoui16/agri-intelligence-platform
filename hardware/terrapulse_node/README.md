# TerraPulse field node (ESP32)

Prototype sensor node: reads air temperature/humidity, soil moisture and
water level, shows them on an OLED and sets a traffic-light LED.

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
- **Stops** when soil reaches 60 %, the tank reads empty, or after 10 seconds.
- **Rests** 30 seconds after stopping so the water can soak in before the
  soil is measured again.
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
