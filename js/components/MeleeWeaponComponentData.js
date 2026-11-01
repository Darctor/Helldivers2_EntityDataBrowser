const MeleeWeaponComponentData = (() => {
const name = "MeleeWeaponComponentData";
const schema = {
  moves: [{ field: "slot", labelPath: `${name}.moves.slot`, kind: "num" }, { field: "stance", labelPath: `${name}.moves.stance` }, { field: "animations", labelPath: `${name}.moves.animations` }],
};
function namedEnum(value) {
  return enumLabel(value).replace(/^0x[0-9A-Fa-f]+_/, "");
}
function usedEnums(list) {
  const labels = [];
  (list || []).some((item) => {
    if (isPlaceholderEnum(item)) return true;
    labels.push(enumLabel(item));
    return false;
  });
  return labels;
}
return defineComponentView({
  name,
  contentId: "#melee-weapon-component-data-content",
  summarize(record) {
    return enumLabel(record.damage_info_type);
  },
  schema,
  i18n: {
    zh: {
      stamina: "耐力消耗", damage: "近战伤害", moveTitle: "挥击",
      moves: { slot: "序号", stance: "玩家姿势", animations: "挥动动画技能 ID" },
    },
    en: {
      stamina: "Stamina Cost", damage: "Melee Damage", moveTitle: "Swings",
      moves: { slot: "Slot", stance: "Avatar Stance", animations: "Swing Ability IDs" },
    },
  },
  build(record) {
    const swings = record["0xAE76DD5D"] || [];
    const rows = swings.flatMap((item, index) => {
      const animations = usedEnums(item.wielder_animation_type);
      if (!animations.length) return [];
      return [{ slot: index + 1, stance: namedEnum(item.avatar_stance), animations: animations.join(", ") }];
    });
    const stanceType = enumTypeName(swings.find((item) => !isPlaceholderEnum(item.avatar_stance))?.avatar_stance);
    const abilityType = enumTypeName(swings.flatMap((item) => item.wielder_animation_type || []).find((item) => !isPlaceholderEnum(item)));
    return statGrid([
      { label: fieldLabel(name, "stamina"), value: formatNumber(record.stamina_cost) },
      enumStat(fieldLabel(name, "damage"), record.damage_info_type),
    ]) + subpanel(fieldLabel(name, "moveTitle"), createTable(enumColumn(enumColumn(schema.moves, "stance", stanceType), "animations", abilityType), rows));
  },
});
})();
