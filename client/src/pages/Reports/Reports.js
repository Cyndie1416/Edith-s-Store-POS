import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Snackbar,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const Reports = () => {
  const [reports, setReports] = useState({
    businessSummary: {},
    salesData: [],
    topProducts: [],
    topCustomers: [],
    inventorySummary: {},
    creditSummary: {}
  });
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(30, 'day'),
    end: dayjs()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const startDate = dateRange.start.format('YYYY-MM-DD');
      const endDate = dateRange.end.format('YYYY-MM-DD');

      const [businessSummary, salesData, topProducts, topCustomers, inventorySummary, creditSummary] = await Promise.all([
        axios.get(`/api/reports/business-summary?start_date=${startDate}&end_date=${endDate}`),
        axios.get(`/api/reports/sales-data?start_date=${startDate}&end_date=${endDate}`),
        axios.get('/api/reports/top-products'),
        axios.get('/api/reports/top-customers'),
        axios.get('/api/inventory/summary'),
        axios.get('/api/customers/credit-summary')
      ]);

      setReports({
        businessSummary: businessSummary.data,
        salesData: salesData.data.sales || [],
        topProducts: topProducts.data.products || [],
        topCustomers: topCustomers.data.customers || [],
        inventorySummary: inventorySummary.data,
        creditSummary: creditSummary.data
      });
    } catch (error) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async (reportType) => {
    try {
      const startDate = dateRange.start.format('YYYY-MM-DD');
      const endDate = dateRange.end.format('YYYY-MM-DD');
      
      const response = await axios.get(`/api/reports/export/${reportType}?start_date=${startDate}&end_date=${endDate}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${startDate}_${endDate}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess(`${reportType} report exported successfully!`);
    } catch (error) {
      setError('Failed to export report');
    }
  };

  // Chart data
  const salesChartData = {
    labels: reports.salesData.map(item => dayjs(item.date).format('MMM DD')),
    datasets: [
      {
        label: 'Daily Sales',
        data: reports.salesData.map(item => item.total_sales),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1
      }
    ]
  };

  const topProductsChartData = {
    labels: reports.topProducts.slice(0, 10).map(product => product.name),
    datasets: [
      {
        label: 'Units Sold',
        data: reports.topProducts.slice(0, 10).map(product => product.total_sold),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0'
        ]
      }
    ]
  };

  const inventoryChartData = {
    labels: ['In Stock', 'Low Stock', 'Out of Stock'],
    datasets: [
      {
        data: [
          reports.inventorySummary.in_stock || 0,
          reports.inventorySummary.low_stock || 0,
          reports.inventorySummary.out_of_stock || 0
        ],
        backgroundColor: [
          '#4BC0C0',
          '#FFCE56',
          '#FF6384'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sales Trend'
      }
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Reports & Analytics
      </Typography>

      {/* Date Range Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography variant="subtitle1">Date Range:</Typography>
          </Grid>
          <Grid item>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={dateRange.start}
                onChange={(newValue) => setDateRange({ ...dateRange, start: newValue })}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item>
            <Typography>to</Typography>
          </Grid>
          <Grid item>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="End Date"
                value={dateRange.end}
                onChange={(newValue) => setDateRange({ ...dateRange, end: newValue })}
                renderInput={(params) => <TextField {...params} size="small" />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={fetchReports}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Business Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Sales
              </Typography>
              <Typography variant="h4" component="div">
                ₱{reports.businessSummary.total_sales?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {reports.businessSummary.total_transactions || 0} transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Gross Profit
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                ₱{reports.businessSummary.gross_profit?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {reports.businessSummary.profit_margin?.toFixed(1) || 0}% margin
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Outstanding Credit
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                ₱{reports.creditSummary.total_outstanding?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {reports.creditSummary.customers_with_credit || 0} customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Inventory Value
              </Typography>
              <Typography variant="h4" component="div">
                ₱{reports.inventorySummary.total_value?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {reports.inventorySummary.total_items || 0} items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Sales Trend
            </Typography>
            <Line data={salesChartData} options={chartOptions} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Inventory Status
            </Typography>
            <Pie data={inventoryChartData} options={{ responsive: true }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Top Products and Customers */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Top Products
              </Typography>
              <Tooltip title="Export to Excel">
                <IconButton onClick={() => exportToExcel('products')} color="primary">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Units Sold</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.topProducts.slice(0, 10).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell align="right">{product.total_sold}</TableCell>
                      <TableCell align="right">₱{product.total_revenue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Top Customers
              </Typography>
              <Tooltip title="Export to Excel">
                <IconButton onClick={() => exportToExcel('customers')} color="primary">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Total Spent</TableCell>
                    <TableCell align="right">Credit Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.topCustomers.slice(0, 10).map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell align="right">₱{customer.total_spent.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`₱${customer.credit_balance.toFixed(2)}`}
                          color={customer.credit_balance > 0 ? 'error' : 'success'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Export Buttons */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Export Reports
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => exportToExcel('sales')}
            >
              Sales Report
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => exportToExcel('inventory')}
            >
              Inventory Report
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => exportToExcel('credit')}
            >
              Credit Report
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => exportToExcel('profit-loss')}
            >
              Profit & Loss
            </Button>
          </Grid>
        </Grid>
      </Paper>

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

export default Reports;
