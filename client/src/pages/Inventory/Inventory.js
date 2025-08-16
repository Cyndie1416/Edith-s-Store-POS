import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import {
  Search,
  Edit,
  Refresh
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [openAdjustmentDialog, setOpenAdjustmentDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const [adjustmentData, setAdjustmentData] = useState({
    type: 'add',
    quantity: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    fetchInventory();
    fetchAdjustments();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (error) {
      setError('Failed to load inventory');
    }
  };

  const fetchAdjustments = async () => {
    try {
      const response = await axios.get('/api/inventory/adjustments');
      setAdjustments(response.data.adjustments || []);
    } catch (error) {
      setError('Failed to load adjustments');
    }
  };

  const handleAdjustment = async () => {
    setLoading(true);
    try {
      const adjustmentPayload = {
        product_id: selectedProduct.id,
        type: adjustmentData.type,
        quantity: parseInt(adjustmentData.quantity),
        reason: adjustmentData.reason,
        notes: adjustmentData.notes
      };

      await axios.post('/api/inventory/adjustments', adjustmentPayload);
      setSuccess('Inventory adjustment processed successfully!');
      setOpenAdjustmentDialog(false);
      setAdjustmentData({ type: 'add', quantity: '', reason: '', notes: '' });
      fetchInventory();
      fetchAdjustments();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to process adjustment');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjustmentDialog = (product) => {
    setSelectedProduct(product);
    setOpenAdjustmentDialog(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.includes(searchTerm) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter(product => 
    product.stock_quantity <= (product.min_stock_level || 5)
  );

  const outOfStockProducts = products.filter(product => 
    product.stock_quantity === 0
  );

  const inventoryColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Product Name', width: 250 },
    { field: 'category_name', headerName: 'Category', width: 150 },
    { field: 'barcode', headerName: 'Barcode', width: 150 },
    { 
      field: 'stock_quantity', 
      headerName: 'Current Stock', 
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 0 ? 'error' :
            params.value <= (params.row.min_stock_level || 5) ? 'warning' : 'success'
          }
          size="small"
        />
      )
    },
    { 
      field: 'min_stock_level', 
      headerName: 'Min Level', 
      width: 120 
    },
    { 
      field: 'cost_price', 
      headerName: 'Cost Price', 
      width: 120,
      valueFormatter: (params) => `₱${params.value?.toFixed(2) || '0.00'}`
    },
    { 
      field: 'stock_value', 
      headerName: 'Stock Value', 
      width: 130,
      valueGetter: (params) => (params.row.stock_quantity * (params.row.cost_price || 0)).toFixed(2),
      valueFormatter: (params) => `₱${params.value}`
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenAdjustmentDialog(params.row)}
            color="primary"
            title="Adjust Stock"
          >
            <Edit />
          </IconButton>
        </Box>
      )
    }
  ];

  const adjustmentColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'product_name', headerName: 'Product', width: 200 },
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === 'add' ? 'success' :
            params.value === 'remove' ? 'error' : 'warning'
          }
          size="small"
        />
      )
    },
    { field: 'quantity', headerName: 'Quantity', width: 100 },
    { field: 'reason', headerName: 'Reason', width: 200 },
    { field: 'notes', headerName: 'Notes', width: 200 },
    { 
      field: 'created_at', 
      headerName: 'Date', 
      width: 150,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString()
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Inventory Management
      </Typography>

      {/* Alerts */}
      {lowStockProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {lowStockProducts.length} product(s) are running low on stock!
          </Typography>
          {lowStockProducts.slice(0, 3).map(product => (
            <Typography key={product.id} variant="body2">
              • {product.name} - {product.stock_quantity} remaining (min: {product.min_stock_level || 5})
            </Typography>
          ))}
        </Alert>
      )}

      {outOfStockProducts.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {outOfStockProducts.length} product(s) are out of stock!
          </Typography>
          {outOfStockProducts.slice(0, 3).map(product => (
            <Typography key={product.id} variant="body2">
              • {product.name} - 0 stock remaining
            </Typography>
          ))}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4" component="div">
                {products.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Stock Items
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {lowStockProducts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Out of Stock
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {outOfStockProducts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4" component="div">
                ₱{products.reduce((total, product) => 
                  total + (product.stock_quantity * (product.cost_price || 0)), 0
                ).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => { fetchInventory(); fetchAdjustments(); }}
        >
          Refresh
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Inventory" />
          <Tab label="Low Stock" />
          <Tab label="Out of Stock" />
          <Tab label="Adjustments" />
        </Tabs>
      </Box>

      {/* Content based on active tab */}
      {activeTab === 0 && (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredProducts}
            columns={inventoryColumns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{ border: 'none' }}
          />
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={lowStockProducts}
            columns={inventoryColumns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{ border: 'none' }}
          />
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={outOfStockProducts}
            columns={inventoryColumns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{ border: 'none' }}
          />
        </Paper>
      )}

      {activeTab === 3 && (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={adjustments}
            columns={adjustmentColumns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{ border: 'none' }}
          />
        </Paper>
      )}

      {/* Inventory Adjustment Dialog */}
      <Dialog open={openAdjustmentDialog} onClose={() => setOpenAdjustmentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Adjust Inventory - {selectedProduct?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Current Stock: {selectedProduct?.stock_quantity} units
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Adjustment Type</InputLabel>
                <Select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value })}
                  label="Adjustment Type"
                >
                  <MenuItem value="add">Add Stock</MenuItem>
                  <MenuItem value="remove">Remove Stock</MenuItem>
                  <MenuItem value="adjust">Set Stock Level</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                required
                placeholder="e.g., Stock count, Damaged items, Returned goods"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                value={adjustmentData.notes}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                multiline
                rows={3}
                placeholder="Additional notes about this adjustment"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdjustmentDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAdjustment}
            variant="contained"
            disabled={loading || !adjustmentData.quantity || !adjustmentData.reason}
          >
            {loading ? 'Processing...' : 'Process Adjustment'}
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

export default Inventory;
