const WeaponRoundsComponentData = (() => {
const name = "WeaponRoundsComponentData";
const schema = {};
return defineComponentView({
  name,
  contentId: "#weapon-rounds-component-data-content",
  summarize(record) {
    const capacity = record.magazine_capacity || {};
    return formatNumber(capacity.x);
  },
  schema,
  i18n: {
    zh: {
      primary: "主要弹药类型", alternate: "次要弹药类型", primaryCapacity: "主要弹药弹仓容量", alternateCapacity: "次要弹药弹仓容量",
      ammoCapacity: "备弹上限", ammoRefill: "弹药补给数量", ammo: "起始备弹数量", reloadAmount: "装填回复数量",
      primaryThreshold: "主要允许装填阈值", alternateThreshold: "次要允许装填阈值",
      flags: { chambered: "枪膛可装弹" },
    },
    en: {
      primary: "Primary Ammo Type", alternate: "Alternate Ammo Type", primaryCapacity: "Primary Magazine Capacity", alternateCapacity: "Alternate Magazine Capacity",
      ammoCapacity: "Ammo Capacity", ammoRefill: "Ammo Refill", ammo: "Starting Ammo", reloadAmount: "Reload Amount",
      primaryThreshold: "Primary Reload Threshold", alternateThreshold: "Alternate Reload Threshold",
      flags: { chambered: "Chambered Round" },
    },
  },
  build(record) {
    const types = record.ammo_types || {};
    const capacity = record.magazine_capacity || {};
    const thresholds = record.reload_thresholds || {};
    return statGrid([
      enumStat(fieldLabel(name, "primary"), types.primary_projectile_type),
      enumStat(fieldLabel(name, "alternate"), types.alternate_projectile_type),
      { label: fieldLabel(name, "primaryCapacity"), value: formatNumber(capacity.x) },
      { label: fieldLabel(name, "alternateCapacity"), value: formatNumber(capacity.y) },
      { label: fieldLabel(name, "ammoCapacity"), value: formatNumber(record.ammo_capacity) },
      { label: fieldLabel(name, "ammoRefill"), value: formatNumber(record.ammo_refill) },
      { label: fieldLabel(name, "ammo"), value: formatNumber(record.ammo) },
      { label: fieldLabel(name, "reloadAmount"), value: formatNumber(record.reload_amount) },
      { label: fieldLabel(name, "primaryThreshold"), value: formatNumber(thresholds.x) },
      { label: fieldLabel(name, "alternateThreshold"), value: formatNumber(thresholds.y) },
      // 布尔混合规则：单布尔并入统计卡，不再独占一行表。
      boolStat(fieldLabel(name, "flags.chambered"), record.chambered),
    ]);
  },
});
})();
