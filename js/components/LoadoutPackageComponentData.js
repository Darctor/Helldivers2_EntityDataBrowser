const LoadoutPackageComponentData = (() => {
const name = "LoadoutPackageComponentData";
return defineComponentView({
  name,
  contentId: "#loadout-package-component-data-content",
  summarize(record) {
    return formatResourceHash(record.package);
  },
  schema: {},
  i18n: {
    zh: { bundleTag: "捆绑包标签", package: "包裹哈希", audio: "音频哈希" },
    en: { bundleTag: "Bundle Tag", package: "Package Hash", audio: "Audio Hash" },
  },
  build(record) {
    return statGrid([
      { label: fieldLabel(name, "bundleTag"), kind: "id", value: record.bundle_tag },
      hashStat(fieldLabel(name, "package"), record.package),
      hashStat(fieldLabel(name, "audio"), record.audio_resource),
    ]);
  },
});
})();
