import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translation dictionary
const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    posSales: 'POS Sales',
    products: 'Products',
    customers: 'Customers',
    salesHistory: 'Sales History',
    inventory: 'Inventory',
    reports: 'Reports',
    settings: 'Settings',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    close: 'Close',
    
    // Dashboard
    todaysProfit: "Today's Profit",
    todaysRevenue: "Today's Revenue",
    todaysProductsSold: "Today's Total Products Sold",
    lowStockItems: 'Low Stock Items',
    recentSales: 'Recent Sales',
    quickActions: 'Quick Actions',
    newSale: 'New Sale',
    addProduct: 'Add Product',
    addCustomer: 'Add Customer',
    viewReports: 'View Reports',
    noRecentSales: 'No recent sales',
    salesWillAppearHere: 'Sales will appear here once transactions are made',
    
    // POS
    pointOfSale: 'Point of Sale',
    shoppingCart: 'Shopping Cart',
    searchProducts: 'Search products by name or barcode...',
    scanBarcode: 'Scan Barcode',
    noItemsInCart: 'No items in cart',
    clearCart: 'Clear Cart',
    processPayment: 'Process Payment',
    paymentDetails: 'Payment Details',
    totalAmount: 'Total Amount',
    paymentMethod: 'Payment Method',
    amountReceived: 'Amount Received',
    change: 'Change',
    completeSale: 'Complete Sale',
    processing: 'Processing...',
    cartIsEmpty: 'Cart is empty',
    saleCompleted: 'Sale completed successfully!',
    receipt: 'Receipt',
    printReceipt: 'Print Receipt',
    barcodeScanner: 'Barcode Scanner',
    failedToAccessCamera: 'Failed to access camera',
    
    // Products
    productName: 'Product Name',
    description: 'Description',
    price: 'Price',
    costPrice: 'Cost Price',
    stockQuantity: 'Stock Quantity',
    minStockLevel: 'Min Stock Level',
    category: 'Category',
    barcode: 'Barcode',
    unit: 'Unit',
    image: 'Image',
    active: 'Active',
    
    // Customers
    customerName: 'Customer Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    creditLimit: 'Credit Limit',
    currentBalance: 'Current Balance',
    creditBalance: 'Credit Balance',
    noCustomer: 'No Customer',
    
    // Payment Methods
    cash: 'Cash',
    gcash: 'GCash',
    credit: 'Credit (Utang)',
    
    // Reports
    dailySales: 'Daily Sales',
    monthlySales: 'Monthly Sales',
    inventoryReport: 'Inventory Report',
    creditReport: 'Credit Report',
    profitLoss: 'Profit & Loss',
    exportToExcel: 'Export to Excel',
    
    // Settings
    general: 'General',
    appearance: 'Appearance',
    language: 'Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    backup: 'Backup',
    restore: 'Restore',
    exportData: 'Export Data',
    importData: 'Import Data',
    
    // Notifications
    lowStockAlert: 'Low Stock Alert',
    creditLimitExceeded: 'Credit Limit Exceeded',
    backupCompleted: 'Backup completed successfully',
    restoreCompleted: 'Restore completed successfully',
    
    // Auth
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    loginFailed: 'Login failed',
    invalidCredentials: 'Invalid credentials',
  },
  fil: {
    // Navigation
    dashboard: 'Dashboard',
    posSales: 'POS Sales',
    products: 'Mga Produkto',
    customers: 'Mga Customer',
    salesHistory: 'Kasaysayan ng Benta',
    inventory: 'Inventory',
    reports: 'Mga Report',
    settings: 'Mga Setting',
    
    // Common
    save: 'I-save',
    cancel: 'Kanselahin',
    delete: 'Tanggalin',
    edit: 'I-edit',
    add: 'Magdagdag',
    search: 'Maghanap',
    loading: 'Naglo-load...',
    error: 'Error',
    success: 'Tagumpay',
    confirm: 'Kumpirmahin',
    close: 'Isara',
    
    // Dashboard
    todaysProfit: 'Kita Ngayon',
    todaysRevenue: 'Kita Ngayon',
    todaysProductsSold: 'Kabuuang Produktong Nabenta Ngayon',
    lowStockItems: 'Mababang Stock',
    recentSales: 'Mga Kamakailang Benta',
    quickActions: 'Mabilisang Aksyon',
    newSale: 'Bagong Benta',
    addProduct: 'Magdagdag ng Produkto',
    addCustomer: 'Magdagdag ng Customer',
    viewReports: 'Tingnan ang Mga Report',
    noRecentSales: 'Walang kamakailang benta',
    salesWillAppearHere: 'Lalabas dito ang mga benta kapag may transaksyon na',
    
    // POS
    pointOfSale: 'Point of Sale',
    shoppingCart: 'Shopping Cart',
    searchProducts: 'Maghanap ng produkto sa pangalan o barcode...',
    scanBarcode: 'I-scan ang Barcode',
    noItemsInCart: 'Walang item sa cart',
    clearCart: 'I-clear ang Cart',
    processPayment: 'I-process ang Bayad',
    paymentDetails: 'Mga Detalye ng Bayad',
    totalAmount: 'Kabuuang Halaga',
    paymentMethod: 'Paraan ng Pagbabayad',
    amountReceived: 'Halagang Natanggap',
    change: 'Sukli',
    completeSale: 'Kumpletuhin ang Benta',
    processing: 'Pinoproseso...',
    cartIsEmpty: 'Walang laman ang cart',
    saleCompleted: 'Matagumpay na nakumpleto ang benta!',
    receipt: 'Resibo',
    printReceipt: 'I-print ang Resibo',
    barcodeScanner: 'Barcode Scanner',
    failedToAccessCamera: 'Hindi ma-access ang camera',
    
    // Products
    productName: 'Pangalan ng Produkto',
    description: 'Deskripsyon',
    price: 'Presyo',
    costPrice: 'Presyo ng Gastos',
    stockQuantity: 'Dami ng Stock',
    minStockLevel: 'Minimum na Dami ng Stock',
    category: 'Kategorya',
    barcode: 'Barcode',
    unit: 'Yunit',
    image: 'Larawan',
    active: 'Aktibo',
    
    // Customers
    customerName: 'Pangalan ng Customer',
    phone: 'Telepono',
    email: 'Email',
    address: 'Address',
    creditLimit: 'Limit ng Credit',
    currentBalance: 'Kasalukuyang Balance',
    creditBalance: 'Balance ng Credit',
    noCustomer: 'Walang Customer',
    
    // Payment Methods
    cash: 'Cash',
    gcash: 'GCash',
    credit: 'Credit (Utang)',
    
    // Reports
    dailySales: 'Mga Benta sa Araw',
    monthlySales: 'Mga Benta sa Buwan',
    inventoryReport: 'Report ng Inventory',
    creditReport: 'Report ng Credit',
    profitLoss: 'Kita at Gastos',
    exportToExcel: 'I-export sa Excel',
    
    // Settings
    general: 'Pangkalahatan',
    appearance: 'Itsura',
    language: 'Wika',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    backup: 'Backup',
    restore: 'I-restore',
    exportData: 'I-export ang Data',
    importData: 'I-import ang Data',
    
    // Notifications
    lowStockAlert: 'Alert ng Mababang Stock',
    creditLimitExceeded: 'Na-exceed ang Limit ng Credit',
    backupCompleted: 'Matagumpay na nakumpleto ang backup',
    restoreCompleted: 'Matagumpay na na-restore',
    
    // Auth
    login: 'Mag-login',
    logout: 'Mag-logout',
    username: 'Username',
    password: 'Password',
    loginFailed: 'Nabigo ang pag-login',
    invalidCredentials: 'Hindi wasto ang credentials',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prevLanguage => prevLanguage === 'en' ? 'fil' : 'en');
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
