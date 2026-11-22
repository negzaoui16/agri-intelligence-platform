"""Shared dataclasses for the TerraPulse IoT MVP Field Station simulation."""

import dataclasses
from mujoco.studio import messages


@dataclasses.dataclass(frozen=True)
class StationConfig(messages.Snapshot):
  """UI -> sim: interactive hardware & environment parameters (latest wins)."""

  panel_tilt_deg: float = 32.0
  hour_of_day: float = 13.5
  ambient_temp_c: float = 31.0
  moisture_threshold_pct: float = 35.0
  auto_mode: bool = True
  manual_pump_on: bool = False
  probe_inserted: bool = True


@dataclasses.dataclass(frozen=True)
class TriggerPumpPulseEvent(messages.Event):
  """UI -> sim: manually run the DC water pump for 5 simulated seconds."""

  duration_s: float = 5.0


@dataclasses.dataclass(frozen=True)
class SimulateJulyPeakEvent(messages.Event):
  """UI -> sim: preset hot July afternoon with dry soil to trigger auto relay."""


@dataclasses.dataclass(frozen=True)
class BakeEvent(messages.Event):
  """UI -> sim: write current Python procedural scene to scene.xml."""


@dataclasses.dataclass(frozen=True)
class IoTTelemetry(messages.Snapshot):
  """sim -> UI: live sensor, relay, boost converter, and OLED readings."""

  sim_time: float = 0.0
  dht11_temp_c: float = 31.0
  dht11_humidity_pct: float = 44.0
  soil_moisture_pct: float = 32.0
  probe_depth_mm: float = 0.0
  probe_contact_force_n: float = 0.0
  panel_tilt_actual_deg: float = 32.0
  solar_irradiance_wm2: float = 850.0
  solar_power_w: float = 8.4
  battery_voltage_v: float = 3.95
  battery_soc_pct: float = 78.0
  boost_5v_out_v: float = 5.02
  relay_closed: bool = False
  pump_flow_l_min: float = 0.0
  pump_rpm: float = 0.0
  tank_level_pct: float = 85.0
  oled_line1: str = "TERRAPULSE IoT"
  oled_line2: str = "T:31.0C H:44% S:32%"
  oled_line3: str = "BAT:3.95V 5V:OK"
  oled_line4: str = "RELAY:OFF PUMP:IDLE"
