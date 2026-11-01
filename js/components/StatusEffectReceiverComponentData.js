const StatusEffectReceiverComponentData = (() => {
const name = "StatusEffectReceiverComponentData";

const schema = {
  zone: [
    { field: "zone", labelPath: `${name}.zone.id`, kind: "num" },
    { field: "type", labelPath: `${name}.zone.type` },
    { field: "min", labelPath: `${name}.zone.min`, kind: "num" },
    { field: "max", labelPath: `${name}.zone.max`, kind: "num" },
    { field: "multiplier", labelPath: `${name}.zone.multiplier`, kind: "percent" },
  ],
  resistance: [
    { field: "type", labelPath: `${name}.resistance.type` },
    { field: "scale", labelPath: `${name}.resistance.scale`, kind: "num" },
  ],
};

const i18n = {
  zh: {
    zone: { id: "受击部位 ID", type: "效果类型", min: "最低阈值", max: "最高阈值", multiplier: "伤害倍率" },
    resistance: { type: "效果类型", scale: "持续时间倍率" },
  },
  en: {
    zone: { id: "Zone ID", type: "Effect Type", min: "Min Threshold", max: "Max Threshold", multiplier: "Damage Multiplier" },
    resistance: { type: "Effect Type", scale: "Duration Scale" },
  },
};

function toZoneRows(record) {
  return (record.zones || []).flatMap((zone) => (zone.susceptibilities || [])
    .filter((item) => !/SusceptibilityType_None/.test(item.type || ""))
    .map((item) => ({
      zone: zone.damageable_zone_name, type: item.type, min: item.min_threshold, max: item.max_threshold,
      multiplier: item.damage_multiplier,
    })));
}

function toResistanceRows(record) {
  return (record.status_effect_resistances || []).filter((item) => !/SusceptibilityType_None/.test(item.susceptibilities_type || ""))
    .map((item) => ({ type: item.susceptibilities_type, scale: item.duration_scale }));
}

// 两个表格的 type 列都是 StatusEffectSusceptibilityType；取首个非 None 的原始值提取类型名。
function susceptibilityType(record) {
  for (const zone of record.zones || []) {
    const item = (zone.susceptibilities || []).find((entry) => !/SusceptibilityType_None/.test(entry.type || ""));
    if (item) return enumTypeName(item.type);
  }
  const resistance = (record.status_effect_resistances || []).find((entry) => !/SusceptibilityType_None/.test(entry.susceptibilities_type || ""));
  return enumTypeName(resistance?.susceptibilities_type);
}

return defineComponentView({
  name,
  contentId: "#status-effect-receiver-component-data-content",
  summarize(record) {
    return `${(record.zones || []).length} ${state.locale === "zh" ? "个区域" : "zones"}`;
  },
  schema,
  i18n,
  build(record) {
    const type = susceptibilityType(record);
    const resistances = toResistanceRows(record);
    return createTable(enumColumn(schema.zone, "type", type), toZoneRows(record)) +
      (resistances.length ? subpanel(state.locale === "zh" ? "状态效果抗性" : "Status Effect Resistance", createTable(enumColumn(schema.resistance, "type", type), resistances)) : "");
  },
});
})();
