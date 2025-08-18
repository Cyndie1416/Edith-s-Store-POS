import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge,
  Chip,
  Popover,
  ListItemAvatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider as MuiDivider,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  PointOfSale as POSIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  ShoppingCart as SalesIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Notifications,
  Logout,
  Brightness4,
  Brightness7,
  NotificationsActive,
  NotificationsOff,
  Clear,
  MoreVert,
  Circle
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationContext';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const { t } = useLanguage();
  const { 
    notifications, 
    unreadCount, 
    settings, 
    markAsRead, 
    clearNotifications, 
    updateSettings 
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: t('dashboard'), icon: <DashboardIcon />, path: '/dashboard' },
    { text: t('posSales'), icon: <POSIcon />, path: '/pos' },
    { text: 'Products & Inventory', icon: <InventoryIcon />, path: '/products' },
    { text: t('customers'), icon: <PeopleIcon />, path: '/customers' },
    { text: t('salesHistory'), icon: <SalesIcon />, path: '/sales' },
    { text: t('reports'), icon: <ReportsIcon />, path: '/reports' },
    { text: t('settings'), icon: <SettingsIcon />, path: '/settings' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };



  const handleNotificationOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'lowStock': return <InventoryIcon fontSize="small" />;
      case 'sales': return <SalesIcon fontSize="small" />;
      case 'system': return <SettingsIcon fontSize="small" />;
      default: return <Notifications fontSize="small" />;
    }
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          Edith's Store POS
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || t('dashboard')}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Theme Toggle */}
            <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton color="inherit" onClick={toggleMode}>
                {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit" 
                onClick={handleNotificationOpen}
                sx={{ position: 'relative' }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Logout Button */}
            <Tooltip title="Logout">
              <IconButton
                onClick={handleLogout}
                color="inherit"
                sx={{ ml: 1 }}
              >
                <Logout />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8
        }}
      >
        <Outlet />
      </Box>

      

      {/* Notifications Popover */}
      <Popover
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
      >
        <Card>
          <CardHeader
            title="Notifications"
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton size="small" onClick={clearNotifications}>
                  <Clear />
                </IconButton>
                <IconButton size="small" onClick={handleNotificationClose}>
                  <MoreVert />
                </IconButton>
              </Box>
            }
          />
          <MuiDivider />
          <CardContent sx={{ p: 0 }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <NotificationsOff sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No notifications
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((notification) => (
                  <ListItem
                    key={notification.id}
                    sx={{
                      backgroundColor: notification.read ? 'transparent' : 'action.hover',
                      borderLeft: `3px solid`,
                      borderColor: `${getPriorityColor(notification.priority)}.main`,
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: `${getPriorityColor(notification.priority)}.light` }}>
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                            {notification.title}
                          </Typography>
                          {!notification.read && (
                            <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(notification.timestamp)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
          {notifications.length > 0 && (
            <>
              <MuiDivider />
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Notification Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.lowStock}
                      onChange={(e) => updateSettings({ lowStock: e.target.checked })}
                      size="small"
                    />
                  }
                  label="Low Stock Alerts"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sales}
                      onChange={(e) => updateSettings({ sales: e.target.checked })}
                      size="small"
                    />
                  }
                  label="Sales Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system}
                      onChange={(e) => updateSettings({ system: e.target.checked })}
                      size="small"
                    />
                  }
                  label="System Updates"
                />
              </Box>
            </>
          )}
        </Card>
      </Popover>
    </Box>
  );
};

export default Layout;
