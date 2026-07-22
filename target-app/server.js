const express = require('express');
const app = express();
const path = require('path');
const PORT = 4000;


app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Carol' }
  ]);
});

app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Widget', price: 9.99 },
    { id: 2, name: 'Gadget', price: 19.99 }
  ]);
});

const SLOW_DELAY_MS = 900;

app.get('/api/report', (req, res) => {
  setTimeout(() => {
    res.json({ report: 'monthly summary', generatedAt: new Date().toISOString() });
  }, SLOW_DELAY_MS);
});



const FORCE_CHECKOUT_FAILURE = false;

app.get('/api/checkout', (req, res) => {
  if (FORCE_CHECKOUT_FAILURE) {
    return res.status(500).json({ error: 'Payment gateway timeout' });
  }
  res.json({ status: 'ok', orderId: Math.floor(Math.random() * 10000) });
});


app.listen(PORT, () => {
  console.log(`Target app running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});




