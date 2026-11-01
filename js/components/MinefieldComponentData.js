const MinefieldComponentData = (() => {
const name = "MinefieldComponentData";
return defineComponentView({
  name,
  contentId: "#minefield-component-data-content",
  summarize(record) {
    return enumLabel(record.explosion_type);
  },
  schema: {},
  i18n: {
    zh: {
      triggerTime: "触发到爆炸的时间", chainReactionTime: "连锁引爆时间", armTime: "引信准备时间",
      explosionType: "爆炸类型", minUnitSize: "最小触发体型",
    },
    en: {
      triggerTime: "Trigger Time", chainReactionTime: "Chain Reaction Time", armTime: "Arm Time",
      explosionType: "Explosion Type", minUnitSize: "Min Trigger Size",
    },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "triggerTime"), value: formatNumber(record.trigger_time) },
      { label: fieldLabel(name, "chainReactionTime"), value: formatNumber(record.chain_reaction_time) },
      { label: fieldLabel(name, "armTime"), value: formatNumber(record.arm_time) },
      enumStat(fieldLabel(name, "explosionType"), record.explosion_type),
      enumStat(fieldLabel(name, "minUnitSize"), record.step_detection_min_unit_size),
    ]);
  },
});
})();
