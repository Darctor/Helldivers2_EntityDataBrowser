const ExplosiveComponentData = (() => {
const name = "ExplosiveComponentData";
const schema = {
  effects: [{ field: "type", labelPath: `${name}.effects.type` }, { field: "value", labelPath: `${name}.effects.value`, kind: "num" }],
};
return defineComponentView({
  name,
  contentId: "#explosive-component-data-content",
  summarize(record) {
    return enumLabel(record.mode);
  },
  schema,
  i18n: {
    zh: {
      mode: "行为模式", armingDelay: "启动引信延迟", explosionDelay: "引信延迟", removalDelay: "移除延迟",
      explosionType: "爆炸类型", impactExplosionType: "撞击爆炸类型", minUnitSize: "最小触发体型",
      templateType: "状态效果模板类型", lifetime: "效果持续时间", innerRadius: "效果内半径", outerRadius: "效果外半径",
      effectTitle: "状态效果",
      effects: { type: "状态效果类型", value: "状态效果累计值" },
    },
    en: {
      mode: "Mode", armingDelay: "Arming Delay", explosionDelay: "Explosion Delay", removalDelay: "Removal Delay",
      explosionType: "Explosion Type", impactExplosionType: "Impact Explosion Type", minUnitSize: "Min Detection Size",
      templateType: "Status Effect Template", lifetime: "Lifetime", innerRadius: "Inner Radius", outerRadius: "Outer Radius",
      effectTitle: "Status Effects",
      effects: { type: "Effect Type", value: "Accumulated Value" },
    },
  },
  build(record) {
    const volume = record.status_effect_template || {};
    const template = volume.effect_template || {};
    const rawEffects = template.effects || [];
    const rows = rawEffects.flatMap((item) => (
      isPlaceholderEnum(item.type) ? [] : [{ type: item.type, value: item.value }]
    ));
    const effectType = enumTypeName(rawEffects.find((item) => !isPlaceholderEnum(item.type)));
    return statGrid([
      enumStat(fieldLabel(name, "mode"), record.mode),
      { label: fieldLabel(name, "armingDelay"), value: formatNumber(record.arming_delay) },
      { label: fieldLabel(name, "explosionDelay"), value: formatNumber(record.explosion_delay) },
      { label: fieldLabel(name, "removalDelay"), value: formatNumber(record.removal_delay) },
      enumStat(fieldLabel(name, "explosionType"), record.explosion_type),
      enumStat(fieldLabel(name, "impactExplosionType"), record.impact_explosion_type),
      enumStat(fieldLabel(name, "minUnitSize"), record.step_detection_min_unit_size),
      enumStat(fieldLabel(name, "templateType"), template.type),
      { label: fieldLabel(name, "lifetime"), value: formatNumber(volume.lifetime) },
      { label: fieldLabel(name, "innerRadius"), value: formatNumber(volume.inner_radius) },
      { label: fieldLabel(name, "outerRadius"), value: formatNumber(volume.outer_radius) },
    ]) + subpanel(fieldLabel(name, "effectTitle"), createTable(enumColumn(schema.effects, "type", effectType), rows));
  },
});
})();
