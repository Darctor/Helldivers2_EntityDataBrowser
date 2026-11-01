const DamageZoneShieldComponentData = (() => {
const name = "DamageZoneShieldComponentData";
const schema = {
  zones: [
    { field: "zone", labelPath: `${name}.zones.zone`, kind: "id" },
    { field: "rechargeDelay", labelPath: `${name}.zones.rechargeDelay`, kind: "num" },
    { field: "brokenRechargeDelay", labelPath: `${name}.zones.brokenRechargeDelay`, kind: "num" },
    { field: "rechargeRate", labelPath: `${name}.zones.rechargeRate`, kind: "num" },
    { field: "starterCharge", labelPath: `${name}.zones.starterCharge`, kind: "num" },
  ],
};
return defineComponentView({
  name,
  contentId: "#damage-zone-shield-component-data-content",
  summarize(record) {
    return `${(record.shieldable_zones || []).length} ${state.locale === "zh" ? "个部位" : "zones"}`;
  },
  schema,
  i18n: {
    zh: {
      blockMelee: "阻挡近战类型", zoneTitle: "可护盾部位",
      zones: { zone: "部位 ID", rechargeDelay: "回复延迟", brokenRechargeDelay: "破盾后回复延迟", rechargeRate: "每秒回复", starterCharge: "回复开始时的起始量" },
    },
    en: {
      blockMelee: "Block Melee Type", zoneTitle: "Shieldable Zones",
      zones: { zone: "Zone ID", rechargeDelay: "Recharge Delay", brokenRechargeDelay: "Broken Recharge Delay", rechargeRate: "Recharge per Second", starterCharge: "Starter Charge" },
    },
  },
  build(record) {
    const rows = (record.shieldable_zones || []).map((zone) => ({
      zone: zone.zone_name,
      rechargeDelay: zone.recharge_delay,
      brokenRechargeDelay: zone.broken_recharge_delay,
      rechargeRate: zone.recharge_rate,
      starterCharge: zone.starter_charge_on_recharge,
    }));
    return statGrid([
      enumStat(fieldLabel(name, "blockMelee"), record.block_melee_type),
    ]) + subpanel(fieldLabel(name, "zoneTitle"), createTable(schema.zones, rows));
  },
});
})();
