const ThrowableComponentData = (() => {
const name = "ThrowableComponentData";
const schema = {
  fuses: [{ field: "slot", labelPath: `${name}.fuses.slot`, kind: "num" }, { field: "time", labelPath: `${name}.fuses.time`, kind: "num" }],
};
return defineComponentView({
  name,
  contentId: "#throwable-component-data-content",
  summarize(record) {
    return `${formatNumber(record.throw_distance_min)}–${formatNumber(record.throw_distance_max)}`;
  },
  schema,
  i18n: {
    zh: {
      minDistance: "最小投掷距离", maxDistance: "最大投掷距离", minAngular: "最小角速度 X/Y/Z", maxAngular: "最大角速度 X/Y/Z",
      addition: "投掷者速度增量", subtraction: "投掷者速度减量", start: "起始数量", max: "最大数量", refill: "补给数量",
      fuseTitle: "引信时间",
      flags: { angular: "使用角速度", sticky: "黏性" },
      fuses: { slot: "序号", time: "引信时间" },
    },
    en: {
      minDistance: "Min Throw Distance", maxDistance: "Max Throw Distance", minAngular: "Min Angular Velocity X/Y/Z", maxAngular: "Max Angular Velocity X/Y/Z",
      addition: "Thrower Velocity Addition", subtraction: "Thrower Velocity Subtraction", start: "Start Amount", max: "Max Amount", refill: "Refill Amount",
      fuseTitle: "Fuse Time",
      flags: { angular: "Use Angular Velocity", sticky: "Sticky" },
      fuses: { slot: "Slot", time: "Fuse Time" },
    },
  },
  build(record) {
    const fuses = (record.fuse_settings || []).flatMap((item, index) => (
      Number(item.fuse_time) < 0 ? [] : [{ slot: index + 1, time: item.fuse_time }]
    ));
    return statGrid([
      { label: fieldLabel(name, "minDistance"), value: formatNumber(record.throw_distance_min) },
      { label: fieldLabel(name, "maxDistance"), value: formatNumber(record.throw_distance_max) },
      { label: fieldLabel(name, "minAngular"), kind: "vec3", value: record.custom_angular_velocity_min },
      { label: fieldLabel(name, "maxAngular"), kind: "vec3", value: record.custom_angular_velocity_max },
      { label: fieldLabel(name, "addition"), value: formatNumber(record.thrower_velocity_addition) },
      { label: fieldLabel(name, "subtraction"), value: formatNumber(record.thrower_velocity_subtraction) },
      { label: fieldLabel(name, "start"), value: formatNumber(record.start_amount) },
      { label: fieldLabel(name, "max"), value: formatNumber(record.max_amount) },
      { label: fieldLabel(name, "refill"), value: formatNumber(record.refill_amount) },
      boolStat(fieldLabel(name, "flags.angular"), record.use_angular_velocity),
      boolStat(fieldLabel(name, "flags.sticky"), record.sticky),
    ]) + subpanel(fieldLabel(name, "fuseTitle"), createTable(schema.fuses, fuses));
  },
});
})();
