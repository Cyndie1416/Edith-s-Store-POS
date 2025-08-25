import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Search,
  Receipt,
  Payment,
  Clear,
  AttachMoney,
  AccountBalance
} from '@mui/icons-material';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';

const POS = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);



  useEffect(() => {
    // Only show products when there's a search term
    if (searchTerm.trim()) {
      // Filter products based on stock levels
      const inStockProducts = products.filter(product => 
        product.stock_quantity > 0
      );
      
      // Separate products by stock status
      const normalStockProducts = inStockProducts.filter(product => 
        product.stock_quantity > (product.min_stock_level || 5)
      );
      
      const lowStockProducts = inStockProducts.filter(product => 
        product.stock_quantity <= (product.min_stock_level || 5) && product.stock_quantity > 0
      );
      
      // For POS, we'll show both normal and low stock products, but mark low stock ones
      const availableProducts = [...normalStockProducts, ...lowStockProducts];
      
      // For name searches, use partial matching
      const filtered = availableProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      // Show empty list when no search term
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (error) {
      setError('Failed to load products');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const addToCart = (product) => {
    // Check if product is in stock
    if (product.stock_quantity <= 0) {
      setError(`Cannot add "${product.name}" - out of stock (Stock: ${product.stock_quantity})`);
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setSearchTerm('');
    // Don't reset filtered products here - let the useEffect handle it
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      // Find the product to check available stock
      const product = products.find(p => p.id === productId);
      if (product && newQuantity > product.stock_quantity) {
        setError(`Cannot add ${newQuantity} items. Only ${product.stock_quantity} available in stock.`);
        return;
      }
      
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setAmountReceived('');
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getChange = () => {
    const total = getTotal();
    const received = parseFloat(amountReceived) || 0;
    return received - total;
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    setLoading(true);
    try {
      const totalAmount = getTotal();
      const receivedAmount = parseFloat(amountReceived) || 0;
      const remainingBalance = Math.max(0, totalAmount - receivedAmount);
      
      // Validate credit sale
      if (paymentMethod === 'credit') {
        if (!selectedCustomer) {
          setError('Please select a customer for credit sales');
          return;
        }
        
        // Credit limit validation removed - allow unlimited credit
      }

      // Validate partial payment
      if (paymentMethod === 'partial') {
        if (!selectedCustomer) {
          setError('Please select a customer for partial payments');
          return;
        }
        
        if (receivedAmount >= totalAmount) {
          setError('For partial payments, amount received must be less than total amount');
          return;
        }
        
        // Credit limit validation removed - allow unlimited credit for remaining balance
      }

      const saleData = {
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        final_amount: totalAmount,
        amount_received: receivedAmount,
        remaining_balance: remainingBalance,
        payment_status: (paymentMethod === 'credit' || paymentMethod === 'partial') ? 'pending' : 'completed',
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }))
      };

      const response = await axios.post('/api/sales', saleData);
      
      setCurrentReceipt(response.data);
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      clearCart();
      setSelectedCustomer(null);
      setPaymentMethod('cash');
      setAmountReceived('');
      
      if (paymentMethod === 'credit') {
        setSuccess(`Credit sale completed! ${selectedCustomer.name}'s new balance: ₱${((selectedCustomer.current_balance || 0) + totalAmount).toFixed(2)}`);
      } else if (paymentMethod === 'partial') {
        setSuccess(`Partial payment completed! ${selectedCustomer.name}'s new balance: ₱${((selectedCustomer.current_balance || 0) + remainingBalance).toFixed(2)}`);
      } else {
        setSuccess('Sale completed successfully!');
      }
      
      // Refresh products and customers to update stock and balances
      fetchProducts();
      fetchCustomers();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!currentReceipt) return;
    
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
            .customer-info { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
            .credit-notice { color: #d32f2f; font-weight: bold; }
            .partial-payment { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 5px; border: 1px solid #ffeaa7; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Edith's Store</h2>
            <p>Receipt #${currentReceipt.id}</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
          
          ${currentReceipt.customer_name ? `
            <div class="customer-info">
              <strong>Customer:</strong> ${currentReceipt.customer_name}<br>
              ${currentReceipt.customer_phone ? `<strong>Phone:</strong> ${currentReceipt.customer_phone}<br>` : ''}
              ${currentReceipt.payment_method === 'credit' ? `
                <div class="credit-notice">
                  ⚠️ CREDIT SALE - Balance will be updated
                </div>
              ` : ''}
              ${currentReceipt.payment_method === 'partial' ? `
                <div class="partial-payment">
                  💳 PARTIAL PAYMENT - Remaining balance added to credit
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${currentReceipt.items.map(item => `
            <div class="item">
              ${item.product_name} x${item.quantity} - ₱${item.total_price.toFixed(2)}
            </div>
          `).join('')}
          <div class="total">
            <h3>Total: ₱${currentReceipt.final_amount.toFixed(2)}</h3>
            <p>Payment Method: ${currentReceipt.payment_method}</p>
            ${currentReceipt.payment_method === 'partial' ? `
              <p><strong>Amount Received:</strong> ₱${(currentReceipt.amount_received || 0).toFixed(2)}</p>
              <p><strong>Remaining Balance:</strong> ₱${(currentReceipt.remaining_balance || 0).toFixed(2)} (Added to credit)</p>
            ` : ''}
            ${paymentMethod !== 'credit' && paymentMethod !== 'partial' && amountReceived ? `
              <p>Amount Received: ₱${parseFloat(amountReceived).toFixed(2)}</p>
              <p>Change: ₱${getChange().toFixed(2)}</p>
            ` : ''}
            ${currentReceipt.payment_method === 'credit' ? `
              <p class="credit-notice">This is a credit sale. Please pay your balance.</p>
            ` : ''}
            ${currentReceipt.payment_method === 'partial' ? `
              <p class="credit-notice">Partial payment completed. Remaining balance added to customer credit.</p>
            ` : ''}
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };



  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Full Width Point of Sale Container */}
        <Paper sx={{ 
          flex: 1, 
          m: 2, 
          mt: 0,
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 0,
          boxShadow: 'none',
          border: '1px solid #e0e0e0',
          p: 2
        }}>
            {/* Header with Title and Stock Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {t('pointOfSale')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${products.filter(p => p.stock_quantity > (p.min_stock_level || 5)).length} Normal Stock`}
                  color="success"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${products.filter(p => p.stock_quantity <= (p.min_stock_level || 5) && p.stock_quantity > 0).length} Low Stock`}
                  color="warning"
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${products.filter(p => p.stock_quantity <= 0).length} Out of Stock`}
                  color="error"
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>

            {/* Customer Selection */}
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => 
                  typeof option === 'string' ? option : `${option.name} - Balance: ₱${option.current_balance?.toFixed(2) || '0.00'}`
                }
                value={selectedCustomer}
                onChange={(event, newValue) => {
                  setSelectedCustomer(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                  label="Customer (Optional)"
                    size="small"
                    placeholder="Type to search customers..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Balance: ₱{option.current_balance?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </Box>
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                clearOnBlur={false}
                clearOnEscape
                freeSolo={false}
              />
              {selectedCustomer && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Current Balance: ₱{selectedCustomer.current_balance?.toFixed(2) || '0.00'}
                </Typography>
              )}
            </Box>

            {/* Search Bar */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  placeholder={t('searchProducts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      // For name searches, look for products by name
                      const filtered = products.filter(p => 
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) && p.stock_quantity > 0
                      );
                      if (filtered.length > 0) {
                        addToCart(filtered[0]);
                        setSearchTerm('');
                        setSuccess(`Product added: ${filtered[0].name}`);
                      } else {
                        setError(`No products found matching "${searchTerm}"`);
                      }
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                💡 Tip: Type product name, then press Enter to add to cart.
              </Typography>
            </Box>

            {/* Main Content Area - Products and Cart */}
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Products List */}
              {filteredProducts.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    📦 Available Products ({filteredProducts.length})
                  </Typography>
                  <Box sx={{ 
                    maxHeight: '200px', 
                    overflow: 'auto', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1, 
                    p: 1,
                    backgroundColor: '#f8f9fa'
                  }}>
                    <List dense>
                      {filteredProducts.map((product) => {
                        const isLowStock = product.stock_quantity <= (product.min_stock_level || 5) && product.stock_quantity > 0;
                        
                        return (
                          <ListItem 
                            key={product.id} 
                            sx={{ 
                              border: '1px solid #e0e0e0', 
                              mb: 1, 
                              borderRadius: 1,
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: '#f0f8ff',
                                borderColor: '#1976d2'
                              },
                              ...(isLowStock && {
                                borderColor: '#ff9800',
                                backgroundColor: '#fff3e0'
                              })
                            }}
                            onClick={() => addToCart(product)}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                    {product.name}
                                  </Typography>
                                  {isLowStock && (
                                    <Chip
                                      label="LOW STOCK"
                                      size="small"
                                      color="warning"
                                      sx={{ fontSize: '0.7rem', height: '20px' }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                    ₱{product.price.toFixed(2)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Stock: {product.stock_quantity} | Barcode: {product.barcode || 'N/A'}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                color="primary"
                              >
                                <Add />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                </Box>
              )}

              {/* Shopping Cart */}
              <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  🛒 {t('shoppingCart')}
                </Typography>
                
                {/* Cart Items */}
                <Box sx={{ flex: 1, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1, mb: 2 }}>
                  {cart.length === 0 ? (
                    <List>
                      {cart.map((item) => {
                        // Find the current product to check stock status
                        const currentProduct = products.find(p => p.id === item.id);
                        const isLowStock = currentProduct && currentProduct.stock_quantity <= (currentProduct.min_stock_level || 5) && currentProduct.stock_quantity > 0;
                        
                        return (
                          <ListItem 
                            key={item.id} 
                            sx={{ 
                              border: '1px solid #e0e0e0', 
                              mb: 1, 
                              borderRadius: 1,
                              ...(isLowStock && {
                                borderColor: '#ff9800',
                                backgroundColor: '#fff3e0'
                              })
                            }}
                          >
                          <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1">
                                    {item.name}
                      </Typography>
                                  {isLowStock && (
                                    <Chip
                                      label="LOW STOCK"
                                      size="small"
                                      color="warning"
                                      sx={{ fontSize: '0.7rem', height: '20px' }}
                                    />
                                  )}
                      </Box>
                              }
                              secondary={`₱${item.price.toFixed(2)} x ${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)} | Available: ${currentProduct?.stock_quantity || 0}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Remove />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Add />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => removeFromCart(item.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        );
                      })}
                    </List>
                  ) : (
                    <List>
                      {cart.map((item) => {
                        // Find the current product to check stock status
                        const currentProduct = products.find(p => p.id === item.id);
                        const isLowStock = currentProduct && currentProduct.stock_quantity <= (currentProduct.min_stock_level || 5) && currentProduct.stock_quantity > 0;
                        
                        return (
                          <ListItem 
                            key={item.id} 
                            sx={{ 
                              border: '1px solid #e0e0e0', 
                              mb: 1, 
                              borderRadius: 1,
                              ...(isLowStock && {
                                borderColor: '#ff9800',
                                backgroundColor: '#fff3e0'
                              })
                            }}
                          >
                          <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body1">
                                    {item.name}
                                  </Typography>
                                  {isLowStock && (
                                    <Chip
                                      label="LOW STOCK"
                                      size="small"
                                      color="warning"
                                      sx={{ fontSize: '0.7rem', height: '20px' }}
                                    />
                                  )}
                                </Box>
                              }
                              secondary={`₱${item.price.toFixed(2)} x ${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)} | Available: ${currentProduct?.stock_quantity || 0}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Remove />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Add />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => removeFromCart(item.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Box>

                {/* Total and Actions */}
                <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, backgroundColor: '#f8f9fa' }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#2e7d32', textAlign: 'center', mb: 2 }}>
                    Total: ₱{getTotal().toFixed(2)}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={clearCart}
                      startIcon={<Clear />}
                      fullWidth
                    >
                      {t('clearCart')}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handlePayment}
                      startIcon={<Payment />}
                      fullWidth
                      disabled={cart.length === 0}
                    >
                      {t('processPayment')}
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Total Amount: ₱{getTotal().toFixed(2)}
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              label="Payment Method"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="gcash">GCash</MenuItem>
              <MenuItem value="credit">Credit (Utang)</MenuItem>
              <MenuItem value="partial">Partial Payment + Credit</MenuItem>
            </Select>
          </FormControl>

          {/* Customer Selection for Credit Sales */}
          {(paymentMethod === 'credit' || paymentMethod === 'partial') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Customer *</InputLabel>
              <Select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(customer);
                }}
                label="Select Customer *"
                required
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} - Current Balance: ₱{customer.current_balance?.toFixed(2) || '0.00'}
                  </MenuItem>
                ))}
              </Select>
              {selectedCustomer && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Current Balance: ₱{selectedCustomer.current_balance?.toFixed(2) || '0.00'}
                </Typography>
              )}
            </FormControl>
          )}

          {/* Amount Received Field */}
          {(paymentMethod === 'cash' || paymentMethod === 'gcash' || paymentMethod === 'partial') && (
            <TextField
              fullWidth
              label="Amount Received"
              type="number"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          {/* Change Calculation */}
          {(paymentMethod === 'cash' || paymentMethod === 'gcash') && amountReceived && (
            <Typography variant="h6" color={getChange() >= 0 ? "primary" : "error"}>
              Change: ₱{getChange().toFixed(2)}
            </Typography>
          )}

          {/* Partial Payment + Credit Calculation */}
          {paymentMethod === 'partial' && amountReceived && selectedCustomer && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Payment Breakdown:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Amount Received: ₱{parseFloat(amountReceived || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Remaining Balance: ₱{Math.max(0, getTotal() - parseFloat(amountReceived || 0)).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Remaining balance will be added to {selectedCustomer.name}'s credit
              </Typography>
              <Typography variant="body2" color="text.secondary">
                New credit balance: ₱{((selectedCustomer.current_balance || 0) + Math.max(0, getTotal() - parseFloat(amountReceived || 0))).toFixed(2)}
              </Typography>
            </Box>
          )}

          {/* Credit Sale Warning */}
          {paymentMethod === 'credit' && selectedCustomer && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                This sale will be added to {selectedCustomer.name}'s credit balance.
                New balance will be: ₱{((selectedCustomer.current_balance || 0) + getTotal()).toFixed(2)}
              </Typography>
            </Alert>
          )}

          {/* Partial Payment Warning */}
          {paymentMethod === 'partial' && selectedCustomer && amountReceived && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Partial payment: ₱{parseFloat(amountReceived || 0).toFixed(2)} received in cash/GCash
                <br />
                Remaining: ₱{Math.max(0, getTotal() - parseFloat(amountReceived || 0)).toFixed(2)} will be added to {selectedCustomer.name}'s credit
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
          <Button
            onClick={processPayment}
            variant="contained"
            disabled={
              loading || 
              (paymentMethod === 'cash' && (!amountReceived || getChange() < 0)) ||
              (paymentMethod === 'gcash' && (!amountReceived || getChange() < 0)) ||
              (paymentMethod === 'credit' && !selectedCustomer) ||
              (paymentMethod === 'partial' && (!selectedCustomer || !amountReceived))
            }
          >
            {loading ? 'Processing...' : 'Complete Sale'}
          </Button>
        </DialogActions>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={showReceiptDialog} onClose={() => setShowReceiptDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Receipt</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Sale #{currentReceipt?.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {new Date().toLocaleString()}
          </Typography>
          
          {currentReceipt?.customer_name && (
            <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Customer: {currentReceipt.customer_name}
              </Typography>
              {currentReceipt.payment_method === 'partial' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Partial payment completed. Remaining balance added to customer credit.
                  </Typography>
                </Alert>
              )}
              {currentReceipt.payment_method === 'credit' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Credit sale completed. Balance updated.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          {currentReceipt?.items?.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{item.product_name} x{item.quantity}</Typography>
              <Typography>₱{item.total_price.toFixed(2)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">
            Total: ₱{currentReceipt?.final_amount?.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Payment Method: {currentReceipt?.payment_method}
          </Typography>
          
          {currentReceipt?.payment_method === 'partial' && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffeaa7' }}>
              <Typography variant="subtitle2" gutterBottom>
                Payment Breakdown:
              </Typography>
              <Typography variant="body2">
                Amount Received: ₱{(currentReceipt.amount_received || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="error">
                Remaining Balance: ₱{(currentReceipt.remaining_balance || 0).toFixed(2)} (Added to credit)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReceiptDialog(false)}>Close</Button>
          <Button onClick={printReceipt} variant="contained" startIcon={<Receipt />}>
            Print Receipt
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

export default POS;
