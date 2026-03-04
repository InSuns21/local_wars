import React from 'react';
import { Button, Card, CardContent, Typography } from '@mui/material';
import type { GameState } from '@core/types/state';

type TurnPanelProps = {
  gameState: GameState;
  onEndTurn: () => void;
  disabled?: boolean;
};

export const TurnPanel: React.FC<TurnPanelProps> = ({ gameState, onEndTurn, disabled = false }) => (
  <Card component="section" aria-label="ターン情報" variant="outlined" sx={{ mb: 1.5 }}>
    <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography>ターン: {gameState.turn}</Typography>
      <Typography>手番: {gameState.currentPlayerId}</Typography>
      <Button type="button" variant="contained" onClick={onEndTurn} disabled={disabled}>
        ターン終了
      </Button>
    </CardContent>
  </Card>
);
