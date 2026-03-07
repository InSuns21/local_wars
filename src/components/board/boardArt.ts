import type { TerrainType } from '@core/types/map';
import type { UnitType } from '@core/types/unit';

const toDataUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const tileSvg = (base: string, accents: string): string =>
  toDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><rect width="68" height="68" fill="${base}"/>${accents}</svg>`,
  );

export const TERRAIN_TEXTURES: Record<TerrainType, string> = {
  PLAIN: tileSvg('#8db56f', '<path d="M0 50 C15 42 30 58 48 50 C58 46 64 48 68 44 L68 68 L0 68 Z" fill="#7ba35f"/><circle cx="16" cy="18" r="2" fill="#6f9a56"/><circle cx="48" cy="22" r="2.4" fill="#6f9a56"/>'),
  FOREST: tileSvg('#4d7f43', '<circle cx="14" cy="14" r="8" fill="#2f5f2e"/><circle cx="30" cy="20" r="10" fill="#336a32"/><circle cx="50" cy="14" r="9" fill="#2e5a2b"/><circle cx="18" cy="40" r="10" fill="#2d582a"/><circle cx="44" cy="44" r="11" fill="#2f602d"/>'),
  MOUNTAIN: tileSvg('#9aa0a8', '<path d="M4 56 L20 26 L36 56 Z" fill="#6f7682"/><path d="M20 56 L40 18 L64 56 Z" fill="#7b828f"/><path d="M40 18 L47 30 L33 30 Z" fill="#e5e7eb"/>'),
  ROAD: tileSvg('#8ca15c', '<path d="M0 24 L68 40" stroke="#544a3b" stroke-width="12"/><path d="M0 24 L68 40" stroke="#c3b08e" stroke-width="8" stroke-dasharray="8 6"/>'),
  BRIDGE: tileSvg('#7da6bc', '<rect x="0" y="24" width="68" height="20" fill="#8b6b4f"/><path d="M0 28 H68 M0 40 H68" stroke="#c7a784" stroke-width="2"/><path d="M8 24 V44 M20 24 V44 M32 24 V44 M44 24 V44 M56 24 V44" stroke="#6b4a31" stroke-width="2"/>'),
  RIVER: tileSvg('#6fa8d9', '<path d="M0 14 C14 28 28 0 42 14 C54 26 62 16 68 22 L68 52 C58 48 52 58 40 50 C28 42 14 66 0 52 Z" fill="#3f84c5"/>'),
  SEA: tileSvg('#2f6fa8', '<path d="M0 16 C8 12 16 20 24 16 C32 12 40 20 48 16 C56 12 64 20 68 18 V68 H0 Z" fill="#3f86bf"/><path d="M0 28 C8 24 16 32 24 28 C32 24 40 32 48 28 C56 24 64 32 68 30" stroke="#9ed2ff" stroke-width="2"/>'),
  CITY: tileSvg('#b8a5d6', '<rect x="8" y="30" width="14" height="24" fill="#4f3e67"/><rect x="24" y="22" width="16" height="32" fill="#5d4b77"/><rect x="42" y="26" width="18" height="28" fill="#4a3a61"/><g fill="#d7c8f0"><rect x="11" y="34" width="3" height="3"/><rect x="16" y="34" width="3" height="3"/><rect x="27" y="26" width="3" height="3"/><rect x="32" y="26" width="3" height="3"/><rect x="45" y="30" width="3" height="3"/><rect x="50" y="30" width="3" height="3"/></g>'),
  FACTORY: tileSvg('#aab4bf', '<rect x="8" y="22" width="52" height="34" rx="3" fill="#4c5a68"/><rect x="14" y="16" width="10" height="12" fill="#3c4753"/><rect x="28" y="10" width="10" height="18" fill="#445364"/><rect x="42" y="14" width="10" height="14" fill="#3e4b58"/><path d="M16 48 H54" stroke="#d4d9df" stroke-width="3"/>'),
  HQ: tileSvg('#d7ba67', '<rect x="6" y="40" width="56" height="18" fill="#6f4b2a"/><rect x="14" y="26" width="40" height="16" fill="#8a5f35"/><path d="M12 26 L34 10 L56 26 Z" fill="#b17d45"/><path d="M34 10 V36" stroke="#f3e29d" stroke-width="3"/><path d="M34 10 L46 18 L34 22 Z" fill="#d34242"/>'),
  AIRPORT: tileSvg('#7ba2b6', '<rect x="8" y="16" width="52" height="36" rx="4" fill="#435869"/><path d="M14 34 H54" stroke="#d5e4ef" stroke-width="4"/><path d="M34 20 V48" stroke="#d5e4ef" stroke-width="4"/><path d="M26 26 L42 42 M42 26 L26 42" stroke="#d5e4ef" stroke-width="2"/>'),
  PORT: tileSvg('#6b9db8', '<rect x="0" y="34" width="68" height="34" fill="#2f6f8a"/><rect x="8" y="22" width="18" height="12" fill="#7d5b3f"/><rect x="30" y="18" width="14" height="16" fill="#8a6545"/><path d="M0 42 C8 38 16 46 24 42 C32 38 40 46 48 42 C56 38 64 46 68 43" stroke="#9fd4f0" stroke-width="2"/><path d="M52 18 V38" stroke="#4a3726" stroke-width="3"/><path d="M52 18 L62 24" stroke="#4a3726" stroke-width="2"/>'),
};

export const UNIT_GLYPH_PATHS: Record<UnitType, string[]> = {
  INFANTRY: ['M12 6 L16 11 L14 11 L14 18 L10 18 L10 11 L8 11 Z'],
  RECON: ['M6 13 L9 9 H15 L18 13 V16 H6 Z', 'M8 16 A2 2 0 1 0 8.01 16', 'M16 16 A2 2 0 1 0 16.01 16'],
  TANK: ['M5.5 13 L8 9 H15.5 L18.5 13 V16.5 H5.5 Z', 'M10 8 H16 V9.8 H10 Z', 'M16 8.6 H20 V9.6 H16 Z'],
  ANTI_TANK: ['M6 13 L9 9.5 H15 L18 13 V16.5 H6 Z', 'M7 8.5 L17 18', 'M17 8.5 L7 18'],
  ARTILLERY: ['M6 14 L9 11 H15 L18 14 V17 H6 Z', 'M14.5 9.5 H20 V10.8 H14.5'],
  ANTI_AIR: ['M6.5 13.5 L9.5 10.5 H14.5 L17.5 13.5 V17 H6.5 Z', 'M12 7 L16 12 H8 Z'],
  FIGHTER: ['M12 6 L16 18 L12.8 15.4 H11.2 L8 18 Z'],
  BOMBER: ['M7 10 H17 L15 15 H9 Z', 'M10.5 8.5 H13.5 V10 H10.5 Z'],
  ATTACKER: ['M12 6 L17 14 L13.8 13.4 L12 18 L10.2 13.4 L7 14 Z'],
  STEALTH_BOMBER: ['M6.5 11 L12 8 L17.5 11 L14.5 16 H9.5 Z', 'M8 12 L16 12'],
  DESTROYER: ['M6 15 H18 L15 9.5 H9 Z', 'M8 16.5 H16'],
  LANDER: ['M7 14.5 H17 L14 10 H10 Z', 'M9 16 H15'],
};
