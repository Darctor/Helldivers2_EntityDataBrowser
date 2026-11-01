/**
 * MountComponentData：挂载槽表。
 * 槽位实体的递归展开走 js/core.js 的 linkedEntityTree()。
 */
const MountComponentData = (() => {
const name = "MountComponentData";

const file = "MountComponentData";

const label = { zh: "MountComponentData", en: "MountComponentData" };

function summarize(record) {
  return `${(record.info || []).filter((item) => String(item.path) !== "0").length} ${state.locale === "zh" ? "个挂载" : "mounts"}`;
}

const schema = {
  info: [
    { field: "slot", labelPath: `${name}.info.slot`, kind: "num" },
    { field: "path", labelPath: `${name}.info.path`, kind: "num" },
    { field: "node", labelPath: `${name}.info.node`, kind: "num" },
    { field: "side", labelPath: `${name}.info.side` },
    { field: "name", labelPath: `${name}.info.name`, kind: "num" },
  ],
};

const i18n = {
  zh: { info: { slot: "槽位", path: "资源路径哈希", node: "挂载节点哈希", side: "挂载侧", name: "挂载名称哈希" } },
  en: { info: { slot: "Slot", path: "Resource Path Hash", node: "Attach Node Hash", side: "Mount Side", name: "Mount Name Hash" } },
};

function mountSideType(record) {
  return enumTypeName((record.info || []).find((item) => String(item.path) !== "0")?.mount_side);
}

function buildNested(_hash, record) {
  const rows = (record.info || []).map((item, index) => ({
    slot: index + 1, path: item.path, node: item.attach_node, side: item.mount_side, name: item.name,
  })).filter((item) => String(item.path) !== "0");
  return `<section class="nested-component-panel">
    <div class="panel-heading">
      <h4>MountComponentData</h4>
      <button class="collapse-toggle" type="button" aria-expanded="true">${escapeHtml(t("collapse"))}</button>
    </div>
    <div class="panel-body">${createTable(enumColumn(schema.info, "side", mountSideType(record)), rows)}</div>
  </section>`;
}

function render(rootHash, record) {
  const target = document.querySelector("#mount-component-data-content");
  if (!record) {
    target.innerHTML = `<div class="no-data">${state.locale === "zh" ? "该实体没有 MountComponentData。" : "This entity has no MountComponentData."}</div>`;
    return;
  }
  const mountComponentDataEntries = (record.info || []).map((item, index) => ({ item, index })).filter(({ item }) => String(item.path) !== "0");
  const rows = mountComponentDataEntries.map(({ item, index }) => ({ slot: index + 1, path: item.path, node: item.attach_node, side: item.mount_side, name: item.name }));
  const links = mountComponentDataEntries.flatMap(({ item, index }) => linkedHashEntries([[
    item.path,
    `${state.locale === "zh" ? "槽位" : "Slot"} ${index + 1}`,
  ]]));
  target.innerHTML = createTable(enumColumn(schema.info, "side", mountSideType(record)), rows) + (linkedEntityTree(links, rootHash)
    || `<div class="mount-tree"><div class="no-data">${state.locale === "zh" ? "没有有效挂载路径。" : "No valid mount paths."}</div></div>`);
}

return { name, file, label, summarize, schema, i18n, render, buildNested };
})();
