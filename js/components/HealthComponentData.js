/**
 * HealthComponentData：生命值、受击部位、元素倍率、死亡设置。
 * 新增同类组件时可参照本文件：提供 name / file / label / summarize / schema / i18n / render / buildNested。
 */
const HealthComponentData = (() => {
const name = "HealthComponentData";

const file = "HealthComponentData";

const label = { zh: "HealthComponentData", en: "HealthComponentData" };

function summarize(record) {
  return `HP ${record.health} / ${translate("HealthComponentData.hitbox.armor")} ${record.default_damageable_zone_info?.armor ?? "—"}`;
}

const schema = {
  hitbox: [
    { field: "zoneKey", labelPath: `HealthComponentData.hitbox.zoneKey` },
    { field: "hitbox", labelPath: `HealthComponentData.hitbox.hitbox` },
    { field: "id", labelPath: `HealthComponentData.hitbox.id`, kind: "num" },
    { field: "health", labelPath: `HealthComponentData.hitbox.health`, kind: "num" },
    { field: "constitution", labelPath: `HealthComponentData.hitbox.constitution`, kind: "num" },
    { field: "durable", labelPath: `HealthComponentData.hitbox.durable`, kind: "percent" },
    { field: "armor", labelPath: `HealthComponentData.hitbox.armor`, kind: "num" },
    { field: "onDeath", labelPath: `HealthComponentData.hitbox.onDeath` },
    { field: "toMain", labelPath: `HealthComponentData.hitbox.toMain`, kind: "percent" },
    { field: "mainCapped", labelPath: `HealthComponentData.hitbox.mainCapped`, kind: "bool" },
    { field: "explosionAffected", labelPath: `HealthComponentData.hitbox.explosionAffected`, kind: "bool" },
    { field: "explosionMultiplier", labelPath: `HealthComponentData.hitbox.explosionMultiplier`, kind: "percent" },
    { field: "explosionVerification", labelPath: `HealthComponentData.hitbox.explosionVerification` },
    { field: "childZones", labelPath: `HealthComponentData.hitbox.childZones` },
    { field: "killChildren", labelPath: `HealthComponentData.hitbox.killChildren`, kind: "bool" },
    { field: "regenerationEnabled", labelPath: `HealthComponentData.hitbox.regenerationEnabled`, kind: "bool" },
    { field: "bleedoutEnabled", labelPath: `HealthComponentData.hitbox.bleedoutEnabled`, kind: "bool" },
    { field: "note", labelPath: `HealthComponentData.hitbox.note` },
  ],
  elementDamage: [
    { field: "type", labelPath: `HealthComponentData.elementDamage.type` },
    { field: "multiplier", labelPath: `HealthComponentData.elementDamage.multiplier`, kind: "percent" },
  ],
  death: [
    { field: "destructionLevel", labelPath: `HealthComponentData.death.destructionLevel` },
    { field: "canDieNaturally", labelPath: `HealthComponentData.death.canDieNaturally`, kind: "bool" },
    { field: "deathPropagation", labelPath: `HealthComponentData.death.deathPropagation` },
  ],
};

const i18n = {
  zh: {
    summary: { totalHealth: "总生命值", healthChangeRate: "生命值变化率", healthChangeCooldown: "生命值变化冷却", totalConstitution: "总流血值", totalConstitutionRate: "总流血值变化率", zoneBleedoutRate: "部位流血值变化率", unitSize: "单位尺寸", unitMass: "单位质量" },
    hitbox: { zoneKey: "索引", hitbox: "部位名称", id: "部位ID", health: "生命值", constitution: "流血值", durable: "耐久度", armor: "护甲", onDeath: "部位关系", toMain: "伤害传递", mainCapped: "过量传递限制", explosionAffected: "受爆炸伤害", explosionMultiplier: "爆炸伤害乘数", explosionVerification: "爆炸遮挡检测", childZones: "子部位 ID", killChildren: "死亡摧毁子部位", regenerationEnabled: "生命值回复", bleedoutEnabled: "部位流血", note: "备注" },
    elementDamage: { type: "元素类型", multiplier: "伤害倍率" },
    death: { destructionLevel: "死亡时自身施加拆毁模板", canDieNaturally: "可自然死亡", deathPropagation: "死亡传播" },
  },
  en: {
    summary: { totalHealth: "Total Health", healthChangeRate: "Health Change Rate", healthChangeCooldown: "Health Change Cooldown", totalConstitution: "Total Constitution", totalConstitutionRate: "Total Constitution Rate", zoneBleedoutRate: "Zone Bleedout Rate", unitSize: "Unit Size", unitMass: "Unit Mass" },
    hitbox: { zoneKey: "Index", hitbox: "Zone Name", id: "Zone ID", health: "Health", constitution: "Constitution", durable: "Durable", armor: "Armor", onDeath: "Zone Relation", toMain: "To Main", mainCapped: "Main Capped", explosionAffected: "Affected by Explosions", explosionMultiplier: "ExDM", explosionVerification: "ExVM", childZones: "Child Zone IDs", killChildren: "Kill Children", regenerationEnabled: "Regen Enabled", bleedoutEnabled: "Bleedout Enabled", note: "Note" },
    elementDamage: { type: "Element Type", multiplier: "Damage Multiplier" },
    death: { destructionLevel: "Death Destruction Level", canDieNaturally: "Can Die Naturally", deathPropagation: "Death Propagation" },
  },
};

function extractZoneName(zoneName) {
  const raw = text(zoneName, "");
  if (raw.includes(" ^_^ ")) {
    const [zoneLabel, id] = raw.split(" ^_^ ", 2);
    return { name: zoneLabel, id };
  }
  return /^\d+$/.test(raw) ? { name: "", id: raw } : { name: raw, id: "" };
}

function isInheritedExplosionMultiplier(value) {
  return Number(value) >= 3e38;
}

function displayExplosionMultiplier(value, mainMultiplier = 1) {
  return percent(isInheritedExplosionMultiplier(value) ? mainMultiplier : Math.abs(value || 0));
}

// health_changerate / constitution_changerate：正为回复、负为扣除，正值加 “+”。
// zone_bleedout_changerate：数据为正，但表示部位流血扣除，显示时加负号。
function formatChangeRate(value, { drain = false } = {}) {
  let rate = Math.trunc(Number(value) || 0);
  if (drain && rate !== 0) rate = -Math.abs(rate);
  return `[${rate > 0 ? "+" : ""}${rate}/s]`;
}

function formatHealthValue(health, regenerationEnabled, healthChangeRate) {
  return Number(regenerationEnabled) === 1 ? `${health}${formatChangeRate(healthChangeRate)}` : health;
}

function formatConstitutionValue(constitution, changeRate, { drain = false } = {}) {
  return Number(constitution) > 0 ? `${constitution} ${formatChangeRate(changeRate, { drain })}` : "0";
}

function extractHealthComponentDataHitboxStats(healthComponentData) {
  const rows = [];
  const defaultZone = healthComponentData.default_damageable_zone_info || {};
  const mainExplosionMultiplier = isInheritedExplosionMultiplier(defaultZone.explosion_damage_multiplier)
    ? 1 : Math.abs(defaultZone.explosion_damage_multiplier || 0);
  if (Object.keys(defaultZone).length) {
    const zone = extractZoneName(defaultZone.zone_name);
    rows.push({
      zoneKey: "default", hitbox: "main", id: zone.id || "0",
      health: formatHealthValue(healthComponentData.health, defaultZone.regeneration_enabled, healthComponentData.health_changerate),
      constitution: formatConstitutionValue(healthComponentData.constitution, healthComponentData.constitution_changerate),
      durable: percent(defaultZone.projectile_durable_resistance), armor: defaultZone.armor,
      onDeath: "—", toMain: "—", mainCapped: "—", explosionAffected: "—",
      explosionMultiplier: displayExplosionMultiplier(defaultZone.explosion_damage_multiplier, mainExplosionMultiplier),
      explosionVerification: enumLabel(defaultZone.explosion_verification_mode),
      childZones: (defaultZone.child_zones || []).filter((childZone) => Number(childZone) !== 0).join(", ") || "—",
      killChildren: defaultZone.kill_children_on_death,
      regenerationEnabled: defaultZone.regeneration_enabled,
      bleedoutEnabled: defaultZone.bleedout_enabled,
    });
  }
  (healthComponentData.damageable_zones || []).forEach((entry, index) => {
    const zone = entry.info || {};
    const zoneName = extractZoneName(zone.zone_name);
    let onDeath = "—";
    if (Number(zone.causes_death_on_death) === 1) onDeath = translate("common.fatal");
    else if (Number(zone.causes_downed_on_death) === 1) onDeath = translate("common.down");
    rows.push({
      zoneKey: index + 1, hitbox: zoneName.name || "—", id: zoneName.id || "—",
      health: formatHealthValue(zone.health, zone.regeneration_enabled, healthComponentData.health_changerate),
      constitution: formatConstitutionValue(zone.constitution, Number(zone.bleedout_enabled) === 1 ? healthComponentData.zone_bleedout_changerate : 0, { drain: true }),
      durable: percent(zone.projectile_durable_resistance), armor: zone.armor, onDeath,
      toMain: percent(zone.affects_main_health), mainCapped: Number(zone.main_health_affect_capped_by_zone_health ?? 1),
      explosionAffected: zone.affected_by_explosions,
      explosionMultiplier: displayExplosionMultiplier(zone.explosion_damage_multiplier, mainExplosionMultiplier),
      explosionVerification: enumLabel(zone.explosion_verification_mode),
      childZones: (zone.child_zones || []).filter((childZone) => Number(childZone) !== 0).join(", ") || "—",
      killChildren: zone.kill_children_on_death,
      regenerationEnabled: zone.regeneration_enabled,
      bleedoutEnabled: zone.bleedout_enabled,
    });
  });
  return rows;
}

const SUMMARY_FIELDS = [
  ["health", "HealthComponentData.summary.totalHealth"], ["health_changerate", "HealthComponentData.summary.healthChangeRate"],
  ["health_changerate_cooldown", "HealthComponentData.summary.healthChangeCooldown"], ["constitution", "HealthComponentData.summary.totalConstitution"],
  ["constitution_changerate", "HealthComponentData.summary.totalConstitutionRate"], ["zone_bleedout_changerate", "HealthComponentData.summary.zoneBleedoutRate"],
  ["unit_size", "HealthComponentData.summary.unitSize"], ["unit_mass", "HealthComponentData.summary.unitMass"],
];

function elementDamageTableRows(record) {
  const entries = record.element_damage || [];
  const filled = entries.filter((entry) => !/ElementType_None/.test(entry.type || ""));
  const shown = filled.length ? filled : entries.slice(0, 1);
  const elementType = enumTypeName(shown.find((entry) => !/ElementType_None/.test(entry.type || ""))?.type);
  return {
    elementType,
    rows: shown.map((entry) => ({ type: enumLabel(entry.type), multiplier: entry.multiplier })),
  };
}

function summaryCardsHtml(healthComponentData) {
  return SUMMARY_FIELDS.map(([key, labelPath]) => {
    const type = enumTypeName(healthComponentData[key]);
    return `<dl class="stat-card"><dt>${escapeHtml(translate(labelPath))}${type ? `<span class="stat-card-type">${escapeHtml(type)}</span>` : ""}</dt><dd>${escapeHtml(enumLabel(healthComponentData[key]))}</dd></dl>`;
  }).join("");
}

function renderHealthComponentDataSummary(healthComponentData) {
  document.querySelector("#main-stats").innerHTML = summaryCardsHtml(healthComponentData);
}

// 爆炸遮挡检测列的枚举类型：取首个带 explosion_verification_mode 的部位（default 或 damageable_zones）。
function explosionVerificationType(record) {
  const defaultZone = record.default_damageable_zone_info;
  if (defaultZone?.explosion_verification_mode) return enumTypeName(defaultZone.explosion_verification_mode);
  for (const entry of record.damageable_zones || []) {
    if (entry?.info?.explosion_verification_mode) return enumTypeName(entry.info.explosion_verification_mode);
  }
  return "";
}

function render(hash, record) {
  const healthComponentDataContent = document.querySelector("#health-component-data-content");
  const healthComponentDataNoData = document.querySelector("#health-component-data-no-data");
  if (record) {
    healthComponentDataContent.hidden = false;
    healthComponentDataNoData.hidden = true;
    renderHealthComponentDataSummary(record);
    const editable = !isWebsiteMode();
    const hitboxRows = extractHealthComponentDataHitboxStats(record).map((row) => {
      if (editable) return row;
      const nameFallback = row.zoneKey === "default" ? translate("common.defaultName") : row.hitbox;
      return {
        ...row,
        hitbox: configuredHitboxDetail(row.zoneKey, "name", nameFallback),
        note: configuredHitboxDetail(row.zoneKey, "note", ""),
      };
    });
    document.querySelector("#hitbox-table").innerHTML = createTable(enumColumn(schema.hitbox, "explosionVerification", explosionVerificationType(record)), hitboxRows, editable);
    if (editable) {
      document.querySelectorAll(".hitbox-name-input, .hitbox-note-input").forEach((input) => {
        input.addEventListener("input", updateHitboxDetail);
      });
      // 高度测量必须等 syncSectionCollapse 展开/折叠 section 之后再做：
      // 容器处于 display:none 时 scrollHeight 为 0，会把 textarea 钉死成空高度（搜索切换实体时最明显）。
      requestAnimationFrame(() => {
        document.querySelectorAll(".hitbox-name-input, .hitbox-note-input").forEach((input) => {
          input.style.height = "auto";
          input.style.height = `${input.scrollHeight}px`;
        });
      });
    }
    const elementDamage = elementDamageTableRows(record);
    document.querySelector("#element-damage-table").innerHTML = createTable(enumColumn(schema.elementDamage, "type", elementDamage.elementType), elementDamage.rows);
    document.querySelector("#death-settings-table").innerHTML = createTable(enumColumn(enumColumn(schema.death, "destructionLevel", enumTypeName(record.on_death_destruction_level)), "deathPropagation", enumTypeName(record.death_propagation)), [{
      destructionLevel: enumLabel(record.on_death_destruction_level),
      canDieNaturally: record.can_die_naturally,
      deathPropagation: enumLabel(record.death_propagation),
    }]);
  } else {
    const message = state.locale === "zh" ? "该实体没有 HealthComponentData。" : "This entity has no HealthComponentData.";
    healthComponentDataContent.hidden = true;
    healthComponentDataNoData.hidden = false;
    healthComponentDataNoData.textContent = message;
  }
}

function buildNested(hash, healthComponentData) {
  const stats = summaryCardsHtml(healthComponentData);
  const hitboxRows = extractHealthComponentDataHitboxStats(healthComponentData).map((row) => ({
    ...row,
    hitbox: configuredHitboxDetail(row.zoneKey, "name", row.zoneKey === "default" ? translate("common.defaultName") : row.hitbox, hash),
    note: configuredHitboxDetail(row.zoneKey, "note", "", hash),
  }));
  const elementDamage = elementDamageTableRows(healthComponentData);
  const deathRows = [{
    destructionLevel: enumLabel(healthComponentData.on_death_destruction_level),
    canDieNaturally: healthComponentData.can_die_naturally,
    deathPropagation: enumLabel(healthComponentData.death_propagation),
  }];
  return `<section class="nested-component-panel">
    <div class="panel-heading">
      <h4>HealthComponentData</h4>
      <button class="collapse-toggle" type="button" aria-expanded="true">${escapeHtml(t("collapse"))}</button>
    </div>
    <div class="panel-body">
      <div class="stat-grid nested-stat-grid">${stats}</div>
      <h3>${escapeHtml(t("hitboxStats"))}</h3>
      ${createTable(enumColumn(schema.hitbox, "explosionVerification", explosionVerificationType(healthComponentData)), hitboxRows)}
      <h3>${escapeHtml(t("elementDamage"))}</h3>
      ${createTable(enumColumn(schema.elementDamage, "type", elementDamage.elementType), elementDamage.rows)}
      <h3>${escapeHtml(t("deathSettings"))}</h3>
      ${createTable(enumColumn(enumColumn(schema.death, "destructionLevel", enumTypeName(healthComponentData.on_death_destruction_level)), "deathPropagation", enumTypeName(healthComponentData.death_propagation)), deathRows)}
    </div>
  </section>`;
}

return { name, file, label, summarize, schema, i18n, render, buildNested };
})();
