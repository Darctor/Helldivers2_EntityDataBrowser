/**
 * 运行时：实体选择/渲染编排、Hash 目录与组件 JSON 加载、文件夹授权与配置读写。
 */

function getEntityComponents(hash) {
  return Object.fromEntries(Object.keys(COMPONENT_REGISTRY)
    .map((componentName) => [componentName, state.stores[componentName]?.get(hash)])
    .filter(([, record]) => Boolean(record)));
}

function getEntityDisplayName(hash, components = getEntityComponents(hash)) {
  const catalogEntry = state.hashCatalogByHex.get(hash);
  const record = Object.values(components)[0];
  const chinese = catalogEntry?.name_zh || (record?.name_zh && record.name_zh !== "N/A" ? record.name_zh : record?.name);
  const english = catalogEntry?.name || record?.name;
  return state.locale === "zh" ? chinese || "未命名实体" : english || "Unnamed entity";
}

// 详情两件套（目录 / 正文）同显隐；#entity-details 内部结构保持不变。
function setEntityDetailsVisible(visible) {
  dom.details.hidden = !visible;
  const nav = document.querySelector("#section-nav");
  if (nav) nav.hidden = !visible;
}

function sortComponentSections() {
  const sections = [...dom.details.querySelectorAll(".data-section[data-component]")]
    .sort((left, right) => left.dataset.component.localeCompare(right.dataset.component, "en"));
  sections.forEach((section, index) => {
    section.querySelector(".section-index").textContent = String(index + 1).padStart(2, "0");
    dom.details.append(section);
  });
  renderSectionNav();
}

// Wiki 文字目录：首项数据链 + 全部组件区块（被空组件栏隐藏的条目 is-empty 灰显）。
// 点击隐藏区块会先还原再滚动；滚动时高亮当前区块，active 项出可视区时只滚目录自身。
function renderSectionNav() {
  const nav = document.querySelector("#section-nav");
  if (!nav) return;
  nav.innerHTML = "";
  const head = document.createElement("div");
  head.className = "toc-head";
  const title = document.createElement("span");
  title.className = "toc-title";
  title.textContent = t("toc");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "toc-toggle";
  toggle.setAttribute("aria-label", t("toc"));
  toggle.setAttribute("aria-expanded", String(nav.classList.contains("is-open")));
  toggle.addEventListener("click", () => {
    toggle.setAttribute("aria-expanded", String(nav.classList.toggle("is-open")));
  });
  head.append(title, toggle);
  const list = document.createElement("div");
  list.className = "toc-list";

  // 目录显示名去掉 ComponentData 后缀，并在大小写边界插 <wbr> 优先断行
  const makeItem = (target, indexText, name, subText) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toc-item";
    button.dataset.target = target;
    const indexNode = document.createElement("span");
    indexNode.className = "toc-index";
    indexNode.textContent = indexText;
    const nameNode = document.createElement("span");
    nameNode.className = "toc-name";
    nameNode.innerHTML = escapeHtml(name.replace(/ComponentData\s*$/, ""))
      .replace(/([a-z0-9)])(?=[A-Z(])/g, "$1<wbr>");
    button.append(indexNode, nameNode);
    if (subText) {
      const subNode = document.createElement("span");
      subNode.className = "toc-sub";
      subNode.textContent = subText;
      nameNode.append(subNode);
    }
    list.append(button);
    return button;
  };

  const chainSection = document.querySelector("#data-chain-section");
  if (chainSection) {
    const heading = chainSection.querySelector("h2");
    const item = makeItem("__dataChain", "DC", t("dataChain"), "");
    item.classList.add("toc-item-chain");
    item.hidden = chainSection.hidden;
    item.title = heading?.dataset.full || heading?.textContent || "";
    item.addEventListener("click", () => {
      chainSection.querySelector(".section-heading").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  dom.details.querySelectorAll(".data-section[data-component]").forEach((section) => {
    const heading = section.querySelector("h2");
    const name = heading?.querySelector(".h-name")?.textContent || heading?.textContent || section.dataset.component;
    const sub = heading?.querySelector(".h-zh")?.textContent || "";
    const item = makeItem(section.dataset.component, section.querySelector(".section-index").textContent, name, sub);
    item.title = heading?.dataset.full || name;
    item.addEventListener("click", () => {
      // 空组件栏隐藏过的区块，从目录点进来时先还原
      revealEmptySection(section.dataset.component);
      section.querySelector(".section-heading").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  nav.append(head, list);
  updateSectionNavActive();
}

function updateSectionNavActive() {
  const nav = document.querySelector("#section-nav");
  if (!nav || nav.hidden) return;
  let current = null;
  dom.details.querySelectorAll(".data-section").forEach((section) => {
    if (section.hidden) return;
    if (section.getBoundingClientRect().top < window.innerHeight * 0.4) current = section.dataset.component || "__dataChain";
  });
  let activeItem = null;
  nav.querySelectorAll(".toc-item").forEach((item) => {
    const active = item.dataset.target === current;
    item.classList.toggle("active", active);
    if (active) activeItem = item;
  });
  // active 项在目录可视区外时滚目录自身（等效 scrollIntoView({block:"nearest"}) 但不牵连页面）
  if (activeItem && nav.scrollHeight > nav.clientHeight) {
    const top = activeItem.offsetTop;
    const bottom = top + activeItem.offsetHeight;
    if (top < nav.scrollTop) nav.scrollTop = top;
    else if (bottom > nav.scrollTop + nav.clientHeight) nav.scrollTop = bottom - nav.clientHeight;
  }
}
document.addEventListener("scroll", updateSectionNavActive, { passive: true });

function setSectionCollapsed(section, collapsed) {
  const button = section.querySelector(":scope > .section-heading > .collapse-toggle");
  const body = section.querySelector(":scope > .section-body");
  if (!button || !body) return;
  body.classList.toggle("is-collapsed", collapsed);
  section.classList.toggle("is-collapsed-section", collapsed);
  button.setAttribute("aria-expanded", String(!collapsed));
  button.textContent = collapsed ? t("expand") : t("collapse");
}

function syncSectionCollapse(hash) {
  const emptySections = [];
  let order = 0;
  dom.details.querySelectorAll(".data-section[data-component]").forEach((section) => {
    // data-component-any：多个组件共用一个区块（如三个 Sensor），任一有数据即展开。
    const names = (section.dataset.componentAny || section.dataset.component).split(",");
    const hasData = names.some((componentName) => state.stores[componentName.trim()]?.get(hash));
    if (hasData) {
      section.hidden = false;
      // 进场编排的错峰序号：只给可见区块编号，封顶 8 级。
      section.style.setProperty("--i", String(Math.min(++order, 8)));
      setSectionCollapsed(section, false);
    } else {
      // 无数据的组件整体隐藏，收进底部一条「空组件栏」；点 chip 或目录条目才拉回来。
      section.hidden = true;
      emptySections.push(section);
    }
    // 目录条目同步灰显/恢复
    document.querySelector(`#section-nav .toc-item[data-target="${CSS.escape(section.dataset.component)}"]`)
      ?.classList.toggle("is-empty", !hasData);
  });
  renderEmptyComponentsBar(emptySections);
  const total = dom.details.querySelectorAll(".data-section[data-component]").length;
  const countNode = document.querySelector("#entity-component-count");
  if (countNode) {
    const filled = total - emptySections.length;
    countNode.textContent = state.locale === "zh" ? `${filled} / ${total} 个组件有数据` : `${filled} / ${total} components with data`;
  }
}

// 区块标题「组件名（中文名）」拆成两层：组件名用大号压缩体，中文名降为灰色小字。
// 完整文本留在 data-full，供导航提示使用。
function splitSectionTitles() {
  document.querySelectorAll(".section-heading h2").forEach((heading) => {
    const full = heading.textContent;
    const match = full.match(/^(.*?)（(.*)）\s*$/);
    if (!match) return;
    heading.dataset.full = full;
    heading.innerHTML = `<span class="h-name">${escapeHtml(match[1])}</span><span class="h-zh">${escapeHtml(match[2])}</span>`;
  });
}

// 哈希「解码」：前缀 0x 固定，其余十六进制位随机跳动后从左到右依次定格。
function decodeHash(node, finalText) {
  cancelAnimationFrame(node.decodeFrame);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || finalText.length < 4) {
    node.textContent = finalText;
    return;
  }
  const digits = "0123456789ABCDEF";
  const duration = 520;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    if (progress >= 1) {
      node.textContent = finalText;
      return;
    }
    const locked = 2 + Math.floor(progress * (finalText.length - 2));
    const noise = [...finalText.slice(locked)].map(() => digits[Math.floor(Math.random() * 16)]).join("");
    node.textContent = finalText.slice(0, locked) + noise;
    node.decodeFrame = requestAnimationFrame(tick);
  };
  node.decodeFrame = requestAnimationFrame(tick);
}

// 空组件栏：一行 chip 替代几十条灰色折叠行；chip 点击把该区块还原成折叠行并滚动过去。
function renderEmptyComponentsBar(emptySections) {
  let bar = document.querySelector("#empty-components-bar");
  if (!emptySections.length) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "empty-components-bar";
  }
  const label = state.locale === "zh" ? `此实体没有 ${emptySections.length} 个组件的数据：` : `${emptySections.length} components without data: `;
  bar.innerHTML = `<span class="empty-bar-label">${escapeHtml(label)}</span>${emptySections.map((section) => `<button type="button" class="empty-chip" data-target="${escapeHtml(section.dataset.component)}">${escapeHtml(section.dataset.component)}</button>`).join("")}`;
  bar.querySelectorAll(".empty-chip").forEach((chip) => chip.addEventListener("click", () => revealEmptySection(chip.dataset.target)));
  dom.details.append(bar);
}

function revealEmptySection(componentName) {
  const section = dom.details.querySelector(`.data-section[data-component="${CSS.escape(componentName)}"]`);
  if (!section || !section.hidden) return;
  section.hidden = false;
  setSectionCollapsed(section, true);
  document.querySelector(`#section-nav .toc-item[data-target="${CSS.escape(componentName)}"]`)?.classList.remove("is-empty");
  document.querySelector(`#empty-components-bar .empty-chip[data-target="${CSS.escape(componentName)}"]`)?.remove();
  const bar = document.querySelector("#empty-components-bar");
  if (!bar) return;
  const chips = bar.querySelectorAll(".empty-chip");
  if (!chips.length) bar.remove();
  else bar.querySelector(".empty-bar-label").textContent = state.locale === "zh" ? `此实体没有 ${chips.length} 个组件的数据：` : `${chips.length} components without data: `;
  section.querySelector(".section-heading").scrollIntoView({ behavior: "smooth", block: "start" });
  scheduleHitboxFit();
}

// 表头自适应：列宽是固定值（按中文键名实测定的），英文表头比中文长得多，会从单词中间断开。
// 这里按列宽把表头字号往下调（下限 8.5px），直到每个词能完整放进一列；到下限仍放不下时
// 交给 CSS 在词与词之间换行（th 已设 overflow-wrap: normal，不再拆词）。
const HEADER_FONT_FLOOR = 8.5;
function fitTableHeaders(root = document) {
  root.querySelectorAll("table").forEach((table) => {
    if (!table.offsetParent) return;
    const headers = [...table.querySelectorAll("thead th")].filter((th) => !th.colSpan || th.colSpan === 1);
    headers.forEach((th) => { th.style.fontSize = ""; });
    const range = document.createRange();
    headers.forEach((th) => {
      const style = getComputedStyle(th);
      const available = th.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (available <= 0) return;
      const labelNodes = [...th.childNodes].filter((node) => node.nodeType === 3 && node.textContent.trim());
      if (!labelNodes.length) return;
      const widthOf = (node) => {
        range.selectNodeContents(node);
        return range.getBoundingClientRect().width;
      };
      // 只看主标签：类型徽标是次要标注，放不下时 CSS 单行省略（完整名在 title 里）
      const needed = () => Math.max(0, ...labelNodes.map(widthOf));
      let size = parseFloat(style.fontSize);
      while (needed() > available + 0.5 && size > HEADER_FONT_FLOOR) {
        size = Math.max(HEADER_FONT_FLOOR, size - 0.5);
        th.style.fontSize = `${size}px`;
      }
    });
  });
}

// 受击部位表缩放适配：自然宽（min-width，详见 css/styles.css 列宽注释）超出 .table-scroll
// 容器宽时给 table 设 zoom 收缩到容器内；低于 0.6 下限则放弃缩放、保留横向滚动。
// 缩放态给容器加 .is-zoomed 关掉 overflow-x，隐藏状态下跳过（展开时会重新计算）。
const HITBOX_ZOOM_FLOOR = 0.6;
function fitHitboxTables() {
  document.querySelectorAll(".hitbox-table").forEach((table) => {
    const scroll = table.closest(".table-scroll");
    if (!scroll || !table.offsetParent || !scroll.clientWidth) return;
    const natural = parseFloat(getComputedStyle(table).minWidth) || table.scrollWidth;
    const available = scroll.clientWidth;
    const needed = natural > 0 ? available / natural : 1;
    if (needed >= 1 || needed < HITBOX_ZOOM_FLOOR) {
      table.style.zoom = "";
      scroll.classList.remove("is-zoomed");
      return;
    }
    table.style.zoom = String(needed);
    scroll.classList.add("is-zoomed");
  });
}

// 两种自适应一起算：表头字号 + 部位表缩放
function fitTables() {
  fitTableHeaders();
  fitHitboxTables();
}
let hitboxFitFrame = 0;
function scheduleHitboxFit() {
  cancelAnimationFrame(hitboxFitFrame);
  hitboxFitFrame = requestAnimationFrame(fitTables);
}

function bindCollapseToggles(root = document) {
  root.querySelectorAll(".collapse-toggle").forEach((button) => {
    if (button.dataset.bound === "1") {
      button.textContent = button.getAttribute("aria-expanded") === "false" ? t("expand") : t("collapse");
      return;
    }
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      const container = button.closest(".data-section, .nested-component-panel");
      const body = container?.querySelector(":scope > .section-body, :scope > .panel-body");
      if (!body) return;
      const collapsed = body.classList.toggle("is-collapsed");
      if (container.classList.contains("data-section")) container.classList.toggle("is-collapsed-section", collapsed);
      button.setAttribute("aria-expanded", String(!collapsed));
      button.textContent = collapsed ? t("expand") : t("collapse");
      if (!collapsed) scheduleHitboxFit();
    });
  });
}

function selectEntity(hash) {
  const healthComponentData = state.stores.HealthComponentData?.get(hash);
  const catalogEntry = state.hashCatalogByHex.get(hash);
  const componentRecord = healthComponentData
    || Object.values(state.stores).map((store) => store?.get(hash)).find(Boolean);
  if (!catalogEntry && !componentRecord) return;
  const changed = state.currentHash !== hash;
  state.currentHash = hash;
  dom.emptyState.hidden = true;
  setEntityDetailsVisible(true);
  const chineseName = catalogEntry?.name_zh || (componentRecord?.name_zh && componentRecord.name_zh !== "N/A" ? componentRecord.name_zh : componentRecord?.name) || "N/A";
  const englishName = catalogEntry?.name || componentRecord?.name || "N/A";
  document.querySelector("#entity-name").textContent = state.locale === "zh" ? chineseName : englishName;
  document.querySelector("#entity-name-en").textContent = state.locale === "zh" ? englishName : chineseName;
  const hashNode = document.querySelector("#entity-hash");
  if (changed) decodeHash(hashNode, hash);
  else hashNode.textContent = hash;
  const categoryNode = document.querySelector("#entity-category");
  categoryNode.textContent = catalogEntry?.category || "";
  categoryNode.hidden = !catalogEntry?.category;
  // 只在真正切换实体时重播进场编排；语言切换等重绘不重播。
  if (changed) {
    dom.details.classList.remove("is-switching");
    void dom.details.offsetWidth;
    dom.details.classList.add("is-switching");
  }

  Object.entries(COMPONENT_REGISTRY).forEach(([componentName, definition]) => {
    definition.render(hash, state.stores[componentName]?.get(hash));
  });
  renderDataChain(hash);
  // 目录里的数据链项跟随数据链区块显隐
  const chainItem = document.querySelector("#section-nav .toc-item-chain");
  const chainSection = document.querySelector("#data-chain-section");
  if (chainItem && chainSection) chainItem.hidden = chainSection.hidden;
  bindCollapseToggles(dom.details);
  syncSectionCollapse(hash);
  scheduleHitboxFit();
}

function setSelectedEntity(hash) {
  const option = [...dom.select.options].find((item) => item.value === hash);
  if (option) {
    dom.select.value = hash;
    dom.entityPickerTrigger.textContent = option.textContent;
  } else {
    dom.entityPickerTrigger.textContent = `${hash} — ${getEntityDisplayName(hash)}`;
  }
  dom.entityPickerMenu.querySelectorAll(".entity-picker-option").forEach((item) => {
    const selected = item.dataset.hash === hash;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  dom.entityPickerMenu.hidden = true;
  dom.entityPickerTrigger.setAttribute("aria-expanded", "false");
  selectEntity(hash);
}

// 实体列表两级菜单：一级为大类，二级为完整列表并定位到所选大类开头。
function renderEntityPickerLevel1() {
  const menu = dom.entityPickerMenu;
  state.entityPickerView = { major: null };
  menu.innerHTML = "";
  const majors = [];
  const groupsByMajor = new Map();
  state.entityGroups.forEach((group) => {
    if (!groupsByMajor.has(group.major)) { groupsByMajor.set(group.major, []); majors.push(group.major); }
    groupsByMajor.get(group.major).push(group);
  });
  majors.forEach((major) => {
    const count = groupsByMajor.get(major).reduce((sum, group) => sum + group.entries.length, 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "entity-picker-option entity-picker-major";
    button.innerHTML = `${escapeHtml(major)}<span class="entity-picker-count">${count}</span>`;
    // 阻止冒泡：本处理器会清空 menu 内容、移除被点按钮，否则 document 的“点击外部关闭”会误判并收起菜单。
    button.addEventListener("click", (event) => { event.stopPropagation(); renderEntityPickerFull(major); });
    menu.append(button);
  });
}

function renderEntityPickerFull(scrollToMajor, keepScroll) {
  const menu = dom.entityPickerMenu;
  const view = state.entityPickerView;
  const sameView = keepScroll && view.major === scrollToMajor;
  state.entityPickerView = { major: scrollToMajor, scrollTop: sameView ? view.scrollTop || 0 : 0 };
  menu.innerHTML = "";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "entity-picker-back";
  back.textContent = `← ${t("backToCategories")}`;
  back.addEventListener("click", (event) => { event.stopPropagation(); renderEntityPickerLevel1(); });
  menu.append(back);
  let anchor = null;
  state.entityGroups.forEach((group) => {
    const categoryNode = document.createElement("div");
    categoryNode.className = "entity-picker-category";
    categoryNode.textContent = group.category;
    if (!anchor && group.major === scrollToMajor) anchor = categoryNode;
    menu.append(categoryNode);
    group.entries.forEach((entity) => {
      const optionNode = document.createElement("button");
      optionNode.type = "button";
      optionNode.className = "entity-picker-option";
      optionNode.dataset.hash = entity.hashHex;
      optionNode.textContent = `${entity.hashHex} — ${text(entity.name_zh, "N/A")} — ${text(entity.name, "N/A")}`;
      if (entity.hashHex === dom.select.value) { optionNode.classList.add("selected"); optionNode.setAttribute("aria-selected", "true"); }
      optionNode.addEventListener("click", () => setSelectedEntity(entity.hashHex));
      menu.append(optionNode);
    });
  });
  if (anchor && !sameView) menu.scrollTop = Math.max(0, anchor.offsetTop - back.offsetHeight);
  else if (sameView) menu.scrollTop = state.entityPickerView.scrollTop;
}

// 记住二级列表的滚动位置，重新打开时保持原样。
dom.entityPickerMenu.addEventListener("scroll", () => {
  if (state.entityPickerView.major) state.entityPickerView.scrollTop = dom.entityPickerMenu.scrollTop;
});

function populateSelect() {
  const previousHash = dom.select.value;
  dom.select.innerHTML = "";
  dom.entityPickerMenu.innerHTML = "";
  const entries = state.hashCatalog.length
    ? state.hashCatalog
    : [...(state.stores.HealthComponentData || new Map()).entries()].map(([hash, entity]) => ({ hashHex: hash, name: entity.name, name_zh: entity.name_zh, category: "HealthComponentData" }));
  const categories = new Map();
  entries.forEach((entry) => {
    const category = entry.category || "未分类";
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(entry);
  });
  // 供实体列表两级菜单使用：保持 Hash.csv 顺序，major 取 category 的 “-” 前段。
  state.entityGroups = [...categories.entries()].map(([category, items]) => ({
    category,
    major: category.split("-", 1)[0] || category,
    entries: items,
  }));
  [...categories.entries()].forEach(([category, categoryEntries]) => {
    const group = document.createElement("optgroup");
    group.label = category;
    // 保持 Hash.csv 中的原始顺序，不做名称排序。
    categoryEntries.forEach((entity) => {
      const option = document.createElement("option");
      option.value = entity.hashHex;
      option.textContent = `${entity.hashHex} — ${text(entity.name_zh, "N/A")} — ${text(entity.name, "N/A")}`;
      group.append(option);
    });
    dom.select.append(group);
  });
  renderEntityPickerLevel1();
  if (!entries.length) {
    dom.select.innerHTML = `<option>${state.locale === "zh" ? "尚未加载 Hash.csv 或组件数据。" : "Hash.csv or component data has not loaded."}</option>`;
  }
  dom.select.disabled = !entries.length;
  dom.entityPickerTrigger.disabled = !entries.length;
  dom.search.disabled = false;
  dom.statusNode.classList.remove("error");
  dom.statusNode.classList.remove("is-loading");
  dom.statusNode.textContent = state.locale === "zh"
    ? `档案已就绪：${entries.length} 个已命名哈希`
    : `Archive ready: ${entries.length} named hashes`;
  if (entries.length) {
    if ([...dom.select.options].some((option) => option.value === previousHash)) dom.select.value = previousHash;
    setSelectedEntity(dom.select.value);
  }
}

function applyLanguage() {
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";
  document.title = `HELLDIVERS 2 // ${t("pageTitle")}`;
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  dom.languageToggle.textContent = state.locale === "zh" ? "EN" : "中文";
  refreshThemeToggle();
  dom.authorizeFolders.textContent = t("authorizeFolders");
  dom.selectConfigFolder.textContent = t("selectConfigFolder");
  dom.saveHitboxConfig.textContent = t("saveConfig");
  dom.nameConfigStatus.textContent = t("configHint");
  applySiteChrome();
  splitSectionTitles();
  sortComponentSections();
  if (dom.select.value && !isRawMode()) selectEntity(dom.select.value);
  bindCollapseToggles();
  syncRawViewerLanguage();
}

function loadHashCatalog(csvText, populate = true) {
  const [header, ...rows] = parseCsv(csvText);
  const columns = Object.fromEntries(header.map((columnName, index) => [columnName.replace(/^\uFEFF/, ""), index]));
  state.hashCatalog = rows
    .filter((row) => row[columns.row_type] === "entry" && row[columns.hash] && row[columns.name] && row[columns.name_zh])
    .map((row) => {
      const decimalHash = row[columns.hash].replace(/[="\s]/g, "");
      return {
        category: row[columns.category],
        hash: decimalHash,
        hashHex: decimalToHexHash(decimalHash),
        name: row[columns.name],
        name_zh: row[columns.name_zh],
      };
    });
  state.hashCatalogByHex = new Map(state.hashCatalog.map((entry) => [entry.hashHex, entry]));
  if (populate) populateSelect();
}

function loadPayloads(payloads) {
  Object.keys(DATA_FILES).forEach((key, index) => { state.stores[key] = asMap(payloads[index]); });
  Object.entries(state.nameConfig.entities).forEach(([hash, entry]) => {
    const healthComponentData = state.stores.HealthComponentData.get(hash);
    if (healthComponentData && (!entry.name || entry.name === "N/A")) {
      entry.name = healthComponentData.name || "N/A";
      entry.name_zh = healthComponentData.name_zh || "N/A";
    }
  });
  populateSelect();
}

function mergeNameConfig(config) {
  if (!config || typeof config !== "object" || typeof config.entities !== "object") return;
  const entities = Object.fromEntries(Object.entries(config.entities).map(([hash, entry]) => {
    const healthComponentData = state.stores.HealthComponentData?.get(hash);
    const sourceZones = entry?.zones || entry || {};
    const zones = Object.fromEntries(Object.entries(sourceZones).map(([zoneKey, detail]) => {
      if (detail?.zh && detail?.en) {
        return [zoneKey, {
          name_zh: detail.zh.name || "", note_zh: detail.zh.note || detail.zh.remark || "",
          name_en: detail.en.name || "", note_en: detail.en.note || detail.en.remark || "",
        }];
      }
      if (typeof detail === "string") {
        return [zoneKey, { name_zh: detail, note_zh: "", name_en: "", note_en: "" }];
      }
      return [zoneKey, {
        name_zh: detail?.name_zh || "",
        note_zh: detail?.note_zh || detail?.remark_zh || "",
        name_en: detail?.name_en || "",
        note_en: detail?.note_en || detail?.remark_en || "",
      }];
    }));
    return [hash, {
      name: entry?.name || healthComponentData?.name || "N/A",
      name_zh: entry?.name_zh || healthComponentData?.name_zh || "N/A",
      zones,
    }];
  }));
  state.nameConfig = { version: 5, entities };
  cacheNameConfig();
}

function loadNameConfigFromStorage() {
  try {
    const cached = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (cached) mergeNameConfig(JSON.parse(cached));
  } catch {
    // Storage can be unavailable for some file:// browser configurations.
  }
}

async function loadNameConfigFromServer() {
  try {
    const response = await fetch(CONFIG_FILE_NAME);
    if (response.ok) mergeNameConfig(await response.json());
  } catch {
    // Direct file opening cannot fetch a sibling config; folder authorization handles that case.
  }
}

// 按顺序尝试多个地址，返回第一个成功读到的文本（失败不抛错，继续下一个）。
async function fetchTextFirst(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-cache" });
      if (response.ok) return { text: await response.text(), url };
    } catch {
      // 跨站/离线/404 都继续试下一个候选地址
    }
  }
  return null;
}

// Hash.csv 统一放在数据仓库的 Data/ 下。网站模式从 ${dataRoot}/Hash.csv 取；
// 本地模式由 loadFromDirectoryHandle() 从已授权的数据文件夹根目录读取。
async function loadHashCatalogFromServer() {
  if (!isWebsiteMode()) return;
  const candidates = [`${websiteDataRootName()}/Hash.csv`];
  const found = await fetchTextFirst(candidates);
  if (found) {
    loadHashCatalog(found.text);
    return;
  }
  console.warn(`Hash.csv 未能加载，已尝试：${candidates.join("、")}`);
  if (dom.searchResult) {
    dom.searchResult.textContent = state.locale === "zh"
      ? `未能读取 Hash.csv（已尝试 ${candidates.join("、")}），实体名与分类暂不可用。`
      : `Could not load Hash.csv (tried ${candidates.join(", ")}); entity names and categories are unavailable.`;
  }
}

async function loadHashCatalogFromDirectory(handle) {
  // 换数据文件夹时先清空旧目录，读不到 Hash.csv 就回退到本次组件里的实体列表。
  state.hashCatalog = [];
  state.hashCatalogByHex = new Map();
  try {
    const fileHandle = await handle.getFileHandle("Hash.csv");
    loadHashCatalog(await (await fileHandle.getFile()).text(), false);
  } catch {
    // 数据文件夹根目录没有 Hash.csv 时，保留组件里的实体列表作为回退。
  }
}

function openHandleDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(HANDLE_STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveFolderHandle(kind, handle) {
  const database = await openHandleDatabase();
  await new Promise((resolve, reject) => {
    const request = database.transaction(HANDLE_STORE_NAME, "readwrite").objectStore(HANDLE_STORE_NAME).put(handle, kind);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
  database.close();
}

async function getSavedFolderHandle(kind) {
  const database = await openHandleDatabase();
  const handle = await new Promise((resolve, reject) => {
    const request = database.transaction(HANDLE_STORE_NAME).objectStore(HANDLE_STORE_NAME).get(kind);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return handle;
}

async function requestFolderPermission(handle, mode) {
  if ((await handle.queryPermission({ mode })) === "granted") return true;
  return (await handle.requestPermission({ mode })) === "granted";
}

function undatedComponentFileName(prefix) {
  return `${prefix}.json`;
}

function datedComponentFileName(prefix) {
  const date = SITE_CONFIG.patch_date;
  return date ? `${prefix}_${date}.json` : "";
}

function componentFileMatches(prefix, fileName) {
  return fileName === undatedComponentFileName(prefix) || fileName === datedComponentFileName(prefix);
}

// 与网站模式相同：先用没有日期的文件名，没有再使用 patch_date 对应的那一份。
function pickPreferredComponentFile(files, prefix) {
  return files.find((file) => file.name === undatedComponentFileName(prefix))
    || files.find((file) => file.name === datedComponentFileName(prefix))
    || null;
}

function pickComponentFile(files, prefix) {
  const matches = files.filter((file) => componentFileMatches(prefix, file.name));
  const inEntities = matches.filter((file) => (file.webkitRelativePath || "").split(/[/\\]/).includes("entities"));
  const pool = inEntities.length ? inEntities : matches;
  return pickPreferredComponentFile(pool, prefix);
}

async function listDirectoryEntries(handle) {
  const files = [];
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === "file") files.push({ name, handle: entry });
  }
  return files;
}

async function resolveEntitiesDirectory(handle) {
  const files = await listDirectoryEntries(handle);
  const prefixes = Object.values(DATA_FILES);
  if (prefixes.some((prefix) => files.some((file) => componentFileMatches(prefix, file.name)))) return handle;
  try {
    return await handle.getDirectoryHandle("entities");
  } catch {
    return handle;
  }
}

async function readComponentPayloads(files) {
  const missing = [];
  const used = [];
  const payloads = [];
  for (const prefix of Object.values(DATA_FILES)) {
    const match = pickComponentFile(files, prefix);
    if (!match) {
      missing.push(prefix);
      continue;
    }
    used.push(match.name);
    const blob = match.handle ? await match.handle.getFile() : match;
    payloads.push(JSON.parse(await blob.text()));
  }
  return { missing, used, payloads };
}

// 数据链功能所需：settings 目录的 generated_*_settings 文件（status_effect 文件含两张表）。
const SETTINGS_PREFIXES = [
  "generated_arc_settings", "generated_beam_settings", "generated_damage_settings",
  "generated_explosion_settings", "generated_projectile_settings", "generated_status_effect_settings",
];

function buildSettingsStores(payloads) {
  const stores = new Map();
  payloads.forEach((payload) => {
    const blocks = Array.isArray(payload) ? payload : [payload];
    blocks.forEach((block) => {
      if (!block || typeof block !== "object" || Array.isArray(block)) return;
      Object.entries(block).forEach(([tableName, body]) => {
        if (!body || !Array.isArray(body.items)) return;
        const byId = new Map();
        body.items.forEach((item) => {
          const id = Number(typeNumber(item?.type));
          if (Number.isFinite(id) && id > 0 && !byId.has(id)) byId.set(id, item);
        });
        stores.set(tableName, byId);
      });
    });
  });
  return stores.size ? stores : null;
}

async function loadSettingsStoresFromHandle(rootHandle) {
  let settingsStores = null;
  try {
    const settingsDir = await rootHandle.getDirectoryHandle("settings");
    const files = await listDirectoryEntries(settingsDir);
    const payloads = [];
    for (const prefix of SETTINGS_PREFIXES) {
      const match = pickComponentFile(files, prefix);
      if (!match) continue;
      payloads.push(JSON.parse(await match.handle.getFile().then((blob) => blob.text())));
    }
    settingsStores = buildSettingsStores(payloads);
  } catch {
    // 用户直接选择 entities 文件夹时无法访问 settings；数据链区块自行降级提示。
  }
  state.settingsStores = settingsStores;
}

function pickSettingsFiles(files) {
  const picked = [];
  SETTINGS_PREFIXES.forEach((prefix) => {
    const matches = files.filter((file) => (file.webkitRelativePath || "").split(/[/\\]/).includes("settings") && componentFileMatches(prefix, file.name));
    const chosen = pickPreferredComponentFile(matches, prefix);
    if (chosen) picked.push(chosen);
  });
  return picked;
}

function reportMissingComponentFiles(missing) {
  dom.statusNode.textContent = state.locale === "zh" ? "缺少所需组件 JSON。" : "Required component JSON is missing.";
  dom.statusNode.classList.add("error");
  dom.statusNode.classList.remove("is-loading");
  dom.emptyState.hidden = false;
  setEntityDetailsVisible(false);
  const help = isWebsiteMode()
    ? (state.locale === "zh"
      ? `网站模式从 ${websiteDataRootName()}/entities 读取。文件名可以是组件名.json，或组件名_${SITE_CONFIG.patch_date}.json。`
      : `Website mode reads ${websiteDataRootName()}/entities. Use Component.json or Component_${SITE_CONFIG.patch_date}.json.`)
    : (state.locale === "zh" ? "请选择含 entities、settings、entity_deltas、Hash.csv 的数据目录。文件名可以不带日期。" : "Select a data folder that contains entities, settings, entity_deltas, and Hash.csv. File names may omit the date.");
  dom.emptyState.innerHTML = `<span class="radar" aria-hidden="true"></span><p>${help}</p><p>${state.locale === "zh" ? "缺少" : "Missing"}：${escapeHtml(missing.join("、"))}</p>`;
}

function reportLoadedComponentFiles(used) {
  dom.statusNode.classList.remove("error");
  dom.statusNode.classList.remove("is-loading");
  dom.statusNode.textContent = state.locale === "zh"
    ? `档案已就绪，已匹配 ${used.length} 个组件文件`
    : `Archive ready. Matched ${used.length} component files`;
}

async function loadFromDirectoryHandle(handle) {
  dom.statusNode.classList.add("is-loading");
  dom.statusNode.textContent = state.locale === "zh" ? "正在读取授权的作战档案…" : "Reading authorized archive data…";
  const directory = await resolveEntitiesDirectory(handle);
  const { missing, used, payloads } = await readComponentPayloads(await listDirectoryEntries(directory));
  if (missing.length) {
    reportMissingComponentFiles(missing);
    return;
  }
  await loadHashCatalogFromDirectory(handle);
  loadPayloads(payloads);
  await loadSettingsStoresFromHandle(handle);
  reportLoadedComponentFiles(used);
  if (state.currentHash) renderDataChain(state.currentHash);
}

async function chooseConfigDirectory() {
  if (!window.showDirectoryPicker) {
    dom.nameConfigStatus.textContent = state.locale === "zh"
      ? "当前浏览器不支持文件夹写入。请使用 Chrome 或 Edge。"
      : "This browser does not support folder writing. Use Chrome or Edge.";
    return;
  }
  try {
    state.configDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    await saveFolderHandle("config", state.configDirectoryHandle);
    const fileHandle = await state.configDirectoryHandle.getFileHandle(CONFIG_FILE_NAME, { create: true });
    const file = await fileHandle.getFile();
    if (file.size) mergeNameConfig(JSON.parse(await file.text()));
    dom.saveHitboxConfig.disabled = false;
    dom.nameConfigStatus.textContent = state.locale === "zh"
      ? "已授权 web 文件夹；可以保存部位名称配置。"
      : "web folder authorized; zone name configuration can now be saved.";
    if (dom.select.value) selectEntity(dom.select.value);
  } catch (error) {
    if (error.name !== "AbortError") {
      dom.nameConfigStatus.textContent = state.locale === "zh" ? `文件夹授权失败：${error.message}` : `Folder access failed: ${error.message}`;
    }
  }
}

async function chooseEntitiesDirectory() {
  if (!window.showDirectoryPicker) return dom.folderInput.click();
  try {
    state.entitiesDirectoryHandle = await window.showDirectoryPicker({ mode: "read" });
    await saveFolderHandle("entities", state.entitiesDirectoryHandle);
    // 数据文件夹同时供原始数据视图使用，选一次两处生效。
    await saveFolderHandle("raw", state.entitiesDirectoryHandle);
    rememberRawRoot(state.entitiesDirectoryHandle);
    await loadFromDirectoryHandle(state.entitiesDirectoryHandle);
  } catch (error) {
    if (error.name !== "AbortError") {
      dom.statusNode.classList.remove("is-loading");
      dom.statusNode.textContent = state.locale === "zh" ? `读取数据文件夹失败：${error.message}` : `Failed to read data folder: ${error.message}`;
    }
  }
}

async function authorizeSavedFolders() {
  try {
    const [savedEntities, savedConfig] = await Promise.all([getSavedFolderHandle("entities"), getSavedFolderHandle("config")]);
    const savedRaw = await getSavedFolderHandle("raw");
    if (!savedEntities && !savedConfig && !savedRaw) {
      dom.nameConfigStatus.textContent = state.locale === "zh" ? "尚未保存文件夹授权；请先选择数据文件夹和 web 文件夹。" : "No saved folder authorization; select a data folder and the web folder first.";
      return;
    }
    if (savedEntities && await requestFolderPermission(savedEntities, "read")) {
      state.entitiesDirectoryHandle = savedEntities;
      await loadFromDirectoryHandle(savedEntities);
    }
    if (savedConfig && await requestFolderPermission(savedConfig, "readwrite")) {
      state.configDirectoryHandle = savedConfig;
      const fileHandle = await state.configDirectoryHandle.getFileHandle(CONFIG_FILE_NAME, { create: true });
      const file = await fileHandle.getFile();
      if (file.size) mergeNameConfig(JSON.parse(await file.text()));
      dom.saveHitboxConfig.disabled = false;
      if (dom.select.value) selectEntity(dom.select.value);
    }
    if (savedRaw && await requestFolderPermission(savedRaw, "read")) rememberRawRoot(savedRaw);
  } catch (error) {
    dom.nameConfigStatus.textContent = state.locale === "zh" ? `授权失败：${error.message}` : `Authorization failed: ${error.message}`;
  }
}

async function saveNameConfig() {
  if (!state.configDirectoryHandle) return chooseConfigDirectory();
  try {
    const fileHandle = await state.configDirectoryHandle.getFileHandle(CONFIG_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(`${JSON.stringify(state.nameConfig, null, 2)}\n`);
    await writable.close();
    dom.nameConfigStatus.textContent = state.locale === "zh" ? "部位详情配置已保存到 web/hitbox-details.json。" : "Zone details saved to web/hitbox-details.json.";
  } catch (error) {
    dom.nameConfigStatus.textContent = state.locale === "zh" ? `保存失败：${error.message}` : `Save failed: ${error.message}`;
  }
}

function renderDataVersion() {
  const node = document.querySelector("#data-version");
  if (!node) return;
  const date = SITE_CONFIG.patch_date || "";
  const version = SITE_CONFIG.game_version || "";
  node.textContent = state.locale === "zh"
    ? `数据日期 ${date} · 游戏版本 ${version}`
    : `Patch date ${date} · Game version ${version}`;
}

function applySiteChrome() {
  renderDataVersion();
  document.querySelectorAll(".local-only").forEach((node) => { node.hidden = isWebsiteMode(); });
}

function websiteDataRootName() {
  return String(SITE_CONFIG.dataRoot || "data").replace(/\/$/, "");
}

// 无日期名在前。发布文件用它，成功就不再请求带日期的名字。
// 带日期名用 patch_date 拼出来，方便数据目录里仍是「前缀_日期.json」的导出。
function websiteFileCandidates(directory, fileName) {
  const root = websiteDataRootName();
  const names = [fileName];
  const date = SITE_CONFIG.patch_date;
  const stem = fileName.endsWith(".json") ? fileName.slice(0, -5) : fileName;
  if (date && !/_\d{4}-\d{2}-\d{2}$/.test(stem)) names.push(`${stem}_${date}.json`);
  return names.map((name) => `${root}/${directory}/${name}`);
}

async function fetchFirstWebsiteJson(urls) {
  for (const url of urls) {
    const response = await fetch(url);
    if (response.ok) return response.json();
  }
  return null;
}

async function loadFromWebsite() {
  dom.statusNode.classList.add("is-loading");
  dom.statusNode.textContent = state.locale === "zh" ? "正在读取网站数据…" : "Reading website data…";
  const listed = new Set(SITE_CONFIG.directories?.entities || []);
  const prefixes = Object.values(DATA_FILES);
  const results = await Promise.all(prefixes.map(async (prefix) => {
    const name = `${prefix}.json`;
    if (!listed.has(name)) return { prefix, ok: false };
    const payload = await fetchFirstWebsiteJson(websiteFileCandidates("entities", name));
    return payload ? { prefix, ok: true, payload } : { prefix, ok: false };
  }));
  const missing = results.filter((item) => !item.ok).map((item) => item.prefix);
  if (missing.length) {
    reportMissingComponentFiles(missing);
    return;
  }
  loadPayloads(results.map((item) => item.payload));
  const settingsPayloads = [];
  for (const prefix of SETTINGS_PREFIXES) {
    const payload = await fetchFirstWebsiteJson(websiteFileCandidates("settings", `${prefix}.json`));
    if (payload) settingsPayloads.push(payload);
  }
  state.settingsStores = buildSettingsStores(settingsPayloads);
  reportLoadedComponentFiles(prefixes);
  if (state.currentHash) renderDataChain(state.currentHash);
}

function showWaitingForEntitiesFolder() {
  if (Object.values(state.stores).some((store) => store?.size)) return;
  if (isWebsiteMode()) return;
  dom.statusNode.classList.add("error");
  dom.statusNode.classList.remove("is-loading");
  dom.statusNode.textContent = state.locale === "zh"
    ? "请选择数据文件夹（含 entities、settings、entity_deltas、Hash.csv）。"
    : "Select a data folder (with entities, settings, entity_deltas, and Hash.csv).";
  dom.emptyState.hidden = false;
  setEntityDetailsVisible(false);
  dom.emptyState.innerHTML = state.locale === "zh"
    ? '<span class="radar" aria-hidden="true"></span><p>点击“选择数据文件夹”。页面会按组件名查找 JSON，不用在脚本里写路径；Hash.csv、原始数据视图与数据链也使用同一个文件夹。</p><p>浏览器需要你的明确授权才能读取本地文件。已经授权过时，点“授权最近使用的文件夹”。</p>'
    : '<span class="radar" aria-hidden="true"></span><p>Use “Select data folder”. JSON is matched by component name, so scripts do not store dump paths; Hash.csv, the raw-data view, and the data chain reuse the same folder.</p><p>The browser needs your permission to read local files. If you already granted it, use “Authorize recent folders”.</p>';
}

async function restoreGrantedFolders() {
  try {
    const savedEntities = await getSavedFolderHandle("entities");
    if (savedEntities && (await savedEntities.queryPermission({ mode: "read" })) === "granted") {
      state.entitiesDirectoryHandle = savedEntities;
      await loadFromDirectoryHandle(savedEntities);
    }
  } catch (error) {
    console.error(error);
  }
  try {
    const savedConfig = await getSavedFolderHandle("config");
    if (savedConfig && (await savedConfig.queryPermission({ mode: "readwrite" })) === "granted") {
      state.configDirectoryHandle = savedConfig;
      const fileHandle = await savedConfig.getFileHandle(CONFIG_FILE_NAME, { create: true });
      const file = await fileHandle.getFile();
      if (file.size) mergeNameConfig(JSON.parse(await file.text()));
      dom.saveHitboxConfig.disabled = false;
      if (dom.select.value && !isRawMode()) selectEntity(dom.select.value);
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadFromFolder(files) {
  try {
    dom.statusNode.classList.add("is-loading");
    dom.statusNode.textContent = state.locale === "zh" ? "正在读取本地作战档案…" : "Reading local archive data…";
    const fileList = [...files];
    const { missing, used, payloads } = await readComponentPayloads(fileList);
    if (missing.length) {
      reportMissingComponentFiles(missing);
      return;
    }
    state.hashCatalog = [];
    state.hashCatalogByHex = new Map();
    const hashFile = fileList.find((file) => file.name === "Hash.csv");
    if (hashFile) loadHashCatalog(await hashFile.text(), false);
    loadPayloads(payloads);
    const settingsPayloads = [];
    for (const file of pickSettingsFiles(fileList)) {
      settingsPayloads.push(JSON.parse(await file.text()));
    }
    state.settingsStores = buildSettingsStores(settingsPayloads);
    reportLoadedComponentFiles(used);
    if (state.currentHash) renderDataChain(state.currentHash);
  } catch (error) {
    console.error(error);
    dom.statusNode.textContent = state.locale === "zh" ? "本地 JSON 读取失败。" : "Failed to read local JSON.";
    dom.statusNode.classList.add("error");
    dom.statusNode.classList.remove("is-loading");
    dom.emptyState.hidden = false;
    setEntityDetailsVisible(false);
    dom.emptyState.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

/* ---------- 主题：深/浅双主题。手动选择写 localStorage；未选择过则跟随系统变化 ---------- */
const THEME_STORAGE_KEY = "helldivers2-theme";

function storedThemeChoice() {
  try { return localStorage.getItem(THEME_STORAGE_KEY); } catch { return null; }
}

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

// 按钮文案显示切换目标（深色下显示「浅色」），随 applyLanguage 刷新。
function refreshThemeToggle() {
  if (dom.themeToggle) dom.themeToggle.textContent = currentTheme() === "dark" ? t("themeToLight") : t("themeToDark");
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  refreshThemeToggle();
  scheduleChainWires(); // 连线颜色来自 CSS 变量，主题切换后重画
  scheduleHitboxFit();
}

function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* file:// 下存储可能不可用 */ }
  setTheme(next);
}

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
  if (storedThemeChoice()) return;
  setTheme(event.matches ? "light" : "dark");
});