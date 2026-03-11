import { UNIT_DEFINITIONS } from '@core/engine/unitDefinitions';
import type { UnitState } from '@core/types/unit';

export const FUEL_WARNING_THRESHOLD = 10;
export const AMMO_WARNING_THRESHOLD = 1;

export type UnitResourceAlertKind = 'fuel-low' | 'ammo-low';

export const UNIT_RESOURCE_ALERT_META: Record<
  UnitResourceAlertKind,
  {
    shortLabel: string;
    chipLabel: string;
    helperText: string;
    bgColor: string;
    fgColor: string;
    borderColor: string;
  }
> = {
  'fuel-low': {
    shortLabel: '燃料警戒',
    chipLabel: '燃料',
    helperText: `残り${FUEL_WARNING_THRESHOLD}以下`,
    bgColor: '#fff7ed',
    fgColor: '#9a3412',
    borderColor: '#fb923c',
  },
  'ammo-low': {
    shortLabel: '弾薬警戒',
    chipLabel: '弾切れ前',
    helperText: `残り${AMMO_WARNING_THRESHOLD}以下`,
    bgColor: '#fef2f2',
    fgColor: '#991b1b',
    borderColor: '#f87171',
  },
};

export const getUnitResourceAlerts = (unit: UnitState): UnitResourceAlertKind[] => {
  const alerts: UnitResourceAlertKind[] = [];
  const definition = UNIT_DEFINITIONS[unit.type];

  if (unit.fuel <= FUEL_WARNING_THRESHOLD) {
    alerts.push('fuel-low');
  }

  if (definition.unitCategory !== 'DRONE' && definition.maxAmmo > 0 && unit.ammo <= AMMO_WARNING_THRESHOLD) {
    alerts.push('ammo-low');
  }

  return alerts;
};
