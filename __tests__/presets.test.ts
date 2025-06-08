import { generatorParameters, Preset, FSRSParameters, default_learning_steps, default_relearning_steps, default_request_retention, default_maximum_interval, default_enable_fuzz, default_enable_short_term, default_w, clipParameters } from '../src/fsrs';

describe('generatorParameters with presets', () => {
  it('should return default parameters when no preset is provided', () => {
    const params = generatorParameters();
    expect(params.request_retention).toEqual(default_request_retention);
    expect(params.maximum_interval).toEqual(default_maximum_interval);
    expect(params.w).toEqual(default_w);
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.enable_short_term).toEqual(default_enable_short_term);
    expect(params.learning_steps).toEqual(default_learning_steps);
    expect(params.relearning_steps).toEqual(default_relearning_steps);
  });

  it('should return LanguageLearner preset parameters', () => {
    const presetRelearningSteps = ['5m', '30m'];
    const params = generatorParameters({ preset: Preset.LanguageLearner });
    expect(params.learning_steps).toEqual(['1m', '10m', '1h']);
    expect(params.relearning_steps).toEqual(presetRelearningSteps);
    // Check other params remain default
    expect(params.request_retention).toEqual(default_request_retention);
    expect(params.maximum_interval).toEqual(default_maximum_interval);
    expect(params.w).toEqual(clipParameters([...default_w], presetRelearningSteps.length));
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.enable_short_term).toEqual(default_enable_short_term);
  });

  it('should return ExamPreparation preset parameters', () => {
    const presetRelearningSteps = ['5m', '25m'];
    const params = generatorParameters({ preset: Preset.ExamPreparation });
    expect(params.request_retention).toEqual(0.92);
    expect(params.learning_steps).toEqual(['1m', '8m', '45m', '3h']);
    expect(params.relearning_steps).toEqual(presetRelearningSteps);
    // Check other params remain default
    expect(params.maximum_interval).toEqual(default_maximum_interval);
    expect(params.w).toEqual(clipParameters([...default_w], presetRelearningSteps.length));
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.enable_short_term).toEqual(default_enable_short_term);
  });

  it('should return CasualLearner preset parameters', () => {
    const params = generatorParameters({ preset: Preset.CasualLearner });
    expect(params.request_retention).toEqual(0.85);
    expect(params.learning_steps).toEqual(['5m', '30m']);
    expect(params.enable_short_term).toEqual(false);
    // Check other params remain default
    expect(params.maximum_interval).toEqual(default_maximum_interval);
    expect(params.w).toEqual(default_w);
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.relearning_steps).toEqual(default_relearning_steps);
  });

  it('should return Default preset parameters', () => {
    const params = generatorParameters({ preset: Preset.Default });
    expect(params.request_retention).toEqual(default_request_retention);
    expect(params.maximum_interval).toEqual(default_maximum_interval);
    expect(params.w).toEqual(default_w);
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.enable_short_term).toEqual(default_enable_short_term);
    expect(params.learning_steps).toEqual(default_learning_steps);
    expect(params.relearning_steps).toEqual(default_relearning_steps);
  });

  it('should override preset parameters with specific props', () => {
    const presetRelearningSteps = ['5m', '30m']; // LanguageLearner preset
    const params = generatorParameters({
      preset: Preset.LanguageLearner,
      request_retention: 0.93,
      learning_steps: ['1m', '15m'],
    });
    expect(params.request_retention).toEqual(0.93); // Overridden
    expect(params.learning_steps).toEqual(['1m', '15m']); // Overridden
    expect(params.relearning_steps).toEqual(presetRelearningSteps); // From preset
    // Check other params remain default
    expect(params.maximum_interval).toEqual(default_maximum_interval);
    expect(params.w).toEqual(clipParameters([...default_w], presetRelearningSteps.length));
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.enable_short_term).toEqual(default_enable_short_term);
  });

  it('should override default parameters with specific props when Default preset is used', () => {
    const params = generatorParameters({
      preset: Preset.Default,
      request_retention: 0.91,
      maximum_interval: 1000,
    });
    expect(params.request_retention).toEqual(0.91); // Overridden
    expect(params.maximum_interval).toEqual(1000); // Overridden
    // Check other params remain default
    expect(params.w).toEqual(default_w);
    expect(params.enable_fuzz).toEqual(default_enable_fuzz);
    expect(params.enable_short_term).toEqual(default_enable_short_term);
    expect(params.learning_steps).toEqual(default_learning_steps);
    expect(params.relearning_steps).toEqual(default_relearning_steps);
  });

  it('should correctly apply enable_short_term from CasualLearner preset', () => {
    const params = generatorParameters({ preset: Preset.CasualLearner });
    expect(params.enable_short_term).toBe(false);
  });

  it('should correctly override enable_short_term when CasualLearner preset is used', () => {
    const params = generatorParameters({ preset: Preset.CasualLearner, enable_short_term: true });
    expect(params.enable_short_term).toBe(true);
  });

});
