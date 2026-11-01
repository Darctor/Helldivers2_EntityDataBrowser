const WeaponReloadComponentData = (() => {
const name = "WeaponReloadComponentData";
const schema = {
  events: [{ field: "slot", labelPath: `${name}.events.slot`, kind: "num" }, { field: "type", labelPath: `${name}.events.type` }],
};
return defineComponentView({
  name,
  contentId: "#weapon-reload-component-data-content",
  summarize(record) {
    return formatNumber(record.duration);
  },
  schema,
  i18n: {
    zh: {
      ability: "换弹动画技能 ID", duration: "换弹时间", eventTitle: "换弹动画事件",
      flags: { manual: "手动清除", allowMove: "换弹时允许移动" },
      events: { slot: "序号", type: "换弹动画事件" },
    },
    en: {
      ability: "Reload Ability ID", duration: "Reload Duration", eventTitle: "Reload Animation Events",
      flags: { manual: "Manual Clearing", allowMove: "Allow Move while Reloading" },
      events: { slot: "Slot", type: "Reload Event" },
    },
  },
  build(record) {
    const rawEvents = record.reload_anim_events || [];
    const events = rawEvents.flatMap((item, index) => (
      isPlaceholderEnum(item.type) ? [] : [{ slot: index + 1, type: item.type }]
    ));
    const eventType = enumTypeName(rawEvents.find((item) => !isPlaceholderEnum(item.type))?.type);
    return statGrid([
      enumStat(fieldLabel(name, "ability"), record.ability_type),
      { label: fieldLabel(name, "duration"), value: formatNumber(record.duration) },
      boolStat(fieldLabel(name, "flags.manual"), record.manual_clearing),
      boolStat(fieldLabel(name, "flags.allowMove"), record.reload_allow_move),
    ]) + subpanel(fieldLabel(name, "eventTitle"), createTable(enumColumn(schema.events, "type", eventType), events));
  },
});
})();
