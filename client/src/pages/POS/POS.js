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
  InputAdornment
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Search,
  CameraAlt,
  Receipt,
  Payment,
  Clear,
  QrCodeScanner,
  AttachMoney,
  AccountBalance
} from '@mui/icons-material';
import axios from 'axios';
import { useLanguage } from '../../contexts/LanguageContext';
import BarcodeScanner from '../../components/BarcodeScanner/BarcodeScanner';

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
  const [showScanner, setShowScanner] = useState(false);


  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);



  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
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
    setFilteredProducts(products);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
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
        
        // Check if customer has available credit
        const availableCredit = (selectedCustomer.credit_limit || 0) - (selectedCustomer.current_balance || 0);
        if (totalAmount > availableCredit) {
          setError(`Insufficient credit. Available: ₱${availableCredit.toFixed(2)}, Required: ₱${totalAmount.toFixed(2)}`);
          return;
        }
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
        
        // Check if customer has available credit for remaining balance
        const availableCredit = (selectedCustomer.credit_limit || 0) - (selectedCustomer.current_balance || 0);
        if (remainingBalance > availableCredit) {
          setError(`Insufficient credit for remaining balance. Available: ₱${availableCredit.toFixed(2)}, Required: ₱${remainingBalance.toFixed(2)}`);
          return;
        }
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

  const startScanner = () => {
    setShowScanner(true);
  };

  const handleBarcodeResult = async (barcode) => {
    try {
      // Search for product with this barcode
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        addToCart(product);
        setSuccess(`Product found: ${product.name}`);
        setShowScanner(false);
      } else {
        setError(`No product found with barcode: ${barcode}`);
      }
    } catch (error) {
      setError('Error processing barcode');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        {t('pointOfSale')}
      </Typography>

      <Grid container spacing={3}>
        {/* Left Side - Product Search and List */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('products')}
            </Typography>
            
            {/* Customer Selection */}
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Customer (Optional)</InputLabel>
                <Select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer);
                  }}
                  label="Customer (Optional)"
                >
                  <MenuItem value="">
                    <em>No customer selected</em>
                  </MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name} - Balance: ₱{customer.current_balance?.toFixed(2) || '0.00'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedCustomer && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Credit Limit: ₱{selectedCustomer.credit_limit?.toFixed(2) || '0.00'} | 
                  Available: ₱{((selectedCustomer.credit_limit || 0) - (selectedCustomer.current_balance || 0)).toFixed(2)}
                </Typography>
              )}
            </Box>
            
            {/* Search Bar */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder={t('searchProducts') + ' or scan barcode'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    // Try to find product by barcode if it looks like a barcode
                    const product = products.find(p => p.barcode === searchTerm.trim());
                    if (product) {
                      addToCart(product);
                      setSearchTerm('');
                      setSuccess(`Product added: ${product.name}`);
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Quick barcode input">
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                          Enter barcode & press Enter
                        </Typography>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title={t('scanBarcode')}>
                <IconButton onClick={startScanner} color="primary">
                  <CameraAlt />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Product List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <List>
                {filteredProducts.map((product) => (
                  <ListItem
                    key={product.id}
                    button
                    onClick={() => addToCart(product)}
                    sx={{
                      border: '1px solid #e0e0e0',
                      mb: 1,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                  >
                    <ListItemText
                      primary={product.name}
                      secondary={`₱${product.price.toFixed(2)} | Stock: ${product.stock_quantity}`}
                    />
                    <Chip
                      label={product.category_name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side - Cart and Payment */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              {t('shoppingCart')}
            </Typography>

            {/* Customer Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('customers')} ({t('cancel')})</InputLabel>
              <Select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(customer);
                }}
                label={`${t('customers')} (${t('cancel')})`}
              >
                <MenuItem value="">{t('noCustomer')}</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} {customer.credit_balance > 0 && `(Credit: ₱${customer.credit_balance})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Cart Items */}
            <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
              {cart.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                  {t('noItemsInCart')}
                </Typography>
              ) : (
                <List>
                  {cart.map((item) => (
                    <ListItem key={item.id} sx={{ border: '1px solid #e0e0e0', mb: 1, borderRadius: 1 }}>
                      <ListItemText
                        primary={item.name}
                        secondary={`₱${item.price.toFixed(2)} x ${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)}`}
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
                  ))}
                </List>
              )}
            </Box>

            {/* Total and Actions */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" gutterBottom>
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
          </Paper>
        </Grid>
      </Grid>

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
                  Credit Limit: ₱{selectedCustomer.credit_limit?.toFixed(2) || '0.00'} | 
                  Current Balance: ₱{selectedCustomer.current_balance?.toFixed(2) || '0.00'} | 
                  Available Credit: ₱{((selectedCustomer.credit_limit || 0) - (selectedCustomer.current_balance || 0)).toFixed(2)}
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

      {/* Barcode Scanner Component */}
      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeResult}
        title="Scan Product Barcode"
        description="Point your camera at a barcode to scan. The scanner will automatically detect and add the product to your cart."
      />

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
