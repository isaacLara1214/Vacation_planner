const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Import routes
const usersRouter = require('./routes/users');
const itinerariesRouter = require('./routes/itineraries');
const destinationsRouter = require('./routes/destinations');
const activitiesRouter = require('./routes/activities');
const accommodationsRouter = require('./routes/accommodations');
const expensesRouter = require('./routes/expenses');

// Mount routes
app.use('/api/users', usersRouter);
app.use('/api/itineraries', itinerariesRouter);
app.use('/api/destinations', destinationsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/accommodations', accommodationsRouter);
app.use('/api/expenses', expensesRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Travel Planner API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});