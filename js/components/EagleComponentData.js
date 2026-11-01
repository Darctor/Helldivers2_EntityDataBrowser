const EagleComponentData = (() => {
const name = "EagleComponentData";
return defineComponentView({
  name,
  contentId: "#eagle-component-data-content",
  summarize(record) {
    return enumLabel(record.payload);
  },
  schema: {},
  i18n: {
    zh: { payload: "飞鹰载荷类型", pattern: "投弹模式", projectile: "射弹类型" },
    en: { payload: "Eagle Payload", pattern: "Airstrike Pattern", projectile: "Projectile Type" },
  },
  build(record) {
    return statGrid([
      enumStat(fieldLabel(name, "payload"), record.payload),
      enumStat(fieldLabel(name, "pattern"), record.airstrike_pattern),
      enumStat(fieldLabel(name, "projectile"), record.projectile_type),
    ]);
  },
});
})();
