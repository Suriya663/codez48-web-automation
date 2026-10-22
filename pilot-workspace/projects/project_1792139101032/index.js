// index.js - Main entry point for the Express server

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Import user routes
const userRouter = require('./routes/user');

// Mount the user router at /api/users
app.use('/api/users', userRouter);

// Simple health check route
app.get('/', (req, res) => {
  res.send('Express server is running');
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});