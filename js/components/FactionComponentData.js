const FactionComponentData = (() => {
const name = "FactionComponentData";
function factionRows(record) {
  const entries = record.factions || [];
  const filled = entries.flatMap((item, index) => (
    isPlaceholderEnum(item.faction) ? [] : [{ slot: index + 1, faction: item.faction }]
  ));
  if (filled.length || !entries.length) return filled;
  return [{ slot: 1, faction: entries[0].faction }];
}

const schema = {
  factions: [{ field: "slot", labelPath: `${name}.factions.slot`, kind: "num" }, { field: "faction", labelPath: `${name}.factions.faction` }],
};
return defineComponentView({
  name,
  contentId: "#faction-component-data-content",
  summarize(record) {
    return factionRows(record).map((row) => enumLabel(row.faction)).join(", ") || "—";
  },
  schema,
  i18n: {
    zh: {
      factionTitle: "阵营类型", nodeTitle: "多目标节点",
      factions: { slot: "序号", faction: "阵营类型" },
    },
    en: {
      factionTitle: "Factions", nodeTitle: "Complex Targeting Nodes",
      factions: { slot: "Slot", faction: "Faction" },
    },
  },
  build(record) {
    const factions = factionRows(record);
    const factionType = enumTypeName((record.factions || [])[0]?.faction);
    const nodes = (record.complex_targeting_nodes || []).filter((node) => Number(node));
    return subpanel(fieldLabel(name, "factionTitle"), createTable(enumColumn(schema.factions, "faction", factionType), factions))
      + subpanel(fieldLabel(name, "nodeTitle"), chipFlow(nodes, { label: formatId }));
  },
});
})();
