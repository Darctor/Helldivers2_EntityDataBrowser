const SprayWeaponComponentData = (() => {
const name = "SprayWeaponComponentData";
return defineComponentView({
  name,
  contentId: "#spray-weapon-component-data-content",
  summarize(record) {
    return enumLabel(record.projectile_type);
  },
  schema: {},
  i18n: {
    zh: { warmup: "预热时间", cooldown: "冷却时间", ammoCost: "弹药消耗", projectile: "射弹类型", damage: "射流伤害" },
    en: { warmup: "Warmup Time", cooldown: "Cooldown Time", ammoCost: "Ammo Cost", projectile: "Projectile Type", damage: "Spray Damage" },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "warmup"), value: formatNumber(record.warmup_time) },
      { label: fieldLabel(name, "cooldown"), value: formatNumber(record.cooldown_time) },
      { label: fieldLabel(name, "ammoCost"), value: formatNumber(record.ammo_cost) },
      enumStat(fieldLabel(name, "projectile"), record.projectile_type),
      enumStat(fieldLabel(name, "damage"), record.damage_info_type),
    ]);
  },
});
})();
