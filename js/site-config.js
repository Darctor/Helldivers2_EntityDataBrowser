/**
 * 发布开关。本地编辑保持 "local"。
 * 上传到 GitHub Pages 前改成 "website"。
 * 网站模式只读。dataRoot 指向已发布的数据仓库，不再在本仓库里放第二份 JSON。
 * jsDelivr 单文件上限 20 MB，HealthComponentData.json 约 30 MB，所以用 raw.githubusercontent.com。
 * 文件名可以是 HealthComponentData.json，也可以是 HealthComponentData_2026-09-22.json。
 * 本地和网站都先用没有日期的文件名，没有再使用 patch_date 拼出的「前缀_日期.json」。
 */
const SITE_CONFIG = {
  mode: "website",
  patch_date: "2026-10-20",
  game_version: "1.007.200",
  dataRoot: "https://raw.githubusercontent.com/Darctor/Helldivers2_RawData/main/Data",
  directories: {
    entities: [
      "AiCharacterComponentData.json",
      "AiEnemyComponentData.json",
      "ArcWeaponComponentData.json",
      "AvatarComponentData.json",
      "BeamWeaponComponentData.json",
      "BombardmentComponentData.json",
      "DamageZoneShieldComponentData.json",
      "DepositComponentData.json",
      "DisplacementComponentData.json",
      "EagleComponentData.json",
      "EagleSpawnerComponentData.json",
      "EncyclopediaEntryComponentData.json",
      "EnemyPackageComponentData.json",
      "ExplosiveComponentData.json",
      "FactionComponentData.json",
      "HealthComponentData.json",
      "HellpodPayloadComponentData.json",
      "HellpodRackComponentData.json",
      "HitReactComponentData.json",
      "HiveMindComponentData.json",
      "InventoryComponentData.json",
      "LoadoutPackageComponentData.json",
      "MeleeWeaponComponentData.json",
      "MinefieldComponentData.json",
      "MountComponentData.json",
      "OrbitalAbilityComponentData.json",
      "OverlapDamageComponentData.json",
      "ProjectileWeaponComponentData.json",
      "SeekingMissileComponentData.json",
      "SensorDangerComponentData.json",
      "SensorEarComponentData.json",
      "SensorEyeComponentData.json",
      "ShieldComponentData.json",
      "SpawnOnPlayersComponentData.json",
      "SprayWeaponComponentData.json",
      "StatusEffectReceiverComponentData.json",
      "StatusEffectVolumeComponentData.json",
      "StickyComponentData.json",
      "TargetingComponentData.json",
      "ThrowableComponentData.json",
      "ThrowerComponentData.json",
      "TurretComponentData.json",
      "VehicleComponentData.json",
      "WeaponChargeComponentData.json",
      "WeaponCustomizationComponentData.json",
      "WeaponDataComponentData.json",
      "WeaponHeatComponentData.json",
      "WeaponMagazineComponentData.json",
      "WeaponReloadComponentData.json",
      "WeaponRoundsComponentData.json",
      "WeaponWielderComponentData.json",
      "WeatherControlComponentData.json",
    ],
    settings: [
      "EntityComponentMap.json",
      "generated_arc_settings.json",
      "generated_beam_settings.json",
      "generated_damage_settings.json",
      "generated_explosion_settings.json",
      "generated_projectile_settings.json",
      "generated_status_effect_settings.json",
      "generated_stratagem_settings.json",
      "generated_weapon_customization_settings.json",
    ],
    entity_deltas: [
      "entity_deltas_decoded.json",
      "entity_deltas_raw.json",
    ],
  },
};

function isWebsiteMode() {
  return SITE_CONFIG.mode === "website";
}
