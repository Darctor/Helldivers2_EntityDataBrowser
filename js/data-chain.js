/**
 * 数据链递归展开：从实体（含嵌套实体）组件读到的有效枚举引用出发，
 * 沿 settings 表引用链递归，以横向卡片流展示每一环的关键字段。
 * 字段与中文名依据 web/数据链说明.txt；引用一律按目标条目 type 左侧 ID 查表。
 */

// 枚举类型 → settings 表名。按长度降序匹配前缀，避免 StatusEffectType/StatusEffectTemplateType 混淆。
const ENUM_TABLES = {
  ArcType: "ArcSettings",
  BeamType: "BeamSettings",
  DamageInfoType: "DamageSettings",
  ExplosionType: "ExplosionSettings",
  ProjectileType: "ProjectileSettings",
  StatusEffectType: "StatusEffectSettings",
  StatusEffectTemplateType: "StatusEffectTemplates",
};
const ENUM_TYPE_KEYS = Object.keys(ENUM_TABLES).sort((a, b) => b.length - a.length);

// DamageSettings 卡片分类徽标：由引用来源决定。
const DAMAGE_CLASS_BY_TABLE = {
  ArcSettings: { zh: "电弧伤害", en: "Arc damage" },
  BeamSettings: { zh: "激光伤害", en: "Beam damage" },
  ExplosionSettings: { zh: "爆炸伤害", en: "Explosion damage" },
  ProjectileSettings: { zh: "射弹伤害", en: "Projectile damage" },
  StatusEffectSettings: { zh: "状态效果伤害", en: "Status effect damage" },
};
const DAMAGE_CLASS_BY_COMPONENT = {
  MeleeWeaponComponentData: { zh: "近战伤害", en: "Melee damage" },
  SprayWeaponComponentData: { zh: "射流伤害", en: "Spray damage" },
};

// 卡片展示字段白名单：[路径, 中文, 英文, 类型]。类型：num/bool/enum/text/damage/pen/effectList/statList/templateList。
const CHAIN_TABLE_FIELDS = {
  ArcSettings: [
    ["speed", "电弧速度", "Arc speed", "num"],
    ["distance", "电弧最大距离", "Max distance", "num"],
    ["distance_at_max_angle_spread", "最大连锁角度下距离", "Distance at max spread", "num"],
    ["distance_at_max_angle_spread_first_shot", "首发最大连锁角度下距离", "First-shot distance", "num"],
    ["max_angle_spread", "最大连锁角度", "Max chain angle", "num"],
    ["max_angle_spread_first_shot", "首发最大连锁角度", "First-shot max angle", "num"],
    ["max_chain_length", "最多连锁次数", "Max chains", "num"],
    ["max_chain_split", "最多分裂次数", "Max splits", "num"],
    ["damage_info_type", "伤害类型", "Damage type", "enum"],
    ["demolition_strength", "拆毁值", "Demolition", "num"],
    ["arc_count", "电弧数量", "Arc count", "num"],
    ["ignore_launcher", "忽视发射者自身", "Ignore launcher", "bool"],
  ],
  BeamSettings: [
    ["radius", "激光半径", "Beam radius", "num"],
    ["length", "激光长度", "Beam length", "num"],
    ["damage_info_type", "伤害类型", "Damage type", "enum"],
    ["focal_distance", "焦点距离", "Focal distance", "num"],
    ["focal_shoulder_width", "焦点肩宽", "Focal shoulder width", "num"],
    ["focal_shoulder_damage_multiplier", "焦点肩部外伤害倍率", "Shoulder damage mult.", "num"],
    ["focal_point_damage_multiplier", "焦点处伤害倍率", "Focal point mult.", "num"],
    ["impact_explosion_type", "撞击爆炸类型", "Impact explosion", "enum"],
    ["not_dps_damage", "不是DPS伤害", "Not DPS damage", "bool"],
  ],
  DamageSettings: [
    ["damage", "伤害", "Damage", "damage"],
    ["armor_penetration_per_angle", "穿甲等级", "Armor penetration", "pen"],
    ["demolition_strength", "拆毁值", "Demolition", "num"],
    ["force_strength", "踉跄力", "Force strength", "num"],
    ["force_impulse", "击退力", "Force impulse", "num"],
    ["element_type", "元素类型", "Element type", "enum"],
    ["status_effects", "状态效果", "Status effects", "effectList"],
  ],
  ExplosionSettings: [
    ["damage_type", "伤害类型", "Damage type", "enum"],
    ["inner_radius", "内圈半径", "Inner radius", "num"],
    ["outer_radius", "外圈半径", "Outer radius", "num"],
    ["stagger_radius", "冲击圈半径", "Stagger radius", "num"],
    ["cone_angle", "爆炸锥角", "Cone angle", "num"],
    ["num_shrapnel_projectiles", "破片数量", "Shrapnel count", "num"],
    ["shrapnel_projectile_type", "破片射弹类型", "Shrapnel projectile", "enum"],
    ["noise_template", "噪音模板", "Noise template", "enum"],
    ["fire_template", "地火模板", "Fire template", "enum"],
    ["persistent_status_volume", "持续性状态体积效果", "Persistent status volume", "enum"],
    ["status_volume_effect_time", "状态体积效果持续时间", "Status volume duration", "num"],
    ["explosion_flags_1_detail.is_huge_explosion", "是否为巨大爆炸", "Huge explosion", "bool"],
    ["arc_type_on_explosion", "爆炸产生电弧类型", "Arc on explosion", "enum"],
  ],
  ProjectileSettings: [
    ["calibre", "口径 (mm)", "Calibre (mm)", "num"],
    ["num_projectiles", "射弹数量", "Projectile count", "num"],
    ["speed", "初速 (m/s)", "Muzzle speed (m/s)", "num"],
    ["mass", "质量 (g)", "Mass (g)", "num"],
    ["drag", "阻力", "Drag", "num"],
    ["gravity_multiplier", "重力乘数", "Gravity mult.", "num"],
    ["simulation_steps", "模拟步长", "Simulation steps", "num"],
    ["life_time", "寿命", "Life time", "num"],
    ["life_time_randomness", "寿命随机值", "Life randomness", "num"],
    ["damage_info_type", "伤害类型", "Damage type", "enum"],
    ["penetration_slowdown", "过穿减速", "Penetration slowdown", "num"],
    ["explosion_threshold_angle", "爆炸角度阈值", "Explosion angle threshold", "num"],
    ["can_expire_after_impact", "允许撞击后触发到期", "Expire after impact", "bool"],
    ["explosion_type_on_impact", "撞击爆炸类型", "Impact explosion", "enum"],
    ["explosion_proximity", "近炸引信距离", "Proximity fuse distance", "num"],
    ["explosion_delay", "爆炸延迟", "Explosion delay", "num"],
    ["explosion_type_expire", "到期爆炸类型", "Expire explosion", "enum"],
    ["arming_distance", "安全引信距离", "Arming distance", "num"],
    ["max_ricochets", "最大跳弹次数", "Max ricochets", "num"],
    ["ricochet_threshold_angle", "跳弹角度阈值", "Ricochet angle threshold", "num"],
    ["ricochet_threshold_speed", "跳弹速度阈值", "Ricochet speed threshold", "num"],
    ["ricochet_angle_loss", "跳弹速度损失", "Ricochet angle loss", "num"],
    ["ricochet_spread_vertical", "跳弹后垂直散布", "Ricochet vertical spread", "num"],
    ["ricochet_spread_horizontal", "跳弹后水平散布", "Ricochet horizontal spread", "num"],
    ["fire_template", "地火模板", "Fire template", "enum"],
    ["projectile_flags_1_detail.inherit_velocity", "继承速度", "Inherit velocity", "bool"],
    ["ignore_terminal_velocity", "忽略终端速度", "Ignore terminal velocity", "bool"],
    ["projectile_flags_2_detail.apply_stim_on_target", "击中目标触发治疗", "Apply stim on target", "bool"],
    ["projectile_flags_2_detail.projectile_auto_attach", "射弹自动附着", "Auto attach", "bool"],
  ],
  StatusEffectSettings: [
    ["debug_name", "调试名称", "Debug name", "text"],
    ["strength", "效果强度", "Strength", "num"],
    ["duration", "效果持续时间", "Duration", "num"],
    ["damage_info_type", "伤害类型", "Damage type", "enum"],
    ["damage_ignore_avatar_armor", "伤害忽略玩家护甲值", "Ignores player armor", "bool"],
    ["status_effect_flags_detail.no_susceptibility_required", "无需状态效果接收器", "No susceptibility", "bool"],
    ["status_effect_flags_detail.block_sprint", "禁用奔跑", "Block sprint", "bool"],
    ["modified_stats_multipliers", "可修改属性", "Modified stats", "statList"],
  ],
  StatusEffectTemplates: [
    ["effects", "状态效果", "Effects", "templateList"],
  ],
};

const CHAIN_ENUM_CSS = {
  ArcType: "chain-arc", BeamType: "chain-beam", DamageInfoType: "chain-damage",
  ExplosionType: "chain-explosion", ProjectileType: "chain-projectile",
  StatusEffectType: "chain-status", StatusEffectTemplateType: "chain-template",
};

function parseEnumRef(value) {
  if (typeof value !== "string" || !value.includes("<=>")) return null;
  const [left, right] = value.split("<=>", 2);
  const id = Number(left.trim());
  if (!Number.isInteger(id) || id <= 0) return null;
  const name = right.trim();
  const enumType = ENUM_TYPE_KEYS.find((key) => name.startsWith(`${key}_`));
  if (!enumType) return null;
  return { id, enumType, tableName: ENUM_TABLES[enumType], enumName: name };
}

function pickField(item, path) {
  return path.split(".").reduce((branch, key) => (branch == null ? undefined : branch[key]), item);
}

// 递归下探对象/数组，收集所有有效枚举引用（含数组槽位路径）。
function collectRefs(value, path, out) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectRefs(item, `${path}[${index}]`, out));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, child]) => collectRefs(child, path ? `${path}.${key}` : key, out));
    return;
  }
  const ref = parseEnumRef(value);
  if (ref) out.push({ ...ref, fieldPath: path });
}

// 主实体 + 嵌套实体（同 Mount 递归规则）的所有有效引用。
// 去重规则：同一实体内指向同一 ID 的引用只保留一行（按组件优先级选主来源）；
// 重复出现的嵌套实体（如两个槽位挂同一导弹）只遍历首次出现，与 Mount 的 seen 机制一致。
const COMPONENT_PRIORITY = { WeaponRoundsComponentData: 0, WeaponChargeComponentData: 1, ProjectileWeaponComponentData: 2 };

function collectChainRoots(hash) {
  const found = [];
  const seenEntities = new Map([[hash, ""]]);
  const walk = (entityHash, entityLabel, depth, ancestors) => {
    const components = componentsOfEntity(entityHash);
    Object.entries(components).forEach(([componentName, record]) => {
      const refs = [];
      collectRefs(record, "", refs);
      refs.forEach((ref) => found.push({ ...ref, componentName, entityLabel, entityHash }));
    });
    if (depth >= MAX_MOUNT_DEPTH) return;
    linksFromLoadedComponents(components).forEach((link) => {
      if (ancestors.has(link.hash)) return;
      // 嵌套实体路径带上来源组件字段，避免“槽位1”这类标签歧义。
      const origin = link.origin ? `${link.origin} › ` : "";
      const label = `${entityLabel}${origin}${link.label} — ${displayNameOfEntity(link.hash)}`;
      if (!seenEntities.has(link.hash)) seenEntities.set(link.hash, label);
      else return;
      walk(link.hash, label, depth + 1, new Set([...ancestors, link.hash]));
    });
  };
  walk(hash, "", 0, new Set([hash]));
  const grouped = new Map();
  found.forEach((root) => {
    const key = `${root.entityHash}|${root.tableName}:${root.id}`;
    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, { ...root, alsoFrom: [] });
      return;
    }
    const rank = (ref) => COMPONENT_PRIORITY[ref.componentName] ?? 9;
    if (rank(root) < rank(prev)) grouped.set(key, { ...root, alsoFrom: [...prev.alsoFrom, `${prev.componentName}.${prev.fieldPath}`] });
    else prev.alsoFrom.push(`${root.componentName}.${root.fieldPath}`);
  });
  const roots = [...grouped.values()];
  roots.sort((a, b) => `${a.entityLabel}|${a.componentName}.${a.fieldPath}`.localeCompare(`${b.entityLabel}|${b.componentName}.${b.fieldPath}`, "zh-CN"));
  return roots;
}

// settings 条目内部的出边（排除自身 type 声明；到期爆炸按说明文档条件生效）。
function collectItemEdges(tableName, item) {
  const found = [];
  collectRefs(item, "", found);
  return found.filter((edge) => {
    if (edge.fieldPath === "type") return false;
    if (tableName === "ProjectileSettings" && edge.fieldPath === "explosion_type_expire") {
      return Number(item.can_expire_after_impact) === 1 && Number(item.explosion_delay) !== 0;
    }
    // 破片射弹仅在破片数量不为 0 时生效。
    if (tableName === "ExplosionSettings" && edge.fieldPath === "shrapnel_projectile_type") {
      return Number(item.num_shrapnel_projectiles) !== 0;
    }
    return true;
  });
}

// DamageSettings 卡片分类徽标：链内节点由父表决定，根节点由引用它的组件决定（近战/射流/组件直引）。
function damageClassBadge(tableName, parentTable, rootRef) {
  if (tableName !== "DamageSettings") return "";
  let label = null;
  if (parentTable) label = DAMAGE_CLASS_BY_TABLE[parentTable] || null;
  else if (rootRef) label = DAMAGE_CLASS_BY_COMPONENT[rootRef.componentName] || { zh: `组件直引 · ${rootRef.componentName}`, en: `Direct ref · ${rootRef.componentName}` };
  return label ? `<span class="chain-class">${escapeHtml(state.locale === "zh" ? label.zh : label.en)}</span>` : "";
}

const PEN_ANGLE_LABELS = [
  ["穿甲 0-25°", "AP 0-25°"], ["穿甲 25-60°", "AP 25-60°"], ["穿甲 60-80°", "AP 60-80°"], ["穿甲 80-90°", "AP 80-90°"],
];

// 字段行数达到该值的卡片改为加宽双列，压低高度（ProjectileSettings 字段最多）。
const CHAIN_WIDE_MIN_ROWS = 14;

function renderChainFields(tableName, item) {
  const zh = state.locale === "zh";
  const fieldRow = (label, value, valueClass = "") => `<div class="chain-field"><span class="chain-field-label">${escapeHtml(label)}</span><span class="chain-field-value${valueClass ? ` ${valueClass}` : ""}">${escapeHtml(value)}</span></div>`;
  const rows = (CHAIN_TABLE_FIELDS[tableName] || []).map(([path, zhLabel, enLabel, kind]) => {
    const label = zh ? zhLabel : enLabel;
    const value = pickField(item, path);
    if (value === undefined || value === null) return "";
    if (kind === "effectList" || kind === "statList" || kind === "templateList") {
      const table = renderListField(item, path, kind);
      return table ? `<div class="chain-field chain-field-list"><span class="chain-field-label">${escapeHtml(label)}</span>${table}</div>` : "";
    }
    if (kind === "damage") {
      const [base, durable] = Array.isArray(value) ? value : [];
      return fieldRow(zh ? "基础伤害" : "Base damage", formatNumber(base))
        + fieldRow(zh ? "耐久伤害" : "Durable damage", formatNumber(durable));
    }
    if (kind === "pen") {
      if (!Array.isArray(value)) return "";
      return value.map((entry, index) => {
        const [zhAngle, enAngle] = PEN_ANGLE_LABELS[index] || [`${label} ${index}`, `${label} ${index}`];
        return fieldRow(zh ? zhAngle : enAngle, formatNumber(entry));
      }).join("");
    }
    const formatted = formatFieldValue(item, path, kind);
    if (formatted === null || formatted === "" || formatted === "—") return "";
    // 枚举值用 --enum，与普通字段值（暖白）区分开
    return fieldRow(label, formatted, kind === "enum" ? "is-enum" : "");
  });
  const filled = rows.filter((row) => row);
  if (!filled.length) return "";
  // 双列按列填充：左列先填满一半再排右列（不是左右左右逐行交替），中间浅分界线见 css/styles.css。
  if (filled.length < CHAIN_WIDE_MIN_ROWS) return `<div class="chain-fields">${filled.join("")}</div>`;
  const split = Math.ceil(filled.length / 2);
  return `<div class="chain-fields chain-fields-wide"><div class="chain-col">${filled.slice(0, split).join("")}</div><div class="chain-col">${filled.slice(split).join("")}</div></div>`;
}

function renderListField(item, path, kind) {
  const list = pickField(item, path.replace(/\[\]$/, ""));
  if (!Array.isArray(list)) return null;
  const zh = state.locale === "zh";
  if (kind === "effectList") {
    const rows = list
      .filter((entry) => parseEnumRef(entry?.status_effect_type))
      .map((entry) => [enumLabel(entry.status_effect_type), formatNumber(entry.value)]);
    return renderMiniTable(rows, [zh ? "状态效果" : "Effect", zh ? "累计值" : "Value"]);
  }
  if (kind === "statList") {
    const rows = list
      .map((entry) => [enumLabel(entry?.type), formatNumber(entry?.value)])
      .filter((row) => row[0] && row[0] !== "—");
    return renderMiniTable(rows, [zh ? "属性" : "Stat", zh ? "倍率" : "Multiplier"]);
  }
  const rows = list
    .map((entry) => [enumLabel(entry?.type), formatNumber(entry?.value_per_second)])
    .filter((row) => row[0] && row[0] !== "—");
  return renderMiniTable(rows, [zh ? "状态效果" : "Effect", zh ? "每秒累计值" : "Per second"]);
}

function formatFieldValue(item, path, kind) {
  const value = pickField(item, path);
  if (value === undefined || value === null) return null;
  if (kind === "bool") return bool(value);
  if (kind === "enum") return enumLabel(value);
  if (kind === "text") return text(value);
  return formatNumber(value);
}

function renderMiniTable(rows, columns) {
  if (!rows.length) return "";
  const [first, second] = columns;
  return `<table class="chain-mini"><thead><tr><th>${escapeHtml(first)}</th><th>${escapeHtml(second)}</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`).join("")}</tbody></table>`;
}

let chainNodeCounter = 0;

// 边标签里的长单词（英文的 ProjectileType_Unknown_37.explosion_type_on_impact 是一整串）
// 在 _ . / 之后插 <wbr>，让换行落在语义分隔处而不是词中间；CSS 的 anywhere 只作兜底。
function chainEdgeHtml(text) {
  return escapeHtml(text).replace(/([_.\/])/g, "$1<wbr>");
}

// 卡片：data-chain-id 唯一；data-chain-parents 是逗号分隔的父卡 id 列表——
// 去重后的共享卡片可以被多条父卡连线，所以父关系是复数。
function chainCardOpen(tableName, ref, classificationHtml, edgeNotes, id, parentIds) {
  const shortName = ref.enumName.slice(ref.enumType.length + 1);
  const parents = parentIds.length ? ` data-chain-parents="${parentIds.join(",")}"` : "";
  const edges = edgeNotes
    .map((note, index) => `<p class="chain-edge${index ? " chain-edge-extra" : ""}">${chainEdgeHtml(note)}</p>`)
    .join("");
  return `<article class="chain-card ${CHAIN_ENUM_CSS[ref.enumType] || ""}" data-chain-id="${id}"${parents}>
    <header class="chain-card-head">
      <span class="chain-enum">${escapeHtml(ref.enumType)}</span>
      <strong class="chain-name">${escapeHtml(shortName)}</strong>
      <code>#${ref.id}</code>
    </header>
    ${classificationHtml ? `<div class="chain-class-row">${classificationHtml}</div>` : ""}
    ${edges}`;
}

function chainFlowNote(text) {
  return `<div class="chain-flow-note">${escapeHtml(text)}</div>`;
}

// 先完整递归出节点树，再平铺分配 id：去重需要先知道「这棵子树是不是全是叶节点」。
function buildChainNode(tableName, ref, edge, ancestors, depth) {
  const key = `${tableName}:${ref.id}`;
  const node = { tableName, ref, key, edge, depth, item: null, children: [], cycle: false, limit: false };
  if (ancestors.has(key)) {
    node.cycle = true;
    return node;
  }
  node.item = state.settingsStores?.get(tableName)?.get(ref.id) || null;
  if (!node.item) return node;
  if (depth >= MAX_MOUNT_DEPTH) {
    node.limit = true;
    return node;
  }
  const nextAncestors = new Set([...ancestors, key]);
  node.children = collectItemEdges(tableName, node.item).map((child) => {
    // 父条目的完整枚举名 + 字段路径，例如「经由 ProjectileType_Unknown_167 的 damage_info_type」。
    const note = state.locale === "zh"
      ? `经由 ${ref.enumName} 的 ${child.fieldPath}`
      : `via ${ref.enumName}.${child.fieldPath}`;
    return buildChainNode(child.tableName, child, { note, parentTable: tableName }, nextAncestors, depth + 1);
  });
  return node;
}

// 「叶子子树」：自身没有下级，或下级全是叶节点。这种卡片内容完全相同（同一 settings 条目），
// 只需渲染一次，由多条父级连线共享。
function isLeafSubtree(node) {
  return node.children.length === 0 || node.children.every((child) => child.children.length === 0);
}

// 可去重的键：表:ID + 伤害分类（分类不同时同一伤害条目要分开显示）。
// 不可去重的节点（有更深的下级、或循环引用）返回空串。
function chainDedupeKey(node) {
  if (node.cycle || !isLeafSubtree(node)) return "";
  return `${node.key}|${damageClassBadge(node.tableName, node.edge.parentTable, node.edge.rootRef)}`;
}

// 平铺：DFS 顺序编号。重复的叶子子树只渲染一次，位置取「最后一次出现」——
// 这样每张共享卡片都在它所有父卡片之后（父卡在各自子树里都早于这一次出现），
// 连线只会向下或同行，不会出现向上横穿卡片带的线。
// 被跳过的那些出现位置，把父卡与「经由…」标签记到 pending，合并到共享卡片上。
function flattenChainNodes(rootNode) {
  const lastByKey = new Map();
  let order = 0;
  const scan = (node) => {
    order += 1;
    node.order = order;
    node.dedupeKey = chainDedupeKey(node);
    if (node.dedupeKey) lastByKey.set(node.dedupeKey, node);
    node.children.forEach(scan);
  };
  scan(rootNode);

  const out = [];
  const pending = new Map();
  const visit = (node, parentId) => {
    const key = node.dedupeKey;
    if (key && lastByKey.get(key) !== node) {
      // 不是最后一份：跳过整棵子树（可去重节点的子树全是叶，其规范位置必在最后一份内部）
      const slot = pending.get(key) || { parents: [], edges: [] };
      if (parentId && !slot.parents.includes(parentId)) slot.parents.push(parentId);
      if (node.edge.note && !slot.edges.includes(node.edge.note)) slot.edges.push(node.edge.note);
      pending.set(key, slot);
      return;
    }
    const slot = key ? pending.get(key) : null;
    const record = {
      node,
      id: ++chainNodeCounter,
      parents: [...(slot?.parents || [])],
      edges: [...(slot?.edges || [])],
      classification: damageClassBadge(node.tableName, node.edge.parentTable, node.edge.rootRef),
    };
    // 自身父卡与自身的「经由…」排在最前
    if (parentId && !record.parents.includes(parentId)) record.parents.unshift(parentId);
    if (node.edge.note && !record.edges.includes(node.edge.note)) record.edges.unshift(node.edge.note);
    out.push(record);
    node.children.forEach((child) => visit(child, record.id));
  };
  visit(rootNode, 0);
  return out;
}

function renderChainCards(rootNode) {
  return flattenChainNodes(rootNode).map((record) => {
    const { node } = record;
    const open = chainCardOpen(node.tableName, node.ref, record.classification, record.edges, record.id, record.parents);
    if (node.cycle) {
      return `${open}<p class="chain-note">${escapeHtml(state.locale === "zh" ? "循环引用，已停止展开。" : "Cycle detected; expansion stopped.")}</p></article>`;
    }
    const fieldsHtml = node.item ? renderChainFields(node.tableName, node.item) : "";
    const missingHtml = node.item ? "" : `<p class="chain-note">${escapeHtml(state.locale === "zh" ? `未在 ${node.tableName} 中找到条目。` : `Entry not found in ${node.tableName}.`)}</p>`;
    const limitHtml = node.limit ? chainFlowNote(state.locale === "zh" ? "已达到展开最大深度。" : "Maximum expansion depth reached.") : "";
    return `${open}${fieldsHtml}${missingHtml}</article>${limitHtml}`;
  }).join("");
}

function renderChainRow(root) {
  const source = root.entityLabel
    ? `${root.entityLabel} › ${root.componentName}.${root.fieldPath}`
    : `${root.componentName}.${root.fieldPath}`;
  const alsoFrom = root.alsoFrom?.length
    ? `<span class="chain-also">${escapeHtml(state.locale === "zh" ? "同 ID 亦来自：" : "also from: ")}${escapeHtml(root.alsoFrom.join("、"))}</span>`
    : "";
  const shortName = root.enumName.slice(root.enumType.length + 1);
  const cards = renderChainCards(buildChainNode(root.tableName, root, { rootRef: root }, new Set(), 0));
  return `<details class="chain-row" open>
    <summary><span class="chain-source">${escapeHtml(source)}</span><span class="chain-ref ${CHAIN_ENUM_CSS[root.enumType] || ""}">${escapeHtml(root.enumType)} #${root.id} — ${escapeHtml(shortName)}</span>${alsoFrom}</summary>
    <div class="chain-flow">${cards}</div>
  </details>`;
}

function renderDataChain(hash) {
  const section = document.querySelector("#data-chain-section");
  const content = document.querySelector("#data-chain-content");
  if (!section || !content) return;
  const roots = collectChainRoots(hash);
  if (!roots.length) {
    section.hidden = true;
    content.innerHTML = "";
    return;
  }
  section.hidden = false;
  if (!state.settingsStores) {
    const message = isWebsiteMode()
      ? (state.locale === "zh" ? "未加载 settings 数据。" : "Settings data was not loaded.")
      : t("dataChainNoSettings");
    content.innerHTML = `<div class="no-data">${escapeHtml(message)}</div>`;
    return;
  }
  content.innerHTML = roots.map(renderChainRow).join("");
  scheduleChainWires();
}

/* ---------- SVG 连线：渲染后测量卡片坐标，画父→子折线 ----------
   分道布线：线只走行与行之间的空白缝隙（车道），不横穿卡片所在行带，
   避免线从卡片背面穿过、以及不同方向线互相重叠。 */

let chainWiresFrame = 0;

function scheduleChainWires() {
  cancelAnimationFrame(chainWiresFrame);
  chainWiresFrame = requestAnimationFrame(() => {
    chainWiresFrame = requestAnimationFrame(drawChainWires);
  });
}

// 圆角折线：从 (sx,sy) 竖走到车道 laneY，横移到 ex，再竖走到 (ex,ey)。laneY 可在起点上方或下方。
function chainRoutePath(sx, sy, ex, ey, laneY) {
  const dx = ex - sx;
  if (Math.abs(dx) < 2) return `M ${sx} ${sy} L ${ex} ${ey}`;
  const dirX = dx > 0 ? 1 : -1;
  const dirY1 = laneY > sy ? 1 : -1;
  const dirY2 = ey > laneY ? 1 : -1;
  const r = Math.max(0, Math.min(7, Math.abs(dx) / 2, Math.abs(laneY - sy), Math.abs(ey - laneY)));
  return `M ${sx} ${sy}`
    + ` L ${sx} ${laneY - r * dirY1}`
    + ` Q ${sx} ${laneY} ${sx + r * dirX} ${laneY}`
    + ` L ${ex - r * dirX} ${laneY}`
    + ` Q ${ex} ${laneY} ${ex} ${laneY + r * dirY2}`
    + ` L ${ex} ${ey}`;
}

// 圆角折线：按给定顶点走，拐角处用二次曲线倒角（多段走廊用）。
function chainPolylinePath(points, radius = 7) {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    if (!next) {
      d += ` L ${cur.x} ${cur.y}`;
      break;
    }
    const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.max(0, Math.min(radius, inLen / 2, outLen / 2));
    const a = { x: cur.x - ((cur.x - prev.x) / (inLen || 1)) * r, y: cur.y - ((cur.y - prev.y) / (inLen || 1)) * r };
    const b = { x: cur.x + ((next.x - cur.x) / (outLen || 1)) * r, y: cur.y + ((next.y - cur.y) / (outLen || 1)) * r };
    d += ` L ${a.x} ${a.y} Q ${cur.x} ${cur.y} ${b.x} ${b.y}`;
  }
  return d;
}

function drawChainWires() {
  document.querySelectorAll("#data-chain-content .chain-flow").forEach((flow) => {
    flow.querySelector(".chain-wires")?.remove();
    if (!flow.offsetParent) return;
    const cards = [...flow.querySelectorAll(".chain-card")];
    const byId = new Map(cards.map((card) => [card.dataset.chainId, card]));
    const parentsOf = (card) => (card.dataset.chainParents || "").split(",").filter(Boolean);
    if (!cards.some((card) => parentsOf(card).some((id) => byId.has(id)))) return;
    const flowRect = flow.getBoundingClientRect();
    const scrollLeft = flow.scrollLeft;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return {
        top: r.top - flowRect.top, bottom: r.bottom - flowRect.top,
        left: r.left - flowRect.left + scrollLeft, right: r.right - flowRect.left + scrollLeft,
        width: r.width, height: r.height,
      };
    };
    const boxes = new Map(cards.map((card) => [card, box(card)]));
    // 按行分组：flex 顶对齐，同一行 top 相同；行底 = 该行卡片的最大 bottom。
    const rows = [];
    cards.forEach((card) => {
      const b = boxes.get(card);
      const row = rows.find((item) => Math.abs(item.top - b.top) < 8);
      if (row) row.bottom = Math.max(row.bottom, b.bottom);
      else rows.push({ top: b.top, bottom: b.bottom });
    });
    rows.sort((a, b) => a.top - b.top);
    const rowIndexOf = (b) => rows.findIndex((row) => Math.abs(row.top - b.top) < 8);

    // 第一遍：给每条线定类型。同行紧挨=水平线；同行隔着卡片=上绕；跨一行=下探车道；
    // 跨多行=走右侧留白里的竖向走廊（只经过行间缝隙，不横穿任何卡片行带）。
    // 共享卡片有多个父卡，每个「父→子」都单独出一条线。
    const accentFallback = getComputedStyle(document.documentElement).getPropertyValue("--accent-dim").trim() || "#a78222";
    const wires = [];
    cards.forEach((child) => {
      const c = boxes.get(child);
      const cr = rowIndexOf(c);
      parentsOf(child).forEach((parentId) => {
        const parent = byId.get(parentId);
        if (!parent) return;
        const p = boxes.get(parent);
        const pr = rowIndexOf(p);
        // 共享卡片取「最后一次出现」的位置，父卡只会同行或更靠上；这里兜底跳过异常方向。
        if (pr < 0 || cr < 0 || pr > cr) return;
        let kind;
        if (pr === cr) {
          const blocked = cards.some((other) => {
            if (other === parent || other === child) return false;
            const o = boxes.get(other);
            return o.left < c.left && o.right > p.right && o.top < c.bottom && o.bottom > c.top;
          });
          kind = blocked ? "over" : "h";
        } else {
          kind = cr - pr >= 2 ? "corridor" : "cross";
        }
        wires.push({ parent, child, p, c, pr, cr, kind, accent: getComputedStyle(child).getPropertyValue("--chain-accent").trim() || accentFallback });
      });
    });
    if (!wires.length) return;

    // 车道分配：按「缝隙」分组（缝隙 = 某一行上方的空白带），组内所有线均匀铺开
    // （n 条线把缝隙分成 n+1 份），任意条数都不会共线重叠。
    const laneGroups = new Map();
    const requestLane = (wire, gapIdx, role) => {
      if (!laneGroups.has(gapIdx)) laneGroups.set(gapIdx, []);
      laneGroups.get(gapIdx).push({ wire, role });
    };
    wires.forEach((wire) => {
      if (wire.kind === "over") requestLane(wire, wire.pr, "lane");
      else if (wire.kind === "cross") requestLane(wire, wire.cr, "lane");
      else if (wire.kind === "corridor") {
        requestLane(wire, wire.pr + 1, "laneOut");
        requestLane(wire, wire.cr, "laneIn");
      }
    });
    laneGroups.forEach((list, gapIdx) => {
      const top = gapIdx === 0 ? 0 : rows[gapIdx - 1].bottom;
      const bottom = gapIdx >= rows.length ? flow.scrollHeight : rows[gapIdx].top;
      const center = (top + bottom) / 2;
      // 车道离上下卡片各留 4px（原来是 6px，缝隙里能用的高度太少时线会挤在一起）
      const half = Math.max(0, (bottom - top) / 2 - 4);
      // 按「父卡左边界、子卡左边界」排序，减少不必要的交叉
      list.sort((a, b) => (a.wire.p.left - b.wire.p.left) || (a.wire.c.left - b.wire.c.left));
      list.forEach((entry, index) => {
        const offset = list.length === 1 ? 0 : ((index + 1) / (list.length + 1) - 0.5) * 2 * half;
        entry.wire[entry.role] = center + offset;
      });
    });

    // 走廊横坐标：右侧 padding 里（卡片之外的留白），多条走廊按 8px 错开
    const corridorRight = flow.clientWidth - 8;
    wires.filter((wire) => wire.kind === "corridor").forEach((wire, index) => {
      wire.corridorX = corridorRight - (index % 3) * 8;
    });

    // 锚点分配：同一卡片同一边的多条线按对端位置排序，均匀铺在边长的 (i+1)/(n+1) 处。
    const anchors = new Map();
    const pushAnchor = (card, side, wire, otherPos) => {
      const key = `${card.dataset.chainId}:${side}`;
      if (!anchors.has(key)) anchors.set(key, []);
      anchors.get(key).push({ wire, otherPos });
    };
    wires.forEach((w) => {
      if (w.kind === "h") {
        pushAnchor(w.parent, "right", w, w.c.left);
        pushAnchor(w.child, "left", w, w.p.right);
      } else if (w.kind === "over") {
        pushAnchor(w.parent, "top", w, w.c.left);
        pushAnchor(w.child, "top", w, w.p.left);
      } else {
        pushAnchor(w.parent, "bottom", w, w.c.left);
        pushAnchor(w.child, "top", w, w.p.left);
      }
    });
    anchors.forEach((list) => list.sort((a, b) => a.otherPos - b.otherPos));
    const anchorPoint = (wire, card, side) => {
      const b = boxes.get(card);
      const list = anchors.get(`${card.dataset.chainId}:${side}`) || [];
      const index = list.findIndex((entry) => entry.wire === wire);
      const frac = (index + 1) / (list.length + 1);
      if (side === "top") return { x: b.left + b.width * frac, y: b.top };
      if (side === "bottom") return { x: b.left + b.width * frac, y: b.bottom };
      if (side === "left") return { x: b.left, y: b.top + b.height * frac };
      return { x: b.right, y: b.top + b.height * frac };
    };

    // 光晕用页面底色（.chain-flow 本身透明，卡片之外的线画在页面背景上）
    const haloColor = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0b0e0f";
    const parts = [];
    wires.forEach((w) => {
      let d;
      let end;
      if (w.kind === "h") {
        const start = anchorPoint(w, w.parent, "right");
        end = anchorPoint(w, w.child, "left");
        d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      } else if (w.kind === "corridor") {
        const start = anchorPoint(w, w.parent, "bottom");
        end = anchorPoint(w, w.child, "top");
        d = chainPolylinePath([
          start,
          { x: start.x, y: w.laneOut },
          { x: w.corridorX, y: w.laneOut },
          { x: w.corridorX, y: w.laneIn },
          { x: end.x, y: w.laneIn },
          end,
        ]);
      } else {
        const start = anchorPoint(w, w.parent, w.kind === "over" ? "top" : "bottom");
        end = anchorPoint(w, w.child, "top");
        d = chainRoutePath(start.x, start.y, end.x, end.y, w.lane);
      }
      // 先画一条页面底色的「光晕」描边，再画彩色细线：相邻平行线和交叉处不会糊在一起
      parts.push(`<path d="${d}" stroke="${haloColor}" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
      parts.push(`<path data-wire-parent="${w.parent.dataset.chainId}" data-wire-child="${w.child.dataset.chainId}" d="${d}" stroke="${w.accent}" fill="none" stroke-width="1.5"/>`);
      parts.push(`<circle data-wire-parent="${w.parent.dataset.chainId}" data-wire-child="${w.child.dataset.chainId}" cx="${end.x}" cy="${end.y}" r="2.5" fill="${w.accent}"/>`);
    });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "chain-wires");
    // 尺寸按内容算但不超出容器：覆盖层不能反过来把卡片流撑出横向滚动
    svg.setAttribute("width", Math.min(flow.scrollWidth, flow.clientWidth));
    svg.setAttribute("height", flow.scrollHeight);
    svg.innerHTML = parts.join("");
    flow.append(svg);
  });
}

window.addEventListener("resize", () => { scheduleChainWires(); scheduleHitboxFit(); });
// details 折叠/展开会改变卡片尺寸和位置；toggle 不冒泡，用捕获监听。
document.addEventListener("toggle", (event) => {
  if (event.target.closest?.("#data-chain-content")) scheduleChainWires();
  if (event.target.closest?.("#entity-details")) scheduleHitboxFit();
}, true);

/* ---------- 卡片级联闪烁：点击后向下找出整棵子树，按深度依次触发，动画结束自动恢复 ---------- */

const CHAIN_FLASH_STEP = 400; // 每深一层，延迟多等 400ms

function flashChainCard(card) {
  const flow = card.closest(".chain-flow");
  if (!flow) return;
  // 清掉上一次还在播的级联
  flow.querySelectorAll(".flash, .flash-related, .wire-flash").forEach((el) => {
    el.classList.remove("flash", "flash-related", "wire-flash");
    el.style.animationDelay = "";
  });
  void flow.offsetWidth;
  // 子表：父 id → 子卡片列表（共享卡片会出现在多个父的列表里；同一 flow 内 id 唯一）
  const childrenByParent = new Map();
  flow.querySelectorAll(".chain-card").forEach((el) => {
    (el.dataset.chainParents || "").split(",").filter(Boolean).forEach((parentId) => {
      const list = childrenByParent.get(parentId);
      if (list) list.push(el);
      else childrenByParent.set(parentId, [el]);
    });
  });
  const subtreeIds = new Set([card.dataset.chainId]);
  card.classList.add("flash");
  // BFS：深度即触发顺序；共享卡片可能被多条路径到达，visited 防止重复与回环
  const visited = new Set([card]);
  let frontier = [card];
  let depth = 0;
  while (frontier.length) {
    depth += 1;
    const next = [];
    const delay = `${depth * CHAIN_FLASH_STEP}ms`;
    frontier.forEach((parent) => {
      (childrenByParent.get(parent.dataset.chainId) || []).forEach((child) => {
        if (visited.has(child)) return;
        visited.add(child);
        child.classList.add("flash-related");
        child.style.animationDelay = delay;
        subtreeIds.add(child.dataset.chainId);
        next.push(child);
      });
    });
    frontier = next;
  }
  // 连线：父端在子树内的边（即指向子树节点的线）随子卡同拍亮起
  const parentIds = new Set([card.dataset.chainId, ...subtreeIds]);
  flow.querySelectorAll(".chain-wires path, .chain-wires circle").forEach((el) => {
    if (!parentIds.has(el.dataset.wireParent) || !subtreeIds.has(el.dataset.wireChild)) return;
    const child = flow.querySelector(`.chain-card[data-chain-id="${el.dataset.wireChild}"]`);
    const childDepth = child?.classList.contains("flash-related")
      ? Math.round(parseFloat(child.style.animationDelay) / CHAIN_FLASH_STEP)
      : 0;
    el.classList.add("wire-flash");
    el.style.animationDelay = `${childDepth * CHAIN_FLASH_STEP}ms`;
  });
}

const chainContentEl = document.querySelector("#data-chain-content");
chainContentEl?.addEventListener("click", (event) => {
  const card = event.target.closest(".chain-card");
  if (card) flashChainCard(card);
});
// 动画结束即摘掉类和延迟，避免残留状态
chainContentEl?.addEventListener("animationend", (event) => {
  event.target.classList?.remove("flash", "flash-related", "wire-flash");
  event.target.style.animationDelay = "";
});
