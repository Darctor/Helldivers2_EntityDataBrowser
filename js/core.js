/**
 * 共享核心：状态、工具函数、UI/common 文案、通用表格。
 * 各组件字段文案仍在 js/components/<Name>.js，由 registry 合并进 TRANSLATIONS。
 */

const state = {
  locale: "zh",
  stores: {},
  settingsStores: null,
  currentHash: "",
  entityGroups: [],
  // 实体列表两级菜单的当前视图：major=null 表示一级大类；scrollTop 记住二级滚动位置。
  entityPickerView: { major: null },
  nameConfig: { version: 1, entities: {} },
  hashCatalog: [],
  hashCatalogByHex: new Map(),
  hashInputFormat: "hex",
  configDirectoryHandle: null,
  entitiesDirectoryHandle: null,
  missingTranslationPaths: new Set(),
};

const CONFIG_FILE_NAME = "hitbox-details.json";
const CONFIG_STORAGE_KEY = "helldivers2-hitbox-details";
const HANDLE_DB_NAME = "helldivers2-entity-browser";
const HANDLE_STORE_NAME = "folders";
const MAX_MOUNT_DEPTH = 8;

const dom = {
  select: document.querySelector("#entity-select"),
  entityPickerTrigger: document.querySelector("#entity-picker-trigger"),
  entityPickerMenu: document.querySelector("#entity-picker-menu"),
  search: document.querySelector("#entity-search"),
  searchResult: document.querySelector("#search-result"),
  manualHash: document.querySelector("#manual-hash"),
  hashFormatToggle: document.querySelector("#hash-format-toggle"),
  readManualHashButton: document.querySelector("#read-manual-hash"),
  manualHashResult: document.querySelector("#manual-hash-result"),
  folderInput: document.querySelector("#data-folder"),
  selectEntitiesFolder: document.querySelector("#select-entities-folder"),
  languageToggle: document.querySelector("#language-toggle"),
  themeToggle: document.querySelector("#theme-toggle"),
  authorizeFolders: document.querySelector("#authorize-folders"),
  selectConfigFolder: document.querySelector("#select-config-folder"),
  saveHitboxConfig: document.querySelector("#save-hitbox-config"),
  nameConfigStatus: document.querySelector("#name-config-status"),
  statusNode: document.querySelector("#load-status"),
  emptyState: document.querySelector("#empty-state"),
  details: document.querySelector("#entity-details"),
  browserView: document.querySelector("#browser-view"),
  rawView: document.querySelector("#raw-view"),
  modeToggle: document.querySelector("#mode-toggle"),
};

function asMap(payload) {
  return new Map(payload.entities.flatMap((item) => Object.entries(item)));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function decimalToHexHash(decimalHash) {
  return `0x${BigInt(decimalHash).toString(16).toUpperCase().padStart(16, "0")}`;
}

function normalizeHashInput(value, format) {
  const raw = value.trim().replace(/[=\s"]/g, "");
  if (!raw) return null;
  try {
    return format === "hex"
      ? `0x${BigInt(raw).toString(16).toUpperCase().padStart(16, "0")}`
      : decimalToHexHash(raw);
  } catch {
    return null;
  }
}

function text(value, fallback = "—") {
  return value === undefined || value === null || value === "" ? fallback : String(value);
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function enumLabel(value) {
  const raw = text(value);
  if (!raw.includes("<=>")) return raw;
  const [left, right] = raw.split("<=>", 2);
  const name = right.trim();
  if (left.trim() === "0" && /^(ProjectileType|DamageInfoType|ExplosionType)_/.test(name)) return "None";
  return name.replace(/^[A-Za-z]+_/, "");
}

// 从 "N <=> TypeName_ItemName" 提取枚举类型名。导出格式的类型名不含下划线，取首个单词；
// 类型名缺失时是 "0xAE7D1593_Unknown_3"，同样取首段。无 <=> 返回空串。
function enumTypeName(value) {
  const raw = String(value ?? "");
  const idx = raw.indexOf("<=>");
  if (idx < 0) return "";
  const name = raw.slice(idx + 3).trim();
  const first = name.split("_", 1)[0];
  return first && first !== name ? first : "";
}

// statGrid 的枚举卡构造器：value 传原始枚举串，由 statGrid 按 kind 统一格式化；
// type 附在标签后（如「电弧类型 ArcType」）。
function enumStat(label, raw) {
  return { label, kind: "enum", value: raw, type: enumTypeName(raw) };
}

// 给 createTable 的某一列声明 kind:"enum"（表体橙色）并附加枚举类型名（显示在表头）。
// 无论 type 是否取到（全占位兜底行可能取不到），kind 都注入，保证原始枚举串始终被格式化。
function enumColumn(columns, field, type) {
  return columns.map((column) => (column.field === field ? { ...column, kind: "enum", ...(type ? { enumType: type } : {}) } : column));
}

// 枚举字符串 "7 <=> ArcType_ArcThrower" 取 <=> 左侧数值；无 <=> 返回空串。
function typeNumber(value) {
  const raw = String(value ?? "");
  return raw.includes("<=>") ? raw.split("<=>", 1)[0].trim() : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

const UI_TRANSLATIONS = {
  zh: {
    ui: {
      pageTitle: "实体数据浏览器", localOpen: "本地直接打开时", selectEntities: "选择数据文件夹",
      localHint: "选择含 entities、settings、entity_deltas 和 Hash.csv 的目录。Dump_<日期> 或已发布的 Data 目录都可以。文件名优先用不带日期的；带日期时必须和 site-config.js 的 patch_date 一致。授权会记住。",
      searchEntity: "搜索实体", searchPlaceholder: "输入哈希、中文名或英文名", entityList: "实体列表",
      backToCategories: "返回大类",
      manualHash: "手动读取哈希", manualHashPlaceholder: "输入十进制哈希值", readEntity: "开始读取",
      waitingData: "等待作战档案载入。", healthComponentData: "HealthComponentData（生命值相关数据）", hitboxStats: "受击部位统计",
      elementDamage: "元素伤害倍率", deathSettings: "死亡相关设置", hitReactComponentData: "HitReactComponentData（受击反应）", statusEffectReceiverComponentData: "StatusEffectReceiverComponentData（状态效果接收器）", mountComponentData: "MountComponentData（挂载数据）",
      arcWeaponComponentData: "ArcWeaponComponentData（电弧武器数据）", beamWeaponComponentData: "BeamWeaponComponentData（激光武器数据）", bombardmentComponentData: "BombardmentComponentData（轰炸数据）",
      damageZoneShieldComponentData: "DamageZoneShieldComponentData（部位护盾数据）", depositComponentData: "DepositComponentData（存放数据）", eagleComponentData: "EagleComponentData（飞鹰数据）",
      enemyPackageComponentData: "EnemyPackageComponentData（敌人包裹数据）", explosiveComponentData: "ExplosiveComponentData（爆炸物数据）", factionComponentData: "FactionComponentData（阵营数据）",
      inventoryComponentData: "InventoryComponentData（装备库存数据）", loadoutPackageComponentData: "LoadoutPackageComponentData（加载包裹数据）", projectileWeaponComponentData: "ProjectileWeaponComponentData（射弹武器数据）",
      weaponChargeComponentData: "WeaponChargeComponentData（武器充能数据）", weaponDataComponentData: "WeaponDataComponentData（武器数据）", weaponHeatComponentData: "WeaponHeatComponentData（武器热量数据）", weaponMagazineComponentData: "WeaponMagazineComponentData（武器弹匣数据）",
      hellpodRackComponentData: "HellpodRackComponentData（地狱空投仓负载数据）", meleeWeaponComponentData: "MeleeWeaponComponentData（近战武器数据）", shieldComponentData: "ShieldComponentData（护盾数据）", sprayWeaponComponentData: "SprayWeaponComponentData（射流武器数据）",
      throwableComponentData: "ThrowableComponentData（投掷物数据）", turretComponentData: "TurretComponentData（炮塔数据）", weaponReloadComponentData: "WeaponReloadComponentData（武器换弹数据）", weaponRoundsComponentData: "WeaponRoundsComponentData（散发供弹数据）",
      minefieldComponentData: "MinefieldComponentData（地雷数据）", orbitalAbilityComponentData: "OrbitalAbilityComponentData（轨道能力数据）", sensorComponents: "Sensor(Danger / Ear / Eye)ComponentData（感知数据）",
      selectConfigFolder: "选择 web 文件夹", saveConfig: "保存部位名称配置", authorizeFolders: "授权最近使用的文件夹",
      configHint: "部位名称与备注按“实体哈希 + 索引 + 语言”保存在 hitbox-details.json。", explosionNote: "先判定区域是否受爆炸伤害，再检查爆炸伤害乘数。",
      collapse: "折叠", expand: "展开",
      viewRawData: "查看原始数据", backToBrowser: "返回实体浏览器",
      dataChain: "数据链（引用递归展开）", dataChainNote: "从组件读到的有效枚举引用出发，递归展开 settings 表中的嵌套数据。", dataChainWarn: "游戏并不一定会使用每一条数据，请以实际情况为准。",
      dataChainNoSettings: "未加载 settings 数据。请选择包含 settings 子文件夹的数据目录后重试。",
      rawFoldersTitle: "选择数据目录", rawFilesTitle: "选择文件", rawLookupTitle: "查找并查看一条记录",
      rawLookupHintEntity: "输入哈希、index、名称，自动匹配。", rawLookupHintSettings: "输入 type（数值或名称，如 7 / ArcType_ArcThrower），自动匹配。", rawLookupHintNoType: "该文件无 type，输入 index 或 debug name，自动匹配。",
      rawLookupPlaceholderEntity: "哈希 / index / 名称", rawLookupPlaceholderSettings: "type 数值或名称", rawLookupPlaceholderNoType: "index 或 debug name",
      rawLookupSelect: "从列表选择", rawLookupButton: "读取这一条", rawBack: "返回上一级", rawNoGroup: "未分组",
      rawFlat: "平铺展示", rawFixed: "固定区域",
      rawLoading: "正在加载 JSON…", rawLoadFailed: "文件加载失败", rawNotFound: "未找到匹配记录。",
      rawEntryCount: "共 {n} 条", rawChooseFolder: "选择数据文件夹", rawChangeFolder: "换一个文件夹",
      rawFoldersHint: "列出 entities、settings、entity_deltas 和 JSON。配置、枚举、HashMap、typelib 布局不显示；要看它们时直接选择那个文件夹。",
      rawPickFolder: "选择要浏览的文件夹。授权会记住，换版本不用改脚本。",
      toc: "目录",
      themeToLight: "浅色", themeToDark: "深色",
    },
    common: { yes: "是", no: "否", fatal: "致命", down: "击倒", defaultName: "main", noData: "此组件没有可展示的有效条目。" },
  },
  en: {
    ui: {
      pageTitle: "Entity Data Browser", localOpen: "When opened locally", selectEntities: "Select data folder",
      localHint: "Select a folder that contains entities, settings, entity_deltas, and Hash.csv. A Dump_<date> folder or the published Data folder both work. Undated file names are preferred; a dated name must match patch_date in site-config.js. The authorization is remembered.",
      searchEntity: "Search entity", searchPlaceholder: "Enter hash, Chinese name, or English name", entityList: "Entity list",
      backToCategories: "Back to categories",
      manualHash: "Manual hash lookup", manualHashPlaceholder: "Enter hexadecimal hash", readEntity: "Read entity",
      waitingData: "Waiting for archive data.", healthComponentData: "HealthComponentData", hitboxStats: "Damage Zone Stats",
      elementDamage: "Element Damage Multipliers", deathSettings: "Death and Destruction Settings", hitReactComponentData: "HitReactComponentData", statusEffectReceiverComponentData: "StatusEffectReceiverComponentData", mountComponentData: "MountComponentData",
      arcWeaponComponentData: "ArcWeaponComponentData", beamWeaponComponentData: "BeamWeaponComponentData", bombardmentComponentData: "BombardmentComponentData",
      damageZoneShieldComponentData: "DamageZoneShieldComponentData", depositComponentData: "DepositComponentData", eagleComponentData: "EagleComponentData",
      enemyPackageComponentData: "EnemyPackageComponentData", explosiveComponentData: "ExplosiveComponentData", factionComponentData: "FactionComponentData",
      inventoryComponentData: "InventoryComponentData", loadoutPackageComponentData: "LoadoutPackageComponentData", projectileWeaponComponentData: "ProjectileWeaponComponentData",
      weaponChargeComponentData: "WeaponChargeComponentData", weaponDataComponentData: "WeaponDataComponentData", weaponHeatComponentData: "WeaponHeatComponentData", weaponMagazineComponentData: "WeaponMagazineComponentData",
      hellpodRackComponentData: "HellpodRackComponentData", meleeWeaponComponentData: "MeleeWeaponComponentData", shieldComponentData: "ShieldComponentData", sprayWeaponComponentData: "SprayWeaponComponentData",
      throwableComponentData: "ThrowableComponentData", turretComponentData: "TurretComponentData", weaponReloadComponentData: "WeaponReloadComponentData", weaponRoundsComponentData: "WeaponRoundsComponentData",
      minefieldComponentData: "MinefieldComponentData", orbitalAbilityComponentData: "OrbitalAbilityComponentData", sensorComponents: "Sensor(Danger / Ear / Eye)ComponentData",
      selectConfigFolder: "Select web folder", saveConfig: "Save zone names", authorizeFolders: "Authorize recent folders",
      configHint: "Zone names and notes are saved in hitbox-details.json by entity hash, index, and language.", explosionNote: "First determine if the zone has been affected by the explosion, then check the ExDM.",
      collapse: "Collapse", expand: "Expand",
      viewRawData: "View raw data", backToBrowser: "Back to entity browser",
      dataChain: "Data Chain (recursive refs)", dataChainNote: "Starts from valid enum refs in components and expands nested settings data recursively.", dataChainWarn: "The game does not necessarily use every entry; verify in practice.",
      dataChainNoSettings: "Settings data not loaded. Select a data folder that contains the settings subfolder and retry.",
      rawFoldersTitle: "Choose a data folder", rawFilesTitle: "Choose a file", rawLookupTitle: "Look up one record",
      rawLookupHintEntity: "Enter hash, index, or name — auto-matches.", rawLookupHintSettings: "Enter type (number or name, e.g. 7 / ArcType_ArcThrower) — auto-matches.", rawLookupHintNoType: "This file has no type; enter index or debug name — auto-matches.",
      rawLookupPlaceholderEntity: "hash / index / name", rawLookupPlaceholderSettings: "type number or name", rawLookupPlaceholderNoType: "index or debug name",
      rawLookupSelect: "Pick from list", rawLookupButton: "Load record", rawBack: "Go back", rawNoGroup: "Ungrouped",
      rawFlat: "Expand full", rawFixed: "Fit panel",
      rawLoading: "Loading JSON…", rawLoadFailed: "Failed to load file", rawNotFound: "No matching record found.",
      rawEntryCount: "{n} entries", rawChooseFolder: "Choose data folder", rawChangeFolder: "Choose another folder",
      rawFoldersHint: "Lists entities, settings, entity_deltas, and JSON. Config, enums, HashMap, and typelib layouts stay hidden unless you select that folder directly.",
      rawPickFolder: "Choose the folder to browse. Authorization is remembered, and new patches do not require script edits.",
      toc: "Contents",
      themeToLight: "Light", themeToDark: "Dark",
    },
    common: { yes: "Yes", no: "No", fatal: "Fatal", down: "Downs", defaultName: "main", noData: "No displayable entries in this component." },
  },
};

const TRANSLATIONS = {
  zh: { ...UI_TRANSLATIONS.zh },
  en: { ...UI_TRANSLATIONS.en },
};

function registerComponentI18n(componentName, i18n) {
  if (i18n.zh) TRANSLATIONS.zh[componentName] = i18n.zh;
  if (i18n.en) TRANSLATIONS.en[componentName] = i18n.en;
}

function t(key) {
  return translate(`ui.${key}`);
}

function translate(path) {
  const value = path.split(".").reduce((branch, key) => branch?.[key], TRANSLATIONS[state.locale]);
  if (typeof value === "string") return value;
  if (!state.missingTranslationPaths.has(`${state.locale}:${path}`)) {
    state.missingTranslationPaths.add(`${state.locale}:${path}`);
    console.warn(`Missing translation path: ${path}`);
  }
  return path;
}

function bool(value) {
  return Number(value) === 1 ? translate("common.yes") : translate("common.no");
}

function configuredHitboxDetail(zoneKey, field, fallback = "", entityHash = state.currentHash) {
  return state.nameConfig.entities[entityHash]?.zones?.[String(zoneKey)]?.[`${field}_${state.locale}`] || fallback;
}

function cacheNameConfig() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.nameConfig));
  } catch {
    // Local storage is an optional convenience cache; the JSON file remains the portable source.
  }
}

/* ---------- kind 类型体系 ----------
   表格列与统计卡都按显式 kind 声明取值和样式：值传原始值，core 统一格式化并定样式，
   不再对格式化后的字符串做正则嗅探。kind 缺省 text（原样放行，兼容已是字符串的值）。 */
const KIND_FORMATTERS = {
  num: (value) => (typeof value === "string" ? value : formatNumber(value)),
  percent: (value) => (typeof value === "string" ? value : percent(value)),
  enum: (value) => enumLabel(value),
  bool: (value) => (typeof value === "string" ? value : bool(value)),
  hash: (value) => formatResourceHash(value),
  id: (value) => formatId(value),
  vec3: vec3Text,
  text: text,
};

// kind → 单元格/统计卡 class。num/percent/hash/id/vec3 统一走 "num"（--value + 等宽 + tabular-nums）。
function kindCellClass(kind, raw) {
  if (kind === "bool") {
    if (raw === undefined || raw === null || raw === "") return "";
    if (typeof raw === "string") return /^(是|Yes)$/.test(raw) ? "yes" : /^(否|No)$/.test(raw) ? "no" : "";
    return Number(raw) === 1 ? "yes" : "no";
  }
  return { num: "num", percent: "num", hash: "num", id: "num", vec3: "num", enum: "enum" }[kind] || "";
}

// 共享 vec3 格式化："x / y / z"（Throwable、HellpodRack、ProjectileWeapon 等共用）。
function vec3Text(value) {
  const point = value || {};
  return `${formatNumber(point.x)} / ${formatNumber(point.y)} / ${formatNumber(point.z)}`;
}

function createTable(columns, rows, editableHitboxes = false) {
  if (!rows.length) return `<div class="no-data">${translate("common.noData")}</div>`;
  // 受击部位表（含 Mount 嵌套只读表）共用 hitbox-table 列宽；可编辑仅影响名称/备注输入框。
  const isHitboxLayout = editableHitboxes || columns.some((column) => column.field === "zoneKey");
  const columnGroup = isHitboxLayout
    ? `<colgroup>${columns.map(({ field }) => `<col class="column-${field}">`).join("")}</colgroup>`
    : "";
  // 每列的枚举类型名解析一次：只用于表头徽标；表体枚举标由 kind:"enum" 驱动。
  const columnTypes = columns.map(({ enumType }) => (typeof enumType === "function" ? enumType(rows) : enumType) || "");
  const header = columns.map(({ field, labelPath, kind = "text" }, index) => {
    const type = columnTypes[index];
    return `<th class="column-${field} kind-${kind}">${escapeHtml(translate(labelPath))}${type ? `<span class="col-type" title="${escapeHtml(type)}">${escapeHtml(type)}</span>` : ""}</th>`;
  }).join("");
  // 爆炸两列的说明单独做表格上方的一条注释（不再占一整行表头：合并单元格里会折成两行、
  // 左右还留一串空格子）。只读表（网站模式、挂载树里的嵌套部位表）也显示——它是列说明。
  const tableNote = isHitboxLayout ? `<p class="table-note">${escapeHtml(t("explosionNote"))}</p>` : "";
  const body = rows.map((row) => `<tr${editableHitboxes ? ` data-zone-key="${escapeHtml(row.zoneKey)}"` : ""}>${columns.map((column, index) => {
    const { field } = column;
    if (editableHitboxes && field === "hitbox") {
      const fallback = row.zoneKey === "default" ? translate("common.defaultName") : "";
      const name = configuredHitboxDetail(row.zoneKey, "name", fallback);
      return `<td class="column-${field}"><textarea class="hitbox-name-input" rows="1" data-zone-key="${escapeHtml(row.zoneKey)}" data-detail-field="name" placeholder="${escapeHtml(fallback || "—")}">${escapeHtml(name)}</textarea></td>`;
    }
    if (editableHitboxes && field === "note") {
      const note = configuredHitboxDetail(row.zoneKey, "note");
      return `<td class="column-${field}"><textarea class="hitbox-note-input" rows="1" data-zone-key="${escapeHtml(row.zoneKey)}" data-detail-field="note">${escapeHtml(note)}</textarea></td>`;
    }
    const kind = column.kind || "text";
    const raw = row[field];
    const value = KIND_FORMATTERS[kind](raw);
    let className = kindCellClass(kind, raw);
    if (!className && kind === "text" && /^(致命|Fatal|击倒|Downs)$/.test(value)) className = "fatal";
    // 速率后缀 [±N/s] 次级样式：先整体转义再包裹尾缀（尾缀不含可转义字符，无双转义风险）。
    const html = escapeHtml(value).replace(/(\[\s*[-+]?\d[\d.,]*\s*\/s\s*\])$/, '<span class="rate">$1</span>');
    return `<td class="column-${field} kind-${kind} ${className}">${html}</td>`;
  }).join("")}</tr>`).join("");
  return `<div class="table-scroll">${tableNote}<table class="${isHitboxLayout ? "hitbox-table" : ""}">${columnGroup}<thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/**
 * 通用胶囊流：把一维数组渲染成横向自动换行的小胶囊，压缩纵向高度。
 * 适用于 JSON 里就是标量数组的数据（[1, 2, 3] 或 ["0 <=> ProjectileType_X", ...]）。
 * 嵌套结构体的数组（[{}, {}, {}]）元素带字段名、需要多列对照（受击部位、状态效果接收器等），
 * 不走此函数：这里对对象元素直接返回空串拒绝渲染，调用方也应自觉只传标量数组。
 * 选项：label(item, position) 自定义胶囊文本；index=false 隐藏序号；title(item) 悬停提示。
 */
function chipFlow(items, options = {}) {
  const list = Array.isArray(items) ? items : [];
  if (list.some((item) => item && typeof item === "object")) return "";
  if (!list.length) return `<div class="no-data">${translate("common.noData")}</div>`;
  const showIndex = options.index !== false;
  const labelOf = options.label || ((item) => (typeof item === "string" ? enumLabel(item) : formatNumber(item)));
  const titleOf = options.title;
  const chips = list.map((item, position) => {
    const label = labelOf(item, position);
    const title = titleOf ? escapeHtml(titleOf(item, position)) : "";
    const ord = showIndex ? `<span class="chip-index">${position + 1}</span>` : "";
    return `<span class="chip"${title ? ` title="${title}"` : ""}>${ord}<span class="chip-text">${escapeHtml(label)}</span></span>`;
  }).join("");
  return `<div class="chip-flow">${chips}</div>`;
}

function updateHitboxDetail(event) {
  const hash = state.currentHash || dom.select.value;
  const zoneKey = event.target.dataset.zoneKey;
  const value = event.target.value.trim();
  const field = event.target.dataset.detailField;
  const healthComponentData = state.stores.HealthComponentData.get(hash);
  state.nameConfig.entities[hash] ||= {
    name: healthComponentData?.name || "N/A",
    name_zh: healthComponentData?.name_zh || "N/A",
    zones: {},
  };
  state.nameConfig.entities[hash].zones[zoneKey] ||= { name_zh: "", note_zh: "", name_en: "", note_en: "" };
  state.nameConfig.entities[hash].zones[zoneKey][`${field}_${state.locale}`] = value;
  event.target.style.height = "auto";
  event.target.style.height = `${event.target.scrollHeight}px`;
  cacheNameConfig();
}

/** 供 Mount 树运行时查询组件定义；由 registry 在初始化后注入。 */
let componentLookup = {};

function setComponentLookup(registry) {
  componentLookup = registry;
}

function getComponentLookup() {
  return componentLookup;
}

function formatNumber(value) {
  if (value === undefined || value === null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return text(value);
  if (Number.isInteger(number)) return String(number);
  return number.toFixed(4).replace(/\.?0+$/, "");
}

function formatId(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "—";
  const unsigned = number >>> 0;
  return `${unsigned} (0x${unsigned.toString(16).toUpperCase().padStart(8, "0")})`;
}

function resourceHashParts(value) {
  if (value === undefined || value === null || value === "" || value === "0" || value === 0) return null;
  let hex;
  try {
    hex = decimalToHexHash(String(value).replace(/[="\s]/g, ""));
  } catch {
    return { hex: text(value), name: "" };
  }
  const entry = state.hashCatalogByHex.get(hex);
  if (!entry) return { hex, name: "" };
  const primary = state.locale === "zh" ? entry.name_zh : entry.name;
  const secondary = state.locale === "zh" ? entry.name : entry.name_zh;
  const name = primary && primary !== "N/A" ? primary : (secondary && secondary !== "N/A" ? secondary : "");
  return { hex, name };
}

function formatResourceHash(value) {
  const parts = resourceHashParts(value);
  if (!parts) return "—";
  return parts.name ? `${parts.hex} — ${parts.name}` : parts.hex;
}

function hashStat(label, value) {
  return { label, kind: "hash", value };
}

// 布尔统计卡构造器：值传原始 0/1，由 statGrid 按 kind 渲染成 ✓是/✕否（绿/红）。
function boolStat(label, value) {
  return { label, kind: "bool", value };
}

function isPlaceholderEnum(value) {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0") return true;
  const raw = String(value);
  const name = raw.includes("<=>") ? raw.split("<=>", 2)[1].trim() : raw;
  return /(?:^|_)(?:None|Unknown_0)$/.test(name);
}

function fieldLabel(componentName, path) {
  return translate(`${componentName}.${path}`);
}

function statGrid(items) {
  return `<div class="stat-grid">${items.map((item) => {
    // hint：标签下的灰色算法注释（如「= (drift.h + climb.h) / 2」）。
    const label = item.type ? `${escapeHtml(item.label)}<span class="stat-card-type">${escapeHtml(item.type)}</span>` : escapeHtml(item.label);
    const hint = item.hint ? `<span class="stat-card-hint">${escapeHtml(item.hint)}</span>` : "";
    if (item.kind === "hash") {
      const parts = resourceHashParts(item.value);
      const body = parts
        ? `<span class="hash-hex">${escapeHtml(parts.hex)}</span>${parts.name ? `<span class="hash-name">${escapeHtml(parts.name)}</span>` : ""}`
        : "—";
      return `<dl class="stat-card stat-card-hash"><dt>${label}${hint}</dt><dd>${body}</dd></dl>`;
    }
    const kind = item.kind || "text";
    const value = KIND_FORMATTERS[kind](item.value);
    // 估宽超过单栏（168-24=144px）的卡跨两列：值按等宽 1rem ≈10.2px/字，
    // 标签按 CJK 13px、其余 7.5px，另加类型徽标宽。估不准的部分由 break-word 兜底。
    const valueWidth = value.length * 10.2;
    const labelWidth = [...item.label].reduce((sum, ch) => sum + (/[㐀-鿿＀-￯]/.test(ch) ? 13 : 7.5), 0)
      + (item.type ? item.type.length * 6.5 + 6 : 0);
    const wide = Math.max(valueWidth, labelWidth) > 144 ? " stat-card-wide" : "";
    // dd 上没有 td.enum 规则，枚举卡用 stat-enum 上色；bool 复用 yes/no（含 ✓/✕ 前缀）。
    const ddClass = kind === "enum" ? "stat-enum" : kindCellClass(kind, item.value);
    return `<dl class="stat-card${wide}"><dt>${label}${hint}</dt><dd${ddClass ? ` class="${ddClass}"` : ""}>${escapeHtml(value)}</dd></dl>`;
  }).join("")}</div>`;
}

function subpanel(title, body) {
  return `<div class="subpanel"><h3>${escapeHtml(title)}</h3>${body}</div>`;
}

function nestedComponentPanel(title, body) {
  return `<section class="nested-component-panel"><div class="panel-heading"><h4>${escapeHtml(title)}</h4><button class="collapse-toggle" type="button" aria-expanded="true">${escapeHtml(t("collapse"))}</button></div><div class="panel-body">${body}</div></section>`;
}

function defineComponentView(spec) {
  const { name } = spec;
  function render(_hash, record) {
    const target = document.querySelector(spec.contentId);
    if (!record) {
      target.innerHTML = `<div class="no-data">${state.locale === "zh" ? `该实体没有 ${name}。` : `This entity has no ${name}.`}</div>`;
      return;
    }
    target.innerHTML = spec.build(record, _hash) + linkedEntityTree(spec.links?.(record) || [], _hash);
  }
  function buildNested(hash, record) {
    return nestedComponentPanel(name, spec.build(record, hash));
  }
  return {
    name,
    file: name,
    label: { zh: name, en: name },
    summarize: spec.summarize,
    schema: spec.schema,
    i18n: spec.i18n,
    render,
    buildNested,
  };
}

function resourceHashHex(value) {
  return resourceHashParts(value)?.hex || "";
}

function linkedHashEntries(pairs) {
  return pairs.flatMap(([raw, label, origin]) => {
    const hex = resourceHashHex(raw);
    return hex ? [{ hash: hex, label, detail: String(raw), origin: origin || "" }] : [];
  });
}

function componentsOfEntity(hash) {
  const registry = getComponentLookup();
  return Object.fromEntries(Object.keys(registry)
    .map((componentName) => [componentName, state.stores[componentName]?.get(hash)])
    .filter(([, record]) => Boolean(record)));
}

function displayNameOfEntity(hash, components = componentsOfEntity(hash)) {
  const catalogEntry = state.hashCatalogByHex.get(hash);
  const record = Object.values(components)[0];
  const chinese = catalogEntry?.name_zh || (record?.name_zh && record.name_zh !== "N/A" ? record.name_zh : record?.name);
  const english = catalogEntry?.name || record?.name;
  return state.locale === "zh" ? chinese || "未命名实体" : english || "Unnamed entity";
}

function linksFromLoadedComponents(components) {
  const links = [];
  const deposit = components.DepositComponentData;
  if (deposit) links.push(...linkedHashEntries([[deposit.drone_path, state.locale === "zh" ? "无人机" : "Drone", "DepositComponentData.drone_path"]]));
  const inventory = components.InventoryComponentData;
  if (inventory) {
    const labels = state.locale === "zh"
      ? [["default_primary", "默认主武器"], ["default_sidearm", "默认副武器"], ["default_support", "默认支援武器"], ["default_throwable", "默认投掷物"], ["default_backpack", "默认背包"], ["default_melee_weapon", "默认近战武器"]]
      : [["default_primary", "Primary"], ["default_sidearm", "Sidearm"], ["default_support", "Support"], ["default_throwable", "Throwable"], ["default_backpack", "Backpack"], ["default_melee_weapon", "Melee"]];
    links.push(...linkedHashEntries(labels.map(([key, label]) => [inventory[key], label, `InventoryComponentData.${key}`])));
  }
  const projectile = components.ProjectileWeaponComponentData;
  if (projectile) {
    links.push(...linkedHashEntries([
      [projectile.projectile_entity, state.locale === "zh" ? "主射弹实体" : "Primary projectile", "ProjectileWeaponComponentData.projectile_entity"],
      [projectile.weapon_function_projectile_entity, state.locale === "zh" ? "副射弹实体" : "Secondary projectile", "ProjectileWeaponComponentData.weapon_function_projectile_entity"],
    ]));
  }
  const rack = components.HellpodRackComponentData;
  (rack?.payloads || []).forEach((item, index) => {
    if (!item || String(item.item) === "0") return;
    links.push(...linkedHashEntries([[item.item, `${state.locale === "zh" ? "负载" : "Payload"} ${index + 1}`, `HellpodRackComponentData.payloads[${index}]`]]));
  });
  const mount = components.MountComponentData;
  (mount?.info || []).forEach((item, index) => {
    if (String(item.path) === "0") return;
    const hex = resourceHashHex(item.path);
    if (!hex) return;
    links.push({ hash: hex, label: `${state.locale === "zh" ? "槽位" : "Slot"} ${index + 1}`, detail: String(item.path), origin: `MountComponentData.info[${index}]` });
  });
  return links;
}

function renderLinkedEntityCard(entry, depth, ancestors, seen) {
  const { hash, label, detail } = entry;
  const components = componentsOfEntity(hash);
  const hasData = Object.keys(components).length > 0;
  const displayName = displayNameOfEntity(hash, components);
  const summary = `<summary><span class="mount-slot">${escapeHtml(label)}</span><strong>${escapeHtml(displayName)}</strong><code>${escapeHtml(hash)}</code></summary>`;
  if (ancestors.has(hash)) {
    return `<details class="mount-card" style="--mount-depth:${depth}">${summary}<div class="mount-card-body"><p class="mount-unresolved">${state.locale === "zh" ? "检测到循环引用，已停止展开。" : "Cycle detected; expansion stopped."}</p></div></details>`;
  }
  if (seen.has(hash)) {
    return `<details class="mount-card mount-card-reference" style="--mount-depth:${depth}">${summary}<div class="mount-card-body"><p class="mount-unresolved">${state.locale === "zh" ? `该实体已在 ${seen.get(hash)} 展示，未重复渲染。` : `This entity is already displayed at ${seen.get(hash)}; it is not rendered again.`}</p></div></details>`;
  }
  seen.set(hash, label);
  const registry = getComponentLookup();
  const badges = Object.entries(components)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([componentName, record]) => {
      const definition = registry[componentName];
      if (!definition) return "";
      return `<span class="component-badge" title="${escapeHtml(definition.summarize(record))}">${escapeHtml(definition.label[state.locale])}</span>`;
    }).join("");
  const panels = Object.keys(components)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((componentName) => registry[componentName]?.buildNested?.(hash, components[componentName]))
    .filter(Boolean)
    .join("");
  const nextAncestors = new Set([...ancestors, hash]);
  const childLinks = hasData && depth < MAX_MOUNT_DEPTH ? linksFromLoadedComponents(components) : [];
  const nestedCards = childLinks.map((child) => renderLinkedEntityCard(child, depth + 1, nextAncestors, seen)).join("");
  const summaryHtml = hasData
    ? `<div class="mount-components">${badges}</div>`
    : `<p class="mount-unresolved">${state.locale === "zh" ? "未在已加载组件中找到此实体。" : "No loaded component data for this entity."}</p>`;
  const limitNotice = depth >= MAX_MOUNT_DEPTH
    ? `<p class="mount-unresolved">${state.locale === "zh" ? "已达到展开最大深度。" : "Maximum expansion depth reached."}</p>` : "";
  return `<details class="mount-card"${hasData ? " open" : ""} style="--mount-depth:${depth}">${summary}
    <div class="mount-card-body">
      <p class="mount-path">${escapeHtml(detail || hash)}</p>
      ${summaryHtml}
      ${hasData ? `<div class="nested-component-panels">${panels}</div>` : ""}
      ${limitNotice}
      ${nestedCards ? `<div class="mount-children">${nestedCards}</div>` : ""}
    </div>
  </details>`;
}

function linkedEntityTree(links, parentHash) {
  if (!links?.length) return "";
  const seen = new Map();
  const ancestors = new Set(parentHash ? [parentHash] : []);
  return `<div class="mount-tree">${links.map((entry) => renderLinkedEntityCard(entry, 0, ancestors, seen)).join("")}</div>`;
}
