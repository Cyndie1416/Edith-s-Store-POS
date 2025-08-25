import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  Alert,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
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
  TableRow
} from '@mui/material';
import {
  Search,
  Receipt,
  Visibility,
  Download,
  Refresh,
  TrendingUp,
  AttachMoney,
  Inventory
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // Dashboard overview stats
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalProfit: 0,
    totalCredit: 0
  });
  
  const [allSales, setAllSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetailsDialog, setSaleDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [dateRange, setDateRange] = useState({
    start: dayjs('2025-08-01'),
    end: dayjs()
  });
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
    fetchAllSales();
  }, [paymentFilter, dateRange.start, dateRange.end]);



  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize with default values
      let salesData = { total_sales: 0, total_revenue: 0, total_cost: 0 };
      let todayProductsSold = 0;
      let todayCreditData = { total_credit_amount: 0 };
      
      try {
        // Fetch sales summary for today
        const today = new Date().toISOString().split('T')[0];
        const salesResponse = await axios.get(`/api/sales/summary/daily?date=${today}`);
        salesData = salesResponse.data || salesData;
        
        // Fetch today's total products sold
        const productsSoldResponse = await axios.get(`/api/sales/products-sold?date=${today}`);
        todayProductsSold = productsSoldResponse.data?.total_products_sold || 0;
        
        // Fetch today's credit sales total
        try {
          const creditResponse = await axios.get('/api/sales/today/credit');
          todayCreditData = creditResponse.data || todayCreditData;
          console.log('Credit API response:', creditResponse.data);
          console.log('Credit amount:', creditResponse.data.total_credit_amount);
          console.log('Credit transactions:', creditResponse.data.credit_transactions);
        } catch (creditError) {
          console.error('Error fetching credit data:', creditError);
          todayCreditData = { total_credit_amount: 0 };
        }
      } catch (error) {
        console.warn('Failed to fetch sales data:', error);
      }
      


      // Calculate profit: revenue - cost
      const totalRevenue = parseFloat(salesData.total_revenue) || 0;
      const totalCost = parseFloat(salesData.total_cost) || 0;
      const totalProfit = totalRevenue - totalCost;

      setStats({
        totalSales: parseInt(salesData.total_sales) || 0,
        totalRevenue: totalRevenue,
        totalProducts: parseInt(todayProductsSold) || 0,
        totalProfit: totalProfit,
        totalCredit: parseFloat(todayCreditData.total_credit_amount) || 0
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSales = async () => {
    try {
      const response = await axios.get(`/api/sales?startDate=${dateRange.start.format('YYYY-MM-DD')}&endDate=${dateRange.end.format('YYYY-MM-DD')}&paymentMethod=${paymentFilter}`);
      const salesData = response.data.sales || [];
      setAllSales(salesData);
      
      console.log('Fetched sales data:', salesData.length, 'sales');
      console.log('Sample sale:', salesData[0]);
      
    } catch (error) {
      console.error('Failed to load sales:', error);
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
        fetchAllSales();
        fetchDashboardData();
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
            <h3>Total: ₱${sale.final_amount.toFixed(2)}</h3>
            <p>Payment Method: ${sale.payment_method}</p>
            <p>Amount Received: ₱${sale.amount_received.toFixed(2)}</p>
            <p>Change: ₱${(sale.amount_received - sale.final_amount).toFixed(2)}</p>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const filteredSales = allSales.filter(sale =>
    sale.id.toString().includes(searchTerm) ||
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSalesAmount = allSales.reduce((sum, sale) => sum + (sale.final_amount || 0), 0);
  const totalTransactions = allSales.length;
  const averageSale = totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

  const salesColumns = [
    { field: 'id', headerName: 'Sale ID', width: 100 },
    { 
      field: 'created_at', 
      headerName: 'Date & Time', 
      width: 180,
      valueFormatter: (value) => {
        if (!value) return 'N/A';
        return new Date(value).toLocaleString();
      }
    },
    { field: 'customer_name', headerName: 'Customer', width: 150 },
    { 
      field: 'final_amount', 
      headerName: 'Total Amount', 
      width: 130,
      valueFormatter: (value) => {
        if (!value) return '₱0.00';
        return `₱${parseFloat(value).toFixed(2)}`;
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
      field: 'payment_status', 
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

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%', minHeight: 120 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ height: '100%' }}>
          <Box sx={{ flex: 1 }}>
            <Typography color="textSecondary" gutterBottom variant="h6" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
            }}>
              {value !== undefined && value !== null
                ? (typeof value === 'number' && (title.includes('Revenue') || title.includes('Profit'))
                    ? `₱${value.toLocaleString()}`
                    : value.toLocaleString())
                : '0'
              }
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: '50%',
              p: { xs: 0.5, sm: 1 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ml: 1
            }}
          >
            {React.cloneElement(icon, { 
              sx: { 
                fontSize: { xs: 30, sm: 35, md: 40 }, 
                color: `${color}.main` 
              } 
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>{t('loading')}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Dashboard Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Daily Revenue"
            value={stats.totalRevenue}
            icon={<AttachMoney />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Daily Profit"
            value={stats.totalProfit}
            icon={<TrendingUp />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Total Items Sold"
            value={stats.totalProducts}
            icon={<Inventory />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Total Credit"
            value={stats.totalCredit}
            icon={<AttachMoney />}
            color="secondary"
          />
        </Grid>
      </Grid>



      {/* Sales History Section */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Sales History
      </Typography>

      {/* Sales Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4" component="div">
                ₱{(totalSalesAmount || 0).toFixed(2)}
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
                ₱{allSales.filter(sale => 
                  dayjs(sale.created_at).isSame(dayjs(), 'day')
                ).reduce((sum, sale) => sum + sale.final_amount, 0).toFixed(2)}
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
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(newValue) => setDateRange({ ...dateRange, end: newValue })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
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
              onClick={() => {
                setLoading(true);
                fetchDashboardData().then(() => {
                  fetchAllSales();
                }).finally(() => {
                  setLoading(false);
                });
              }}
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
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
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

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="h6">Total Amount: ₱{selectedSale.final_amount.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6">Amount Received: ₱{selectedSale.amount_received.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6">Change: ₱{(selectedSale.amount_received - selectedSale.final_amount).toFixed(2)}</Typography>
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

export default Dashboard;
