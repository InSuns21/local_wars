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
  INFANTRY: [
    'M12 5.2 A1.7 1.7 0 1 1 11.99 5.2',
    'M11 7.2 H13 L13.6 10.2 L15.9 12.4 L14.7 13.5 L13.2 12.2 L13.6 18.5 H12.1 L11.8 14.9 L10.2 18.5 H8.7 L10.1 12.1 L8.8 13.5 L7.5 12.3 L10 10.1 Z',
  ],
  RECON: [
    'M5.2 14.2 L7.9 10.8 H15.9 L18.8 13.2 V16.4 H5.2 Z',
    'M14.2 9.2 H18.8 V10.4 H14.2 Z',
    'M7.6 17.1 A1.8 1.8 0 1 0 7.61 17.1',
    'M16.4 17.1 A1.8 1.8 0 1 0 16.41 17.1',
  ],
  TANK: [
    'M4.8 13.8 L7.4 10.4 H16 L19.2 12.8 V16.7 H4.8 Z',
    'M8.7 8.7 H14.8 V10.3 H8.7 Z',
    'M14.5 9.1 H20 V10.1 H14.5 Z',
    'M7 17.2 A1.5 1.5 0 1 0 7.01 17.2',
    'M16.8 17.2 A1.5 1.5 0 1 0 16.81 17.2',
  ],
  HEAVY_TANK: [
    'M4.2 14.4 L7.4 10.3 H16.6 L20 12.8 V17.1 H4.2 Z',
    'M7.8 9.1 H15.9 V10.9 H7.8 Z',
    'M14.7 8.6 H21.2 V10 H14.7 Z',
    'M8.4 7.3 H12.8 V8.8 H8.4 Z',
    'M6.5 17.6 A1.7 1.7 0 1 0 6.51 17.6',
    'M17.5 17.6 A1.7 1.7 0 1 0 17.51 17.6',
  ],
  ANTI_TANK: [
    'M5 13.9 L7.8 10.6 H15.8 L18.8 13.1 V16.8 H5 Z',
    'M13.7 8.4 L20.3 6.7 L20.7 8.1 L14.1 9.8 Z',
    'M9.1 7.8 L17 15.7',
    'M17 7.8 L9.1 15.7',
  ],
  ARTILLERY: [
    'M5.5 14.4 L8.4 11.7 H15.2 L17.8 13.8 V16.8 H5.5 Z',
    'M14.1 9.1 H21 V10.4 H14.1 Z',
    'M7.4 17.2 A1.3 1.3 0 1 0 7.41 17.2',
    'M15.9 17.2 A1.3 1.3 0 1 0 15.91 17.2',
  ],
  ANTI_AIR: [
    'M5.2 14.1 L7.9 10.9 H15.6 L18.5 13.3 V16.8 H5.2 Z',
    'M12 6.4 L16.8 11.8 H13.4 V14.2 H10.6 V11.8 H7.2 Z',
    'M16.3 8.2 H19.6 V9.4 H16.3 Z',
  ],
  FLAK_TANK: [
    'M5.1 14.4 L7.9 10.9 H15.8 L18.8 13.2 V16.9 H5.1 Z',
    'M11.9 6.9 L14.8 9.7 L12.7 11.8 L15.1 14.2 L12.8 16.4 L10.3 13.8 L8 16.3 L6.1 14.4 L8.6 12 L6.3 9.8 L9.2 6.9 Z',
    'M15.2 7.4 H19.9 V8.8 H15.2 Z',
  ],
  MISSILE_AA: [
    'M4.9 14.7 L7.6 11.2 H15.8 L18.9 13.6 V16.9 H4.9 Z',
    'M8.4 8.7 H15.7 V10.2 H8.4 Z',
    'M15 7.2 L19.6 5.3 L20.2 6.6 L15.6 8.5 Z',
    'M12.2 10.2 V13.5',
    'M7 17.2 A1.4 1.4 0 1 0 7.01 17.2',
    'M16.9 17.2 A1.4 1.4 0 1 0 16.91 17.2',
  ],
  SUPPLY_TRUCK: [
    'M5.1 14.5 L7.6 11.1 H15.8 L18.8 13.5 V17 H5.1 Z',
    'M8.2 8.8 H14.8 V10.2 H8.2 Z',
    'M12 6.4 V12.8',
    'M8.8 9.6 H15.2',
    'M6.9 17.3 A1.5 1.5 0 1 0 6.91 17.3',
    'M17 17.3 A1.5 1.5 0 1 0 17.01 17.3',
  ],
  FIGHTER: [
    'M12 4.8 L14 9.7 H18.9 L14.2 12.2 L15.7 18.3 L12 14.9 L8.3 18.3 L9.8 12.2 L5.1 9.7 H10 Z',
  ],
  BOMBER: [
    'M6 10.4 H18 L16.7 13.2 H14.8 V18.2 H9.2 V13.2 H7.3 Z',
    'M10.2 7.8 H13.8 V10.4 H10.2 Z',
  ],
  ATTACKER: [
    'M12 5.2 L17.8 11.4 L14.5 11.8 L15.7 17.3 L12 14.5 L8.3 17.3 L9.5 11.8 L6.2 11.4 Z',
    'M11.2 9.4 H12.8 V12.2 H11.2 Z',
  ],
  STEALTH_BOMBER: [
    'M4.8 11.6 L12 7.2 L19.2 11.6 L15.1 12.7 L17.1 16.7 H6.9 L8.9 12.7 Z',
    'M8.4 12.2 H15.6',
  ],
  AIR_TANKER: [
    'M12 5.1 L18.3 11.1 L14.8 11.6 L15.8 16.9 L12 14.8 L8.2 16.9 L9.2 11.6 L5.7 11.1 Z',
    'M11.1 8.8 H12.9 V15.2 H11.1 Z',
    'M8.8 11.1 H15.2',
  ],
  DESTROYER: [
    'M5.2 15.7 H18.8 L16 10.1 H9.5 L7.6 12.2 H5.2 Z',
    'M8.8 9.2 H12.8 V10.4 H8.8 Z',
    'M7.2 17.1 H17',
  ],
  LANDER: [
    'M6.2 15.5 H17.8 L15 11 H9.7 Z',
    'M10 9.5 H14 V10.9 H10 Z',
    'M8.5 17 H15.5',
  ],
};
