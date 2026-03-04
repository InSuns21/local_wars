import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import type { UnitState } from '@core/types/unit';
import { getUnitTypeLabel } from '@/utils/unitLabel';

type UnitPanelProps = {
  unit: UnitState | null;
};

export const UnitPanel: React.FC<UnitPanelProps> = ({ unit }) => (
  <Card component="section" aria-label="ユニット情報" variant="outlined" sx={{ mb: 1.5 }}>
    <CardContent>
      <Typography variant="h2" sx={{ fontSize: 20, mb: 1 }}>ユニット情報</Typography>
      {!unit && <Typography variant="body2">ユニット未選択</Typography>}
      {unit && (
        <dl>
          <dt>ID</dt>
          <dd>{unit.id}</dd>
          <dt>種類</dt>
          <dd>{getUnitTypeLabel(unit.type)}</dd>
          <dt>HP</dt>
          <dd>{unit.hp}</dd>
          <dt>座標</dt>
          <dd>
            {unit.position.x},{unit.position.y}
          </dd>
        </dl>
      )}
    </CardContent>
  </Card>
);
