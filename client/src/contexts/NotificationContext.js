import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({
    lowStock: true,
    sales: true,
    system: true,
    sound: true,
    desktop: false
  });

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    const savedSettings = localStorage.getItem('notificationSettings');
    
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
    
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }, [settings]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show desktop notification if enabled
    if (settings.desktop && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
    
    // Play sound if enabled
    if (settings.sound) {
      // You can add sound notification here
      console.log('Notification sound would play here');
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const requestDesktopPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ desktop: true });
        return true;
      }
    }
    return false;
  };

  // Auto-generate notifications for demo purposes
  useEffect(() => {
    const generateDemoNotifications = () => {
      const demoNotifications = [
        {
          type: 'lowStock',
          title: 'Low Stock Alert',
          message: 'Magic Sarap 8g is running low on stock (5 remaining)',
          priority: 'high'
        },
        {
          type: 'sales',
          title: 'New Sale Completed',
          message: 'Sale #1234 completed for ₱1,250.00',
          priority: 'medium'
        },
        {
          type: 'system',
          title: 'System Update',
          message: 'Database backup completed successfully',
          priority: 'low'
        }
      ];

      // Add a random notification every 30 seconds for demo
      const interval = setInterval(() => {
        const randomNotification = demoNotifications[Math.floor(Math.random() * demoNotifications.length)];
        addNotification(randomNotification);
      }, 30000);

      return () => clearInterval(interval);
    };

    // Only generate demo notifications if there are no existing ones
    if (notifications.length === 0) {
      generateDemoNotifications();
    }
  }, [notifications.length]);

  const value = {
    notifications,
    unreadCount,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    deleteNotification,
    updateSettings,
    requestDesktopPermission
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
