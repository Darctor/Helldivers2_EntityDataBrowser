const WeaponDataComponentData = (() => {
const name = "WeaponDataComponentData";
const schema = {
  recoil: [
    { field: "pattern", labelPath: `${name}.recoil.pattern` },
    { field: "horizontal", labelPath: `${name}.recoil.horizontal`, kind: "num" },
    { field: "vertical", labelPath: `${name}.recoil.vertical`, kind: "num" },
    { field: "recoilLimitF1", labelPath: `${name}.recoil.recoilLimitF1`, kind: "num" },
    { field: "recoilLimitF2", labelPath: `${name}.recoil.recoilLimitF2`, kind: "num" },
  ],
};
function recoilNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
function panelRecoil(recoil) {
  const drift = recoil.drift || {};
  const climb = recoil.climb || {};
  const horizontal = (recoilNumber(drift.horizontal_recoil) + recoilNumber(climb.horizontal_recoil)) / 2;
  const vertical = (recoilNumber(drift.vertical_recoil) + recoilNumber(climb.vertical_recoil)) / 2;
  return { horizontal, vertical, combined: (horizontal + vertical) / 2 };
}
function recoilRow(label, pattern) {
  const source = pattern || {};
  return {
    pattern: label,
    horizontal: source.horizontal_recoil,
    vertical: source.vertical_recoil,
    recoilLimitF1: source.unk_float_r0x000C,
    recoilLimitF2: source.unk_float_r0x0010,
  };
}
return defineComponentView({
  name,
  contentId: "#weapon-data-component-data-content",
  summarize(record) {
    return enumLabel(record.primary_fire_mode);
  },
  schema,
  i18n: {
    zh: {
      recoilTitle: "后坐力", spreadTitle: "散布与操控", fireModeTitle: "开火模式", behaviorTitle: "行为",
      panelHorizontal: "面板水平后坐力", panelVertical: "面板垂直后坐力", panelCombined: "面板后坐力",
      panelHorizontalHint: "= (drift.h + climb.h) / 2", panelVerticalHint: "= (drift.v + climb.v) / 2", panelCombinedHint: "= (水平 + 垂直) / 2",
      horizontalSpread: "水平散布", verticalSpread: "垂直散布", sway: "摆动倍率", aimBlock: "阻挡瞄准长度",
      visibility: "开火能见度倍率", ergonomics: "人体工学", noise: "噪音模板",
      crosshair: "准心图案哈希", crosshairType: "准心类型",
      primary: "首要开火模式", secondary: "次要开火模式", tertiary: "第三开火模式", quaternary: "第四开火模式",
      recoil: { pattern: "模式", horizontal: "水平后坐力", vertical: "垂直后坐力", recoilLimitF1: "后坐力限制f1", recoilLimitF2: "后坐力限制f2", drift: "漂移", climb: "爬升" },
      flags: { allowFpv: "允许第一人称", hideWeapons: "第一人称下隐藏武器", allowAiming: "允许瞄准", preventMovement: "开火时阻止移动", infiniteAmmo: "无限弹药", suppressed: "消音武器" },
    },
    en: {
      recoilTitle: "Recoil", spreadTitle: "Spread and Handling", fireModeTitle: "Fire Modes", behaviorTitle: "Behavior",
      panelHorizontal: "Panel Horizontal Recoil", panelVertical: "Panel Vertical Recoil", panelCombined: "Panel Recoil",
      panelHorizontalHint: "= (drift.h + climb.h) / 2", panelVerticalHint: "= (drift.v + climb.v) / 2", panelCombinedHint: "= (horizontal + vertical) / 2",
      horizontalSpread: "Horizontal Spread", verticalSpread: "Vertical Spread", sway: "Sway Multiplier", aimBlock: "Aim Block Length",
      visibility: "Visibility Modifier", ergonomics: "Ergonomics", noise: "Noise Template",
      crosshair: "Crosshair Hash", crosshairType: "Crosshair Type",
      primary: "Primary Fire Mode", secondary: "Secondary Fire Mode", tertiary: "Tertiary Fire Mode", quaternary: "Quaternary Fire Mode",
      recoil: { pattern: "Pattern", horizontal: "Horizontal Recoil", vertical: "Vertical Recoil", recoilLimitF1: "Recoil Limit f1", recoilLimitF2: "Recoil Limit f2", drift: "Drift", climb: "Climb" },
      flags: { allowFpv: "Allow FPV", hideWeapons: "Hide Weapons in FPV", allowAiming: "Allow Aiming", preventMovement: "Prevent Movement when Firing", infiniteAmmo: "Infinite Ammo", suppressed: "Suppressed" },
    },
  },
  build(record) {
    const recoil = record.recoil_info || {};
    const spread = record.spread_info || {};
    const rows = [
      recoilRow(fieldLabel(name, "recoil.drift"), recoil.drift),
      recoilRow(fieldLabel(name, "recoil.climb"), recoil.climb),
    ];
    const panel = panelRecoil(recoil);
    return subpanel(fieldLabel(name, "recoilTitle"), statGrid([
      { label: fieldLabel(name, "panelHorizontal"), value: formatNumber(panel.horizontal), hint: fieldLabel(name, "panelHorizontalHint") },
      { label: fieldLabel(name, "panelVertical"), value: formatNumber(panel.vertical), hint: fieldLabel(name, "panelVerticalHint") },
      { label: fieldLabel(name, "panelCombined"), value: formatNumber(panel.combined), hint: fieldLabel(name, "panelCombinedHint") },
    ]) + createTable(schema.recoil, rows))
      + subpanel(fieldLabel(name, "spreadTitle"), statGrid([
        { label: fieldLabel(name, "horizontalSpread"), value: formatNumber(spread.horizontal) },
        { label: fieldLabel(name, "verticalSpread"), value: formatNumber(spread.vertical) },
        { label: fieldLabel(name, "sway"), value: formatNumber(record.sway_multiplier) },
        { label: fieldLabel(name, "aimBlock"), value: formatNumber(record.aim_block_length) },
        { label: fieldLabel(name, "visibility"), value: formatNumber(record.visibility_modifier) },
        { label: fieldLabel(name, "ergonomics"), value: formatNumber(record.ergonomics) },
        enumStat(fieldLabel(name, "noise"), record.noise_template),
      ]))
      + subpanel(fieldLabel(name, "fireModeTitle"), statGrid([
        enumStat(fieldLabel(name, "primary"), record.primary_fire_mode),
        enumStat(fieldLabel(name, "secondary"), record.secondary_fire_mode),
        enumStat(fieldLabel(name, "tertiary"), record.tertiary_fire_mode),
        enumStat(fieldLabel(name, "quaternary"), record.quaternary_fire_mode),
        enumStat(fieldLabel(name, "crosshairType"), record.crosshair_type),
        hashStat(fieldLabel(name, "crosshair"), record.crosshair),
      ]))
      + subpanel(fieldLabel(name, "behaviorTitle"), statGrid([
        boolStat(fieldLabel(name, "flags.allowFpv"), record.allow_fpv),
        boolStat(fieldLabel(name, "flags.hideWeapons"), record.hide_weapons_in_fpv),
        boolStat(fieldLabel(name, "flags.allowAiming"), record.allow_aiming),
        boolStat(fieldLabel(name, "flags.preventMovement"), record.prevent_movement_when_firing),
        boolStat(fieldLabel(name, "flags.infiniteAmmo"), record.infinite_ammo),
        boolStat(fieldLabel(name, "flags.suppressed"), record.is_suppressed),
      ]));
  },
});
})();
