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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import {
  Search,
  Receipt,
  Visibility,
  Download,
  Refresh
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetailsDialog, setSaleDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(30, 'day'),
    end: dayjs()
  });
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    fetchSales();
  }, [dateRange, paymentFilter]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const startDate = dateRange.start.format('YYYY-MM-DD');
      const endDate = dateRange.end.format('YYYY-MM-DD');
      
      const response = await axios.get(`/api/sales?start_date=${startDate}&end_date=${endDate}&payment_method=${paymentFilter}`);
      setSales(response.data.sales || []);
    } catch (error) {
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchSaleDetails = async (saleId) => {
    try {
      const response = await axios.get(`/api/sales/${saleId}`);
      setSelectedSale(response.data.sale);
      setSaleDetailsDialog(true);
    } catch (error) {
      setError('Failed to load sale details');
    }
  };

  const voidSale = async (saleId) => {
    if (window.confirm('Are you sure you want to void this sale? This action cannot be undone.')) {
      try {
        await axios.put(`/api/sales/${saleId}/void`);
        setSuccess('Sale voided successfully!');
        fetchSales();
      } catch (error) {
        setError('Failed to void sale');
      }
    }
  };

  const printReceipt = (sale) => {
    const receiptWindow = window.open('', '_blank');
    receiptWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Edith's Store</title>
          <style>
            body { font-family: monospace; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { margin: 5px 0; }
            .total { border-top: 1px solid #000; margin-top: 10px; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Edith's Store</h2>
            <p>Receipt #${sale.id}</p>
            <p>${new Date(sale.created_at).toLocaleString()}</p>
          </div>
          ${sale.items.map(item => `
            <div class="item">
              ${item.product_name} x${item.quantity} - ₱${(item.price * item.quantity).toFixed(2)}
            </div>
          `).join('')}
          <div class="total">
            <h3>Total: ₱${sale.total_amount.toFixed(2)}</h3>
            <p>Payment Method: ${sale.payment_method}</p>
            <p>Amount Received: ₱${sale.amount_received.toFixed(2)}</p>
            <p>Change: ₱{(sale.amount_received - sale.total_amount).toFixed(2)}</p>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const filteredSales = sales.filter(sale =>
    sale.id.toString().includes(searchTerm) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSales = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalTransactions = sales.length;
  const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const salesColumns = [
    { field: 'id', headerName: 'Sale ID', width: 100 },
    { 
      field: 'created_at', 
      headerName: 'Date & Time', 
      width: 180,
      valueFormatter: (params) => {
        if (!params || params.value === undefined || params.value === null) return 'N/A';
        return new Date(params.value).toLocaleString();
      }
    },
    { field: 'customer_name', headerName: 'Customer', width: 150 },
    { 
      field: 'total_amount', 
      headerName: 'Total Amount', 
      width: 130,
      valueFormatter: (params) => {
        if (!params || params.value === undefined || params.value === null) return '₱0.00';
        return `₱${parseFloat(params.value).toFixed(2)}`;
      }
    },
    { 
      field: 'payment_method', 
      headerName: 'Payment Method', 
      width: 140,
      renderCell: (params) => (
        <Chip
          label={!params || params.value === undefined || params.value === null ? 'unknown' : params.value}
          color={
            !params || params.value === undefined || params.value === null ? 'warning' :
            params.value === 'cash' ? 'success' :
            params.value === 'gcash' ? 'primary' : 'warning'
          }
          size="small"
        />
      )
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 100,
      renderCell: (params) => (
        <Chip
          label={!params || params.value === undefined || params.value === null ? 'unknown' : params.value}
          color={!params || params.value === undefined || params.value === null ? 'warning' : params.value === 'completed' ? 'success' : 'error'}
          size="small"
        />
      )
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => fetchSaleDetails(params.row.id)}
            color="primary"
            title="View Details"
          >
            <Visibility />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => printReceipt(params.row)}
            color="info"
            title="Print Receipt"
          >
            <Receipt />
          </IconButton>
          {params.row.status === 'completed' && (
            <IconButton
              size="small"
              onClick={() => voidSale(params.row.id)}
              color="error"
              title="Void Sale"
            >
              <Download />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Sales History
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4" component="div">
                ₱{(totalSales || 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Transactions
              </Typography>
              <Typography variant="h4" component="div">
                {totalTransactions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Sale
              </Typography>
              <Typography variant="h4" component="div">
                ₱{averageSale.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Today's Sales
              </Typography>
              <Typography variant="h4" component="div">
                ₱{sales.filter(sale => 
                  dayjs(sale.created_at).isSame(dayjs(), 'day')
                ).reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={dateRange.start}
                onChange={(newValue) => setDateRange({ ...dateRange, start: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(newValue) => setDateRange({ ...dateRange, end: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                label="Payment Method"
              >
                <MenuItem value="all">All Methods</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="gcash">GCash</MenuItem>
                <MenuItem value="credit">Credit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              placeholder="Search sales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchSales}
              disabled={loading}
              fullWidth
            >
              {loading ? '...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Sales Table */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={Array.isArray(filteredSales) ? filteredSales : []}
          columns={salesColumns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      {/* Sale Details Dialog */}
      <Dialog open={saleDetailsDialog} onClose={() => setSaleDetailsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Sale Details - #{selectedSale?.id}
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Date:</Typography>
                  <Typography>{new Date(selectedSale.created_at).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Customer:</Typography>
                  <Typography>{selectedSale.customer_name || 'Walk-in Customer'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Payment Method:</Typography>
                  <Chip
                    label={selectedSale.payment_method}
                    color={
                      selectedSale.payment_method === 'cash' ? 'success' :
                      selectedSale.payment_method === 'gcash' ? 'primary' : 'warning'
                    }
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status:</Typography>
                  <Chip
                    label={selectedSale.status}
                    color={selectedSale.status === 'completed' ? 'success' : 'error'}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Items
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">₱{item.price.toFixed(2)}</TableCell>
                        <TableCell align="right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h6">Total Amount: ₱{selectedSale.total_amount.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6">Amount Received: ₱{selectedSale.amount_received.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6">Change: ₱{(selectedSale.amount_received - selectedSale.total_amount).toFixed(2)}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleDetailsDialog(false)}>Close</Button>
          {selectedSale && (
            <Button
              onClick={() => printReceipt(selectedSale)}
              variant="contained"
              startIcon={<Receipt />}
            >
              Print Receipt
            </Button>
          )}
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

export default Sales;
