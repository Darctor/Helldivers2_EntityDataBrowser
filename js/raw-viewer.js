/**
 * 原始数据浏览器：授权一个文件夹后列出子目录和 JSON，再按 hash/index/type 查看单条。
 * 不写死 Dump 路径。记录形状决定查找方式：根上有 entities 按实体哈希，否则按 settings。
 */
const rawState = {
  mode: "browser",
  level: "home",
  stack: [],
  listing: { dirs: [], files: [] },
  file: null,
  entries: [],
  groups: [],
  kind: "entity",
  statusText: "",
  recordHtml: "",
  selectedLabel: "",
  flatMode: false,
  // 条目下拉的当前视图：full=false 表示一级大类；full=true 时记住 group 与二级滚动位置。
  pickerView: { group: null, full: false },
};

function rememberRawRoot(handle) {
  rawState.stack = [{ name: handle.name || "data", handle }];
  rawState.file = null;
  rawState.entries = [];
  rawState.level = "browse";
  if (rawState.mode === "raw") renderDirectory();
}

const RAW_SKIP_DIRECTORIES = new Set([
  "__pycache__",
  "enums",
  "entities_config",
  "settings_config",
  "HashMap",
  "typelib_layouts",
]);

// 顶层是 { _metadata, items }，既不是实体表也不是 settings 表，打开后解析结果是 0 条。
const RAW_SKIP_FILES = new Set([
  "entity_deltas_component_index_usage.json",
]);

async function listHandleEntries(handle) {
  const dirs = [];
  const files = [];
  for await (const [name, entry] of handle.entries()) {
    if (name.startsWith(".") || RAW_SKIP_DIRECTORIES.has(name) || RAW_SKIP_FILES.has(name)) continue;
    if (entry.kind === "directory") dirs.push({ name, handle: entry });
    else if (entry.kind === "file" && name.toLowerCase().endsWith(".json")) files.push({ name, handle: entry });
  }
  dirs.sort((left, right) => left.name.localeCompare(right.name, "en"));
  files.sort((left, right) => left.name.localeCompare(right.name, "en"));
  return { dirs, files };
}

function displayEnum(value) {
  if (value === undefined || value === null || value === "") return "";
  const label = enumLabel(value);
  return label === "—" ? "" : label;
}

// 实体条目有两种形状：
//   ① 包装式 { "0xHASH": { name, index, ... } }（组件 JSON、entity_deltas）
//   ② 扁平式 { hash_hex | hash, name, name_zh, index, ... }（如 EntityComponentMap 的 entities）
// 以前只按 item.hash 判断扁平，导出改成 hash_hex 后会把键名当成哈希，整列显示 N/A。
function entityLookupEntry(item, arrayIndex, settingsName = "") {
  const isObject = Boolean(item) && typeof item === "object" && !Array.isArray(item);
  const keys = isObject ? Object.keys(item) : [];
  const isFlat = isObject && ["hash_hex", "hash", "index", "name"].some((key) => key in item);
  const wrappedKey = isFlat ? "" : keys[0] || "";
  const record = isFlat ? item : item?.[wrappedKey];
  const rawHash = isFlat ? (item.hash_hex ?? item.hash) : wrappedKey;
  let hashHex = "";
  if (rawHash !== undefined && rawHash !== null && rawHash !== "") {
    const value = String(rawHash).trim().replace(/[="\s]/g, "");
    if (/^0x/i.test(value)) {
      hashHex = `0x${value.slice(2).toUpperCase()}`;
    } else {
      try { hashHex = decimalToHexHash(value); } catch { hashHex = value; }
    }
  }
  const index = record?.index ?? arrayIndex;
  const name = record?.name ?? "N/A";
  const nameZh = record?.name_zh ?? "N/A";
  const prefix = settingsName ? `${settingsName} — ` : "";
  const head = hashHex || `#${index}`;
  const hasName = [name, nameZh].some((value) => value && value !== "N/A");
  return {
    key: settingsName ? `${settingsName}:${head}` : head,
    kind: "entity",
    group: settingsName || "",
    hashHex,
    index,
    name,
    name_zh: nameZh,
    record: item,
    // 没有名字的条目（如 EntityComponentMap 的多数记录）改显序号，不再是一串 N/A
    label: hasName
      ? `${prefix}${head} — ${text(nameZh, "N/A")} — ${text(name, "N/A")}`
      : `${prefix}${head} — #${index}`,
  };
}

function parseEntityEntries(payload) {
  return (payload.entities || []).map((item, arrayIndex) => entityLookupEntry(item, arrayIndex));
}

function settingsLookupEntry(settingsName, item, arrayIndex) {
  const index = item?.index ?? arrayIndex;
  const typeValue = item?.type ?? "";
  const typeText = displayEnum(typeValue);
  const debugName = typeof item?.debug_name === "string" ? item.debug_name.trim() : "";
  const parts = [settingsName, String(index)];
  if (debugName) parts.push(debugName);
  else if (typeText) parts.push(typeText);
  return {
    key: `${settingsName}:${index}`,
    kind: "settings",
    group: settingsName,
    index,
    type: typeValue,
    typeNum: typeNumber(typeValue),
    typeShort: typeText,
    debugName,
    settingsName,
    record: item,
    label: parts.join(" — "),
  };
}

function parseSettingsEntries(payload) {
  const entries = [];
  const blocks = Array.isArray(payload) ? payload : [payload];
  blocks.forEach((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) return;
    Object.entries(block).forEach(([settingsName, body]) => {
      if (!body || typeof body !== "object") return;
      if (Array.isArray(body.items)) {
        body.items.forEach((item, arrayIndex) => {
          entries.push(settingsLookupEntry(settingsName, item, arrayIndex));
        });
        return;
      }
      if (Array.isArray(body.entities)) {
        body.entities.forEach((item, arrayIndex) => {
          entries.push(entityLookupEntry(item, arrayIndex, settingsName));
        });
        if (Array.isArray(body.component_usage) && body.component_usage.length) {
          entries.push({
            key: `${settingsName}:component_usage`,
            kind: "entity",
            group: settingsName,
            index: null,
            name: "component_usage",
            name_zh: "组件引用统计",
            record: body.component_usage,
            label: `${settingsName} — component_usage`,
          });
        }
      }
    });
  });
  return entries;
}

function parseExportEntries(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && Array.isArray(payload.entities)) {
    return { kind: "entity", entries: parseEntityEntries(payload) };
  }
  const entries = parseSettingsEntries(payload);
  const kind = entries.length && entries.every((entry) => entry.kind === "entity") ? "entity" : "settings";
  return { kind, entries };
}

function highlightJson(value) {
  const json = JSON.stringify(value, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, (match) => {
    let className = "json-number";
    if (match.startsWith("\"")) {
      className = /:$/.test(match) ? "json-key" : "json-string";
    } else if (match === "true" || match === "false") {
      className = "json-boolean";
    } else if (match === "null") {
      className = "json-null";
    }
    return `<span class="${className}">${match}</span>`;
  });
}

function renderRawJson(value) {
  return `<pre class="raw-json-pre">${highlightJson(value)}</pre>`;
}

function setModeButton() {
  if (!dom.modeToggle) return;
  dom.modeToggle.textContent = rawState.mode === "raw" ? t("backToBrowser") : t("viewRawData");
}

function showBrowser() {
  rawState.mode = "browser";
  if (dom.browserView) dom.browserView.hidden = false;
  if (dom.rawView) dom.rawView.hidden = true;
  const nav = document.querySelector("#section-nav");
  if (nav) nav.hidden = dom.details?.hidden !== false;
  setModeButton();
}

function websiteDataRootEntry() {
  return { name: websiteDataRootName(), websiteRoot: true };
}

function listWebsiteEntries(current) {
  if (current.websiteRoot) {
    const dirs = Object.keys(SITE_CONFIG.directories || {})
      .map((name) => ({ name, websiteDir: name }))
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    return { dirs, files: [] };
  }
  const names = SITE_CONFIG.directories?.[current.websiteDir] || [];
  const files = names.map((name) => ({ name, urls: websiteFileCandidates(current.websiteDir, name) }))
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
  return { dirs: [], files };
}

async function showRaw() {
  rawState.mode = "raw";
  if (dom.browserView) dom.browserView.hidden = true;
  if (dom.rawView) dom.rawView.hidden = false;
  const nav = document.querySelector("#section-nav");
  if (nav) nav.hidden = true;
  setModeButton();
  if (isWebsiteMode() && !rawState.stack.length) {
    rawState.stack = [websiteDataRootEntry()];
    rawState.level = "browse";
  }
  if (!isWebsiteMode() && !rawState.stack.length) {
    try {
      const saved = await getSavedFolderHandle("raw");
      if (saved && await requestFolderPermission(saved, "read")) {
        rawState.stack = [{ name: saved.name || "data", handle: saved }];
        rawState.level = "browse";
      }
    } catch (error) {
      console.error(error);
    }
  }
  if (rawState.level === "lookup" && rawState.file) renderLookup(rawState.statusText, rawState.recordHtml);
  else if (rawState.stack.length) await renderDirectory();
  else renderRawHome();
}

function renderBreadcrumb() {
  const parts = [t("viewRawData"), ...rawState.stack.map((entry) => entry.name)];
  if (rawState.file) parts.push(rawState.file.name);
  return `<nav class="raw-breadcrumb" aria-label="breadcrumb">${parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    return `<span class="raw-crumb${isLast ? " is-current" : ""}">${escapeHtml(part)}</span>`;
  }).join("<span class=\"raw-crumb-sep\">/</span>")}</nav>`;
}

function renderRawHome() {
  rawState.level = "home";
  rawState.file = null;
  rawState.entries = [];
  dom.rawView.innerHTML = `
    <section class="raw-panel">
      ${renderBreadcrumb()}
      <div class="section-heading">
        <p class="section-index">RAW</p>
        <h2>${escapeHtml(t("rawFoldersTitle"))}</h2>
      </div>
      <p class="hint">${escapeHtml(t("rawPickFolder"))}</p>
      <button type="button" class="file-button" data-raw-pick>${escapeHtml(t("rawChooseFolder"))}</button>
    </section>
  `;
}

async function renderDirectory() {
  const current = rawState.stack.at(-1);
  if (!current) return renderRawHome();
  rawState.level = "browse";
  rawState.file = null;
  rawState.entries = [];
  let listed;
  try {
    listed = current.websiteRoot || current.websiteDir
      ? listWebsiteEntries(current)
      : await listHandleEntries(current.handle);
  } catch (error) {
    dom.rawView.innerHTML = `
      <section class="raw-panel">
        ${renderBreadcrumb()}
        <p class="hint">${escapeHtml(t("rawLoadFailed"))}: ${escapeHtml(error.message)}</p>
        <button type="button" class="file-button" data-raw-pick>${escapeHtml(t("rawChangeFolder"))}</button>
      </section>
    `;
    return;
  }
  rawState.listing = listed;
  dom.rawView.innerHTML = `
    <section class="raw-panel">
      ${renderBreadcrumb()}
      <div class="raw-toolbar">
        ${isWebsiteMode() && rawState.stack.length <= 1 ? "" : `<button type="button" class="file-button" data-raw-back="up">${escapeHtml(t("rawBack"))}</button>`}
        ${isWebsiteMode() ? "" : `<button type="button" class="file-button" data-raw-pick>${escapeHtml(t("rawChangeFolder"))}</button>`}
      </div>
      <div class="section-heading">
        <p class="section-index">RAW</p>
        <h2>${escapeHtml(current.name)}</h2>
      </div>
      <p class="hint">${escapeHtml(isWebsiteMode() ? (state.locale === "zh" ? "列出 entities、settings、entity_deltas 里的 JSON。" : "Lists JSON in entities, settings, and entity_deltas.") : t("rawFoldersHint"))}</p>
      <div class="raw-file-list">
        ${listed.dirs.map((dir) => `
          <button type="button" class="raw-file-button" data-raw-dir="${escapeHtml(dir.name)}">
            <code>${escapeHtml(dir.name)}/</code>
          </button>
        `).join("")}
        ${listed.files.map((file) => `
          <button type="button" class="raw-file-button" data-raw-file="${escapeHtml(file.name)}">
            <code>${escapeHtml(file.name)}</code>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

// 条目下拉：用自定义菜单替代原生 <select>，固定向下展开；多表文件先列大类再进全表并定位。
function buildRawGroups() {
  const order = [];
  const map = new Map();
  rawState.entries.forEach((entry) => {
    const group = entry.group || "";
    if (!map.has(group)) { map.set(group, []); order.push(group); }
    map.get(group).push(entry);
  });
  rawState.groups = order.map((group) => ({ group, entries: map.get(group) }));
}

function populateEntrySelect() {
  const menu = document.querySelector("#raw-entry-menu");
  const trigger = document.querySelector("#raw-entry-trigger");
  if (!menu || !trigger) return;
  trigger.textContent = rawState.selectedLabel || t("rawLookupSelect");
  menu.innerHTML = "";
  // 保持上次视图：二级列表（含滚动位置）或一级大类。
  const view = rawState.pickerView;
  if (rawState.groups.length > 1 && !view.full) renderRawPickerLevel1(menu);
  else renderRawPickerFull(menu, view.full ? view.group : null, view.full);
}

function renderRawPickerLevel1(menu) {
  rawState.pickerView = { group: null, full: false };
  menu.innerHTML = "";
  menu.scrollTop = 0;
  rawState.groups.forEach(({ group, entries }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "entity-picker-option entity-picker-major";
    button.innerHTML = `${escapeHtml(group || t("rawNoGroup"))}<span class="entity-picker-count">${entries.length}</span>`;
    button.addEventListener("click", (event) => { event.stopPropagation(); renderRawPickerFull(menu, group); });
    menu.append(button);
  });
}

function renderRawPickerFull(menu, scrollToGroup, keepScroll) {
  const view = rawState.pickerView;
  const sameView = keepScroll && view.full && view.group === scrollToGroup;
  rawState.pickerView = { group: scrollToGroup, full: true, scrollTop: sameView ? view.scrollTop || 0 : 0 };
  menu.innerHTML = "";
  if (rawState.groups.length > 1) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "entity-picker-back";
    back.textContent = `← ${t("backToCategories")}`;
    back.addEventListener("click", (event) => { event.stopPropagation(); renderRawPickerLevel1(menu); });
    menu.append(back);
  }
  let anchor = null;
  rawState.groups.forEach(({ group, entries }) => {
    if (rawState.groups.length > 1 || group) {
      const categoryNode = document.createElement("div");
      categoryNode.className = "entity-picker-category";
      categoryNode.textContent = group || t("rawNoGroup");
      if (!anchor && group === scrollToGroup) anchor = categoryNode;
      menu.append(categoryNode);
    }
    entries.forEach((entry) => {
      const optionNode = document.createElement("button");
      optionNode.type = "button";
      optionNode.className = "entity-picker-option";
      optionNode.dataset.rawEntryKey = entry.key;
      optionNode.textContent = entry.label;
      if (entry.label === rawState.selectedLabel) { optionNode.classList.add("selected"); optionNode.setAttribute("aria-selected", "true"); }
      optionNode.addEventListener("click", (event) => {
        event.stopPropagation();
        closeRawEntryMenu();
        showEntry(entry);
      });
      menu.append(optionNode);
    });
  });
  if (anchor && !sameView) menu.scrollTop = Math.max(0, anchor.offsetTop - (menu.querySelector(".entity-picker-back")?.offsetHeight || 0));
  else if (sameView) menu.scrollTop = rawState.pickerView.scrollTop;
}

function toggleRawEntryMenu() {
  const menu = document.querySelector("#raw-entry-menu");
  const trigger = document.querySelector("#raw-entry-trigger");
  if (!menu || !trigger) return;
  const isOpening = menu.hidden;
  menu.hidden = !isOpening;
  trigger.setAttribute("aria-expanded", String(isOpening));
  if (isOpening) populateEntrySelect();
}

function closeRawEntryMenu() {
  const menu = document.querySelector("#raw-entry-menu");
  const trigger = document.querySelector("#raw-entry-trigger");
  if (menu) menu.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function renderLookup(statusText = "", recordHtml = "", inputText = "") {
  if (!rawState.file) return renderDirectory();
  rawState.level = "lookup";
  rawState.statusText = statusText;
  rawState.recordHtml = recordHtml;
  const isEntity = rawState.kind === "entity";
  const hasType = rawState.entries.some((entry) => String(entry.type ?? "") !== "");
  const hintText = isEntity ? t("rawLookupHintEntity") : (hasType ? t("rawLookupHintSettings") : t("rawLookupHintNoType"));
  const placeholderText = isEntity ? t("rawLookupPlaceholderEntity") : (hasType ? t("rawLookupPlaceholderSettings") : t("rawLookupPlaceholderNoType"));
  const countLabel = t("rawEntryCount").replace("{n}", String(rawState.entries.length));
  dom.rawView.innerHTML = `
    <section class="raw-panel">
      ${renderBreadcrumb()}
      <div class="raw-toolbar">
        <button type="button" class="file-button" data-raw-back="browse">${escapeHtml(t("rawBack"))}</button>
        <button type="button" class="file-button" id="raw-flat-toggle" data-raw-flat>${escapeHtml(rawState.flatMode ? t("rawFixed") : t("rawFlat"))}</button>
        <span class="hint">${escapeHtml(countLabel)}</span>
      </div>
      <div class="section-heading">
        <p class="section-index">RAW</p>
        <h2>${escapeHtml(t("rawLookupTitle"))}</h2>
      </div>
      <p class="hint">${escapeHtml(hintText)}</p>
      <div class="raw-lookup-row">
        <input id="raw-lookup-input" type="text" autocomplete="off" placeholder="${escapeHtml(placeholderText)}" value="${escapeHtml(inputText)}">
        <button type="button" class="file-button" id="raw-lookup-button">${escapeHtml(t("rawLookupButton"))}</button>
      </div>
      <div class="raw-lookup-row">
        <label for="raw-entry-trigger">${escapeHtml(t("rawLookupSelect"))}</label>
        <div class="entity-picker raw-entry-picker">
          <button type="button" id="raw-entry-trigger" class="entity-picker-trigger" aria-expanded="false">${escapeHtml(rawState.selectedLabel || t("rawLookupSelect"))}</button>
          <div id="raw-entry-menu" class="entity-picker-menu raw-entry-menu" hidden></div>
        </div>
      </div>
      <p id="raw-lookup-status" class="hint">${escapeHtml(statusText)}</p>
      <div id="raw-json-panel" class="raw-json-panel${rawState.flatMode ? " is-flat" : ""}">${recordHtml}</div>
    </section>
  `;
}

// 平铺/固定区域切换：平铺时取消面板高度限制，页面随数据变长。
function toggleRawFlatMode() {
  rawState.flatMode = !rawState.flatMode;
  const inputText = document.querySelector("#raw-lookup-input")?.value || "";
  renderLookup(rawState.statusText, rawState.recordHtml, inputText);
}

function findEntityEntry(query) {
  const raw = query.trim();
  if (!raw) return null;
  if (/^0x/i.test(raw) || /[a-f]/i.test(raw)) {
    const hex = normalizeHashInput(raw.replace(/^0x/i, "0x"), "hex") || normalizeHashInput(raw, "hex");
    if (hex) {
      const upper = hex.toUpperCase();
      return rawState.entries.find((entry) => entry.hashHex?.toUpperCase() === upper) || null;
    }
  }
  if (/^\d+$/.test(raw)) {
    const indexMatch = rawState.entries.find((entry) => Number(entry.index) === Number(raw));
    let hashMatch = null;
    try {
      const hex = decimalToHexHash(raw);
      hashMatch = rawState.entries.find((entry) => entry.hashHex?.toUpperCase() === hex.toUpperCase()) || null;
    } catch {
      hashMatch = null;
    }
    if (indexMatch && hashMatch) return Number(raw) < 100000 ? indexMatch : hashMatch;
    return indexMatch || hashMatch;
  }
  const lowered = raw.toLocaleLowerCase();
  const named = rawState.entries.find((entry) =>
    `${entry.label || ""} ${entry.name || ""} ${entry.name_zh || ""}`.toLocaleLowerCase().includes(lowered)
  );
  if (named) return named;
  const hex = normalizeHashInput(raw, "hex") || normalizeHashInput(raw, "decimal");
  if (!hex) return null;
  const upper = hex.toUpperCase();
  return rawState.entries.find((entry) => entry.hashHex?.toUpperCase() === upper) || null;
}

function findSettingsEntry(query) {
  const raw = query.trim();
  if (!raw) return null;
  const lowered = raw.toLocaleLowerCase();
  const hasType = rawState.entries.some((entry) => String(entry.type ?? "") !== "");
  if (hasType) {
    // 只按 type 匹配：数字对应 “<=>” 左侧数值，文本对应 type 名称（支持部分输入）。
    if (/^\d+$/.test(raw)) {
      return rawState.entries.find((entry) => entry.typeNum !== "" && Number(entry.typeNum) === Number(raw)) || null;
    }
    return rawState.entries.find((entry) =>
      String(entry.typeShort || "").toLocaleLowerCase().includes(lowered)
      || String(entry.type || "").toLocaleLowerCase().includes(lowered)
    ) || null;
  }
  // 无 type 的文件（如 weapon_customization）：文本按 debug name，数字按 index。
  if (/^\d+$/.test(raw)) {
    const byIndex = rawState.entries.find((entry) => Number(entry.index) === Number(raw));
    if (byIndex) return byIndex;
  }
  return rawState.entries.find((entry) => String(entry.debugName || "").toLocaleLowerCase().includes(lowered)) || null;
}

function entryStatusText(entry) {
  return rawState.kind === "entity"
    ? (entry.hashHex ? `${entry.hashHex} / index ${entry.index}` : entry.label)
    : [entry.settingsName, entry.index, entry.debugName || entry.typeShort || entry.type].filter((part) => part !== undefined && part !== null && part !== "").join(" / ");
}

// 轻量更新：只替换状态与 JSON 面板，不重建查找区，保证输入框自动匹配时焦点不丢。
function showEntry(entry) {
  const statusNode = document.querySelector("#raw-lookup-status");
  const panel = document.querySelector("#raw-json-panel");
  const trigger = document.querySelector("#raw-entry-trigger");
  if (!statusNode || !panel) return;
  if (!entry) {
    statusNode.textContent = t("rawNotFound");
    panel.innerHTML = "";
    rawState.recordHtml = "";
    return;
  }
  rawState.selectedLabel = entry.label;
  rawState.statusText = entryStatusText(entry);
  rawState.recordHtml = renderRawJson(entry.record);
  statusNode.textContent = rawState.statusText;
  panel.innerHTML = rawState.recordHtml;
  if (trigger) trigger.textContent = entry.label;
}

async function pickRawRoot() {
  if (!window.showDirectoryPicker) {
    dom.rawView.innerHTML = `<section class="raw-panel"><p class="hint">${escapeHtml(state.locale === "zh" ? "当前浏览器不能选择文件夹。请使用 Chrome 或 Edge。" : "This browser cannot pick folders. Use Chrome or Edge.")}</p></section>`;
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "read" });
    await saveFolderHandle("raw", handle);
    rememberRawRoot(handle);
  } catch (error) {
    if (error.name !== "AbortError") {
      dom.rawView.innerHTML = `<section class="raw-panel"><p class="hint">${escapeHtml(error.message)}</p></section>`;
    }
  }
}

async function openRawFile(file) {
  rawState.file = file;
  rawState.selectedLabel = "";
  rawState.pickerView = { group: null, full: false };
  renderLookup(t("rawLoading"), "");
  try {
    let rawText;
    if (file.urls) {
      let response = null;
      for (const url of file.urls) {
        const attempt = await fetch(url);
        if (attempt.ok) { response = attempt; break; }
      }
      if (!response) throw new Error(file.name);
      rawText = await response.text();
    } else if (file.url) {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`${response.status} ${file.name}`);
      rawText = await response.text();
    } else {
      rawText = await (await file.handle.getFile()).text();
    }
    const payload = JSON.parse(rawText);
    const parsed = parseExportEntries(payload);
    rawState.kind = parsed.kind;
    rawState.entries = parsed.entries;
    buildRawGroups();
    const hint = rawState.kind === "settings" ? t("rawLookupHintSettings") : t("rawLookupHintEntity");
    renderLookup("", `<div class="no-data">${escapeHtml(hint)}</div>`);
  } catch (error) {
    console.error(error);
    rawState.entries = [];
    rawState.groups = [];
    renderLookup(`${t("rawLoadFailed")}: ${error.message}`, "");
  }
}

function onRawClick(event) {
  if (event.target.closest("[data-raw-pick]")) {
    pickRawRoot();
    return;
  }
  if (event.target.closest("[data-raw-flat]")) {
    toggleRawFlatMode();
    return;
  }
  const dirButton = event.target.closest("[data-raw-dir]");
  if (dirButton) {
    const dir = rawState.listing.dirs.find((item) => item.name === dirButton.dataset.rawDir);
    if (dir) {
      rawState.stack.push(dir);
      renderDirectory();
    }
    return;
  }
  const fileButton = event.target.closest("[data-raw-file]");
  if (fileButton) {
    const file = rawState.listing.files.find((item) => item.name === fileButton.dataset.rawFile);
    if (file) openRawFile(file);
    return;
  }
  const backButton = event.target.closest("[data-raw-back]");
  if (!backButton) return;
  if (backButton.dataset.rawBack === "browse") {
    renderDirectory();
    return;
  }
  if (isWebsiteMode() && rawState.stack.length <= 1) return;
  rawState.stack.pop();
  if (rawState.stack.length) renderDirectory();
  else renderRawHome();
}

function onRawLookup() {
  const input = document.querySelector("#raw-lookup-input");
  const query = input?.value || "";
  if (!query.trim()) {
    const statusNode = document.querySelector("#raw-lookup-status");
    const panel = document.querySelector("#raw-json-panel");
    if (statusNode) statusNode.textContent = "";
    if (panel) panel.innerHTML = "";
    return;
  }
  const entry = rawState.kind === "settings" ? findSettingsEntry(query) : findEntityEntry(query);
  showEntry(entry);
}

function isRawMode() {
  return rawState.mode === "raw";
}

function syncRawViewerLanguage() {
  setModeButton();
  if (rawState.mode !== "raw") return;
  if (rawState.level === "lookup" && rawState.file) {
    const inputText = document.querySelector("#raw-lookup-input")?.value || "";
    renderLookup(rawState.statusText, rawState.recordHtml, inputText);
  } else if (rawState.stack.length) renderDirectory();
  else renderRawHome();
}

function toggleRawViewer() {
  if (rawState.mode === "raw") showBrowser();
  else {
    showRaw();
  }
}

function initRawViewer() {
  if (!dom.rawView || !dom.modeToggle) return;
  dom.modeToggle.addEventListener("click", toggleRawViewer);
  dom.rawView.addEventListener("click", (event) => {
    if (event.target.id === "raw-lookup-button" || event.target.closest("#raw-lookup-button")) {
      onRawLookup();
      return;
    }
    if (event.target.closest("#raw-entry-trigger")) {
      toggleRawEntryMenu();
      return;
    }
    onRawClick(event);
  });
  // 输入即自动匹配（与主页面搜索框一致）；点击菜单外部收起条目下拉。
  dom.rawView.addEventListener("input", (event) => {
    if (event.target.id === "raw-lookup-input") onRawLookup();
  });
  // scroll 不冒泡，用捕获监听条目下拉，记住二级列表滚动位置。
  dom.rawView.addEventListener("scroll", (event) => {
    if (event.target.id === "raw-entry-menu" && rawState.pickerView.full) rawState.pickerView.scrollTop = event.target.scrollTop;
  }, true);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".raw-entry-picker")) closeRawEntryMenu();
  });
  dom.rawView.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.id === "raw-lookup-input") onRawLookup();
  });
  setModeButton();
  renderRawHome();
  dom.rawView.hidden = true;
}
