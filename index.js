// Simple Express server setup for Render deployment
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';
import cookieParser from 'cookie-parser';

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
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

// Serve static files if available
app.use(express.static(join(__dirname, 'public')));

// Shopify API credentials
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES || 'read_products,write_products,read_orders,write_orders,read_customers,write_customers';
const hostName = process.env.HOST;

// Shopify OAuth Routes
app.get('/auth', (req, res) => {
  const shop = req.query.shop;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-shop.myshopify.com');
  }

  // Validate the shop parameter
  if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
    return res.status(400).send('Invalid shop parameter. Must be a valid myshopify.com domain.');
  }

  // Generate a random nonce for this auth attempt
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Store the nonce in a cookie
  res.cookie('shopify_nonce', nonce, { 
    signed: true, 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });

  // Construct the authorization URL
  const redirectUri = `${hostName}/auth/callback`;
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;

  // Redirect to Shopify OAuth page
  res.redirect(authUrl);
});

// Auth callback route
app.get('/auth/callback', async (req, res) => {
  const { shop, code, state } = req.query;
  const storedNonce = req.signedCookies.shopify_nonce;

  // Validate the callback
  if (!shop || !code || !state) {
    return res.status(400).send('Invalid OAuth callback parameters');
  }

  // Validate the state/nonce
  if (state !== storedNonce) {
    return res.status(403).send('Request origin cannot be verified');
  }

  try {
    // Exchange the auth code for a permanent access token
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: apiKey,
      client_secret: apiSecret,
      code
    });

    const { access_token } = tokenResponse.data;

    // Store this token securely (in a real app, save to database)
    // For this example, we'll just store in a cookie
    res.cookie('shopify_access_token', access_token, { 
      signed: true, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Clear the nonce cookie
    res.clearCookie('shopify_nonce');

    // Redirect to the app
    res.redirect(`/app?shop=${shop}`);
  } catch (error) {
    console.error('OAuth error:', error.message);
    res.status(500).send('Error completing OAuth flow');
  }
});

// App route - where users land after successful installation
app.get('/app', (req, res) => {
  const shop = req.query.shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    // If not authenticated, redirect to auth
    return res.redirect(`/auth?shop=${shop || 'your-shop.myshopify.com'}`);
  }

  // Display the app interface
  res.send(`
    <html>
      <head>
        <title>Custom Bundles for ${shop}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #004c3f; }
          .success-message { 
            background-color: #d8f4ea;
            border: 1px solid #95e1c9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .button {
            background-color: #008060;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Shopify Custom Bundles App</h1>
        
        <div class="success-message">
          <h2>✓ Installation Complete!</h2>
          <p>Your Custom Bundles app has been successfully installed on ${shop}.</p>
        </div>
        
        <h3>Next Steps:</h3>
        <ul>
          <li>Create your first product bundle</li>
          <li>Configure bundle settings</li>
          <li>Add bundle display to your storefront</li>
        </ul>
        
        <a href="/bundles/manage" class="button">Manage Bundles</a>
      </body>
    </html>
  `);
});

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
          .card {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 20px;
          }
          .button {
            background-color: #008060;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            text-decoration: none;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <h1>Shopify Custom Bundles App</h1>
        <div class="card">
          <p>Your custom bundle application is running successfully.</p>
          <p>API Key: ${process.env.SHOPIFY_API_KEY ? '✓ Configured' : '✗ Missing'}</p>
          <p>API Secret: ${process.env.SHOPIFY_API_SECRET ? '✓ Configured' : '✗ Missing'}</p>
          <p>HOST: ${process.env.HOST || 'Not configured'}</p>
        </div>
        
        <h3>Install on your store:</h3>
        <p>To install this app on your Shopify store, use the link:</p>
        <code>${process.env.HOST}/auth?shop=your-store.myshopify.com</code>
        <p>Replace "your-store.myshopify.com" with your actual store domain.</p>
        
        <a href="/auth?shop=fva1ra-vz.myshopify.com" class="button">Install on Demo Store</a>
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
