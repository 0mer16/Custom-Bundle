// Simple Express server setup for Render deployment
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8081;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files if available
app.use(express.static(join(__dirname, 'public')));

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Custom Bundles app is running' });
});

// Default route
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>Shopify Custom Bundles</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #004c3f; }
        </style>
      </head>
      <body>
        <h1>Shopify Custom Bundles App</h1>
        <p>Your custom bundle application is running successfully.</p>
        <p>API Key: ${process.env.SHOPIFY_API_KEY ? '✓ Configured' : '✗ Missing'}</p>
        <p>API Secret: ${process.env.SHOPIFY_API_SECRET ? '✓ Configured' : '✗ Missing'}</p>
        <p>HOST: ${process.env.HOST || 'Not configured'}</p>
      </body>
    </html>
  `);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key configured: ${Boolean(process.env.SHOPIFY_API_KEY)}`);
  console.log(`API Secret configured: ${Boolean(process.env.SHOPIFY_API_SECRET)}`);
  console.log(`HOST: ${process.env.HOST || 'Not configured'}`);
}); 