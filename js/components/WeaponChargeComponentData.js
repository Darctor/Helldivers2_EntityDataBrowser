const WeaponChargeComponentData = (() => {
const name = "WeaponChargeComponentData";
const schema = {
  stages: [
    { field: "stage", labelPath: `${name}.stages.stage`, kind: "num" },
    { field: "chargeTime", labelPath: `${name}.stages.chargeTime`, kind: "num" },
    { field: "projectile", labelPath: `${name}.stages.projectile` },
  ],
  multipliers: [
    { field: "item", labelPath: `${name}.multipliers.item` },
    { field: "min", labelPath: `${name}.multipliers.min`, kind: "num" },
    { field: "overcharge", labelPath: `${name}.multipliers.overcharge`, kind: "num" },
  ],
};
const multiplierRows = [
  ["speed", "speed_multiplier_min", "speed_multiplier_overcharge"],
  ["damage", "damage_multiplier_min", "damage_multiplier_overcharge"],
  ["penetration", "penetration_multiplier_min", "penetration_multiplier_overcharge"],
  ["distance", "distance_multiplier_min", "distance_multiplier_overcharge"],
  ["splits", "extra_arc_splits_min", "extra_arc_splits_overcharge"],
  ["chains", "extra_arc_chains_min", "extra_arc_chains_overcharge"],
];
return defineComponentView({
  name,
  contentId: "#weapon-charge-component-data-content",
  summarize(record) {
    const stages = (record.charge_state_settings || []).filter((item) => Number(item.charge_time) || !isPlaceholderEnum(item.projectile_type));
    return `${stages.length} ${state.locale === "zh" ? "段充能" : "charge stages"}`;
  },
  schema,
  i18n: {
    zh: {
      stageTitle: "充能阶段", multiplierTitle: "射弹倍率",
      stages: { stage: "阶段", chargeTime: "充能时间", projectile: "射弹类型" },
      multipliers: { item: "项目", min: "最小", overcharge: "过充" },
      speed: "射弹初速", damage: "伤害", penetration: "穿甲", distance: "电弧距离", splits: "电弧额外分裂", chains: "电弧连锁",
      extraTitle: "过充与额外射弹",
      autoFire: "安全模式自动发射", extraProjectiles: "额外射弹数量", extraInterval: "额外射弹产生间隔",
      overchargeExplosion: "过度充能爆炸类型", overchargeTime: "过度充能爆炸时间",
    },
    en: {
      stageTitle: "Charge Stages", multiplierTitle: "Projectile Multipliers",
      stages: { stage: "Stage", chargeTime: "Charge Time", projectile: "Projectile Type" },
      multipliers: { item: "Item", min: "Minimum", overcharge: "Overcharge" },
      speed: "Projectile Speed", damage: "Damage", penetration: "Penetration", distance: "Arc Distance", splits: "Extra Arc Splits", chains: "Extra Arc Chains",
      extraTitle: "Overcharge and Extra Projectiles",
      autoFire: "Auto Fire in Safety", extraProjectiles: "Extra Projectiles", extraInterval: "Extra Projectile Interval",
      overchargeExplosion: "Overcharge Explosion Type", overchargeTime: "Overcharge Explosion Time",
    },
  },
  build(record) {
    const stages = (record.charge_state_settings || []).flatMap((item, index) => {
      if (!Number(item.charge_time) && isPlaceholderEnum(item.projectile_type)) return [];
      return [{ stage: index + 1, chargeTime: item.charge_time, projectile: item.projectile_type }];
    });
    const stageType = enumTypeName((record.charge_state_settings || [])[0]?.projectile_type);
    const multipliers = record.projectile_multipliers || {};
    const rows = multiplierRows.map(([label, minKey, maxKey]) => ({
      item: fieldLabel(name, label),
      min: multipliers[minKey],
      overcharge: multipliers[maxKey],
    }));
    const overcharge = record["0xE5073B6A"] || {};
    return subpanel(fieldLabel(name, "stageTitle"), createTable(enumColumn(schema.stages, "projectile", stageType), stages))
      + subpanel(fieldLabel(name, "multiplierTitle"), createTable(schema.multipliers, rows))
      + subpanel(fieldLabel(name, "extraTitle"), statGrid([
        boolStat(fieldLabel(name, "autoFire"), record.auto_fire_in_safety),
        { label: fieldLabel(name, "extraProjectiles"), value: formatNumber(record.extra_projectiles) },
        { label: fieldLabel(name, "extraInterval"), value: formatNumber(record.extra_projectiles_interval) },
        enumStat(fieldLabel(name, "overchargeExplosion"), record.overcharge_explosion_type),
        { label: fieldLabel(name, "overchargeTime"), value: formatNumber(overcharge.overcharge_explosion_time) },
      ]));
  },
});
})();
