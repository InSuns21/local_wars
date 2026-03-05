export type BgmContext =
  | 'title'
  | 'map-select'
  | 'settings'
  | 'save-select'
  | 'credits'
  | 'tutorial'
  | 'battle'
  | 'battle-result'
  | 'audio-settings';

const TRACK_BY_CONTEXT: Record<BgmContext, string> = {
  title: './audio/title.mp3',
  'map-select': './audio/map_select.mp3',
  settings: './audio/settings.mp3',
  'save-select': './audio/save_select.mp3',
  credits: './audio/credits.mp3',
  tutorial: './audio/tutorial.mp3',
  battle: './audio/battle.mp3',
  'battle-result': './audio/battle_result.mp3',
  'audio-settings': './audio/settings.mp3',
};

export const getBgmTrackByContext = (context: BgmContext): string => TRACK_BY_CONTEXT[context];


