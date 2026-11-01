const DepositComponentData = (() => {
const name = "DepositComponentData";
return defineComponentView({
  name,
  contentId: "#deposit-component-data-content",
  summarize(record) {
    return `${formatNumber(record.start_amount)} / ${formatNumber(record.refill_amount)}`;
  },
  schema: {},
  i18n: {
    zh: { startAmount: "起始数量", refillAmount: "补给数量", dronePath: "无人机哈希", refillStyle: "补充类型" },
    en: { startAmount: "Start Amount", refillAmount: "Refill Amount", dronePath: "Drone Hash", refillStyle: "Refill Style" },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "startAmount"), value: formatNumber(record.start_amount) },
      { label: fieldLabel(name, "refillAmount"), value: formatNumber(record.refill_amount) },
      { label: fieldLabel(name, "dronePath"), value: record.drone_path, kind: "hash" },
      enumStat(fieldLabel(name, "refillStyle"), record.refill_style),
    ]);
  },
  links(record) {
    return linkedHashEntries([[record.drone_path, fieldLabel(name, "dronePath")]]);
  },
});
})();
