import React, { useState, useEffect } from 'react';
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
  Cancel
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [creditDialog, setCreditDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
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
    address: '',
    credit_limit: '1000'
  });

  const [creditData, setCreditData] = useState({
    type: 'add', // 'add' or 'deduct'
    amount: '',
    description: ''
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
        address: customer.address || '',
        credit_limit: customer.credit_limit?.toString() || '1000'
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        credit_limit: '1000'
      });
    }
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const customerData = {
        ...formData,
        credit_limit: parseFloat(formData.credit_limit)
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customersWithCredit = customers.filter(customer => customer.credit_balance > 0);

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Customer Name', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { 
      field: 'credit_balance', 
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
      field: 'credit_limit', 
      headerName: 'Credit Limit', 
      width: 120,
      valueFormatter: (params) => {
        if (!params || params.value === undefined || params.value === null) return '₱0.00';
        return `₱${parseFloat(params.value).toFixed(2)}`;
      }
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
              • {customer.name} - ₱{customer.credit_balance.toFixed(2)} outstanding
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Credit Limit"
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
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
            Current Balance: ₱{selectedCustomer?.credit_balance?.toFixed(2) || '0.00'}
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
            Current Balance: ₱{(parseFloat(selectedCustomer?.credit_balance) || 0).toFixed(2)}
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Balance After</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {creditHistory.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type === 'add' ? 'Added' : 'Deducted'}
                        color={transaction.type === 'add' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>₱{(parseFloat(transaction.amount) || 0).toFixed(2)}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>₱{(parseFloat(transaction.balance_after) || 0).toFixed(2)}</TableCell>
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
