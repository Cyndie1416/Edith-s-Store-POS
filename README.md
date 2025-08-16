# 📋 Edith's Store POS System

A complete retail Point of Sale (POS) system built with React.js and Node.js, designed specifically for Edith's Store with features for sales management, inventory tracking, customer credit management ("Utang" system), and comprehensive reporting.

## ✨ Features

### 🛒 Core POS Features
- **Quick Product Search** - Search by name or barcode
- **Shopping Cart Management** - Add/remove items, quantity adjustment
- **Multiple Payment Methods** - Cash, GCash, Credit
- **Receipt Generation** - Print, SMS, Email, or None
- **Real-time Calculations** - Automatic totals, tax, and change calculation

### 📦 Inventory Management
- **Product Database** - 100+ items with categories
- **Stock Level Tracking** - Real-time inventory updates
- **Low Stock Alerts** - Automatic notifications (5 items threshold)
- **Barcode Scanning** - Phone camera integration
- **Manual Product Entry** - Add new products easily

### 💳 Credit Management ("Utang" System)
- **Customer Profiles** - Complete contact information
- **Credit Tracking** - Track borrowed items and money
- **Balance Management** - Partial payments and automatic deduction
- **Credit History** - Complete transaction history per customer
- **Payment Reminders** - Outstanding credit alerts

### 📊 Reporting & Analytics
- **Daily Sales Summary** - Real-time sales tracking
- **Profit/Loss Analysis** - Revenue vs. cost calculations
- **Inventory Reports** - Stock levels and value
- **Customer Reports** - Credit and purchase history
- **Visual Charts** - Easy-to-understand data visualization
- **Excel Export** - Data export for backup and analysis

### 🎨 User Interface
- **Responsive Design** - Works on mobile, tablet, and desktop
- **Dark/Light Theme** - Toggle between themes
- **Multi-language Support** - English and Filipino
- **Modern UI** - Material-UI components
- **Quick Navigation** - Intuitive sidebar menu

## 🛠️ Technical Stack

### Frontend
- **React.js** - Modern UI framework
- **Material-UI** - Professional UI components
- **React Router** - Navigation and routing
- **Chart.js** - Data visualization
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **ExcelJS** - Excel file generation

### Development Tools
- **npm** - Package management
- **Git** - Version control
- **VS Code** - Code editor

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Edith-s-Store-POS
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start the backend server**
   ```bash
   npm run server
   ```
   The backend will run on `http://localhost:5000`

5. **Start the frontend development server**
   ```bash
   cd client
   npm start
   ```
   The frontend will run on `http://localhost:3000`

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

## 📁 Project Structure

```
Edith-s-Store-POS/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts (Auth)
│   │   └── utils/         # Utility functions
│   └── public/            # Static files
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── models/            # Database models
│   ├── middleware/        # Express middleware
│   └── utils/             # Backend utilities
├── database/              # SQLite database files
└── docs/                  # Documentation
```

## 🔧 Development Phases

### ✅ Phase 1: Core Setup (COMPLETED)
- [x] Project structure setup
- [x] Backend API development
- [x] Database schema and initialization
- [x] Authentication system
- [x] Basic frontend structure
- [x] Login and dashboard

### 🚧 Phase 2: Core POS Features (IN PROGRESS)
- [ ] Product catalog management
- [ ] Shopping cart functionality
- [ ] Payment processing
- [ ] Receipt generation
- [ ] Barcode scanning integration

### 📋 Phase 3: Inventory & Credit Management
- [ ] Stock management interface
- [ ] Customer profile management
- [ ] Credit tracking system
- [ ] Low stock alerts
- [ ] Inventory adjustments

### 📊 Phase 4: Reporting & Polish
- [ ] Sales reports and analytics
- [ ] Data export functionality
- [ ] UI/UX improvements
- [ ] Testing and bug fixes
- [ ] Performance optimization

## 🔒 Security Features

- **Password Protection** - Secure login system
- **JWT Authentication** - Token-based security
- **Input Validation** - Server-side validation
- **SQL Injection Protection** - Parameterized queries
- **Rate Limiting** - API request throttling
- **CORS Configuration** - Cross-origin security

## 📱 Mobile Responsiveness

The system is fully responsive and works on:
- **Desktop** - Full-featured interface
- **Tablet** - Touch-optimized layout
- **Mobile** - Simplified mobile interface

## 🔄 Data Management

- **Local Storage** - SQLite database for reliability
- **Data Export** - Excel format for backup
- **Receipt History** - Complete transaction records
- **Customer Data** - Secure customer information storage

## 🆘 Support

For technical support or questions:
- Check the documentation in the `docs/` folder
- Review the API endpoints in `server/routes/`
- Contact the development team

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ for Edith's Store**
