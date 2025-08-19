import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Assessment,
  QrCodeScanner
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import axios from 'axios';
import BarcodeScanner from '../../components/BarcodeScanner/BarcodeScanner';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);



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



  // Memoize categories to prevent unnecessary re-renders
  const memoizedCategories = useMemo(() => categories, [categories]);

  // Helper function to find category by ID
  const findCategoryById = useCallback((categoryId) => {
    if (!categoryId || categoryId === '') return null;
    return memoizedCategories.find(c => c.id.toString() === categoryId.toString());
  }, [memoizedCategories]);

  useEffect(() => {
    const outOfStock = products.filter(product => 
      product.stock_quantity <= 0
    );
    setOutOfStockProducts(outOfStock);
  }, [products]);

  // Update form data when categories change (for newly created categories)
  useEffect(() => {
    if (openDialog && formData.category_id && !findCategoryById(formData.category_id)) {
      // If the selected category is not found in the current categories list,
      // it might be a newly created category that hasn't been loaded yet
      // We'll keep the category_id as is and let the renderValue handle it
      console.log('Category not found in list, keeping current selection:', formData.category_id);
    }
  }, [categories, openDialog, formData.category_id, findCategoryById]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterLowStock) params.append('lowStock', 'true');
      
      console.log('Fetching products with params:', params.toString());
      const response = await axios.get(`/api/products?${params}`);
      console.log('Fetched products:', response.data.products?.length || 0, 'products');

      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Debug function to show all products including inactive ones
  const debugShowAllProducts = async () => {
    try {
      console.log('=== DEBUG: Fetching ALL products (including inactive) ===');
      const response = await axios.get('/api/products/debug/all');
      console.log('All products in database:', response.data);
    } catch (error) {
      console.error('Debug fetch error:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await axios.get('/api/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
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
        category_id: formData.category_id && formData.category_id !== '' ? parseInt(formData.category_id) : null,
        min_stock_level: parseInt(formData.min_stock_level)
      };

      console.log('Submitting product data:', productData);
      console.log('Category ID before submission:', formData.category_id, 'Type:', typeof formData.category_id);
      console.log('Category ID after processing:', productData.category_id, 'Type:', typeof productData.category_id);

      if (editingProduct) {
        const response = await axios.put(`/api/products/${editingProduct.id}`, productData);
        console.log('Product updated successfully:', response.data);
        setSuccess('Product updated successfully!');
      } else {
        const response = await axios.post('/api/products', productData);
        console.log('Product created successfully:', response.data);
        setSuccess('Product created successfully!');
      }

      setOpenDialog(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      console.error('Error response:', error.response?.data);
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
        setOpenCategoryDialog(false);
        fetchCategories();
      } else {
        const response = await axios.post('/api/categories', categoryFormData);
        setSuccess('Category created successfully!');
        
        // Debug: Log the response to see the structure
        console.log('Category creation response:', response);
        
        // If we're in the product creation dialog, automatically select the new category
        if (openDialog) {
          // The backend returns the category object directly, not wrapped in data
          const newCategoryId = response.data.id.toString();
          console.log('Setting new category ID:', newCategoryId);
          
          // First, refresh categories to include the new one
          await fetchCategories();
          
          // Then set the form data with the new category
          setFormData(prev => ({ ...prev, category_id: newCategoryId }));
          
          // Show a success message specific to category creation
          setSuccess('Category created and selected for your product!');
        }
        
        setOpenCategoryDialog(false);
        if (!openDialog) {
          fetchCategories();
        }
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setError(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        console.log('Deleting product with ID:', productId);
        const response = await axios.delete(`/api/products/${productId}`);
        console.log('Delete response:', response.data);
        setSuccess('Product deleted successfully!');
        fetchProducts();
      } catch (error) {
        console.error('Delete error:', error);
        console.error('Error response:', error.response?.data);
        setError(error.response?.data?.message || 'Failed to delete product');
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

  // Barcode Scanner Functions
  const startScanner = () => {
    setShowScanner(true);
  };

  const handleBarcodeResult = async (barcode) => {
    try {
      // Check if product with this barcode already exists
      const existingProduct = products.find(p => p.barcode === barcode);
      if (existingProduct) {
        setError(`Product with barcode ${barcode} already exists: ${existingProduct.name}`);
        setShowScanner(false);
        return;
      }

      // Set the barcode in the form and open the product dialog
      setFormData(prev => ({ ...prev, barcode: barcode }));
      setEditingProduct(null);
      setOpenDialog(true);
      setSuccess(`Barcode ${barcode} scanned. Please fill in the product details.`);
      setShowScanner(false);
    } catch (error) {
      setError('Error processing barcode');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || product.category_id?.toString() === filterCategory || product.category_id === parseInt(filterCategory);
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



  // Updated stock level calculations
  const lowStockProducts = products.filter(product => 
    product.stock_quantity <= (product.min_stock_level || 5) && product.stock_quantity > 0
  );

  const normalStockProducts = products.filter(product => 
    product.stock_quantity > (product.min_stock_level || 5)
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
          checked={selectedProducts.includes(!params || params.value === undefined || params.value === null ? null : params.value)}
          onChange={(e) => {
            const value = !params || params.value === undefined || params.value === null ? null : params.value;
            if (e.target.checked) {
              setSelectedProducts([...selectedProducts, value]);
            } else {
              setSelectedProducts(selectedProducts.filter(id => id !== value));
            }
          }}
        />
      )
    },
    { 
      field: 'name', 
      headerName: 'Product Name', 
      width: 200
    },
    { 
      field: 'barcode', 
      headerName: 'Barcode', 
      width: 150,
             renderCell: (params) => {
         const barcode = params.row?.barcode || params.value;
         return barcode || 'N/A';
       }
    },
    { 
      field: 'category_name', 
      headerName: 'Category', 
      width: 120,
      renderCell: (params) => {
        const categoryName = params.row?.category_name || params.value;
        return categoryName || 'No Category';
      }
    },
    { 
      field: 'price', 
      headerName: 'Price', 
      width: 100,
      renderCell: (params) => {
        const price = params.row?.price || params.value;
        if (!price || price === 0) return '₱0.00';
        return `₱${parseFloat(price).toFixed(2)}`;
      }
    },
    { 
      field: 'cost_price', 
      headerName: 'Cost', 
      width: 100,
      renderCell: (params) => {
        const costPrice = params.row?.cost_price || params.value;
        if (!costPrice || costPrice === 0) return '₱0.00';
        return `₱${parseFloat(costPrice).toFixed(2)}`;
      }
    },
    { 
      field: 'stock_quantity', 
      headerName: 'Stock', 
      width: 120,
      renderCell: (params) => {
        const stockQuantity = !params || params.value === undefined || params.value === null ? 0 : params.value;
        const minStockLevel = !params || !params.row || params.row.min_stock_level === undefined || params.row.min_stock_level === null ? 5 : params.row.min_stock_level;
        
        // Determine stock status
        let color = 'success';
        let label = stockQuantity;
        
        if (stockQuantity <= 0) {
          color = 'error';
          label = `${stockQuantity} (OUT OF STOCK)`;
        } else if (stockQuantity <= minStockLevel) {
          color = 'warning';
          label = `${stockQuantity} (LOW STOCK)`;
        }
        
        return (
          <Chip
            label={label}
            color={color}
            size="small"
          />
        );
      }
    },
    { 
      field: 'unit', 
      headerName: 'Unit', 
      width: 80,
      renderCell: (params) => {
        const unit = params.row?.unit || params.value;
        return unit || 'piece';
      }
    },
    { 
      field: 'actions', 
      headerName: 'Actions', 
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params?.row)}
            color="primary"
          >
            <Edit />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params?.row?.id)}
            color="error"
          >
            <Delete />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openStockAdjustment(params?.row)}
            color="info"
          >
            <Inventory />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => openViewProduct(params?.row)}
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
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Normal Stock
              </Typography>
              <Typography variant="h4" color="success.main">
                {normalStockProducts.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={2}>
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
        <Grid item xs={12} sm={6} md={4}>
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
            
            {/* Active Filters Display */}
            {(filterCategory || filterLowStock || searchTerm) && (
              <Box sx={{ width: '100%', mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Active Filters:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {searchTerm && (
                    <Chip 
                      label={`Search: "${searchTerm}"`} 
                      size="small" 
                      onDelete={() => setSearchTerm('')}
                    />
                  )}
                  {filterCategory && (
                    <Chip 
                      label={`Category: ${memoizedCategories.find(c => c.id.toString() === filterCategory)?.name || filterCategory}`} 
                      size="small" 
                      onDelete={() => setFilterCategory('')}
                    />
                  )}
                  {filterLowStock && (
                    <Chip 
                      label="Low Stock Only" 
                      size="small" 
                      onDelete={() => setFilterLowStock(false)}
                    />
                  )}
                </Box>
              </Box>
            )}
            <TextField
              placeholder="Search products or enter barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  // Try to find product by barcode if it looks like a barcode
                  const product = products.find(p => p.barcode === searchTerm.trim());
                  if (product) {
                    handleOpenDialog(product);
                    setSearchTerm('');
                    setSuccess(`Product found: ${product.name}`);
                  }
                }
              }}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Enter barcode and press Enter">
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        Barcode: Enter + ↵
                      </Typography>
                    </Tooltip>
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
                disabled={categoriesLoading}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categoriesLoading ? (
                  <MenuItem disabled>Loading categories...</MenuItem>
                ) : (
                  memoizedCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </MenuItem>
                  ))
                )}
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

            {(filterCategory || filterLowStock || searchTerm) && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setFilterCategory('');
                  setFilterLowStock(false);
                  setSearchTerm('');
                }}
              >
                Clear Filters
              </Button>
            )}

            <Tooltip title="Refresh">
              <IconButton 
                onClick={() => {
                  fetchProducts();
                  fetchCategories();
                  fetchAdjustments();
                }} 
                color="primary"
                disabled={loading || categoriesLoading}
              >
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

            {/* Debug button - remove in production */}
            <Tooltip title="Debug: Show all products">
              <IconButton onClick={debugShowAllProducts} color="secondary">
                <Assessment />
              </IconButton>
            </Tooltip>
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

          {/* Results Summary */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Showing {sortedProducts.length} of {products.length} products
              {(filterCategory || filterLowStock || searchTerm) && ' (filtered)'}
            </Typography>
          </Box>

          {/* Products Table */}
          <Paper sx={{ height: 600, width: '100%' }}>
            {loading && <LinearProgress />}
            {!loading && sortedProducts.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No products found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Try adjusting your search or filters
                </Typography>
              </Box>
            ) : (
              <DataGrid
                rows={Array.isArray(sortedProducts) ? sortedProducts : []}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                sx={{ border: 'none' }}
                loading={loading}
                getRowId={(row) => row?.id || Math.random()}
              />
            )}
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

          {categoriesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : categories.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6" color="textSecondary">
                No categories found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Create your first category to organize your products
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenCategoryDialog()}
              >
                Add First Category
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {memoizedCategories.map((category) => (
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
          )}
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
            {!loading && lowStockProducts.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No low stock products found
                </Typography>
              </Box>
            ) : (
              <DataGrid
                rows={Array.isArray(lowStockProducts) ? lowStockProducts : []}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                sx={{ border: 'none' }}
                loading={loading}
                getRowId={(row) => row?.id || Math.random()}
              />
            )}
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
            {!loading && outOfStockProducts.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No out of stock products found
                </Typography>
              </Box>
            ) : (
              <DataGrid
                rows={Array.isArray(outOfStockProducts) ? outOfStockProducts : []}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                sx={{ border: 'none' }}
                loading={loading}
                getRowId={(row) => row?.id || Math.random()}
              />
            )}
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
            {!loading && adjustments.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="textSecondary">
                  No adjustments found
                </Typography>
              </Box>
            ) : (
              <DataGrid
                rows={Array.isArray(adjustments) ? adjustments : []}
                columns={[
                  { field: 'id', headerName: 'ID', width: 70 },
                  { 
                    field: 'product_name', 
                    headerName: 'Product', 
                    width: 200,
                    renderCell: (params) => {
                      const productName = params.row?.product_name || params.value;
                      return productName || 'Deleted Product';
                    }
                  },
                  { 
                    field: 'adjustment_type', 
                    headerName: 'Type', 
                    width: 100,
                    renderCell: (params) => (
                      <Chip
                        label={!params || params.value === undefined || params.value === null ? 'unknown' : params.value}
                        color={
                          !params || params.value === undefined || params.value === null ? 'warning' :
                          params.value === 'add' ? 'success' :
                          params.value === 'subtract' ? 'error' : 'warning'
                        }
                        size="small"
                      />
                    )
                  },
                  { 
                    field: 'quantity', 
                    headerName: 'Quantity', 
                    width: 100,
                    renderCell: (params) => {
                      const quantity = params.row?.quantity || params.value;
                      return quantity || 0;
                    }
                  },
                  { 
                    field: 'reason', 
                    headerName: 'Reason', 
                    width: 200,
                    renderCell: (params) => {
                      const reason = params.row?.reason || params.value;
                      return reason || 'No reason provided';
                    }
                  },
                  { 
                    field: 'created_at', 
                    headerName: 'Date', 
                    width: 150,
                    renderCell: (params) => {
                      const date = params.row?.created_at || params.value;
                      if (!date) return 'N/A';
                      return new Date(date).toLocaleDateString();
                    }
                  }
                ]}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                disableSelectionOnClick
                sx={{ border: 'none' }}
                loading={loading}
                getRowId={(row) => row?.id || Math.random()}
              />
            )}
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Scan Barcode">
                          <IconButton
                            onClick={() => {
                              setOpenDialog(false);
                              startScanner();
                            }}
                            edge="end"
                          >
                            <CameraAlt />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category_id || ''}
                    onChange={(e) => {
                      console.log('Category changed:', e.target.value);
                      setFormData({ ...formData, category_id: e.target.value });
                    }}
                    label="Category"
                    disabled={categoriesLoading}
                    renderValue={(value) => {
                      if (!value || value === '') return "No Category";
                      const category = findCategoryById(value);
                      return category ? category.name : `Category ID: ${value}`;
                    }}
                  >
                    <MenuItem value="">No Category</MenuItem>
                    {categoriesLoading ? (
                      <MenuItem disabled>Loading categories...</MenuItem>
                    ) : (
                      memoizedCategories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleOpenCategoryDialog()}
                  sx={{ 
                    alignSelf: 'flex-start',
                    color: 'primary.main',
                    '&:hover': { backgroundColor: 'primary.light', color: 'white' }
                  }}
                >
                  Add New Category
                </Button>
              </Box>
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
            disabled={loading || !formData.name || !formData.price || !formData.stock_quantity}
          >
            {loading ? 'Saving...' : (editingProduct ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
          {openDialog && !editingCategory && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              This category will be automatically selected for your product after creation.
            </Typography>
          )}
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

      {/* Barcode Scanner Component */}
      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeResult}
        title="Scan Product Barcode"
        description="Point your camera at a barcode to scan. The scanner will automatically detect and pre-fill the barcode field for a new product."
      />

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
