/**
 * 应用入口：事件绑定与启动加载。
 * 配置与渲染见 js/registry.js、js/components/；加载与实体选择见 js/runtime.js。
 * 使用普通 script 顺序加载，便于直接双击 index.html（file://）打开。
 */

function searchEntity(query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    dom.searchResult.textContent = "输入内容后会自动切换至第一个匹配实体。";
    return;
  }
  const match = state.hashCatalog.find((entity) =>
    `${entity.hashHex} ${entity.hash} ${entity.name || ""} ${entity.name_zh || ""}`.toLocaleLowerCase().includes(normalized)
  ) || [...Object.values(state.stores).flatMap((store) => [...store.entries()])].map(([hash, entity]) => ({
    hashHex: hash, name: entity.name, name_zh: entity.name_zh,
  })).find((entity) => `${entity.hashHex} ${entity.name || ""} ${entity.name_zh || ""}`.toLocaleLowerCase().includes(normalized));
  if (!match) {
    dom.searchResult.textContent = "没有匹配的实体。";
    return;
  }
  setSelectedEntity(match.hashHex);
  dom.searchResult.textContent = `已切换至：${text(match.name_zh, "N/A")} — ${text(match.name, "N/A")}`;
}

function updateHashFormatButton() {
  const isHex = state.hashInputFormat === "hex";
  dom.hashFormatToggle.textContent = isHex ? "HEX" : "DEC";
  dom.manualHash.placeholder = isHex ? "0x0123ABCD…" : "123456789…";
}

function readManualHash() {
  const hash = normalizeHashInput(dom.manualHash.value, state.hashInputFormat);
  if (!hash) {
    dom.manualHashResult.textContent = state.locale === "zh" ? "哈希格式无效。" : "Invalid hash format.";
    return;
  }
  const hasComponent = Object.values(state.stores).some((store) => store.has(hash));
  if (!hasComponent) {
    dom.manualHashResult.textContent = state.locale === "zh" ? `未在已加载组件中找到 ${hash}。` : `${hash} was not found in loaded components.`;
    return;
  }
  selectEntity(hash);
  dom.manualHashResult.textContent = state.locale === "zh" ? `已读取 ${hash}。` : `Loaded ${hash}.`;
}

dom.select.addEventListener("change", (event) => setSelectedEntity(event.target.value));
dom.entityPickerTrigger.addEventListener("click", () => {
  const isOpening = dom.entityPickerMenu.hidden;
  dom.entityPickerMenu.hidden = !isOpening;
  dom.entityPickerTrigger.setAttribute("aria-expanded", String(isOpening));
  // 重新打开时保持上次视图（一级大类或某个大类的二级列表），不自动返回。
  if (isOpening) {
    const view = state.entityPickerView;
    if (view.major) renderEntityPickerFull(view.major, true);
    else renderEntityPickerLevel1();
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".entity-picker")) {
    dom.entityPickerMenu.hidden = true;
    dom.entityPickerTrigger.setAttribute("aria-expanded", "false");
  }
});
dom.search.addEventListener("input", (event) => searchEntity(event.target.value));
dom.hashFormatToggle.addEventListener("click", () => {
  state.hashInputFormat = state.hashInputFormat === "hex" ? "decimal" : "hex";
  dom.manualHash.value = "";
  updateHashFormatButton();
});
dom.readManualHashButton.addEventListener("click", readManualHash);
dom.manualHash.addEventListener("keydown", (event) => {
  if (event.key === "Enter") readManualHash();
});
dom.folderInput.addEventListener("change", (event) => loadFromFolder(event.target.files));
dom.selectEntitiesFolder.addEventListener("click", chooseEntitiesDirectory);
dom.languageToggle.addEventListener("click", () => {
  state.locale = state.locale === "zh" ? "en" : "zh";
  applyLanguage();
});
dom.themeToggle?.addEventListener("click", toggleTheme);
dom.selectConfigFolder.addEventListener("click", chooseConfigDirectory);
dom.saveHitboxConfig.addEventListener("click", saveNameConfig);
dom.authorizeFolders.addEventListener("click", authorizeSavedFolders);

initRawViewer();
applyLanguage();
updateHashFormatButton();
if (!isWebsiteMode()) loadNameConfigFromStorage();
const startupLoads = isWebsiteMode()
  ? [loadNameConfigFromServer(), loadHashCatalogFromServer(), loadFromWebsite()]
  : [loadNameConfigFromServer(), restoreGrantedFolders()];
Promise.all(startupLoads).then(() => {
  if (Object.values(state.stores).some((store) => store?.size)) {
    if (dom.select.value) selectEntity(dom.select.value);
    return;
  }
  showWaitingForEntitiesFolder();
});
