require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { seedAdminIfEmpty } = require('./utils/autoSeed');
const { startFollowUpReminderScheduler } = require('./utils/followupReminderScheduler');
const { startPaymentDueScheduler } = require('./utils/paymentDueScheduler');
const { startOrderDeliveryReminderScheduler } = require('./utils/orderDeliveryReminderScheduler');

const PORT = parseInt(process.env.PORT || '7007', 10);

// Gracefully handle uncaught exceptions — but NOT EADDRINUSE (handled below)
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`   Run this to free it:\n`);
    console.error(`   PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
    process.exit(1);
  }
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err.name, err.message);
  process.exit(1);
});

connectDB()
  .then(async () => {
    // Auto-create admin when the database has no users (fresh DB or wiped DB).
    await seedAdminIfEmpty();
    startFollowUpReminderScheduler();
    startPaymentDueScheduler();
    startOrderDeliveryReminderScheduler();

    const server = app.listen(PORT, () => {
      console.log(`✅  HNG CRM API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌  Port ${PORT} is already in use.`);
        console.error(`   Run: npm run kill-port  then retry npm run dev\n`);
        process.exit(1);
      }
      throw err;
    });

    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! Shutting down...', err.name, err.message);
      server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => process.exit(0));
    });
  })
  .catch((err) => {
    console.error('DB Connection failed:', err.message);
    process.exit(1);
  });
