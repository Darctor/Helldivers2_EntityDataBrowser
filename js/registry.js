/**
 * 组件注册表：新增组件的唯一接入点。
 *
 * 步骤：
 * 1. 在 js/components/ 新建 <ComponentName>.js，提供 name/file/label/summarize/schema/i18n/render/buildNested。
 *    file 只写 JSON 文件名前缀，不要写目录或日期。
 * 2. 将模块加入下方 COMPONENT_MODULES，并在 index.html 中于 registry.js 之前加入对应 script
 * 3. 在 index.html 增加对应 data-component 区块（可选，sortComponentSections 会自动编号）
 */
const COMPONENT_MODULES = [
  HealthComponentData,
  HitReactComponentData,
  StatusEffectReceiverComponentData,
  MountComponentData,
  ArcWeaponComponentData,
  BeamWeaponComponentData,
  BombardmentComponentData,
  DamageZoneShieldComponentData,
  DepositComponentData,
  EagleComponentData,
  EnemyPackageComponentData,
  ExplosiveComponentData,
  FactionComponentData,
  InventoryComponentData,
  LoadoutPackageComponentData,
  ProjectileWeaponComponentData,
  WeaponChargeComponentData,
  WeaponDataComponentData,
  WeaponHeatComponentData,
  WeaponMagazineComponentData,
  HellpodRackComponentData,
  MeleeWeaponComponentData,
  ShieldComponentData,
  SprayWeaponComponentData,
  ThrowableComponentData,
  TurretComponentData,
  WeaponReloadComponentData,
  WeaponRoundsComponentData,
  MinefieldComponentData,
  OrbitalAbilityComponentData,
  SensorDangerComponentData,
  SensorEarComponentData,
  SensorEyeComponentData,
];

COMPONENT_MODULES.forEach((module) => {
  registerComponentI18n(module.name, module.i18n);
});

const COMPONENT_REGISTRY = Object.fromEntries(COMPONENT_MODULES.map((module) => [module.name, {
  file: module.file,
  label: module.label,
  summarize: module.summarize,
  schema: module.schema,
  render: module.render,
  buildNested: module.buildNested,
}]));

setComponentLookup(COMPONENT_REGISTRY);

const TABLE_SCHEMAS = Object.fromEntries(COMPONENT_MODULES.map((module) => [module.name, module.schema]));

const DATA_FILES = Object.fromEntries(Object.entries(COMPONENT_REGISTRY).map(([componentName, definition]) => [componentName, definition.file]));
