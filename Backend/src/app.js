const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const billingRoutes = require('./modules/billing/billing.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const purchaseRoutes = require('./modules/purchase/purchase.routes');
const financialRoutes = require('./modules/financial/financial.routes');
const operationsRoutes = require('./modules/operations/operations.routes');
const dispatchRoutes = require('./modules/dispatch/dispatch.routes');
const tasksRoutes = require('./modules/tasks/tasks.routes');
const staffRoutes = require('./modules/staff/staff.routes');
const expensesRoutes = require('./modules/expenses/expenses.routes');
const vendorsRoutes = require('./modules/vendors/vendors.routes');
const partiesRoutes = require('./modules/parties/parties.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const reportsRoutes = require('./modules/reports/reports.routes');

const app = express();

app.set('trust proxy', 1);

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(mongoSanitize());
app.use(compression());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Rate limiting
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Try again in 15 minutes.',
}));
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Too many requests from this IP.',
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HNG CRM API is running', env: process.env.NODE_ENV });
});

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
