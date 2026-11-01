const InventoryComponentData = (() => {
const name = "InventoryComponentData";
const fields = [
  ["default_primary", "primary"],
  ["default_sidearm", "sidearm"],
  ["default_support", "support"],
  ["default_throwable", "throwable"],
  ["default_backpack", "backpack"],
  ["default_melee_weapon", "melee"],
];
return defineComponentView({
  name,
  contentId: "#inventory-component-data-content",
  summarize(record) {
    const filled = fields.filter(([key]) => formatResourceHash(record[key]) !== "—").length;
    return `${filled} ${state.locale === "zh" ? "件装备" : "items"}`;
  },
  schema: {},
  i18n: {
    zh: {
      primary: "默认主武器", sidearm: "默认副武器", support: "默认支援武器",
      throwable: "默认投掷物", backpack: "默认背包", melee: "默认近战武器",
    },
    en: {
      primary: "Default Primary", sidearm: "Default Sidearm", support: "Default Support",
      throwable: "Default Throwable", backpack: "Default Backpack", melee: "Default Melee",
    },
  },
  build(record) {
    return statGrid(fields.map(([key, label]) => hashStat(fieldLabel(name, label), record[key])));
  },
  links(record) {
    return linkedHashEntries(fields.map(([key, label]) => [record[key], fieldLabel(name, label)]));
  },
});
})();
