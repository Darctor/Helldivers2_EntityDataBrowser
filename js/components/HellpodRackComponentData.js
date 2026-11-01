const HellpodRackComponentData = (() => {
const name = "HellpodRackComponentData";
const schema = {
  payloads: [
    { field: "slot", labelPath: `${name}.payloads.slot`, kind: "num" },
    { field: "item", labelPath: `${name}.payloads.item`, kind: "hash" },
    { field: "node", labelPath: `${name}.payloads.node`, kind: "id" },
    { field: "offset", labelPath: `${name}.payloads.offset`, kind: "vec3" },
    { field: "rotation", labelPath: `${name}.payloads.rotation`, kind: "vec3" },
    { field: "applyDeltas", labelPath: `${name}.payloads.applyDeltas`, kind: "bool" },
    { field: "side", labelPath: `${name}.payloads.side` },
  ],
};
return defineComponentView({
  name,
  contentId: "#hellpod-rack-component-data-content",
  summarize(record) {
    return `${formatNumber(record.spawn_payload_size)} ${state.locale === "zh" ? "个负载" : "payloads"}`;
  },
  schema,
  i18n: {
    zh: {
      randomSize: "负载随机值", spawnSize: "生成的负载数", payloadTitle: "负载",
      payloads: { slot: "序号", item: "负载物品哈希", node: "节点", offset: "节点偏移 X/Y/Z", rotation: "节点旋转偏移 X/Y/Z", applyDeltas: "应用定制差异", side: "侧边" },
    },
    en: {
      randomSize: "Random Payload Size", spawnSize: "Spawn Payload Size", payloadTitle: "Payloads",
      payloads: { slot: "Slot", item: "Item Hash", node: "Node", offset: "Offset X/Y/Z", rotation: "Rotation Offset X/Y/Z", applyDeltas: "Apply Deltas", side: "Rack Side" },
    },
  },
  build(record) {
    const rows = (record.payloads || []).flatMap((item, index) => {
      if (!item || String(item.item) === "0") return [];
      return [{
        slot: index + 1,
        item: item.item,
        node: item.node,
        offset: item.offset,
        rotation: item.rotation_offset,
        applyDeltas: item.apply_deltas,
        side: item.rack_side,
      }];
    });
    const sideType = enumTypeName((record.payloads || []).find((item) => item && String(item.item) !== "0")?.rack_side);
    return statGrid([
      { label: fieldLabel(name, "randomSize"), value: formatNumber(record.random_payload_size) },
      { label: fieldLabel(name, "spawnSize"), value: formatNumber(record.spawn_payload_size) },
    ]) + subpanel(fieldLabel(name, "payloadTitle"), createTable(enumColumn(schema.payloads, "side", sideType), rows));
  },
  links(record) {
    return (record.payloads || []).flatMap((item, index) => (
      !item || String(item.item) === "0" ? [] : linkedHashEntries([[item.item, `${fieldLabel(name, "payloads.item")} ${index + 1}`]])
    ));
  },
});
})();
