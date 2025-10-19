const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix when forwarding
  },
}));

// Serve landing page as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Frontend server running at http://localhost:${PORT}`);
  console.log(`📱 Landing page: http://localhost:${PORT}/landing.html`);
  console.log(`🎯 Main app: http://localhost:${PORT}/main.html`);
  console.log(`🔌 API proxied from: http://localhost:3001`);
});
