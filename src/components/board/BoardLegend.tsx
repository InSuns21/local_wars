import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { BOARD_VISUAL_TOKENS } from './boardVisualTokens';

const LegendSwatch: React.FC<{
  label: string;
  overlay?: string;
  outline?: string;
  borderColor?: string;
  borderStyle?: React.CSSProperties['borderStyle'];
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  markerBg?: string;
  markerBorder?: string;
}> = ({
  label,
  overlay,
  outline,
  borderColor = '#64748b',
  borderStyle = 'solid',
  badgeText,
  badgeBg,
  badgeColor,
  markerBg,
  markerBorder,
}) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <Box
      aria-hidden="true"
      sx={{
        width: 36,
        height: 28,
        border: '1px solid',
        borderColor,
        borderStyle,
        boxShadow: outline,
        backgroundColor: '#f8fafc',
        backgroundImage: overlay ? `linear-gradient(${overlay}, ${overlay})` : undefined,
        position: 'relative',
        borderRadius: 0.75,
      }}
    >
      {markerBg ? (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: markerBg,
            border: '2px solid',
            borderColor: markerBorder,
          }}
        />
      ) : null}
      {badgeText ? (
        <Box
          component="span"
          sx={{
            position: 'absolute',
            top: 2,
            right: 2,
            px: 0.5,
            py: '1px',
            fontSize: 9,
            fontWeight: 800,
            borderRadius: 0.5,
            bgcolor: badgeBg,
            color: badgeColor,
            border: '1px solid',
            borderColor,
            lineHeight: 1.1,
          }}
        >
          {badgeText}
        </Box>
      ) : null}
    </Box>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
  </Stack>
);

export const BoardLegend: React.FC = () => (
  <Paper component="section" aria-label="盤面凡例" variant="outlined" sx={{ p: 1.25, mb: 1.25 }}>
    <Typography component="h2" variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
      盤面凡例
    </Typography>
    <Stack direction="row" useFlexGap flexWrap="wrap" gap={1.25}>
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.selectedUnit.label}
        overlay={BOARD_VISUAL_TOKENS.selectedUnit.overlay}
        outline={BOARD_VISUAL_TOKENS.selectedUnit.outline}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.selectedTile.label}
        overlay={BOARD_VISUAL_TOKENS.selectedTile.overlay}
        outline={BOARD_VISUAL_TOKENS.selectedTile.outline}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.previewPath.label}
        overlay={BOARD_VISUAL_TOKENS.previewPath.overlay}
        outline={BOARD_VISUAL_TOKENS.previewPath.outline}
        markerBg={BOARD_VISUAL_TOKENS.previewPath.markerBg}
        markerBorder={BOARD_VISUAL_TOKENS.previewPath.markerBorder}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.moveReachable.label}
        overlay={BOARD_VISUAL_TOKENS.moveReachable.overlay}
        outline={BOARD_VISUAL_TOKENS.moveReachable.outline}
        borderStyle={BOARD_VISUAL_TOKENS.moveReachable.borderStyle}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.attackRange.label}
        overlay={BOARD_VISUAL_TOKENS.attackRange.overlay}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.attackTarget.label}
        overlay={BOARD_VISUAL_TOKENS.attackTarget.overlay}
        outline={BOARD_VISUAL_TOKENS.attackTarget.outline}
        badgeText="標的"
        badgeBg={BOARD_VISUAL_TOKENS.attackTarget.badgeBg}
        badgeColor={BOARD_VISUAL_TOKENS.attackTarget.badgeColor}
        borderColor={BOARD_VISUAL_TOKENS.attackTarget.borderColor}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.friendlyUnit.label}
        badgeText="味"
        badgeBg={BOARD_VISUAL_TOKENS.friendlyUnit.badgeBg}
        badgeColor={BOARD_VISUAL_TOKENS.friendlyUnit.badgeColor}
        borderColor={BOARD_VISUAL_TOKENS.friendlyUnit.borderColor}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.enemyUnit.label}
        badgeText="敵"
        badgeBg={BOARD_VISUAL_TOKENS.enemyUnit.badgeBg}
        badgeColor={BOARD_VISUAL_TOKENS.enemyUnit.badgeColor}
        borderColor={BOARD_VISUAL_TOKENS.enemyUnit.borderColor}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.friendlyProperty.label}
        borderColor={BOARD_VISUAL_TOKENS.friendlyProperty.borderColor}
      />
      <LegendSwatch
        label={BOARD_VISUAL_TOKENS.enemyProperty.label}
        borderColor={BOARD_VISUAL_TOKENS.enemyProperty.borderColor}
      />
    </Stack>
  </Paper>
);
