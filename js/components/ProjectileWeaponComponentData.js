const ProjectileWeaponComponentData = (() => {
const name = "ProjectileWeaponComponentData";
return defineComponentView({
  name,
  contentId: "#projectile-weapon-component-data-content",
  summarize(record) {
    const rpm = record.rounds_per_minute || {};
    return `${enumLabel(record.projectile_type)} / ${formatNumber(rpm.x)} ${formatNumber(rpm.y)} ${formatNumber(rpm.z)}`;
  },
  schema: {},
  i18n: {
    zh: {
      projectileType: "主射弹类型", rpm: "每分钟射速 X/Y/Z",
      infiniteAmmo: "无限弹药", projectileEntity: "主射弹实体哈希", silenced: "使用消音音效",
      functionType: "副射弹类型", functionEntity: "副射弹实体哈希",
    },
    en: {
      projectileType: "Primary Projectile", rpm: "Rounds per Minute X/Y/Z",
      infiniteAmmo: "Infinite Ammo", projectileEntity: "Primary Projectile Entity", silenced: "Silenced",
      functionType: "Secondary Projectile", functionEntity: "Secondary Projectile Entity",
    },
  },
  build(record) {
    const rpm = record.rounds_per_minute || {};
    return statGrid([
      enumStat(fieldLabel(name, "projectileType"), record.projectile_type),
      { label: fieldLabel(name, "rpm"), kind: "vec3", value: rpm },
      boolStat(fieldLabel(name, "infiniteAmmo"), record.infinite_ammo),
      boolStat(fieldLabel(name, "silenced"), record.silenced),
      hashStat(fieldLabel(name, "projectileEntity"), record.projectile_entity),
      enumStat(fieldLabel(name, "functionType"), record.weapon_function_projectile_type),
      hashStat(fieldLabel(name, "functionEntity"), record.weapon_function_projectile_entity),
    ]);
  },
  links(record) {
    return linkedHashEntries([
      [record.projectile_entity, fieldLabel(name, "projectileEntity")],
      [record.weapon_function_projectile_entity, fieldLabel(name, "functionEntity")],
    ]);
  },
});
})();
