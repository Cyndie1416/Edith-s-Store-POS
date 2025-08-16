import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { Settings } from '@mui/icons-material';

const SettingsPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Settings
      </Typography>
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Settings sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Settings Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary">
          System settings, user management, and preferences will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
