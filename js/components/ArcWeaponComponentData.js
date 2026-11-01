const ArcWeaponComponentData = (() => {
const name = "ArcWeaponComponentData";
return defineComponentView({
  name,
  contentId: "#arc-weapon-component-data-content",
  summarize(record) {
    return `${enumLabel(record.arc_type)} / ${formatNumber(record.rounds_per_minute)} RPM`;
  },
  schema: {},
  i18n: {
    zh: { arcType: "电弧类型", roundsPerMinute: "每分钟射速", infiniteAmmo: "无限弹药" },
    en: { arcType: "Arc Type", roundsPerMinute: "Rounds per Minute", infiniteAmmo: "Infinite Ammo" },
  },
  build(record) {
    return statGrid([
      enumStat(fieldLabel(name, "arcType"), record.arc_type),
      { label: fieldLabel(name, "roundsPerMinute"), value: formatNumber(record.rounds_per_minute) },
      boolStat(fieldLabel(name, "infiniteAmmo"), record.infinite_ammo),
    ]);
  },
});
})();
