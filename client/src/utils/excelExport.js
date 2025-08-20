import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Export sales data to Excel
export const exportSalesToExcel = (salesData, filename = 'sales_report') => {
  const worksheet = XLSX.utils.json_to_sheet(salesData.map(sale => ({
    'Sale ID': sale.id,
    'Sale Number': sale.sale_number,
    'Customer': sale.customer_name || 'Walk-in Customer',
    'Total Amount': sale.total_amount,
    'Final Amount': sale.final_amount,
    'Payment Method': sale.payment_method,
    'Payment Status': sale.payment_status,
    'Date': new Date(sale.created_at).toLocaleDateString(),
    'Time': new Date(sale.created_at).toLocaleTimeString(),
    'Cashier': sale.cashier_name || 'Unknown'
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export inventory data to Excel
export const exportInventoryToExcel = (inventoryData, filename = 'inventory_report') => {
  const worksheet = XLSX.utils.json_to_sheet(inventoryData.map(item => ({
    'Product ID': item.id,
    'Product Name': item.name,
    'Category': item.category_name,
    'Price': item.price,
    'Cost Price': item.cost_price,
    'Stock Quantity': item.stock_quantity,
    'Min Stock Level': item.min_stock_level,
    'Unit': item.unit,
    'Barcode': item.barcode || 'N/A',
    'Status': item.stock_quantity <= item.min_stock_level ? 'Low Stock' : 'In Stock',
    'Last Updated': new Date(item.updated_at).toLocaleDateString()
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export customer data to Excel
export const exportCustomersToExcel = (customersData, filename = 'customers_report') => {
  const worksheet = XLSX.utils.json_to_sheet(customersData.map(customer => ({
    'Customer ID': customer.id,
    'Name': customer.name,
    'Phone': customer.phone || 'N/A',
    'Email': customer.email || 'N/A',
    'Address': customer.address || 'N/A',
    'Current Balance': customer.current_balance,
    'Status': customer.current_balance > 0 ? 'Has Credit' : 'No Credit',
    'Date Added': new Date(customer.created_at).toLocaleDateString()
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export comprehensive report to Excel with multiple sheets
export const exportComprehensiveReport = (data, filename = 'comprehensive_report') => {
  const workbook = XLSX.utils.book_new();
  
  // Sales Summary Sheet
  if (data.sales) {
    const salesWorksheet = XLSX.utils.json_to_sheet(data.sales.map(sale => ({
      'Sale ID': sale.id,
      'Date': new Date(sale.created_at).toLocaleDateString(),
      'Customer': sale.customer_name || 'Walk-in',
      'Amount': sale.final_amount,
      'Payment Method': sale.payment_method
    })));
    XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Sales Summary');
  }
  
  // Inventory Summary Sheet
  if (data.inventory) {
    const inventoryWorksheet = XLSX.utils.json_to_sheet(data.inventory.map(item => ({
      'Product': item.name,
      'Category': item.category_name,
      'Stock': item.stock_quantity,
      'Price': item.price,
      'Value': item.stock_quantity * item.price
    })));
    XLSX.utils.book_append_sheet(workbook, inventoryWorksheet, 'Inventory Summary');
  }
  
  // Customer Summary Sheet
  if (data.customers) {
    const customerWorksheet = XLSX.utils.json_to_sheet(data.customers.map(customer => ({
      'Customer': customer.name,
      'Phone': customer.phone || 'N/A',
      'Credit Balance': customer.current_balance
    })));
    XLSX.utils.book_append_sheet(workbook, customerWorksheet, 'Customer Summary');
  }
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(dataBlob, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export receipt data to Excel
export const exportReceiptsToExcel = (receiptsData, filename = 'receipts_history') => {
  const worksheet = XLSX.utils.json_to_sheet(receiptsData.map(receipt => ({
    'Receipt ID': receipt.id,
    'Sale Number': receipt.sale_number,
    'Customer': receipt.customer_name || 'Walk-in Customer',
    'Amount': receipt.final_amount,
    'Payment Method': receipt.payment_method,
    'Receipt Type': receipt.receipt_type,
    'Date': new Date(receipt.created_at).toLocaleDateString(),
    'Time': new Date(receipt.created_at).toLocaleTimeString()
  })));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Receipts History');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
