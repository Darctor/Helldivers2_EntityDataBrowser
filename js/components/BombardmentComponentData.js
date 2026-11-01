const BombardmentComponentData = (() => {
const name = "BombardmentComponentData";
return defineComponentView({
  name,
  contentId: "#bombardment-component-data-content",
  summarize(record) {
    return `${formatNumber(record.num_bombs)} × ${formatNumber(record.num_salvos)}`;
  },
  schema: {},
  i18n: {
    zh: {
      initialDelay: "第一颗投弹延迟", numBombs: "单轮齐射炸弹数量", bombInterval: "投弹间隔", bombIntervalOffset: "投弹间隔随机偏移",
      numSalvos: "齐射次数", salvoInterval: "齐射间隔", salvoIntervalOffset: "齐射间隔随机偏移",
      areaSize: "区域大小", fireHeight: "开火高度", fireFromShip: "从舰船上发射", speed: "轰炸行进速度", startDelay: "轰炸开始前延迟",
      projectileTitle: "射弹类型",
    },
    en: {
      initialDelay: "Initial Delay", numBombs: "Bombs per Salvo", bombInterval: "Bomb Interval", bombIntervalOffset: "Bomb Interval Offset",
      numSalvos: "Salvo Count", salvoInterval: "Salvo Interval", salvoIntervalOffset: "Salvo Interval Offset",
      areaSize: "Area Size", fireHeight: "Fire Height", fireFromShip: "Fire from Ship", speed: "Travel Speed", startDelay: "Start Delay",
      projectileTitle: "Projectile Types",
    },
  },
  build(record) {
    const projectiles = (record.projectile_types || []).filter((item) => !isPlaceholderEnum(item));
    return statGrid([
      { label: fieldLabel(name, "initialDelay"), value: formatNumber(record.initial_delay) },
      { label: fieldLabel(name, "numBombs"), value: formatNumber(record.num_bombs) },
      { label: fieldLabel(name, "bombInterval"), value: formatNumber(record.bomb_interval) },
      { label: fieldLabel(name, "bombIntervalOffset"), value: formatNumber(record.bomb_interval_random_offset) },
      { label: fieldLabel(name, "numSalvos"), value: formatNumber(record.num_salvos) },
      { label: fieldLabel(name, "salvoInterval"), value: formatNumber(record.salvo_interval) },
      { label: fieldLabel(name, "salvoIntervalOffset"), value: formatNumber(record.salvo_interval_random_offset) },
      { label: fieldLabel(name, "areaSize"), value: formatNumber(record.area_size) },
      { label: fieldLabel(name, "fireHeight"), value: formatNumber(record.fire_height) },
      boolStat(fieldLabel(name, "fireFromShip"), record.fire_from_ship),
      { label: fieldLabel(name, "speed"), value: formatNumber(record.speed) },
      { label: fieldLabel(name, "startDelay"), value: formatNumber(record.start_delay) },
    ]) + subpanel(fieldLabel(name, "projectileTitle"), chipFlow(projectiles));
  },
});
})();
