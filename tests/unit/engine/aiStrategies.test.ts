import { getAiStrategy } from '@core/engine/aiStrategies';

describe('aiStrategies', () => {
  it('captain / hunter / turtle / sieger は専用strategyを返す', () => {
    expect(getAiStrategy('captain').profile).toBe('captain');
    expect(getAiStrategy('hunter').profile).toBe('hunter');
    expect(getAiStrategy('turtle').profile).toBe('turtle');
    expect(getAiStrategy('sieger').profile).toBe('sieger');
  });

  it('未切り出しprofileはfallback strategyを返す', () => {
    expect(getAiStrategy('balanced').profile).toBe('balanced');
    expect(getAiStrategy('drone_swarm').profile).toBe('balanced');
  });
});
