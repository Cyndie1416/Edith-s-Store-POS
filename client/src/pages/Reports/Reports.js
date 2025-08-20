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
  Alert,
  CircularProgress,
  Chip,
  Divider,
  TextField
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  ShoppingCart,
  Inventory,
  People,
  AttachMoney,
  Assessment,
  FileDownload,
  CalendarToday
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  exportSalesToExcel, 
  exportInventoryToExcel, 
  exportCustomersToExcel,
  exportComprehensiveReport 
} from '../../utils/excelExport';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Reports = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('week');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchReportData();
  }, [reportType, dateRange, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      switch (reportType) {
        case 'sales':
          const salesResponse = await axios.get(`/api/reports/sales?startDate=${startDateStr}&endDate=${endDateStr}`);
          setSalesData(salesResponse.data.sales || []);
          setChartData(processSalesData(salesResponse.data.sales || []));
          break;
        
        case 'inventory':
          const inventoryResponse = await axios.get('/api/reports/inventory');
          setInventoryData(inventoryResponse.data.inventory || []);
          setChartData(processInventoryData(inventoryResponse.data.inventory || []));
          break;
        
        case 'customers':
          const customersResponse = await axios.get('/api/reports/customers');
          setCustomerData(customersResponse.data.customers || []);
          setChartData(processCustomerData(customersResponse.data.customers || []));
          break;
        
        case 'comprehensive':
          const [sales, inventory, customers] = await Promise.all([
            axios.get(`/api/reports/sales?startDate=${startDateStr}&endDate=${endDateStr}`),
            axios.get('/api/reports/inventory'),
            axios.get('/api/reports/customers')
          ]);
          setSalesData(sales.data.sales || []);
          setInventoryData(inventory.data.inventory || []);
          setCustomerData(customers.data.customers || []);
          setChartData(processComprehensiveData(sales.data.sales || [], inventory.data.inventory || [], customers.data.customers || []));
          break;
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (sales) => {
    const dailySales = {};
    sales.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleDateString();
      if (!dailySales[date]) {
        dailySales[date] = { date, sales: 0, revenue: 0 };
      }
      dailySales[date].sales += 1;
      dailySales[date].revenue += parseFloat(sale.final_amount);
    });
    return Object.values(dailySales);
  };

  const processInventoryData = (inventory) => {
    const categoryData = {};
    inventory.forEach(item => {
      const category = item.category_name || 'Uncategorized';
      if (!categoryData[category]) {
        categoryData[category] = { name: category, stock: 0, value: 0 };
      }
      categoryData[category].stock += item.stock_quantity;
      categoryData[category].value += item.stock_quantity * item.price;
    });
    return Object.values(categoryData);
  };

  const processCustomerData = (customers) => {
    return customers.map(customer => ({
      name: customer.name,
      balance: parseFloat(customer.current_balance)
    }));
  };

  const processComprehensiveData = (sales, inventory, customers) => {
    return {
      sales: processSalesData(sales),
      inventory: processInventoryData(inventory),
      customers: processCustomerData(customers)
    };
  };

  const handleExport = () => {
    switch (reportType) {
      case 'sales':
        exportSalesToExcel(salesData, 'sales_report');
        break;
      case 'inventory':
        exportInventoryToExcel(inventoryData, 'inventory_report');
        break;
      case 'customers':
        exportCustomersToExcel(customerData, 'customers_report');
        break;
      case 'comprehensive':
        exportComprehensiveReport({
          sales: salesData,
          inventory: inventoryData,
          customers: customerData
        }, 'comprehensive_report');
        break;
    }
  };

  const getTotalRevenue = () => {
    const total = salesData.reduce((total, sale) => {
      const amount = parseFloat(sale?.final_amount) || 0;
      return total + amount;
    }, 0);
    return isNaN(total) ? 0 : total;
  };

  const getTotalSales = () => {
    return salesData.length;
  };

  const getLowStockItems = () => {
    return inventoryData.filter(item => item.stock_quantity <= item.min_stock_level).length;
  };

  const getTotalCustomers = () => {
    return customerData.length;
  };

  const renderSalesChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="sales" fill="#8884d8" name="Number of Sales" />
        <Bar dataKey="revenue" fill="#82ca9d" name="Revenue (₱)" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderInventoryChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, stock }) => `${name}: ${stock}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="stock"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderCustomerChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="balance" fill="#ff7300" name="Current Balance" />
        <Bar dataKey="available" fill="#00C49F" name="Available Credit" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderComprehensiveCharts = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>{t('dailySales')}</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData.sales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>{t('inventoryReport')}</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData.inventory}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="stock"
                >
                  {chartData.inventory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        {t('reports')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Report Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('reports')}</InputLabel>
              <Select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                label={t('reports')}
              >
                <MenuItem value="sales">{t('dailySales')}</MenuItem>
                <MenuItem value="inventory">{t('inventoryReport')}</MenuItem>
                <MenuItem value="customers">{t('creditReport')}</MenuItem>
                <MenuItem value="comprehensive">Comprehensive Report</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                label="Date Range"
              >
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="quarter">Last Quarter</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {dateRange === 'custom' && (
            <>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
            </>
          )}
          
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleExport}
              fullWidth
            >
              {t('exportToExcel')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    {t('todaysSales')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {getTotalSales()}
                  </Typography>
                </Box>
                <ShoppingCart sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    {t('todaysRevenue')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    ₱{(getTotalRevenue() || 0).toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    {t('lowStockItems')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {getLowStockItems()}
                  </Typography>
                </Box>
                <Inventory sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    {t('totalProducts')}
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {getTotalCustomers()}
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          {reportType === 'sales' && t('dailySales')}
          {reportType === 'inventory' && t('inventoryReport')}
          {reportType === 'customers' && t('creditReport')}
          {reportType === 'comprehensive' && 'Comprehensive Analysis'}
        </Typography>
        
        {reportType === 'sales' && renderSalesChart()}
        {reportType === 'inventory' && renderInventoryChart()}
        {reportType === 'customers' && renderCustomerChart()}
        {reportType === 'comprehensive' && renderComprehensiveCharts()}
      </Paper>
    </Box>
  );
};

export default Reports;
