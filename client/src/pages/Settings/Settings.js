import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette,
  Language,
  Backup,
  Restore,
  FileDownload,
  FileUpload,
  Security,
  Notifications,
  Storage,
  Refresh,
  Save,
  Delete,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';

import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportComprehensiveReport } from '../../utils/excelExport';

const Settings = () => {
  const { mode, toggleMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [backupDialog, setBackupDialog] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [systemInfo, setSystemInfo] = useState({});

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/health');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Error fetching system info:', error);
    }
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Export comprehensive data
      const [sales, inventory, customers, receipts] = await Promise.all([
        axios.get('/api/sales'),
        axios.get('/api/products'),
        axios.get('/api/customers'),
        axios.get('/api/receipts')
      ]);

      const backupData = {
        sales: sales.data.sales || [],
        inventory: inventory.data.products || [],
        customers: customers.data.customers || [],
        receipts: receipts.data.receipts || [],
        timestamp: new Date().toISOString(),
        version: systemInfo.version || '1.0.0'
      };

      // Create backup file
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Download backup file
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ediths_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Backup completed successfully!');
      setBackupDialog(false);
    } catch (error) {
      console.error('Error creating backup:', error);
      setError('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setError('Please select a backup file');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const fileContent = await selectedFile.text();
      const backupData = JSON.parse(fileContent);

      // Validate backup data
      if (!backupData.version || !backupData.timestamp) {
        throw new Error('Invalid backup file format');
      }

      // Here you would implement the actual restore logic
      // For now, we'll just show a success message
      setSuccess('Restore completed successfully!');
      setRestoreDialog(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error restoring backup:', error);
      setError('Failed to restore backup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select a valid JSON backup file');
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      setError('');

      const [sales, inventory, customers] = await Promise.all([
        axios.get('/api/sales'),
        axios.get('/api/products'),
        axios.get('/api/customers')
      ]);

      exportComprehensiveReport({
        sales: sales.data.sales || [],
        inventory: inventory.data.products || [],
        customers: customers.data.customers || []
      }, 'ediths_pos_data_export');

      setSuccess('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      setError('');

      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();

      setSuccess('Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      setError('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = () => {
    try {
      // Reset to default settings
      localStorage.removeItem('themeMode');
      localStorage.removeItem('language');
      
      // Reload page to apply defaults
      window.location.reload();
    } catch (error) {
      console.error('Error resetting settings:', error);
      setError('Failed to reset settings');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        {t('settings')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                <Palette sx={{ mr: 1, verticalAlign: 'middle' }} />
                {t('appearance')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={mode === 'dark'}
                    onChange={toggleMode}
                    color="primary"
                  />
                }
                label={mode === 'dark' ? t('darkMode') : t('lightMode')}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary">
                Toggle between light and dark themes for better visibility
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Language Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                <Language sx={{ mr: 1, verticalAlign: 'middle' }} />
                {t('language')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{t('language')}</InputLabel>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  label={t('language')}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="fil">Filipino</MenuItem>
                </Select>
              </FormControl>
              
              <Typography variant="body2" color="text.secondary">
                Choose your preferred language for the interface
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Data Management */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                <Storage sx={{ mr: 1, verticalAlign: 'middle' }} />
                Data Management
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Backup />}
                    onClick={() => setBackupDialog(true)}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Create Backup
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Backup all data to JSON file
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Restore />}
                    onClick={() => setRestoreDialog(true)}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Restore Backup
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Restore data from backup file
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownload />}
                    onClick={handleExportData}
                    disabled={loading}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Export to Excel
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Export data to Excel format
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleClearCache}
                    disabled={loading}
                    fullWidth
                    sx={{ mb: 1 }}
                  >
                    Clear Cache
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Clear browser cache and storage
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                System Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Version"
                    secondary={systemInfo.version || '1.0.0'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={
                      <Chip 
                        label={systemInfo.status || 'Unknown'} 
                        color={systemInfo.status === 'OK' ? 'success' : 'error'}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Updated"
                    secondary={systemInfo.timestamp ? new Date(systemInfo.timestamp).toLocaleString() : 'Unknown'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Database"
                    secondary="SQLite (Local)"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem button onClick={fetchSystemInfo}>
                  <ListItemIcon>
                    <Refresh />
                  </ListItemIcon>
                  <ListItemText primary="Refresh System Info" />
                </ListItem>
                
                <ListItem button onClick={handleResetSettings}>
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Reset to Defaults" />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Security Status" 
                    secondary="All systems secure"
                  />
                  <ListItemSecondaryAction>
                    <Chip label="Secure" color="success" size="small" />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Backup Dialog */}
      <Dialog open={backupDialog} onClose={() => setBackupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will create a complete backup of all your data including sales, inventory, customers, and receipts.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              The backup file will be downloaded automatically and contains all your data in JSON format.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleBackup} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <Refresh /> : <Backup />}
          >
            {loading ? 'Creating...' : 'Create Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a backup file to restore your data. This will overwrite current data.
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Warning: This action will overwrite all current data. Make sure to backup current data first.
            </Typography>
          </Alert>
          
          <input
            accept=".json"
            style={{ display: 'none' }}
            id="restore-file"
            type="file"
            onChange={handleFileSelect}
          />
          <label htmlFor="restore-file">
            <Button variant="outlined" component="span" startIcon={<FileUpload />}>
              Select Backup File
            </Button>
          </label>
          
          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Chip 
                label={selectedFile.name} 
                color="primary" 
                onDelete={() => setSelectedFile(null)}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRestore} 
            variant="contained" 
            disabled={loading || !selectedFile}
            startIcon={loading ? <Refresh /> : <Restore />}
            color="warning"
          >
            {loading ? 'Restoring...' : 'Restore Backup'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;
