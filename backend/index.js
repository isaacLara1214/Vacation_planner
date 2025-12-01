const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend, but not on /api routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    express.static(path.join(__dirname, '../frontend'))(req, res, next);
});

// Default route to serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});