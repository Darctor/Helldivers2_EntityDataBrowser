const ShieldComponentData = (() => {
const name = "ShieldComponentData";
return defineComponentView({
  name,
  contentId: "#shield-component-data-content",
  summarize(record) {
    return formatNumber(record.radius);
  },
  schema: {},
  i18n: {
    zh: {
      radius: "护盾半径", rechargeDelay: "回复延迟", brokenDelay: "破盾后回复延迟", rechargeRate: "每秒回复",
      starter: "回复开始时的起始量", blockMelee: "阻挡近战类型", color: "护盾颜色", shape: "护盾形状",
    },
    en: {
      radius: "Radius", rechargeDelay: "Recharge Delay", brokenDelay: "Broken Recharge Delay", rechargeRate: "Recharge per Second",
      starter: "Starter Charge", blockMelee: "Block Melee Type", color: "Shield Color", shape: "Shield Shape",
    },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "radius"), value: formatNumber(record.radius) },
      { label: fieldLabel(name, "rechargeDelay"), value: formatNumber(record.recharge_delay) },
      { label: fieldLabel(name, "brokenDelay"), value: formatNumber(record.broken_recharge_delay) },
      { label: fieldLabel(name, "rechargeRate"), value: formatNumber(record.recharge_rate) },
      { label: fieldLabel(name, "starter"), value: formatNumber(record.starter_charge_on_recharge) },
      enumStat(fieldLabel(name, "blockMelee"), record.block_melee_type),
      enumStat(fieldLabel(name, "color"), record.shield_color_type),
      enumStat(fieldLabel(name, "shape"), record.shield_shape),
    ]);
  },
});
})();
