import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box } from '@mui/material';

interface AlertData {
  id: number;
  timestamp: string;
  type: string;
  message: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  alert: AlertData | null;
}

const AlertDetailModal: React.FC<Props> = ({ open, onClose, alert }) => {
  if (!alert) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Alert Details</DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Typography><strong>ID:</strong> {alert.id}</Typography>
          <Typography><strong>Time:</strong> {alert.timestamp}</Typography>
          <Typography><strong>Type:</strong> {alert.type}</Typography>
          <Typography><strong>Message:</strong> {alert.message}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AlertDetailModal;
