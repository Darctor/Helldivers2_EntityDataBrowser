const EnemyPackageComponentData = (() => {
const name = "EnemyPackageComponentData";
return defineComponentView({
  name,
  contentId: "#enemy-package-component-data-content",
  summarize(record) {
    return formatId(record.bundle_tag);
  },
  schema: {},
  i18n: {
    zh: { bundleTag: "捆绑包标签", package: "包裹哈希", dependant: "依赖包哈希", audio: "音频哈希" },
    en: { bundleTag: "Bundle Tag", package: "Package Hash", dependant: "Dependant Package Hash", audio: "Audio Hash" },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "bundleTag"), kind: "id", value: record.bundle_tag },
      hashStat(fieldLabel(name, "package"), record.package),
      hashStat(fieldLabel(name, "dependant"), record.dependant_package),
      hashStat(fieldLabel(name, "audio"), record.audio_resource),
    ]);
  },
});
})();
