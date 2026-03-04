import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'はい',
  cancelLabel = 'いいえ',
  onConfirm,
  onCancel,
}) => (
  <Dialog open onClose={onCancel} aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-desc">
    <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
    <DialogContent>
      <Typography id="confirm-dialog-desc">{message}</Typography>
    </DialogContent>
    <DialogActions>
      <Button type="button" onClick={onCancel}>{cancelLabel}</Button>
      <Button type="button" variant="contained" color="error" onClick={onConfirm}>{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);
