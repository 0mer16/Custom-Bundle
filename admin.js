const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const { ensureAuthenticated } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only images
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// In-memory storage for bundles (replace with database in production)
let bundles = [];

// Shopify API helpers
async function getShopifyAccessToken(shop) {
  // In a real implementation, this would retrieve the token from a database
  // For demo purposes, we're just returning a placeholder
  return process.env.SHOPIFY_ACCESS_TOKEN || '';
}

async function fetchShopifyProducts(shop, accessToken, query = '', limit = 10) {
  try {
    const url = query
      ? `https://${shop}/admin/api/2023-04/products.json?limit=${limit}&title=${encodeURIComponent(query)}`
      : `https://${shop}/admin/api/2023-04/products.json?limit=${limit}`;
    
    const response = await axios({
      url,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.products;
  } catch (error) {
    console.error('Error fetching Shopify products:', error.message);
    throw error;
  }
}

async function fetchShopifyProduct(shop, accessToken, productId) {
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/2023-04/products/${productId}.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.product;
  } catch (error) {
    console.error('Error fetching Shopify product:', error.message);
    throw error;
  }
}

async function createShopifyMetafield(shop, accessToken, ownerId, namespace, key, value, type = 'json_string') {
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/2023-04/metafields.json`,
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      data: {
        metafield: {
          namespace,
          key,
          value: JSON.stringify(value),
          type,
          owner_id: ownerId,
          owner_resource: 'shop'
        }
      }
    });
    
    return response.data.metafield;
  } catch (error) {
    console.error('Error creating Shopify metafield:', error.message);
    throw error;
  }
}

// Admin dashboard page
router.get('/', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.redirect('/install');
  }
  
  try {
    // Get access token
    const accessToken = await getShopifyAccessToken(shop);
    
    res.render('admin/dashboard', {
      title: 'Custom Bundles Admin',
      shop,
      bundles
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Bundles list page
router.get('/bundles', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.redirect('/install');
  }
  
  try {
    // Get access token
    const accessToken = await getShopifyAccessToken(shop);
    
    // Filter bundles for this shop
    const shopBundles = bundles.filter(bundle => bundle.shop === shop);
    
    res.render('admin/bundles/index', {
      title: 'Bundle Manager',
      shop,
      bundles: shopBundles
    });
  } catch (error) {
    console.error('Error loading bundles:', error);
    res.status(500).send('Error loading bundles');
  }
});

// Create bundle page
router.get('/bundles/create', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.redirect('/install');
  }
  
  res.render('admin/bundles/create', {
    title: 'Create Bundle',
    shop
  });
});

// Edit bundle page
router.get('/bundles/:id/edit', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.redirect('/install');
  }
  
  const bundle = bundles.find(b => b.id.toString() === req.params.id && b.shop === shop);
  
  if (!bundle) {
    return res.redirect('/admin/bundles');
  }
  
  res.render('admin/bundles/edit', {
    title: 'Edit Bundle',
    shop,
    bundle
  });
});

// API: Search products
router.get('/api/products/search', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  const query = req.query.query || '';
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const accessToken = await getShopifyAccessToken(shop);
    const products = await fetchShopifyProducts(shop, accessToken, query);
    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'Error searching products' });
  }
});

// API: Get product details
router.get('/api/products/:id', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  const productId = req.params.id;
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const accessToken = await getShopifyAccessToken(shop);
    const product = await fetchShopifyProduct(shop, accessToken, productId);
    res.json(product);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Error getting product' });
  }
});

// API: Upload image
router.post('/api/upload', ensureAuthenticated, upload.single('image'), (req, res) => {
  const shop = req.query.shop || req.body.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // In a real app, you might upload to Shopify's Files API
  // For simplicity, we're just storing locally
  const fileUrl = `/uploads/${req.file.filename}`;
  
  res.json({
    url: fileUrl,
    filename: req.file.filename
  });
});

// API: Save bundle
router.post('/api/bundles', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || req.body.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const bundleData = req.body;
    
    // Validate required fields
    if (!bundleData.title || !bundleData.handle || !bundleData.products || bundleData.products.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Generate ID for new bundle
    const id = Date.now().toString();
    
    // Get access token
    const accessToken = await getShopifyAccessToken(shop);
    
    // Store bundle data in Shopify as metafield
    try {
      await createShopifyMetafield(
        shop,
        accessToken,
        'shop', // Owner ID (using shop as the owner)
        'custom_bundles',
        `bundle_${id}`,
        {
          ...bundleData,
          id
        }
      );
    } catch (metafieldError) {
      console.error('Failed to create Shopify metafield, falling back to in-memory storage:', metafieldError);
      // Metafield creation failed, continue with in-memory storage
    }
    
    // Add to bundles collection (in-memory)
    const newBundle = {
      id,
      ...bundleData,
      shop,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    bundles.push(newBundle);
    
    res.status(201).json(newBundle);
  } catch (error) {
    console.error('Error saving bundle:', error);
    res.status(500).json({ error: 'Error saving bundle' });
  }
});

// API: Update bundle
router.put('/api/bundles/:id', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || req.body.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const bundleIndex = bundles.findIndex(b => b.id.toString() === req.params.id && b.shop === shop);
    
    if (bundleIndex === -1) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    const bundleData = req.body;
    
    // Validate required fields
    if (!bundleData.title || !bundleData.handle || !bundleData.products || bundleData.products.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get access token
    const accessToken = await getShopifyAccessToken(shop);
    
    // Update bundle in Shopify as metafield
    try {
      await createShopifyMetafield(
        shop,
        accessToken,
        'shop', // Owner ID (using shop as the owner)
        'custom_bundles',
        `bundle_${req.params.id}`,
        {
          ...bundleData,
          id: req.params.id
        }
      );
    } catch (metafieldError) {
      console.error('Failed to update Shopify metafield:', metafieldError);
      // Metafield update failed, continue with in-memory update
    }
    
    // Update bundle in memory
    bundles[bundleIndex] = {
      ...bundles[bundleIndex],
      ...bundleData,
      updated_at: new Date().toISOString()
    };
    
    res.json(bundles[bundleIndex]);
  } catch (error) {
    console.error('Error updating bundle:', error);
    res.status(500).json({ error: 'Error updating bundle' });
  }
});

// API: Delete bundle
router.delete('/api/bundles/:id', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const bundleIndex = bundles.findIndex(b => b.id.toString() === req.params.id && b.shop === shop);
    
    if (bundleIndex === -1) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    // Get access token
    const accessToken = await getShopifyAccessToken(shop);
    
    // Delete bundle from Shopify metafields (would require additional code to find and delete the metafield)
    // For simplicity, we're just removing from memory
    
    // Remove bundle from memory
    bundles.splice(bundleIndex, 1);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting bundle:', error);
    res.status(500).json({ error: 'Error deleting bundle' });
  }
});

// API: Get all bundles
router.get('/api/bundles', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Filter bundles for current shop
  const shopBundles = bundles.filter(b => b.shop === shop);
  
  res.json(shopBundles);
});

// API: Get a single bundle
router.get('/api/bundles/:id', ensureAuthenticated, async (req, res) => {
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  if (!shop) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const bundle = bundles.find(b => b.id.toString() === req.params.id && b.shop === shop);
  
  if (!bundle) {
    return res.status(404).json({ error: 'Bundle not found' });
  }
  
  res.json(bundle);
});

module.exports = router; 