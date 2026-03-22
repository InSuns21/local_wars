import { getAiStrategy } from '@core/engine/aiStrategies';

describe('aiStrategies', () => {
  it('captain と hunter は専用strategyを返す', () => {
    expect(getAiStrategy('captain').profile).toBe('captain');
    expect(getAiStrategy('hunter').profile).toBe('hunter');
  });

  it('未切り出しprofileはfallback strategyを返す', () => {
    expect(getAiStrategy('balanced').profile).toBe('balanced');
    expect(getAiStrategy('turtle').profile).toBe('balanced');
  });
});
