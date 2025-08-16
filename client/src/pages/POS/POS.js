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

const POS = () => {
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      const saleData = {
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod,
        amount_received: parseFloat(amountReceived),
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const response = await axios.post('/api/sales', saleData);
      
      setCurrentReceipt(response.data.sale);
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      clearCart();
      setSuccess('Sale completed successfully!');
      
      // Refresh products to update stock
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
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
            <p>Receipt #${currentReceipt?.id}</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
          ${cart.map(item => `
            <div class="item">
              ${item.name} x${item.quantity} - ₱${(item.price * item.quantity).toFixed(2)}
            </div>
          `).join('')}
          <div class="total">
            <h3>Total: ₱${getTotal().toFixed(2)}</h3>
            <p>Payment Method: ${paymentMethod}</p>
            <p>Amount Received: ₱${parseFloat(amountReceived).toFixed(2)}</p>
            <p>Change: ₱${getChange().toFixed(2)}</p>
          </div>
        </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const startScanner = () => {
    setShowScanner(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        setError('Failed to access camera');
        setShowScanner(false);
      });
  };

  const stopScanner = () => {
    setShowScanner(false);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Point of Sale
      </Typography>

      <Grid container spacing={3}>
        {/* Left Side - Product Search and List */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Products
            </Typography>
            
            {/* Search Bar */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Search products by name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
              <Tooltip title="Scan Barcode">
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
              Shopping Cart
            </Typography>

            {/* Customer Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Customer (Optional)</InputLabel>
              <Select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(customer);
                }}
                label="Customer (Optional)"
              >
                <MenuItem value="">No Customer</MenuItem>
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
                  No items in cart
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
                Clear Cart
              </Button>
              <Button
                variant="contained"
                onClick={handlePayment}
                startIcon={<Payment />}
                fullWidth
                disabled={cart.length === 0}
              >
                Process Payment
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
            </Select>
          </FormControl>

          {paymentMethod !== 'credit' && (
            <TextField
              fullWidth
              label="Amount Received"
              type="number"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          {paymentMethod !== 'credit' && amountReceived && (
            <Typography variant="h6" color="primary">
              Change: ₱{getChange().toFixed(2)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
          <Button
            onClick={processPayment}
            variant="contained"
            disabled={loading || (paymentMethod !== 'credit' && (!amountReceived || getChange() < 0))}
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
          <Divider sx={{ my: 2 }} />
          {cart.map((item) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{item.name} x{item.quantity}</Typography>
              <Typography>₱{(item.price * item.quantity).toFixed(2)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">
            Total: ₱{getTotal().toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReceiptDialog(false)}>Close</Button>
          <Button onClick={printReceipt} variant="contained" startIcon={<Receipt />}>
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showScanner} onClose={stopScanner} maxWidth="sm" fullWidth>
        <DialogTitle>Barcode Scanner</DialogTitle>
        <DialogContent>
          <video
            ref={videoRef}
            autoPlay
            style={{ width: '100%', height: '300px' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={stopScanner}>Close</Button>
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
