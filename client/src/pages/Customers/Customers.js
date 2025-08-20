import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  Phone,
  Email,
  AttachMoney,
  History,
  Warning,
  CheckCircle,
  Cancel,
  SelectAll,
  LocalShipping,
  AssignmentReturn,
  Inventory
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [creditDialog, setCreditDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [creditHistory, setCreditHistory] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const [creditData, setCreditData] = useState({
    type: 'add', // 'add' or 'deduct'
    amount: '',
    description: ''
  });

  const [borrowedItems, setBorrowedItems] = useState([]);
  const [borrowedItemsDialog, setBorrowedItemsDialog] = useState(false);
  const [borrowItemDialog, setBorrowItemDialog] = useState(false);
  const [returnItemDialog, setReturnItemDialog] = useState(false);
  const [selectedBorrowedItem, setSelectedBorrowedItem] = useState(null);
  const [products, setProducts] = useState([]);

  const [borrowData, setBorrowData] = useState({
    product_id: '',
    quantity: '',
    expected_return_date: '',
    notes: ''
  });

  const [returnData, setReturnData] = useState({
    notes: ''
  });


  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.customers || []);
    } catch (error) {
      setError('Failed to load customers');
    }
  };

  const fetchCreditHistory = async (customerId) => {
    try {
      const response = await axios.get(`/api/customers/${customerId}/credit-history`);
      setCreditHistory(response.data.transactions || []);
    } catch (error) {
      setError('Failed to load credit history');
    }
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const customerData = {
        ...formData
      };

      if (editingCustomer) {
        await axios.put(`/api/customers/${editingCustomer.id}`, customerData);
        setSuccess('Customer updated successfully!');
      } else {
        await axios.post('/api/customers', customerData);
        setSuccess('Customer created successfully!');
      }

      setOpenDialog(false);
      fetchCustomers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await axios.delete(`/api/customers/${customerId}`);
        setSuccess('Customer deleted successfully!');
        fetchCustomers();
      } catch (error) {
        setError('Failed to delete customer');
      }
    }
  };

  const handleCreditTransaction = async () => {
    setLoading(true);
    try {
      const transactionData = {
        customer_id: selectedCustomer.id,
        type: creditData.type,
        amount: parseFloat(creditData.amount),
        description: creditData.description
      };

      await axios.post('/api/customers/credit-transaction', transactionData);
      setSuccess('Credit transaction processed successfully!');
      setCreditDialog(false);
      setCreditData({ type: 'add', amount: '', description: '' });
      fetchCustomers();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to process credit transaction');
    } finally {
      setLoading(false);
    }
  };

  const openCreditDialog = (customer) => {
    setSelectedCustomer(customer);
    setCreditDialog(true);
  };

  const openHistoryDialog = (customer) => {
    setSelectedCustomer(customer);
    fetchCreditHistory(customer.id);
    setHistoryDialog(true);
  };

  const handleViewReceipt = async (saleId) => {
    try {
      const response = await axios.get(`/api/sales/${saleId}/receipt`);
      setSelectedReceipt(response.data);
      setReceiptDialog(true);
    } catch (error) {
      setError('Failed to load receipt');
    }
  };

  const fetchBorrowedItems = async (customerId) => {
    try {
      const response = await axios.get(`/api/borrowed-items/customer/${customerId}`);
      setBorrowedItems(response.data.borrowed_items || []);
    } catch (error) {
      setError('Failed to load borrowed items');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (error) {
      setError('Failed to load products');
    }
  };

  const openBorrowedItemsDialog = (customer) => {
    setSelectedCustomer(customer);
    fetchBorrowedItems(customer.id);
    setBorrowedItemsDialog(true);
  };

  const openBorrowItemDialog = (customer) => {
    setSelectedCustomer(customer);
    fetchProducts();
    setBorrowItemDialog(true);
  };

  const handleBorrowItem = async () => {
    setLoading(true);
    try {
      const borrowItemData = {
        customer_id: selectedCustomer.id,
        product_id: borrowData.product_id,
        quantity: parseInt(borrowData.quantity),
        expected_return_date: borrowData.expected_return_date,
        notes: borrowData.notes,
        borrowed_by: 1 // TODO: Get current user ID
      };

      await axios.post('/api/borrowed-items', borrowItemData);
      setSuccess('Item borrowed successfully!');
      setBorrowItemDialog(false);
      setBorrowData({ product_id: '', quantity: '', expected_return_date: '', notes: '' });
      
      // Refresh borrowed items if dialog is open
      if (borrowedItemsDialog) {
        fetchBorrowedItems(selectedCustomer.id);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to borrow item');
    } finally {
      setLoading(false);
    }
  };

  const openReturnItemDialog = (borrowedItem) => {
    setSelectedBorrowedItem(borrowedItem);
    setReturnItemDialog(true);
  };

  const handleReturnItem = async () => {
    setLoading(true);
    try {
      const returnItemData = {
        returned_to: 1, // TODO: Get current user ID
        notes: returnData.notes
      };

      await axios.put(`/api/borrowed-items/${selectedBorrowedItem.id}/return`, returnItemData);
      setSuccess('Item returned successfully!');
      setReturnItemDialog(false);
      setReturnData({ notes: '' });
      setSelectedBorrowedItem(null);
      
      // Refresh borrowed items
      if (borrowedItemsDialog) {
        fetchBorrowedItems(selectedCustomer.id);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to return item');
    } finally {
      setLoading(false);
    }
  };


  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customersWithCredit = customers.filter(customer => customer.current_balance > 0);

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Customer Name', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { 
      field: 'current_balance', 
      headerName: 'Credit Balance', 
      width: 150,
      valueFormatter: (params) => {
        if (!params || params.value === undefined || params.value === null) return '₱0.00';
        return `₱${parseFloat(params.value).toFixed(2)}`;
      },
      renderCell: (params) => (
        <Chip
          label={`₱${!params || params.value === undefined || params.value === null ? '0.00' : parseFloat(params.value).toFixed(2)}`}
          color={!params || params.value === undefined || params.value === null || params.value <= 0 ? 'success' : 'error'}
          size="small"
        />
      )
    },

    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 200,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => openCreditDialog(params.row)}
            color="primary"
            title="Manage Credit"
          >
            <AttachMoney />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openHistoryDialog(params.row)}
            color="info"
            title="View History"
          >
            <History />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openBorrowedItemsDialog(params.row)}
            color="secondary"
            title="View Borrowed Items"
          >
            <LocalShipping />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            color="primary"
            title="Edit"
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            color="error"
            title="Delete"
          >
            <Delete />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Customer Management
      </Typography>

      {/* Credit Alert */}
      {customersWithCredit.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {customersWithCredit.length} customer(s) have outstanding credit!
          </Typography>
          {customersWithCredit.slice(0, 3).map(customer => (
            <Typography key={customer.id} variant="body2">
              • {customer.name} - ₱{customer.current_balance.toFixed(2)} outstanding
            </Typography>
          ))}
        </Alert>
      )}

      {/* Search and Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Customer
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="All Customers" />
          <Tab label="With Credit" />
        </Tabs>
      </Box>

      {/* Customers Table */}
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={Array.isArray(activeTab === 0 ? filteredCustomers : customersWithCredit) ? (activeTab === 0 ? filteredCustomers : customersWithCredit) : []}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Customer Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name}
          >
            {loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit Transaction Dialog */}
      <Dialog open={creditDialog} onClose={() => setCreditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Manage Credit - {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Current Balance: ₱{selectedCustomer?.current_balance?.toFixed(2) || '0.00'}
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={creditData.type}
              onChange={(e) => setCreditData({ ...creditData, type: e.target.value })}
              label="Transaction Type"
            >
              <MenuItem value="add">Add Credit (Customer owes more)</MenuItem>
              <MenuItem value="deduct">Deduct Credit (Customer pays)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={creditData.amount}
            onChange={(e) => setCreditData({ ...creditData, amount: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
            }}
          />

          <TextField
            fullWidth
            label="Description"
            value={creditData.description}
            onChange={(e) => setCreditData({ ...creditData, description: e.target.value })}
            multiline
            rows={3}
            placeholder="e.g., Purchased items on credit, Payment received"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreditTransaction}
            variant="contained"
            disabled={loading || !creditData.amount || !creditData.description}
          >
            {loading ? 'Processing...' : 'Process Transaction'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit History Dialog */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Credit History - {selectedCustomer?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Current Balance: ₱{(parseFloat(selectedCustomer?.current_balance) || 0).toFixed(2)}
          </Typography>
          
          <TableContainer>
            <Table>
                             <TableHead>
                 <TableRow>
                   <TableCell>Date</TableCell>
                   <TableCell>Type</TableCell>
                   <TableCell>Amount</TableCell>
                   <TableCell>Description</TableCell>
                 </TableRow>
               </TableHead>
              <TableBody>
                {creditHistory.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'N/A'}</TableCell>
                                         <TableCell>
                       <Chip
                         label={['credit', 'debit'].includes(transaction.transaction_type) ? 'Added' : 'Deducted'}
                         color={['credit', 'debit'].includes(transaction.transaction_type) ? 'error' : 'success'}
                         size="small"
                       />
                     </TableCell>
                                         <TableCell>₱{(parseFloat(transaction.amount) || 0).toFixed(2)}</TableCell>
                     <TableCell>
                       {transaction.reference_type === 'sale' && transaction.reference_id ? (
                         <Button
                           size="small"
                           color="primary"
                           onClick={() => handleViewReceipt(transaction.reference_id)}
                           sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                         >
                           {transaction.description}
                         </Button>
                       ) : (
                         transaction.description
                       )}
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Close</Button>
                 </DialogActions>
       </Dialog>

       {/* Receipt Dialog */}
       <Dialog open={receiptDialog} onClose={() => setReceiptDialog(false)} maxWidth="md" fullWidth>
         <DialogTitle>
           Receipt Details
         </DialogTitle>
         <DialogContent>
           {selectedReceipt ? (
             <Box>
               <Typography variant="h6" gutterBottom>
                 Receipt #{selectedReceipt.receipt_number}
               </Typography>
               <Typography variant="body2" color="textSecondary" gutterBottom>
                 Date: {selectedReceipt.created_at ? new Date(selectedReceipt.created_at).toLocaleString() : 'N/A'}
               </Typography>
               
               <Divider sx={{ my: 2 }} />
               
               <Typography variant="subtitle1" gutterBottom>
                 Items:
               </Typography>
               {selectedReceipt.items && selectedReceipt.items.map((item, index) => (
                 <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                   <Typography variant="body2">
                     {item.product_name} x {item.quantity}
                   </Typography>
                   <Typography variant="body2">
                     ₱{(parseFloat(item.total_price) || 0).toFixed(2)}
                   </Typography>
                 </Box>
               ))}
               
               <Divider sx={{ my: 2 }} />
               
               <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                 <Typography variant="body1" fontWeight="bold">
                   Total Amount:
                 </Typography>
                 <Typography variant="body1" fontWeight="bold">
                   ₱{(parseFloat(selectedReceipt.total_amount) || 0).toFixed(2)}
                 </Typography>
               </Box>
               
               {selectedReceipt.payment_method && (
                 <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                   <Typography variant="body2">
                     Payment Method:
                   </Typography>
                   <Typography variant="body2">
                     {selectedReceipt.payment_method}
                   </Typography>
                 </Box>
               )}
               
               {selectedReceipt.notes && (
                 <Box sx={{ mt: 2 }}>
                   <Typography variant="body2" color="textSecondary">
                     Notes: {selectedReceipt.notes}
                   </Typography>
                 </Box>
               )}
             </Box>
           ) : (
             <Typography>Loading receipt...</Typography>
           )}
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setReceiptDialog(false)}>Close</Button>
         </DialogActions>
       </Dialog>

       {/* Borrowed Items Dialog */}
       <Dialog open={borrowedItemsDialog} onClose={() => setBorrowedItemsDialog(false)} maxWidth="lg" fullWidth>
         <DialogTitle>
           Borrowed Items - {selectedCustomer?.name}
         </DialogTitle>
         <DialogContent>
           <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <Typography variant="h6">
               Borrowed Items History
             </Typography>
             <Button
               variant="contained"
               startIcon={<Inventory />}
               onClick={() => {
                 setBorrowedItemsDialog(false);
                 openBorrowItemDialog(selectedCustomer);
               }}
             >
               Borrow New Item
             </Button>
           </Box>
           
           <TableContainer>
             <Table>
               <TableHead>
                 <TableRow>
                   <TableCell>Item</TableCell>
                   <TableCell>Quantity</TableCell>
                   <TableCell>Borrow Date</TableCell>
                   <TableCell>Expected Return</TableCell>
                   <TableCell>Actual Return</TableCell>
                   <TableCell>Status</TableCell>
                   <TableCell>Notes</TableCell>
                   <TableCell>Actions</TableCell>
                 </TableRow>
               </TableHead>
               <TableBody>
                 {borrowedItems.map((item) => (
                   <TableRow key={item.id}>
                     <TableCell>
                       <Typography variant="body2" fontWeight="bold">
                         {item.product_name}
                       </Typography>
                       <Typography variant="caption" color="textSecondary">
                         {item.product_barcode}
                       </Typography>
                     </TableCell>
                     <TableCell>{item.quantity}</TableCell>
                     <TableCell>
                       {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : 'N/A'}
                     </TableCell>
                     <TableCell>
                       {item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString() : 'N/A'}
                     </TableCell>
                     <TableCell>
                       {item.actual_return_date ? new Date(item.actual_return_date).toLocaleDateString() : 'N/A'}
                     </TableCell>
                     <TableCell>
                       <Chip
                         label={item.status === 'borrowed' ? 'Borrowed' : 'Returned'}
                         color={item.status === 'borrowed' ? 'warning' : 'success'}
                         size="small"
                       />
                     </TableCell>
                     <TableCell>
                       <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {item.notes || '-'}
                       </Typography>
                     </TableCell>
                     <TableCell>
                       {item.status === 'borrowed' && (
                         <IconButton
                           size="small"
                           onClick={() => {
                             setBorrowedItemsDialog(false);
                             openReturnItemDialog(item);
                           }}
                           color="success"
                           title="Return Item"
                         >
                           <AssignmentReturn />
                         </IconButton>
                       )}
                     </TableCell>
                   </TableRow>
                 ))}
                 {borrowedItems.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={8} align="center">
                       <Typography variant="body2" color="textSecondary">
                         No borrowed items found
                       </Typography>
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </TableContainer>
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setBorrowedItemsDialog(false)}>Close</Button>
         </DialogActions>
       </Dialog>

       {/* Borrow Item Dialog */}
       <Dialog open={borrowItemDialog} onClose={() => setBorrowItemDialog(false)} maxWidth="md" fullWidth>
         <DialogTitle>
           Borrow Item - {selectedCustomer?.name}
         </DialogTitle>
         <DialogContent>
           <Grid container spacing={2} sx={{ mt: 1 }}>
             <Grid item xs={12}>
               <FormControl fullWidth>
                 <InputLabel>Product</InputLabel>
                 <Select
                   value={borrowData.product_id}
                   onChange={(e) => setBorrowData({ ...borrowData, product_id: e.target.value })}
                   label="Product"
                 >
                   {products.map((product) => (
                     <MenuItem key={product.id} value={product.id}>
                       {product.name} - Stock: {product.stock_quantity} {product.unit}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Grid>
             <Grid item xs={12} md={6}>
               <TextField
                 fullWidth
                 label="Quantity"
                 type="number"
                 value={borrowData.quantity}
                 onChange={(e) => setBorrowData({ ...borrowData, quantity: e.target.value })}
                 required
               />
             </Grid>
             <Grid item xs={12} md={6}>
               <TextField
                 fullWidth
                 label="Expected Return Date"
                 type="date"
                 value={borrowData.expected_return_date}
                 onChange={(e) => setBorrowData({ ...borrowData, expected_return_date: e.target.value })}
                 InputLabelProps={{ shrink: true }}
               />
             </Grid>
             <Grid item xs={12}>
               <TextField
                 fullWidth
                 label="Notes"
                 value={borrowData.notes}
                 onChange={(e) => setBorrowData({ ...borrowData, notes: e.target.value })}
                 multiline
                 rows={3}
                 placeholder="Any additional notes about the borrowed item..."
               />
             </Grid>
           </Grid>
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setBorrowItemDialog(false)}>Cancel</Button>
           <Button
             onClick={handleBorrowItem}
             variant="contained"
             disabled={loading || !borrowData.product_id || !borrowData.quantity}
           >
             {loading ? 'Processing...' : 'Borrow Item'}
           </Button>
         </DialogActions>
       </Dialog>

       {/* Return Item Dialog */}
       <Dialog open={returnItemDialog} onClose={() => setReturnItemDialog(false)} maxWidth="sm" fullWidth>
         <DialogTitle>
           Return Item - {selectedBorrowedItem?.product_name}
         </DialogTitle>
         <DialogContent>
           <Box sx={{ mb: 2 }}>
             <Typography variant="body2" color="textSecondary">
               Customer: {selectedBorrowedItem?.customer_name}
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Quantity: {selectedBorrowedItem?.quantity}
             </Typography>
             <Typography variant="body2" color="textSecondary">
               Borrowed on: {selectedBorrowedItem?.borrow_date ? new Date(selectedBorrowedItem.borrow_date).toLocaleDateString() : 'N/A'}
             </Typography>
           </Box>
           
           <TextField
             fullWidth
             label="Return Notes"
             value={returnData.notes}
             onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
             multiline
             rows={3}
             placeholder="Any notes about the returned item..."
           />
         </DialogContent>
         <DialogActions>
           <Button onClick={() => setReturnItemDialog(false)}>Cancel</Button>
           <Button
             onClick={handleReturnItem}
             variant="contained"
             disabled={loading}
           >
             {loading ? 'Processing...' : 'Return Item'}
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

export default Customers;
