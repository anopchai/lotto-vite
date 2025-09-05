const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic security middleware
app.use(helmet());

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Very high limit
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Simple CORS configuration
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Function to remove 3straight_toad entries
async function remove3StraightToadEntries() {
  try {
    const { promisePool } = require('./config/database');
    
    console.log('Removing 3straight_toad entries...');
    
    // Remove from tbl_setting
    console.log('Attempting to remove 3straight_toad from tbl_setting...');
    const [result1] = await promisePool.execute(
      'DELETE FROM tbl_setting WHERE lotto_type = ?',
      ['3straight_toad']
    );
    console.log(`Removed ${result1.affectedRows} 3straight_toad entries from tbl_setting`);
    
    // Update tickets from 3straight_toad to 3toad
    console.log('Attempting to update tickets from 3straight_toad to 3toad...');
    const [result2] = await promisePool.execute(
      'UPDATE tbl_ticket SET lotto_type = ? WHERE lotto_type = ?',
      ['3toad', '3straight_toad']
    );
    console.log(`Updated ${result2.affectedRows} tickets from 3straight_toad to 3toad`);
    
    console.log('3straight_toad entries removal completed');
  } catch (error) {
    console.error('Error removing 3straight_toad entries:', error.message);
    console.error('Error stack:', error.stack);
  }
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/half-price', require('./routes/halfPriceRoutes'));
app.use('/api/periods', require('./routes/periodRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Lotto Vite System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Only log errors in development
  if (process.env.NODE_ENV === 'development') {
    // Error handling;
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, async () => {
  // Only log startup info in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API URL: http://localhost:${PORT}/api`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  }
  
  // Remove 3straight_toad entries
  await remove3StraightToadEntries();
});