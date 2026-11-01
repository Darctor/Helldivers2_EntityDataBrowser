/**
 * 三个传感器组件共用一个页面区块（#sensor-component-data-content），各自一个 subpanel 分隔区。
 * 每个组件只写一份 build(record)，render（主页面插槽）与 buildNested（挂载树嵌套）共用。
 * 数据链依赖的是组件注册与 store 加载，与本文件的页面展示互不影响。
 */
const SENSOR_SECTION_CONTENT = "#sensor-component-data-content";

function renderSensorSubpanel(name, record, body) {
  const container = document.querySelector(SENSOR_SECTION_CONTENT);
  if (!container) return;
  let slot = container.querySelector(`[data-sensor="${name}"]`);
  if (!slot) {
    slot = document.createElement("div");
    slot.dataset.sensor = name;
    container.append(slot);
  }
  // 无数据时清空该组件的分隔区；整个区块的折叠由 syncSectionCollapse 统一处理。
  slot.innerHTML = record ? subpanel(fieldLabel(name, "title"), body(record)) : "";
}

const SensorDangerComponentData = (() => {
const name = "SensorDangerComponentData";
function build(record) {
  return statGrid([
    { label: fieldLabel(name, "dangerMax"), value: formatNumber(record.danger_max) },
    { label: fieldLabel(name, "sphereRadius"), value: formatNumber(record.danger_sphere_radius) },
    boolStat(fieldLabel(name, "ignoreStance"), record.ignore_stance),
  ]);
}
return {
  name,
  file: name,
  label: { zh: "SensorDangerComponent（危险感知）", en: "SensorDangerComponent" },
  summarize(record) {
    return formatNumber(record.danger_max);
  },
  schema: {},
  i18n: {
    zh: { title: "危险感知", dangerMax: "最大危险值", sphereRadius: "感知的危险半径", ignoreStance: "忽略姿态组件" },
    en: { title: "Danger Sensor", dangerMax: "Danger Max", sphereRadius: "Danger Radius", ignoreStance: "Ignore Stance" },
  },
  render(_hash, record) {
    renderSensorSubpanel(name, record, build);
  },
  buildNested(_hash, record) {
    return nestedComponentPanel(name, build(record));
  },
};
})();

const SensorEarComponentData = (() => {
const name = "SensorEarComponentData";
function build(record) {
  return statGrid([
    { label: fieldLabel(name, "noiseMax"), value: formatNumber(record.noise_max) },
    { label: fieldLabel(name, "hearingMultiplier"), value: formatNumber(record.hearing_multiplier) },
    { label: fieldLabel(name, "unkFloat"), value: formatNumber(record.unk_float_0x0008) },
    { label: fieldLabel(name, "attractNoise"), value: (record.unk_enum_0x000C || []).filter((item) => !isPlaceholderEnum(item)).map((item) => enumLabel(item)).join("、") || "—", type: enumTypeName((record.unk_enum_0x000C || []).find((item) => !isPlaceholderEnum(item))) },
  ]);
}
return {
  name,
  file: name,
  label: { zh: "SensorEarComponent（听觉感知）", en: "SensorEarComponent" },
  summarize(record) {
    return formatNumber(record.noise_max);
  },
  schema: {},
  i18n: {
    zh: { title: "听觉感知", noiseMax: "最大噪音值", hearingMultiplier: "听力倍率", unkFloat: "未知浮点（和霸王虫相关）", attractNoise: "吸引实体的噪音模板" },
    en: { title: "Hearing Sensor", noiseMax: "Noise Max", hearingMultiplier: "Hearing Multiplier", unkFloat: "Unknown Float (Hirex)", attractNoise: "Attracting Noise Templates" },
  },
  render(_hash, record) {
    renderSensorSubpanel(name, record, build);
  },
  buildNested(_hash, record) {
    return nestedComponentPanel(name, build(record));
  },
};
})();

const SensorEyeComponentData = (() => {
const name = "SensorEyeComponentData";
function build(record) {
  return statGrid([
    { label: fieldLabel(name, "distance"), value: formatNumber(record.distance) },
    { label: fieldLabel(name, "peripheralDistance"), value: formatNumber(record.peripheral_distance) },
    { label: fieldLabel(name, "backDistance"), value: formatNumber(record.back_distance) },
    { label: fieldLabel(name, "angleHorizontal"), value: formatNumber(record.angle_horizontal) },
    { label: fieldLabel(name, "angleVertical"), value: formatNumber(record.angle_vertical) },
    { label: fieldLabel(name, "sightNode"), kind: "id", value: record.sight_node },
    boolStat(fieldLabel(name, "useSightNode"), record.use_sight_node_for_direction),
    enumStat(fieldLabel(name, "eyeType"), record.eye_type),
  ]);
}
return {
  name,
  file: name,
  label: { zh: "SensorEyeComponent（视觉感知）", en: "SensorEyeComponent" },
  summarize(record) {
    return formatNumber(record.distance);
  },
  schema: {},
  i18n: {
    zh: {
      title: "视觉感知", distance: "视野距离", peripheralDistance: "周边视觉外的视野距离", backDistance: "背面视野距离",
      angleHorizontal: "水平锥角", angleVertical: "垂直锥角", sightNode: "视线节点", useSightNode: "使用视线节点指向", eyeType: "视野类型",
    },
    en: {
      title: "Vision Sensor", distance: "Vision Distance", peripheralDistance: "Peripheral Distance", backDistance: "Back Distance",
      angleHorizontal: "Horizontal Cone", angleVertical: "Vertical Cone", sightNode: "Sight Node", useSightNode: "Use Sight Node Direction", eyeType: "Eye Type",
    },
  },
  render(_hash, record) {
    renderSensorSubpanel(name, record, build);
  },
  buildNested(_hash, record) {
    return nestedComponentPanel(name, build(record));
  },
};
})();
