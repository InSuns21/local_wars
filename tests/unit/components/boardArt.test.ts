import { TERRAIN_TEXTURES } from '@/components/board/boardArt';

describe('board terrain textures', () => {
  const decodeTexture = (texture: string) => decodeURIComponent(texture.slice(texture.indexOf(',') + 1));

  it('COAST は海タイルではなく砂浜付きの陸ベースで描く', () => {
    const coastTexture = decodeTexture(TERRAIN_TEXTURES.COAST);
    const seaTexture = decodeTexture(TERRAIN_TEXTURES.SEA);

    expect(coastTexture).toContain('fill="#90b66f"');
    expect(coastTexture).toContain('fill="#efd79a"');
    expect(coastTexture).not.toContain('fill="#84c5ea"');
    expect(coastTexture).not.toBe(seaTexture);
  });
});
