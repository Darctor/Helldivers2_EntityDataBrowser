const TurretComponentData = (() => {
const name = "TurretComponentData";
return defineComponentView({
  name,
  contentId: "#turret-component-data-content",
  summarize(record) {
    return `${formatNumber(record.turn_speed_horizontal)} / ${formatNumber(record.turn_speed_vertical)}`;
  },
  schema: {},
  i18n: {
    zh: {
      verticalSpeed: "每秒垂直旋转速度", horizontalSpeed: "每秒水平旋转速度", exponent: "比率指数",
      verticalMin: "垂直最小角度", verticalMax: "垂直最大角度", horizontalMin: "水平最小角度", horizontalMax: "水平最大角度",
    },
    en: {
      verticalSpeed: "Vertical Turn Speed", horizontalSpeed: "Horizontal Turn Speed", exponent: "Ratio Exponent",
      verticalMin: "Min Vertical Angle", verticalMax: "Max Vertical Angle", horizontalMin: "Min Horizontal Angle", horizontalMax: "Max Horizontal Angle",
    },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "verticalSpeed"), value: formatNumber(record.turn_speed_vertical) },
      { label: fieldLabel(name, "horizontalSpeed"), value: formatNumber(record.turn_speed_horizontal) },
      { label: fieldLabel(name, "exponent"), value: formatNumber(record.ratio_exponent) },
      { label: fieldLabel(name, "verticalMin"), value: formatNumber(record.vertical_limit_min) },
      { label: fieldLabel(name, "verticalMax"), value: formatNumber(record.vertical_limit_max) },
      { label: fieldLabel(name, "horizontalMin"), value: formatNumber(record.horizontal_limit_min) },
      { label: fieldLabel(name, "horizontalMax"), value: formatNumber(record.horizontal_limit_max) },
    ]);
  },
});
})();
