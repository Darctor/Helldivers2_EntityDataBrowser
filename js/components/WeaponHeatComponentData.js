const WeaponHeatComponentData = (() => {
const name = "WeaponHeatComponentData";
const schema = {
  stages: [
    { field: "stage", labelPath: `${name}.stages.stage`, kind: "num" },
    { field: "threshold", labelPath: `${name}.stages.threshold`, kind: "num" },
    { field: "projectile", labelPath: `${name}.stages.projectile` },
    { field: "status", labelPath: `${name}.stages.status` },
  ],
};
return defineComponentView({
  name,
  contentId: "#weapon-heat-component-data-content",
  summarize(record) {
    return `${formatNumber(record.overheat_temperature)}°`;
  },
  schema,
  i18n: {
    zh: {
      stageTitle: "过热阶段", temperatureTitle: "温度", magazineTitle: "弹匣", chargeTitle: "充能", behaviorTitle: "过热行为",
      rpmMultiplier: "过热后射速倍率", magazines: "起始弹匣数", magazinesRefill: "补给弹匣数", magazinesMax: "最大弹匣数量",
      overheat: "武器过热温度", recover: "过热后可再次开火的温度", gainShot: "每次射击积累温度", gainSecond: "每秒射击积累温度",
      lossSecond: "每秒失去温度", lossHeat: "极暑天气降温倍率", lossCold: "极寒天气降温倍率", lossOverheated: "过热后每秒失去温度",
      firingCharge: "触发开火的充能值", chargeGain: "每秒获得的充能值", chargeLoss: "每秒失去的充能值", ability: "技能 ID",
      stages: { stage: "阶段", threshold: "阶段温度阈值", projectile: "射弹类型", status: "向使用者施加状态效果" },
      flags: { forbidShoot: "过热后禁止射击", needsReload: "过热后需要换弹", resetCharge: "开火后重置充能值" },
    },
    en: {
      stageTitle: "Heat Stages", temperatureTitle: "Temperature", magazineTitle: "Magazines", chargeTitle: "Charge", behaviorTitle: "Overheat Behavior",
      rpmMultiplier: "RPM Multiplier", magazines: "Starting Magazines", magazinesRefill: "Refill Magazines", magazinesMax: "Max Magazines",
      overheat: "Overheat Temperature", recover: "Temperature to Fire Again", gainShot: "Heat per Shot", gainSecond: "Heat per Second",
      lossSecond: "Heat Loss per Second", lossHeat: "Extreme Heat Loss Modifier", lossCold: "Extreme Cold Loss Modifier", lossOverheated: "Heat Loss per Second while Overheated",
      firingCharge: "Charge to Fire", chargeGain: "Charge Gain per Second", chargeLoss: "Charge Loss per Second", ability: "Ability ID",
      stages: { stage: "Stage", threshold: "Temperature Threshold", projectile: "Projectile Type", status: "Status Effect on User" },
      flags: { forbidShoot: "Forbid Shooting after Overheat", needsReload: "Reload after Overheat", resetCharge: "Reset Charge after Shot" },
    },
  },
  build(record) {
    const stages = (record.heat_Level_setting || []).flatMap((item, index) => {
      const empty = !Number(item.temperature_threshold) && isPlaceholderEnum(item.projectile_type) && isPlaceholderEnum(item.status_effect_to_user);
      if (empty) return [];
      return [{
        stage: index + 1,
        threshold: item.temperature_threshold,
        projectile: item.projectile_type,
        status: item.status_effect_to_user,
      }];
    });
    const firstStage = (record.heat_Level_setting || []).find((item) => Number(item.temperature_threshold) || !isPlaceholderEnum(item.projectile_type) || !isPlaceholderEnum(item.status_effect_to_user));
    return subpanel(fieldLabel(name, "stageTitle"), createTable(enumColumn(enumColumn(schema.stages, "projectile", enumTypeName(firstStage?.projectile_type)), "status", enumTypeName(firstStage?.status_effect_to_user)), stages))
      + subpanel(fieldLabel(name, "temperatureTitle"), statGrid([
        { label: fieldLabel(name, "overheat"), value: formatNumber(record.overheat_temperature) },
        { label: fieldLabel(name, "recover"), value: formatNumber(record.overheat_temperature_recover) },
        { label: fieldLabel(name, "gainShot"), value: formatNumber(record.temp_gain_per_shot) },
        { label: fieldLabel(name, "gainSecond"), value: formatNumber(record.temp_gain_per_second) },
        { label: fieldLabel(name, "lossSecond"), value: formatNumber(record.temp_loss_per_second) },
        { label: fieldLabel(name, "lossHeat"), value: formatNumber(record.temp_loss_modifier_extreme_heat) },
        { label: fieldLabel(name, "lossCold"), value: formatNumber(record.temp_loss_modifier_extreme_cold) },
        { label: fieldLabel(name, "lossOverheated"), value: formatNumber(record.temp_loss_per_second_overheated) },
        { label: fieldLabel(name, "rpmMultiplier"), value: formatNumber(record.rpm_multiplier) },
      ]))
      + subpanel(fieldLabel(name, "magazineTitle"), statGrid([
        { label: fieldLabel(name, "magazines"), value: formatNumber(record.magazines) },
        { label: fieldLabel(name, "magazinesRefill"), value: formatNumber(record.magazines_refill) },
        { label: fieldLabel(name, "magazinesMax"), value: formatNumber(record.magazines_max) },
      ]))
      + subpanel(fieldLabel(name, "chargeTitle"), statGrid([
        { label: fieldLabel(name, "firingCharge"), value: formatNumber(record.firing_charge) },
        { label: fieldLabel(name, "chargeGain"), value: formatNumber(record.charge_gain_per_second) },
        { label: fieldLabel(name, "chargeLoss"), value: formatNumber(record.charge_loss_per_second) },
      ]))
      + subpanel(fieldLabel(name, "behaviorTitle"), statGrid([
        enumStat(fieldLabel(name, "ability"), record.overheat_ability),
        boolStat(fieldLabel(name, "flags.forbidShoot"), record.forbid_shoot_after_overheated),
        boolStat(fieldLabel(name, "flags.needsReload"), record.needs_reload_after_overheat),
        boolStat(fieldLabel(name, "flags.resetCharge"), record.reset_charge_after_shot),
      ]));
  },
});
})();
