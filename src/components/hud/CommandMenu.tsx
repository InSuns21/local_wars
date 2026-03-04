import React from 'react';
import { Button, Card, CardContent } from '@mui/material';
import type { CommandResult } from '@core/types/state';

type CommandMenuProps = {
  onUndo: () => CommandResult;
};

export const CommandMenu: React.FC<CommandMenuProps> = ({ onUndo }) => (
  <Card component="section" aria-label="コマンド" variant="outlined">
    <CardContent>
      <Button type="button" variant="outlined" onClick={() => onUndo()}>
        行動を取り消す
      </Button>
    </CardContent>
  </Card>
);
