import { getAiStrategy } from '@core/engine/aiStrategies';

describe('aiStrategies', () => {
  it('captain / hunter / turtle / sieger / drone / stealth は専用strategyを返す', () => {
    expect(getAiStrategy('captain').profile).toBe('captain');
    expect(getAiStrategy('hunter').profile).toBe('hunter');
    expect(getAiStrategy('turtle').profile).toBe('turtle');
    expect(getAiStrategy('sieger').profile).toBe('sieger');
    expect(getAiStrategy('drone_swarm').profile).toBe('drone_swarm');
    expect(getAiStrategy('stealth_strike').profile).toBe('stealth_strike');
  });

  it('balanced は fallback strategy を返す', () => {
    expect(getAiStrategy('balanced').profile).toBe('balanced');
  });
});

