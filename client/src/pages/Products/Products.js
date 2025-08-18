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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Fab,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Avatar,
  LinearProgress,
  Toolbar,
  Checkbox,
  Menu,
  ListItemIcon
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  CameraAlt,
  Warning,
  Inventory,
  QrCode,
  Category,
  FilterList,
  Sort,
  Download,
  Upload,
  Refresh,
  Visibility,
  VisibilityOff,
  ExpandMore,
  MoreVert,
  LocalOffer,
  AttachMoney,
  ShoppingCart,
  Assessment
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showInactive, setShowInactive] = useState(false);
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [stockAdjustmentProduct, setStockAdjustmentProduct] = useState(null);
  const [stockAdjustmentData, setStockAdjustmentData] = useState({
    quantity: '',
    adjustment_type: 'add',
    reason: ''
  });
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [adjustments, setAdjustments] = useState([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    category_id: '',
    barcode: '',
    min_stock_level: '5',
    unit: 'piece',
    image_url: ''
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchAdjustments();
  }, []);

  useEffect(() => {
    const outOfStock = products.filter(product => 
      product.stock_quantity === 0
    );
    setOutOfStockProducts(outOfStock);
  }, [products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterLowStock) params.append('lowStock', 'true');
      
      const response = await axios.get(`/api/products?${params}`);
      setProducts(response.data.products || []);
    } catch (error) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const response = await axios.get('/api/inventory/adjustments');
      setAdjustments(response.data.adjustments || []);
    } catch (error) {
      console.error('Failed to load adjustments:', error);
    }
  };

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        cost_price: product.cost_price?.toString() || '',
        stock_quantity: product.stock_quantity.toString(),
        category_id: product.category_id?.toString() || '',
        barcode: product.barcode || '',
        min_stock_level: product.min_stock_level?.toString() || '5',
        unit: product.unit || 'piece',
        image_url: product.image_url || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        cost_price: '',
        stock_quantity: '',
        category_id: '',
        barcode: '',
        min_stock_level: '5',
        unit: 'piece',
        image_url: ''
      });
    }
    setOpenDialog(true);
  };

  const handleOpenCategoryDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        description: ''
      });
    }
    setOpenCategoryDialog(true);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        cost_price: parseFloat(formData.cost_price) || 0,
        stock_quantity: parseInt(formData.stock_quantity),
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        min_stock_level: parseInt(formData.min_stock_level)
      };

      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, productData);
        setSuccess('Product updated successfully!');
      } else {
        await axios.post('/api/products', productData);
        setSuccess('Product created successfully!');
      }

      setOpenDialog(false);
      fetchProducts();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async () => {
    setLoading(true);
    try {
      if (editingCategory) {
        await axios.put(`/api/categories/${editingCategory.id}`, categoryFormData);
        setSuccess('Category updated successfully!');
      } else {
        await axios.post('/api/categories', categoryFormData);
        setSuccess('Category created successfully!');
      }

      setOpenCategoryDialog(false);
      fetchCategories();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`/api/products/${productId}`);
        setSuccess('Product deleted successfully!');
        fetchProducts();
      } catch (error) {
        setError('Failed to delete product');
      }
    }
  };

  const handleCategoryDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await axios.delete(`/api/categories/${categoryId}`);
        setSuccess('Category deleted successfully!');
        fetchCategories();
      } catch (error) {
        setError(error.response?.data?.message || 'Failed to delete category');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected products?`)) {
      try {
        await Promise.all(selectedProducts.map(id => axios.delete(`/api/products/${id}`)));
        setSuccess(`${selectedProducts.length} products deleted successfully!`);
        setSelectedProducts([]);
        fetchProducts();
      } catch (error) {
        setError('Failed to delete some products');
      }
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockAdjustmentProduct || !stockAdjustmentData.quantity) return;
    
    setLoading(true);
    try {
      await axios.patch(`/api/products/${stockAdjustmentProduct.id}/stock`, stockAdjustmentData);
      setSuccess('Stock adjusted successfully!');
      setOpenStockDialog(false);
      setStockAdjustmentProduct(null);
      setStockAdjustmentData({ quantity: '', adjustment_type: 'add', reason: '' });
      fetchProducts();
      fetchAdjustments();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const openStockAdjustment = (product) => {
    setStockAdjustmentProduct(product);
    setStockAdjustmentData({
      quantity: '',
      adjustment_type: 'add',
      reason: ''
    });
    setOpenStockDialog(true);
  };

  const openViewProduct = (product) => {
    setViewingProduct(product);
    setOpenViewDialog(true);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || product.category_id?.toString() === filterCategory;
    const matchesLowStock = !filterLowStock || product.stock_quantity <= (product.min_stock_level || 5);
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'price' || sortBy === 'cost_price' || sortBy === 'stock_quantity') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    } else {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const lowStockProducts = products.filter(product => 
    product.stock_quantity <= (product.min_stock_level || 5)
  );



  const totalValue = products.reduce((sum, product) => 
    sum + (product.price * product.stock_quantity), 0
  );

  const totalCost = products.reduce((sum, product) => 
    sum + (product.cost_price * product.stock_quantity), 0
  );

  const columns = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70,
      renderCell: (params) => (
        <Checkbox
          checked={selectedProducts.includes(params.value)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedProducts([...selectedProducts, params.value]);
            } else {
              setSelectedProducts(selectedProducts.filter(id => id !== params.value));
            }
          }}
        />
      )
    },
    { field: 'name', headerName: 'Product Name', width: 200 },
    { field: 'barcode', headerName: 'Barcode', width: 150 },
    { field: 'category_name', headerName: 'Category', width: 120 },
    { 
      field: 'price', 
      headerName: 'Price', 
      width: 100,
      valueFormatter: (params) => `₱${params.value.toFixed(2)}`
    },
    { 
      field: 'cost_price', 
      headerName: 'Cost', 
      width: 100,
      valueFormatter: (params) => `₱${params.value.toFixed(2)}`
    },
    { 
      field: 'stock_quantity', 
      headerName: 'Stock', 
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value <= (params.row.min_stock_level || 5) ? 'error' : 'success'}
          size="small"
        />
      )
    },
    { 
      field: 'unit', 
      headerName: 'Unit', 
      width: 80 
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            color="primary"
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            color="error"
          >
            <Delete />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openStockAdjustment(params.row)}
            color="info"
          >
            <Inventory />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openViewProduct(params.row)}
            color="primary"
          >
            <Visibility />
          </IconButton>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Products & Inventory Management
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4">
                {products.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Stock Items
              </Typography>
              <Typography variant="h4" color="warning.main">
                {lowStockProducts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Out of Stock
              </Typography>
              <Typography variant="h4" color="error.main">
                {outOfStockProducts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4" color="primary">
                ₱{totalValue.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {lowStockProducts.length} product(s) are running low on stock!
          </Typography>
          {lowStockProducts.slice(0, 3).map(product => (
            <Typography key={product.id} variant="body2">
              • {product.name} - {product.stock_quantity} remaining
            </Typography>
          ))}
        </Alert>
      )}

      {/* Out of Stock Alert */}
      {outOfStockProducts.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {outOfStockProducts.length} product(s) are out of stock!
          </Typography>
          {outOfStockProducts.slice(0, 3).map(product => (
            <Typography key={product.id} variant="body2">
              • {product.name} - 0 stock remaining
            </Typography>
          ))}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Products" />
          <Tab label="Categories" />
          <Tab label="Low Stock" />
          <Tab label="Out of Stock" />
          <Tab label="Adjustments" />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <>
          {/* Search and Actions */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                />
              }
              label="Low Stock Only"
            />

            <Tooltip title="Refresh">
              <IconButton onClick={() => {
                fetchProducts();
                fetchAdjustments();
              }} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>

            <Tooltip title="Scan Barcode">
              <IconButton onClick={() => setShowScanner(true)} color="primary">
                <CameraAlt />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Add Product
            </Button>
          </Box>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {selectedProducts.length} product(s) selected
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleBulkDelete}
                sx={{ mr: 1 }}
              >
                Delete Selected
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedProducts([])}
              >
                Clear Selection
              </Button>
            </Box>
          )}

          {/* Products Table */}
          <Paper sx={{ height: 600, width: '100%' }}>
            {loading && <LinearProgress />}
            <DataGrid
              rows={sortedProducts}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{ border: 'none' }}
              loading={loading}
            />
          </Paper>
        </>
      )}

      {activeTab === 1 && (
        <>
          {/* Categories Section */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Categories</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenCategoryDialog()}
            >
              Add Category
            </Button>
          </Box>

          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={category.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">{category.name}</Typography>
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
                    <Typography color="textSecondary" sx={{ mb: 2 }}>
                      {category.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleOpenCategoryDialog(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => handleCategoryDelete(category.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {activeTab === 2 && (
        <>
          {/* Low Stock Section */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Low Stock Products</Typography>
            <Typography variant="body2" color="textSecondary">
              {lowStockProducts.length} products below minimum stock level
            </Typography>
          </Box>

          <Paper sx={{ height: 600, width: '100%' }}>
            {loading && <LinearProgress />}
            <DataGrid
              rows={lowStockProducts}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{ border: 'none' }}
              loading={loading}
            />
          </Paper>
        </>
      )}

      {activeTab === 3 && (
        <>
          {/* Out of Stock Section */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Out of Stock Products</Typography>
            <Typography variant="body2" color="textSecondary">
              {outOfStockProducts.length} products with zero stock
            </Typography>
          </Box>

          <Paper sx={{ height: 600, width: '100%' }}>
            {loading && <LinearProgress />}
            <DataGrid
              rows={outOfStockProducts}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{ border: 'none' }}
              loading={loading}
            />
          </Paper>
        </>
      )}

      {activeTab === 4 && (
        <>
          {/* Adjustments History Section */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Inventory Adjustments History</Typography>
            <Typography variant="body2" color="textSecondary">
              {adjustments.length} adjustments recorded
            </Typography>
          </Box>

          <Paper sx={{ height: 600, width: '100%' }}>
            {loading && <LinearProgress />}
            <DataGrid
              rows={adjustments}
              columns={[
                { field: 'id', headerName: 'ID', width: 70 },
                { field: 'product_name', headerName: 'Product', width: 200 },
                { 
                  field: 'adjustment_type', 
                  headerName: 'Type', 
                  width: 100,
                  renderCell: (params) => (
                    <Chip
                      label={params.value}
                      color={
                        params.value === 'add' ? 'success' :
                        params.value === 'subtract' ? 'error' : 'warning'
                      }
                      size="small"
                    />
                  )
                },
                { field: 'quantity', headerName: 'Quantity', width: 100 },
                { field: 'reason', headerName: 'Reason', width: 200 },
                { 
                  field: 'created_at', 
                  headerName: 'Date', 
                  width: 150,
                  valueFormatter: (params) => new Date(params.value).toLocaleDateString()
                }
              ]}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{ border: 'none' }}
              loading={loading}
            />
          </Paper>
        </>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Product Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Cost Price"
                type="number"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Stock Quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="">No Category</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Minimum Stock Level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                helperText="Alert when stock falls below this level"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="piece, kg, liter, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Image URL"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.name || !formData.price}
          >
            {loading ? 'Saving...' : (editingProduct ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category Name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCategorySubmit}
            variant="contained"
            disabled={loading || !categoryFormData.name}
          >
            {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showScanner} onClose={() => setShowScanner(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Barcode Scanner</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Camera access is required for barcode scanning. This feature will be implemented with a barcode scanning library.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScanner(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={openStockDialog} onClose={() => setOpenStockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Stock for {stockAdjustmentProduct?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={stockAdjustmentData.quantity}
                onChange={(e) => setStockAdjustmentData({ ...stockAdjustmentData, quantity: e.target.value })}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">Qty</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Adjustment Type</InputLabel>
                <Select
                  value={stockAdjustmentData.adjustment_type}
                  onChange={(e) => setStockAdjustmentData({ ...stockAdjustmentData, adjustment_type: e.target.value })}
                  label="Adjustment Type"
                >
                  <MenuItem value="add">Add</MenuItem>
                  <MenuItem value="subtract">Subtract</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                value={stockAdjustmentData.reason}
                onChange={(e) => setStockAdjustmentData({ ...stockAdjustmentData, reason: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStockDialog(false)}>Cancel</Button>
          <Button
            onClick={handleStockAdjustment}
            variant="contained"
            disabled={loading || !stockAdjustmentData.quantity}
          >
            {loading ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {viewingProduct && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Product Name</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingProduct.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Barcode</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingProduct.barcode || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingProduct.description || 'No description'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Price</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>₱{viewingProduct.price?.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Cost Price</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>₱{viewingProduct.cost_price?.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary">Stock Quantity</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <Chip
                    label={viewingProduct.stock_quantity}
                    color={viewingProduct.stock_quantity <= (viewingProduct.min_stock_level || 5) ? 'error' : 'success'}
                    size="small"
                  />
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Category</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingProduct.category_name || 'No category'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Unit</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingProduct.unit || 'piece'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Minimum Stock Level</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>{viewingProduct.min_stock_level || 5}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="textSecondary">Created At</Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {new Date(viewingProduct.created_at).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpenViewDialog(false);
              handleOpenDialog(viewingProduct);
            }}
          >
            Edit Product
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

export default Products;
