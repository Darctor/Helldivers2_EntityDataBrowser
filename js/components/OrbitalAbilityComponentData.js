const OrbitalAbilityComponentData = (() => {
const name = "OrbitalAbilityComponentData";
return defineComponentView({
  name,
  contentId: "#orbital-ability-component-data-content",
  summarize(record) {
    return formatNumber(record.duration);
  },
  schema: {},
  i18n: {
    zh: {
      duration: "持续时间", removeTime: "移除时间", movementSpeed: "移动速度", searchRadius: "搜索半径",
      damageInfoType: "伤害类型", interval: "伤害间隔", shape: "伤害区域形状",
      size: "区域大小 X/Y/Z",
      noiseHitTemplate: "噪音模板", projectileType: "射弹类型",
      projectileSpawnHeight: "射弹生成高度", projectileSpawnDelay: "射弹生成延迟", targetListUpdateTime: "目标列表更新时间",
      zoneTitle: "伤害区域",
    },
    en: {
      duration: "Duration", removeTime: "Remove Time", movementSpeed: "Movement Speed", searchRadius: "Search Radius",
      damageInfoType: "Damage Type", interval: "Damage Interval", shape: "Zone Shape",
      size: "Zone Size X/Y/Z",
      noiseHitTemplate: "Noise Template", projectileType: "Projectile Type",
      projectileSpawnHeight: "Spawn Height", projectileSpawnDelay: "Spawn Delay", targetListUpdateTime: "Target Update Time",
      zoneTitle: "Damage Dealer Zone",
    },
  },
  build(record) {
    const zone = record.damage_dealer_zone || {};
    const size = zone.size || {};
    return statGrid([
      { label: fieldLabel(name, "duration"), value: formatNumber(record.duration) },
      { label: fieldLabel(name, "removeTime"), value: formatNumber(record.remove_time) },
      { label: fieldLabel(name, "movementSpeed"), value: formatNumber(record.movement_speed) },
      { label: fieldLabel(name, "searchRadius"), value: formatNumber(record.search_radius) },
      enumStat(fieldLabel(name, "noiseHitTemplate"), record.noise_hit_template),
      enumStat(fieldLabel(name, "projectileType"), record.projectile_type),
      { label: fieldLabel(name, "projectileSpawnHeight"), value: formatNumber(record.projectile_spawn_height) },
      { label: fieldLabel(name, "projectileSpawnDelay"), value: formatNumber(record.projectile_spawn_delay) },
      { label: fieldLabel(name, "targetListUpdateTime"), value: formatNumber(record.target_list_update_time) },
    ]) + subpanel(fieldLabel(name, "zoneTitle"), statGrid([
      enumStat(fieldLabel(name, "damageInfoType"), zone.damage_info_type),
      { label: fieldLabel(name, "interval"), value: formatNumber(zone.interval) },
      enumStat(fieldLabel(name, "shape"), zone.shape),
      { label: fieldLabel(name, "size"), kind: "vec3", value: size },
    ]));
  },
});
})();
