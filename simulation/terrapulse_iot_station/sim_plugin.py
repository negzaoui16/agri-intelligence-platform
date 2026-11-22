"""Simulation-side Studio plugin for TerraPulse IoT MVP (hot-reloaded on save).

Models the user's real hardware workbench in a farm plot:
- 2 articulated solar panels
- Li-ion battery pack + 5V Boost Converter (feeds ESP32 VIN, Relay VCC, Pump)
- ESP32 DevKit + 1.3" blue I2C OLED Display + DHT11 sensor
- Blue JQC3F-05VDC-C 5V Relay (replacing the MOSFET driver) -> DC Water Pump
- Articulated capacitive soil moisture probe with MuJoCo touch/joint sensors
"""

import math
import os

import messages as user_messages
import mujoco
from mujoco.studio import messages
from mujoco.studio import plugin
import numpy as np

SCENE_XML = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'scene.xml'
)


class SimPlugin(plugin.SimPlugin):
  """Procedural MjSpec scene and real-time hardware + agronomy controller."""

  # Live user-tunable parameters
  panel_tilt_deg: float = 32.0
  hour_of_day: float = 13.5
  ambient_temp_c: float = 31.0
  moisture_threshold_pct: float = 35.0
  auto_mode: bool = True
  manual_pump_on: bool = False
  probe_inserted: bool = True

  # Dynamic physical state across physics steps
  soil_moisture_pct: float = 32.0
  battery_soc_pct: float = 78.0
  tank_level_pct: float = 85.0
  relay_closed: bool = False
  pulse_until_t: float | None = None
  last_step_t: float = 0.0
  impeller_angle: float = 0.0

  spec: mujoco.MjSpec | None = None

  def build_spec(self) -> mujoco.MjSpec:
    """Builds the procedural TerraPulse IoT hardware + crop plot scene."""
    spec = mujoco.MjSpec()
    spec.modelname = 'terrapulse_iot_station'
    spec.compiler.degree = False
    spec.option.timestep = 0.002
    spec.option.integrator = mujoco.mjtIntegrator.mjINT_IMPLICITFAST

    spec.visual.headlight.diffuse = [0.72, 0.72, 0.68]
    spec.visual.headlight.ambient = [0.35, 0.35, 0.35]
    spec.visual.headlight.specular = [0.15, 0.15, 0.15]
    spec.visual.global_.azimuth = 135
    spec.visual.global_.elevation = -24

    spec.add_texture(
        type=mujoco.mjtTexture.mjTEXTURE_SKYBOX,
        builtin=mujoco.mjtBuiltin.mjBUILTIN_GRADIENT,
        rgb1=[0.46, 0.68, 0.88],
        rgb2=[0.90, 0.88, 0.80],
        width=512,
        height=1024,
    )
    spec.add_texture(
        name='soil_tex',
        type=mujoco.mjtTexture.mjTEXTURE_2D,
        builtin=mujoco.mjtBuiltin.mjBUILTIN_CHECKER,
        mark=mujoco.mjtMark.mjMARK_NONE,
        rgb1=[0.36, 0.25, 0.17],
        rgb2=[0.32, 0.22, 0.15],
        width=256,
        height=256,
    )
    soil_mat = spec.add_material(
        name='soil_mat', texrepeat=[12, 12], texuniform=True, reflectance=0.05
    )
    soil_mat.textures[mujoco.mjtTextureRole.mjTEXROLE_RGB] = 'soil_tex'

    spec.default.geom.friction = [0.7, 0.005, 0.005]
    spec.default.geom.density = 1000

    world = spec.worldbody
    world.add_light(
        pos=[1.2, -1.0, 3.0],
        dir=[-0.3, 0.25, -1.0],
        type=mujoco.mjtLightType.mjLIGHT_DIRECTIONAL,
    )

    # Farm soil floor
    world.add_geom(
        name='farm_ground',
        type=mujoco.mjtGeom.mjGEOM_PLANE,
        size=[0, 0, 0.05],
        material='soil_mat',
    )

    # Irrigated root-zone bed & citrus/olive tree crop
    bed = world.add_body(name='crop_root_zone', pos=[-0.42, 0.0, 0.02])
    bed.add_geom(
        name='raised_soil_bed',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.36, 0.28, 0.02],
        rgba=[0.27, 0.18, 0.12, 1.0],
    )
    bed.add_geom(
        name='probe_soil_pad',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[0.18, 0.0, 0.015],
        size=[0.06, 0.01],
        rgba=[0.20, 0.34, 0.18, 1.0],
    )
    bed.add_geom(
        name='tree_trunk',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[-0.08, 0.0, 0.18],
        size=[0.028, 0.18],
        rgba=[0.38, 0.24, 0.13, 1.0],
    )
    bed.add_geom(
        name='tree_canopy',
        type=mujoco.mjtGeom.mjGEOM_ELLIPSOID,
        pos=[-0.08, 0.0, 0.44],
        size=[0.20, 0.20, 0.15],
        rgba=[0.18, 0.44, 0.22, 1.0],
    )
    # Citrus fruits
    for idx, fpos in enumerate([(-0.18, 0.10, 0.41), (0.04, -0.09, 0.45), (-0.06, 0.14, 0.49)]):
      bed.add_geom(
          name=f'citrus_fruit_{idx}',
          type=mujoco.mjtGeom.mjGEOM_SPHERE,
          pos=list(fpos),
          size=[0.026],
          rgba=[0.92, 0.56, 0.08, 1.0],
      )

    # Drip tube connecting tank -> DC pump -> citrus tree root zone
    world.add_geom(
        name='suction_pipe_segment',
        type=mujoco.mjtGeom.mjGEOM_CAPSULE,
        fromto=[0.11, -0.30, 0.045, 0.02, -0.26, 0.045],
        size=[0.010],
        rgba=[0.14, 0.15, 0.17, 1.0],
        contype=0,
        conaffinity=0,
    )
    world.add_geom(
        name='irrigation_pipe_segment',
        type=mujoco.mjtGeom.mjGEOM_CAPSULE,
        fromto=[-0.04, -0.26, 0.095, -0.36, -0.02, 0.050],
        size=[0.011],
        rgba=[0.12, 0.12, 0.14, 1.0],
        contype=0,
        conaffinity=0,
    )

    # Wooden electronics workbench / field stand
    bench = world.add_body(name='iot_workbench', pos=[0.26, 0.06, 0.14])
    bench.add_geom(
        name='bench_post',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[0, 0, -0.07],
        size=[0.025, 0.07],
        rgba=[0.42, 0.30, 0.18, 1.0],
    )
    bench.add_geom(
        name='wooden_board',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.24, 0.20, 0.012],
        rgba=[0.74, 0.56, 0.36, 1.0],
    )

    # 1. ESP32 DevKit + Telemetry Site
    esp = bench.add_body(name='esp32_devkit', pos=[-0.10, 0.07, 0.022])
    esp.add_geom(
        name='esp32_pcb',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.030, 0.016, 0.004],
        rgba=[0.10, 0.11, 0.13, 1.0],
    )
    esp.add_geom(
        name='esp32_rf_shield',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[-0.015, 0.0, 0.005],
        size=[0.009, 0.008, 0.002],
        rgba=[0.75, 0.77, 0.80, 1.0],
    )
    esp.add_site(name='esp32_site', pos=[0, 0, 0.01], size=[0.008])

    # 2. 1.3" Blue I2C OLED Display
    oled = bench.add_body(name='oled_13_i2c', pos=[-0.10, -0.04, 0.024])
    oled.add_geom(
        name='oled_pcb',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.020, 0.019, 0.003],
        rgba=[0.07, 0.24, 0.55, 1.0],
    )
    oled.add_geom(
        name='oled_glass',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[0, 0, 0.004],
        size=[0.017, 0.011, 0.0015],
        rgba=[0.05, 0.65, 0.92, 1.0],
    )

    # 3. Blue DHT11 Temperature & Humidity Sensor
    dht = bench.add_body(name='dht11_sensor', pos=[-0.02, 0.11, 0.026])
    dht.add_geom(
        name='dht11_housing',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.011, 0.009, 0.010],
        rgba=[0.11, 0.58, 0.88, 1.0],
    )

    # 4. Li-ion Battery + Holder
    bat = bench.add_body(name='battery_holder', pos=[0.12, 0.10, 0.024])
    bat.add_geom(
        name='battery_case',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.042, 0.015, 0.010],
        rgba=[0.12, 0.12, 0.14, 1.0],
    )
    bat.add_geom(
        name='liion_cell',
        type=mujoco.mjtGeom.mjGEOM_CAPSULE,
        fromto=[-0.032, 0, 0.004, 0.032, 0, 0.004],
        size=[0.009],
        rgba=[0.16, 0.45, 0.72, 1.0],
    )

    # 5. Blue 5V Boost Converter Module (from Image 1)
    boost = bench.add_body(name='boost_5v_converter', pos=[0.02, 0.01, 0.022])
    boost.add_geom(
        name='boost_pcb',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.024, 0.014, 0.003],
        rgba=[0.06, 0.25, 0.58, 1.0],
    )
    boost.add_geom(
        name='boost_inductor',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[0.003, 0.0, 0.006],
        size=[0.006, 0.006, 0.004],
        rgba=[0.16, 0.16, 0.18, 1.0],
    )
    boost.add_geom(
        name='boost_cap',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[0.015, 0.003, 0.007],
        size=[0.005, 0.005],
        rgba=[0.70, 0.72, 0.75, 1.0],
    )

    # 6. Blue JQC3F-05VDC-C Relay Module (from Image 2, replacing MOSFET)
    relay = bench.add_body(name='relay_jqc3f_05vdc', pos=[0.02, -0.09, 0.024])
    relay.add_geom(
        name='relay_pcb',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.026, 0.014, 0.003],
        rgba=[0.06, 0.26, 0.58, 1.0],
    )
    relay.add_geom(
        name='relay_coil_cube',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[-0.002, 0.0, 0.011],
        size=[0.010, 0.008, 0.009],
        rgba=[0.11, 0.50, 0.85, 1.0],
    )
    relay.add_geom(
        name='relay_terminals',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[-0.018, 0.0, 0.007],
        size=[0.005, 0.009, 0.005],
        rgba=[0.10, 0.36, 0.68, 1.0],
    )
    # Mechanical relay state flag (slides between OPEN=0 and CLOSED=0.018 m)
    relay_flag = relay.add_body(name='relay_contact_indicator', pos=[0.015, 0.0, 0.012])
    relay_flag.add_joint(
        name='relay_switch_joint',
        type=mujoco.mjtJoint.mjJNT_SLIDE,
        axis=[0, 1, 0],
        range=[0.0, 0.016],
        damping=2.0,
    )
    relay_flag.add_geom(
        name='relay_green_indicator',
        type=mujoco.mjtGeom.mjGEOM_SPHERE,
        size=[0.0045],
        rgba=[0.14, 0.85, 0.32, 1.0],
    )
    relay_act = spec.add_actuator(
        name='relay_switch_act',
        target='relay_switch_joint',
        trntype=mujoco.mjtTrn.mjTRN_JOINT,
    )
    relay_act.set_to_position(kp=120.0, dampratio=1.0)

    # 7. Articulated Mount for 2 Solar Panels
    pv_mast = world.add_body(name='solar_mast', pos=[0.54, 0.14, 0.22])
    pv_mast.add_geom(
        name='solar_pole',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[0, 0, -0.09],
        size=[0.016, 0.12],
        rgba=[0.30, 0.33, 0.36, 1.0],
    )
    pv_rack = pv_mast.add_body(name='dual_solar_panels', pos=[0, 0, 0.08])
    pv_rack.add_joint(
        name='panel_tilt_joint',
        type=mujoco.mjtJoint.mjJNT_HINGE,
        axis=[0, 1, 0],
        range=[0.0, 1.08],
        damping=2.0,
    )
    # 2 solar panels side-by-side in an aluminum frame (lightweight for crisp servo tracking)
    for idx, y_off in enumerate([-0.105, 0.105], start=1):
      pv_rack.add_geom(
          name=f'solar_panel_frame_{idx}',
          type=mujoco.mjtGeom.mjGEOM_BOX,
          pos=[0.0, y_off, 0.0],
          size=[0.125, 0.095, 0.006],
          rgba=[0.78, 0.80, 0.83, 1.0],
          mass=0.15,
          contype=0,
          conaffinity=0,
      )
      pv_rack.add_geom(
          name=f'solar_panel_cells_{idx}',
          type=mujoco.mjtGeom.mjGEOM_BOX,
          pos=[0.0, y_off, 0.005],
          size=[0.115, 0.086, 0.003],
          rgba=[0.07, 0.14, 0.34, 1.0],
          mass=0.05,
          contype=0,
          conaffinity=0,
      )
    pv_act = spec.add_actuator(
        name='panel_tilt_act',
        target='panel_tilt_joint',
        trntype=mujoco.mjtTrn.mjTRN_JOINT,
    )
    pv_act.set_to_position(kp=350.0, dampratio=1.0)

    # 8. Water Tank & White DC Submersible Pump (matching Image 1)
    tank = world.add_body(name='water_tank', pos=[0.20, -0.32, 0.12])
    tank.add_geom(
        name='tank_shell',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        size=[0.11, 0.12],
        rgba=[0.16, 0.45, 0.72, 0.38],
        contype=0,
        conaffinity=0,
    )
    tank.add_geom(
        name='tank_base',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[0, 0, -0.115],
        size=[0.115, 0.008],
        rgba=[0.22, 0.25, 0.28, 1.0],
        contype=0,
        conaffinity=0,
    )
    water_col = tank.add_body(name='tank_water_column', pos=[0, 0, -0.02])
    water_col.add_joint(
        name='tank_level_joint',
        type=mujoco.mjtJoint.mjJNT_SLIDE,
        axis=[0, 0, 1],
        range=[-0.09, 0.04],
        damping=2.0,
    )
    water_col.add_geom(
        name='water_volume',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        size=[0.096, 0.085],
        rgba=[0.12, 0.56, 0.90, 0.75],
        mass=0.2,
        contype=0,
        conaffinity=0,
    )
    tank_act = spec.add_actuator(
        name='tank_level_act',
        target='tank_level_joint',
        trntype=mujoco.mjtTrn.mjTRN_JOINT,
    )
    tank_act.set_to_position(kp=200.0, dampratio=1.0)

    # White DC Water Pump next to tank (shifted cleanly clear of tank wall)
    pump = world.add_body(name='dc_water_pump', pos=[-0.02, -0.26, 0.045])
    pump.add_geom(
        name='pump_housing',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        euler=[0, math.pi / 2.0, 0],
        size=[0.028, 0.045],
        rgba=[0.92, 0.92, 0.90, 1.0],
        contype=0,
        conaffinity=0,
    )
    pump.add_geom(
        name='pump_outlet_nozzle',
        type=mujoco.mjtGeom.mjGEOM_CYLINDER,
        pos=[-0.02, 0, 0.036],
        size=[0.011, 0.022],
        rgba=[0.90, 0.90, 0.88, 1.0],
        contype=0,
        conaffinity=0,
    )
    impeller = pump.add_body(name='pump_impeller', pos=[0.050, 0, 0])
    impeller.add_joint(
        name='pump_impeller_joint',
        type=mujoco.mjtJoint.mjJNT_HINGE,
        axis=[1, 0, 0],
        armature=0.002,
        damping=0.002,
    )
    impeller.add_geom(
        name='impeller_blade_a',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.004, 0.022, 0.005],
        rgba=[0.12, 0.56, 0.90, 1.0],
        contype=0,
        conaffinity=0,
    )
    impeller.add_geom(
        name='impeller_blade_b',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        size=[0.004, 0.005, 0.022],
        rgba=[0.12, 0.56, 0.90, 1.0],
        contype=0,
        conaffinity=0,
    )
    pump_motor = spec.add_actuator(
        name='pump_impeller_motor',
        target='pump_impeller_joint',
        trntype=mujoco.mjtTrn.mjTRN_JOINT,
    )
    pump_motor.set_to_velocity(kv=0.05)

    # 9. Articulated Capacitive Soil Moisture Probe over Root-Zone Soil Pad
    probe_frame = world.add_body(name='soil_probe_gantry', pos=[-0.24, 0.0, 0.20])
    probe_frame.add_geom(
        name='probe_arm_support',
        type=mujoco.mjtGeom.mjGEOM_CAPSULE,
        fromto=[0.28, 0.04, 0.02, 0.0, 0.018, 0.02],
        size=[0.008],
        rgba=[0.28, 0.30, 0.32, 1.0],
        contype=0,
        conaffinity=0,
    )
    probe = probe_frame.add_body(name='capacitive_soil_probe', pos=[0.0, 0.0, -0.04])
    probe.add_joint(
        name='probe_slide_joint',
        type=mujoco.mjtJoint.mjJNT_SLIDE,
        axis=[0, 0, 1],
        range=[-0.135, 0.04],
        damping=4.0,
    )
    probe.add_geom(
        name='probe_pcb_head',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[0, 0, 0.04],
        size=[0.015, 0.004, 0.018],
        rgba=[0.10, 0.12, 0.14, 1.0],
    )
    probe.add_geom(
        name='probe_capacitive_blade',
        type=mujoco.mjtGeom.mjGEOM_BOX,
        pos=[0, 0, -0.01],
        size=[0.011, 0.0025, 0.045],
        rgba=[0.78, 0.62, 0.22, 1.0],
    )
    probe.add_site(
        name='probe_tip_site',
        type=mujoco.mjtGeom.mjGEOM_SPHERE,
        pos=[0, 0, -0.052],
        size=[0.016],
    )
    probe_act = spec.add_actuator(
        name='probe_slide_act',
        target='probe_slide_joint',
        trntype=mujoco.mjtTrn.mjTRN_JOINT,
    )
    probe_act.set_to_position(kp=150.0, dampratio=1.0)

    # Physical MuJoCo Sensors
    spec.add_sensor(
        name='panel_tilt_sensor',
        type=mujoco.mjtSensor.mjSENS_JOINTPOS,
        objtype=mujoco.mjtObj.mjOBJ_JOINT,
        objname='panel_tilt_joint',
    )
    spec.add_sensor(
        name='probe_depth_sensor',
        type=mujoco.mjtSensor.mjSENS_JOINTPOS,
        objtype=mujoco.mjtObj.mjOBJ_JOINT,
        objname='probe_slide_joint',
    )
    spec.add_sensor(
        name='probe_touch_sensor',
        type=mujoco.mjtSensor.mjSENS_TOUCH,
        objtype=mujoco.mjtObj.mjOBJ_SITE,
        objname='probe_tip_site',
    )
    spec.add_sensor(
        name='pump_rpm_sensor',
        type=mujoco.mjtSensor.mjSENS_JOINTVEL,
        objtype=mujoco.mjtObj.mjOBJ_JOINT,
        objname='pump_impeller_joint',
    )
    spec.add_sensor(
        name='station_gps_sensor',
        type=mujoco.mjtSensor.mjSENS_FRAMEPOS,
        objtype=mujoco.mjtObj.mjOBJ_SITE,
        objname='esp32_site',
    )

    return spec

  @messages.handler
  def on_load_model(self, event: messages.LoadModelEvent) -> bool:
    if event.path:
      return False
    self.spec = self.build_spec()
    self.handle.set_model(self.spec)
    return True

  @messages.handler
  def on_post_model(self, event: messages.PostModelEvent) -> None:
    self.last_step_t = float(event.data.time)
    mujoco.mj_forward(event.model, event.data)

  @messages.handler
  def on_hot_reload(self, event: messages.HotReloadEvent) -> None:
    if self in event.plugins:
      self.handle.reload()

  @messages.handler
  def on_station_config(self, snapshot: user_messages.StationConfig) -> None:
    self.panel_tilt_deg = float(np.clip(snapshot.panel_tilt_deg, 0.0, 60.0))
    self.hour_of_day = float(np.clip(snapshot.hour_of_day, 5.0, 21.0))
    self.ambient_temp_c = float(np.clip(snapshot.ambient_temp_c, 10.0, 50.0))
    self.moisture_threshold_pct = float(
        np.clip(snapshot.moisture_threshold_pct, 10.0, 75.0)
    )
    self.auto_mode = snapshot.auto_mode
    self.manual_pump_on = snapshot.manual_pump_on
    self.probe_inserted = snapshot.probe_inserted

  @messages.handler
  def on_pulse_pump(self, event: user_messages.TriggerPumpPulseEvent) -> None:
    self.auto_mode = False
    self.manual_pump_on = True
    self.pulse_until_t = self.last_step_t + max(1.0, event.duration_s)

  @messages.handler
  def on_simulate_july(self, event: user_messages.SimulateJulyPeakEvent) -> None:
    del event
    self.ambient_temp_c = 38.0
    self.hour_of_day = 13.5
    self.soil_moisture_pct = 24.0
    self.auto_mode = True
    self.pulse_until_t = None

  @messages.handler
  def on_bake(self, event: user_messages.BakeEvent) -> None:
    del event
    if self.spec is None:
      return
    with open(SCENE_XML, 'w', encoding='utf-8') as f:
      f.write(self.spec.to_xml())
    self.handle.dispatch(messages.LoadModelEvent(path=SCENE_XML))

  @messages.handler
  def on_pre_step(self, event: messages.PreStepEvent) -> None:
    model, data = event.model, event.data

    # Timed manual pump pulse timeout
    if self.pulse_until_t is not None and data.time >= self.pulse_until_t:
      self.pulse_until_t = None
      self.manual_pump_on = False

    # 1. Solar panels actuator target
    target_tilt_rad = math.radians(self.panel_tilt_deg)
    data.actuator('panel_tilt_act').ctrl[0] = target_tilt_rad

    # 2. Capacitive soil probe target depth (inserted vs raised)
    data.actuator('probe_slide_act').ctrl[0] = -0.105 if self.probe_inserted else 0.02

    # 3. Relay JQC3F-05VDC-C state & DC Pump drive
    if self.relay_closed and self.tank_level_pct > 2.0:
      data.actuator('relay_switch_act').ctrl[0] = 0.015
      data.actuator('pump_impeller_motor').ctrl[0] = 12.0
    else:
      data.actuator('relay_switch_act').ctrl[0] = 0.0
      data.actuator('pump_impeller_motor').ctrl[0] = 0.0

    # 4. Water tank piston height reflects remaining tank %
    tank_slide_m = -0.085 + 0.115 * (self.tank_level_pct / 100.0)
    data.actuator('tank_level_act').ctrl[0] = tank_slide_m
    del model

  @messages.handler
  def on_post_step(self, event: messages.PostStepEvent) -> None:
    data = event.data
    t_now = float(data.time)
    dt = max(0.0, t_now - self.last_step_t)
    self.last_step_t = t_now

    # Read actual MuJoCo sensor values
    panel_tilt_actual_deg = math.degrees(float(data.sensor('panel_tilt_sensor').data[0]))
    probe_slide_m = float(data.sensor('probe_depth_sensor').data[0])
    probe_depth_mm = max(0.0, (-probe_slide_m - 0.02) * 1000.0)
    probe_touch_n = float(data.sensor('probe_touch_sensor').data[0])
    pump_vel_rad_s = abs(float(data.sensor('pump_rpm_sensor').data[0]))
    pump_rpm = pump_vel_rad_s * 60.0 / (2.0 * math.pi)

    # Compute solar irradiance from sun hour (peak ~1000 W/m2 around 13:00) and panel angle
    sun_phase = max(0.0, math.sin(math.pi * (self.hour_of_day - 6.0) / 14.0))
    sun_elev_deg = 70.0 * sun_phase
    ideal_tilt = max(5.0, 90.0 - sun_elev_deg - 25.0)
    angle_factor = max(0.35, math.cos(math.radians(panel_tilt_actual_deg - ideal_tilt)))
    irradiance_wm2 = 980.0 * sun_phase * angle_factor
    # 2 mini solar panels (approx 2x 5W peak at 1000 W/m2)
    solar_power_w = 10.0 * (irradiance_wm2 / 1000.0)

    # Evaluate ESP32 relay decision (auto firmware hysteresis vs manual)
    can_power = self.battery_soc_pct > 12.0 or solar_power_w > 4.0
    if self.auto_mode:
      if not self.relay_closed and self.soil_moisture_pct < self.moisture_threshold_pct:
        if can_power and self.tank_level_pct > 4.0:
          self.relay_closed = True
      elif self.relay_closed:
        if (
            self.soil_moisture_pct >= min(85.0, self.moisture_threshold_pct + 16.0)
            or not can_power
            or self.tank_level_pct <= 2.0
        ):
          self.relay_closed = False
    else:
      self.relay_closed = bool(self.manual_pump_on and can_power and self.tank_level_pct > 2.0)

    pump_flow_l_min = 2.1 * min(1.2, pump_rpm / 100.0) if self.relay_closed else 0.0

    # Integrate soil evaporation vs watering + battery charge/discharge (accelerated time scale x40 for visible demo)
    if dt > 0.0 and dt < 0.2:
      evap_rate_pct_s = 0.25 + max(0.0, self.ambient_temp_c - 20.0) * 0.035 + 0.0005 * irradiance_wm2
      add_moisture_s = 2.8 if self.relay_closed else 0.0
      self.soil_moisture_pct = float(
          np.clip(self.soil_moisture_pct + (add_moisture_s - evap_rate_pct_s) * dt, 8.0, 95.0)
      )
      if self.relay_closed:
        self.tank_level_pct = max(0.0, self.tank_level_pct - 1.2 * dt)

      pump_load_w = 3.8 if self.relay_closed else 0.45
      net_power_w = solar_power_w - pump_load_w
      self.battery_soc_pct = float(
          np.clip(self.battery_soc_pct + net_power_w * 0.22 * dt, 5.0, 100.0)
      )

    battery_voltage_v = 3.25 + 0.95 * (self.battery_soc_pct / 100.0)
    boost_5v_out_v = 5.02 if battery_voltage_v >= 3.3 else 4.65
    dht11_humidity_pct = float(
        np.clip(72.0 - (self.ambient_temp_c - 20.0) * 1.4 + (8.0 if self.relay_closed else 0.0), 18.0, 92.0)
    )

    # When probe is lifted above soil, simulate air reading instead of soil reading
    displayed_soil_pct = self.soil_moisture_pct if self.probe_inserted else 0.0

    line1 = 'TERRAPULSE IoT MVP'
    line2 = f'T:{self.ambient_temp_c:.1f}C H:{dht11_humidity_pct:.0f}%'
    line3 = f'SOL:{displayed_soil_pct:.0f}% BAT:{battery_voltage_v:.2f}V'
    line4 = (
        f'REL:ON  PUMP:{pump_flow_l_min:.1f}L/m'
        if self.relay_closed
        else f'REL:OFF TANK:{self.tank_level_pct:.0f}%'
    )

    self.handle.send_to_viewer(
        user_messages.IoTTelemetry(
            sim_time=t_now,
            dht11_temp_c=self.ambient_temp_c,
            dht11_humidity_pct=dht11_humidity_pct,
            soil_moisture_pct=displayed_soil_pct,
            probe_depth_mm=probe_depth_mm,
            probe_contact_force_n=probe_touch_n,
            panel_tilt_actual_deg=panel_tilt_actual_deg,
            solar_irradiance_wm2=irradiance_wm2,
            solar_power_w=solar_power_w,
            battery_voltage_v=battery_voltage_v,
            battery_soc_pct=self.battery_soc_pct,
            boost_5v_out_v=boost_5v_out_v,
            relay_closed=self.relay_closed,
            pump_flow_l_min=pump_flow_l_min,
            pump_rpm=pump_rpm,
            tank_level_pct=self.tank_level_pct,
            oled_line1=line1,
            oled_line2=line2,
            oled_line3=line3,
            oled_line4=line4,
        )
    )
