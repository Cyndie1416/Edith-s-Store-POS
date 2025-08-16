import React, { useState, useEffect } from 'react';
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

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
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
      
      // Fetch sales summary for today
      const today = new Date().toISOString().split('T')[0];
      const salesResponse = await axios.get(`http://localhost:5000/api/sales/summary/daily?date=${today}`);
      
      // Fetch inventory summary
      const inventoryResponse = await axios.get('http://localhost:5000/api/inventory/summary');
      
      // Fetch recent sales
      const recentSalesResponse = await axios.get('http://localhost:5000/api/sales?limit=5');
      
      // Fetch low stock alerts
      const lowStockResponse = await axios.get('http://localhost:5000/api/products/alerts/low-stock');

      setStats({
        totalSales: salesResponse.data.total_sales || 0,
        totalRevenue: salesResponse.data.total_revenue || 0,
        totalProducts: inventoryResponse.data.total_products || 0,
        lowStockCount: lowStockResponse.data.length || 0
      });

      setRecentSales(recentSalesResponse.data.sales || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
              {typeof value === 'number' && title.includes('Revenue') 
                ? `₱${value.toLocaleString()}`
                : value.toLocaleString()
              }
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: '50%',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {React.cloneElement(icon, { 
              sx: { fontSize: 40, color: `${color}.main` } 
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading dashboard...</Typography>
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

      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Sales"
            value={stats.totalSales}
            icon={<ShoppingCart />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Revenue"
            value={stats.totalRevenue}
            icon={<AttachMoney />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<Inventory />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockCount}
            icon={<Warning />}
            color="warning"
          />
        </Grid>

        {/* Recent Sales */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Recent Sales
            </Typography>
            <List>
              {recentSales.length > 0 ? (
                recentSales.map((sale, index) => (
                  <React.Fragment key={sale.id}>
                    <ListItem>
                      <ListItemIcon>
                        <ShoppingCart color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Sale #${sale.sale_number}`}
                        secondary={`${sale.customer_name || 'Walk-in Customer'} • ${new Date(sale.created_at).toLocaleString()}`}
                      />
                      <Chip 
                        label={`₱${parseFloat(sale.final_amount).toFixed(2)}`}
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
                    primary="No recent sales"
                    secondary="Sales will appear here once transactions are made"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Quick Actions
            </Typography>
            <List>
              <ListItem button>
                <ListItemIcon>
                  <ShoppingCart color="primary" />
                </ListItemIcon>
                <ListItemText primary="New Sale" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <Inventory color="primary" />
                </ListItemIcon>
                <ListItemText primary="Add Product" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <People color="primary" />
                </ListItemIcon>
                <ListItemText primary="Add Customer" />
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <Assessment color="primary" />
                </ListItemIcon>
                <ListItemText primary="View Reports" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
