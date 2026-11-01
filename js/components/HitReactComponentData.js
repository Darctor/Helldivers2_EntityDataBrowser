const HitReactComponentData = (() => {
const name = "HitReactComponentData";

const schema = {
  set: [
    { field: "event", labelPath: `${name}.set.event` },
    { field: "threshold", labelPath: `${name}.set.threshold`, kind: "num" },
    { field: "stagger", labelPath: `${name}.set.stagger`, kind: "bool" },
    { field: "cooldown", labelPath: `${name}.set.cooldown`, kind: "num" },
    { field: "duration", labelPath: `${name}.set.duration`, kind: "num" },
    { field: "interrupt", labelPath: `${name}.set.interrupt`, kind: "bool" },
  ],
};

const i18n = {
  zh: { set: { event: "受击事件", threshold: "踉跄阈值", stagger: "造成踉跄", cooldown: "冷却时间", duration: "持续时间", interrupt: "可打断技能" } },
  en: { set: { event: "Hit Event", threshold: "Stagger Threshold", stagger: "Staggers", cooldown: "Cooldown", duration: "Duration", interrupt: "Can Interrupt Skills" } },
};

function toRows(record) {
  return (record.hit_react_sets_1 || []).filter((item) => !/HitReactEventType_None/.test(item.event_type || ""))
    .map((item) => ({
      event: item.event_type, threshold: item.force_strength_threshold, stagger: item.do_stagger,
      cooldown: item.stagger_cooldown, duration: item.stagger_duration, interrupt: item.can_interrupt_abilities,
    }));
}

function eventType(record) {
  return enumTypeName((record.hit_react_sets_1 || []).find((item) => !/HitReactEventType_None/.test(item.event_type || ""))?.event_type);
}

return defineComponentView({
  name,
  contentId: "#hit-react-component-data-content",
  summarize(record) {
    return `${(record.hit_react_sets || []).filter((item) => !/HitReactEventType_None/.test(item.event_type || "")).length} ${state.locale === "zh" ? "个反应组" : "reaction sets"}`;
  },
  schema,
  i18n,
  build(record) {
    return createTable(enumColumn(schema.set, "event", eventType(record)), toRows(record));
  },
});
})();
