const WeaponMagazineComponentData = (() => {
const name = "WeaponMagazineComponentData";
const schema = {};
return defineComponentView({
  name,
  contentId: "#weapon-magazine-component-data-content",
  summarize(record) {
    return `${formatNumber(record.magazine_capacity)} × ${formatNumber(record.magazines)}`;
  },
  schema,
  i18n: {
    zh: {
      magazineType: "弹匣类型", capacity: "弹匣容量", magazines: "起始弹匣数", refill: "补给弹匣数", max: "最大弹匣数量", reload: "可换弹阈值",
      patternTitle: "弹匣中的射弹类型",
      flags: { chambered: "枪膛可装弹" },
    },
    en: {
      magazineType: "Magazine Type", capacity: "Capacity", magazines: "Starting Magazines", refill: "Refill Magazines", max: "Max Magazines", reload: "Reload Threshold",
      patternTitle: "Projectile Pattern",
      flags: { chambered: "Chambered Round" },
    },
  },
  build(record) {
    const pattern = record.magazine_pattern || {};
    const projectiles = [];
    (pattern.projectiles || []).some((item) => {
      if (isPlaceholderEnum(item)) return true;
      projectiles.push(item);
      return false;
    });
    // 布尔混合规则：单布尔并入统计卡，不再独占一行表（≥2 个布尔才成一行紧凑表）。
    return statGrid([
      enumStat(fieldLabel(name, "magazineType"), record.magazine_type),
      { label: fieldLabel(name, "capacity"), value: formatNumber(record.magazine_capacity) },
      { label: fieldLabel(name, "magazines"), value: formatNumber(record.magazines) },
      { label: fieldLabel(name, "refill"), value: formatNumber(record.magazines_refill) },
      { label: fieldLabel(name, "max"), value: formatNumber(record.magazines_max) },
      { label: fieldLabel(name, "reload"), value: formatNumber(record.reload_threshold) },
      boolStat(fieldLabel(name, "flags.chambered"), record.chambered),
    ]) + subpanel(fieldLabel(name, "patternTitle"), chipFlow(projectiles));
  },
});
})();
