import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  ShoppingCart,
  Inventory,
  People,
  Warning,
  AttachMoney,
  Assessment
} from '@mui/icons-material';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';

const Dashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockCount: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize with default values
      let salesData = { total_sales: 0, total_revenue: 0, total_cost: 0 };
      let todayProductsSold = 0;
      let recentSalesData = { sales: [] };
      let lowStockData = [];
      
      try {
        // Fetch sales summary for today
        const today = new Date().toISOString().split('T')[0];
        const salesResponse = await axios.get(`/api/sales/summary/daily?date=${today}`);
        salesData = salesResponse.data || salesData;
        
        // Fetch today's total products sold
        const productsSoldResponse = await axios.get(`/api/sales/products-sold?date=${today}`);
        todayProductsSold = productsSoldResponse.data?.total_products_sold || 0;
      } catch (error) {
        console.warn('Failed to fetch sales data:', error);
      }
      
      try {
        // Fetch recent sales
        const recentSalesResponse = await axios.get('/api/sales?limit=5');
        recentSalesData = recentSalesResponse.data || recentSalesData;
      } catch (error) {
        console.warn('Failed to fetch recent sales:', error);
      }
      
      try {
        // Fetch low stock alerts
        const lowStockResponse = await axios.get('/api/products/alerts/low-stock');
        lowStockData = Array.isArray(lowStockResponse.data) ? lowStockResponse.data : [];
      } catch (error) {
        console.warn('Failed to fetch low stock data:', error);
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
        lowStockCount: lowStockData.length || 0
      });

      setRecentSales(recentSalesData.sales || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

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
        {t('dashboard')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Stats Cards - First Row */}
        <Grid item xs={12} sm={6} md={6} lg={6}>
          <StatCard
            title={t('todaysProfit')}
            value={stats.totalProfit}
            icon={<TrendingUp />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6} lg={6}>
          <StatCard
            title={t('todaysRevenue')}
            value={stats.totalRevenue}
            icon={<AttachMoney />}
            color="primary"
          />
        </Grid>
        
        {/* Stats Cards - Second Row */}
        <Grid item xs={12} sm={6} md={6} lg={6}>
          <StatCard
            title={t('todaysProductsSold')}
            value={stats.totalProducts}
            icon={<Inventory />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6} lg={6}>
          <StatCard
            title={t('lowStockItems')}
            value={stats.lowStockCount}
            icon={<Warning />}
            color="warning"
          />
        </Grid>

        {/* Quick Actions - Full Width */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, backgroundColor: '#e3f2fd', mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              {t('quickActions')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <ListItem 
                  button 
                  onClick={() => navigate('/pos')}
                  sx={{ 
                    cursor: 'pointer', 
                    py: 3,
                    borderRadius: 2,
                    backgroundColor: '#ffffff',
                    border: '2px solid #2196f3',
                    '&:hover': { backgroundColor: '#bbdefb' } 
                  }}
                >
                  <ListItemIcon>
                    <ShoppingCart color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={t('newSale')} />
                </ListItem>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <ListItem 
                  button 
                  onClick={() => navigate('/products')}
                  sx={{ 
                    cursor: 'pointer', 
                    py: 3,
                    borderRadius: 2,
                    backgroundColor: '#ffffff',
                    border: '2px solid #4caf50',
                    '&:hover': { backgroundColor: '#c8e6c9' } 
                  }}
                >
                  <ListItemIcon>
                    <Inventory color="success" />
                  </ListItemIcon>
                  <ListItemText primary={t('addProduct')} />
                </ListItem>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <ListItem 
                  button 
                  onClick={() => navigate('/customers')}
                  sx={{ 
                    cursor: 'pointer', 
                    py: 3,
                    borderRadius: 2,
                    backgroundColor: '#ffffff',
                    border: '2px solid #ff9800',
                    '&:hover': { backgroundColor: '#ffcc80' } 
                  }}
                >
                  <ListItemIcon>
                    <People color="warning" />
                  </ListItemIcon>
                  <ListItemText primary={t('addCustomer')} />
                </ListItem>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <ListItem 
                  button 
                  onClick={() => navigate('/reports')}
                  sx={{ 
                    cursor: 'pointer', 
                    py: 3,
                    borderRadius: 2,
                    backgroundColor: '#ffffff',
                    border: '2px solid #9c27b0',
                    '&:hover': { backgroundColor: '#ce93d8' } 
                  }}
                >
                  <ListItemIcon>
                    <Assessment color="secondary" />
                  </ListItemIcon>
                  <ListItemText primary={t('viewReports')} />
                </ListItem>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Recent Sales - Smaller Section */}
        <Grid item xs={12} sm={12} md={8} lg={8}>
          <Paper sx={{ p: 3, height: '400px', overflow: 'auto', backgroundColor: '#fafafa' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              {t('recentSales')}
            </Typography>
            <List>
              {recentSales.length > 0 ? (
                recentSales.map((sale, index) => (
                  <React.Fragment key={sale.id}>
                    <ListItem sx={{ py: 1.5 }}>
                      <ListItemIcon>
                        <ShoppingCart color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Sale #${sale.sale_number}`}
                        secondary={`${sale.customer_name || 'Walk-in Customer'} • ${sale.created_at ? new Date(sale.created_at).toLocaleString() : 'N/A'}`}
                      />
                      <Chip 
                        label={`₱${(parseFloat(sale.final_amount) || 0).toFixed(2)}`}
                        color="primary"
                        variant="outlined"
                      />
                    </ListItem>
                    {index < recentSales.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary={t('noRecentSales')}
                    secondary={t('salesWillAppearHere')}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
