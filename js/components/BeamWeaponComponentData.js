const BeamWeaponComponentData = (() => {
const name = "BeamWeaponComponentData";
return defineComponentView({
  name,
  contentId: "#beam-weapon-component-data-content",
  summarize(record) {
    return `${enumLabel(record.beam_type)} / ${formatNumber(record.rounds_per_minute)} RPM`;
  },
  schema: {},
  i18n: {
    zh: {
      beamType: "激光类型", fireMode: "武器开火模式", roundsPerMinute: "每分钟射速",
      beamCount: "每根枪管的激光数量", beamPersists: "单次开火持续",
    },
    en: {
      beamType: "Beam Type", fireMode: "Fire Mode", roundsPerMinute: "Rounds per Minute",
      beamCount: "Beams per Barrel", beamPersists: "Persistence per Shot",
    },
  },
  build(record) {
    return statGrid([
      enumStat(fieldLabel(name, "beamType"), record.beam_type),
      enumStat(fieldLabel(name, "fireMode"), record.weapon_firing_mode),
      { label: fieldLabel(name, "roundsPerMinute"), value: formatNumber(record.rounds_per_minute) },
      { label: fieldLabel(name, "beamCount"), value: formatNumber(record.beam_count_per_barrel) },
      { label: fieldLabel(name, "beamPersists"), value: formatNumber(record.beam_persists_per_shot) },
    ]);
  },
});
})();
