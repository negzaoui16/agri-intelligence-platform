"""Viewer-side Dear ImGui Studio plugin for TerraPulse IoT MVP (hot-reloaded)."""

import os
import pathlib

import messages as user_messages
from mujoco.studio import messages
from mujoco.studio import plugin
from mujoco.studio.app import plugins as app_plugins

imgui = app_plugins.imgui

WORKSPACE_DIR = pathlib.Path(os.path.abspath(__file__)).parent


class ViewerPlugin(plugin.ViewerPlugin):
  """Interactive hardware & agronomy dashboard inside MuJoCo Studio."""

  panel_tilt_deg: float = 32.0
  hour_of_day: float = 13.5
  ambient_temp_c: float = 31.0
  moisture_threshold_pct: float = 35.0
  auto_mode: bool = True
  manual_pump_on: bool = False
  probe_inserted: bool = True
  telemetry: user_messages.IoTTelemetry = user_messages.IoTTelemetry()
  window_open: bool = True

  @messages.handler
  def on_telemetry(self, snapshot: user_messages.IoTTelemetry) -> None:
    self.telemetry = snapshot

  def _send_config(self) -> None:
    self.viewer.send_to_sim(
        user_messages.StationConfig(
            panel_tilt_deg=self.panel_tilt_deg,
            hour_of_day=self.hour_of_day,
            ambient_temp_c=self.ambient_temp_c,
            moisture_threshold_pct=self.moisture_threshold_pct,
            auto_mode=self.auto_mode,
            manual_pump_on=self.manual_pump_on,
            probe_inserted=self.probe_inserted,
        )
    )

  def _build_oled_preview_gui(self, t: user_messages.IoTTelemetry) -> None:
    imgui.TextUnformatted('1.3" I2C OLED Display (Live Field Screen)')
    imgui.PushStyleColor(imgui.Col.ChildBg, imgui.Vec4(0.03, 0.06, 0.14, 1.0))
    imgui.PushStyleColor(imgui.Col.Border, imgui.Vec4(0.18, 0.56, 0.90, 1.0))
    if imgui.BeginChild('##OledScreenBox', imgui.Vec2(0, 96), imgui.ChildFlags.Borders):
      cyan = imgui.Vec4(0.45, 0.88, 1.0, 1.0)
      amber = imgui.Vec4(1.0, 0.78, 0.28, 1.0)
      green = imgui.Vec4(0.35, 0.95, 0.48, 1.0)
      imgui.TextColored(cyan, t.oled_line1)
      imgui.TextColored(cyan, t.oled_line2)
      imgui.TextColored(cyan, t.oled_line3)
      imgui.TextColored(green if t.relay_closed else amber, t.oled_line4)
    imgui.EndChild()
    imgui.PopStyleColor(2)

  def _build_telemetry_table_gui(self, t: user_messages.IoTTelemetry) -> None:
    flags = (
        imgui.TableFlags.BordersInnerH.value
        | imgui.TableFlags.SizingStretchProp.value
    )
    if imgui.BeginTable('##HardwareSensorsTable', 3, flags):
      imgui.TableSetupColumn('Hardware Module')
      imgui.TableSetupColumn('Live Reading')
      imgui.TableSetupColumn('Status')
      imgui.TableHeadersRow()

      rows = [
          (
              '2x Solar Panels',
              f'{t.solar_power_w:.1f} W ({t.solar_irradiance_wm2:.0f} W/m2)',
              f'Tilt {t.panel_tilt_actual_deg:.1f} deg',
          ),
          (
              'Battery + 5V Boost',
              f'{t.battery_voltage_v:.2f} V ({t.battery_soc_pct:.0f}%)',
              f'5V OUT: {t.boost_5v_out_v:.2f} V',
          ),
          (
              'Relay JQC3F-05VDC-C',
              'CLOSED (NO -> COM)' if t.relay_closed else 'OPEN (Idle)',
              'GREEN LED ON' if t.relay_closed else 'RED PWR ONLY',
          ),
          (
              'DC Water Pump',
              f'{t.pump_flow_l_min:.1f} L/min ({t.pump_rpm:.0f} rpm)',
              f'Tank {t.tank_level_pct:.0f}%',
          ),
          (
              'DHT11 (GPIO4)',
              f'{t.dht11_temp_c:.1f} C | {t.dht11_humidity_pct:.0f}% RH',
              'Air Micro-Climate',
          ),
          (
              'Soil Probe (GPIO34)',
              f'{t.soil_moisture_pct:.1f}% moisture',
              f'Touch {t.probe_contact_force_n:.1f} N',
          ),
      ]
      for mod, reading, status in rows:
        imgui.TableNextRow()
        imgui.TableNextColumn()
        imgui.TextUnformatted(mod)
        imgui.TableNextColumn()
        imgui.TextUnformatted(reading)
        imgui.TableNextColumn()
        imgui.TextUnformatted(status)

      imgui.EndTable()

  @messages.handler
  def on_build_gui(self, event: messages.BuildGuiEvent) -> None:
    del event
    if not self.window_open:
      return
    expanded, self.window_open = imgui.Begin(
        'TerraPulse IoT MVP Station###TerraPulseIoTWindow', self.window_open
    )
    try:
      if not expanded:
        return
      t = self.telemetry
      imgui.TextUnformatted(f't = {t.sim_time:.1f} s  |  Relay JQC3F-05VDC-C + 5V Boost')
      imgui.Separator()

      self._build_oled_preview_gui(t)
      imgui.Spacing()

      # Action Buttons & Modes
      changed = False
      c_auto, self.auto_mode = imgui.Checkbox(
          'Auto Irrigation Firmware Mode (ESP32)##AutoMode', self.auto_mode
      )
      changed |= c_auto

      if not self.auto_mode:
        c_man, self.manual_pump_on = imgui.Checkbox(
            'Relay JQC3F Closed (Pump ON)##ManualRelay', self.manual_pump_on
        )
        changed |= c_man

      c_probe, self.probe_inserted = imgui.Checkbox(
          'Soil Probe Inserted in Root Zone##ProbeIns', self.probe_inserted
      )
      changed |= c_probe

      if imgui.Button('Simulate Hot July Day (38 C, Dry Soil)###JulyPresetBtn'):
        self.ambient_temp_c = 38.0
        self.hour_of_day = 13.5
        self.auto_mode = True
        self.viewer.send_to_sim(user_messages.SimulateJulyPeakEvent())
        changed = True

      imgui.SameLine()
      if imgui.Button('Pump 5s Pulse###PumpPulseBtn'):
        self.auto_mode = False
        self.manual_pump_on = True
        self.viewer.send_to_sim(user_messages.TriggerPumpPulseEvent(duration_s=5.0))

      # Parameter Sliders
      c1, self.panel_tilt_deg = imgui.SliderFloat(
          'Solar Panels Tilt (deg)##TiltSlider', self.panel_tilt_deg, 0.0, 60.0
      )
      c2, self.hour_of_day = imgui.SliderFloat(
          'Hour of Day (Sun)##HourSlider', self.hour_of_day, 6.0, 20.0
      )
      c3, self.ambient_temp_c = imgui.SliderFloat(
          'Ambient Temp (C)##TempSlider', self.ambient_temp_c, 15.0, 45.0
      )
      c4, self.moisture_threshold_pct = imgui.SliderFloat(
          'Relay Trigger Threshold (%)##ThreshSlider',
          self.moisture_threshold_pct,
          15.0,
          65.0,
      )
      if changed or c1 or c2 or c3 or c4:
        self._send_config()

      imgui.Separator()
      self._build_telemetry_table_gui(t)

      if imgui.CollapsingHeader('Real-World Hardware Cablage (JQC3F Relay + 5V Boost)'):
        imgui.BulletText('2x Solar Panels + Battery -> TP4056 / Charger -> 5V Boost IN')
        imgui.BulletText('5V Boost OUT (+) -> ESP32 VIN + Relay VCC + Relay COM')
        imgui.BulletText('ESP32 GPIO26 -> Relay IN | Relay NO -> Pump (+), Pump (-) -> GND')
        imgui.BulletText('OLED 1.3" I2C: SDA=GPIO21, SCL=GPIO22, VCC=3.3V, GND=GND')
        imgui.BulletText('DHT11 Data=GPIO4 (3.3V) | Capacitive Soil Moisture=GPIO34 (ADC)')

      imgui.Separator()
      if imgui.Button('Bake to scene.xml###BakeXmlBtn'):
        self.viewer.send_to_sim(user_messages.BakeEvent())
    finally:
      imgui.End()
