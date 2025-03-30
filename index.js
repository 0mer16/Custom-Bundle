// Simple Express server setup for Render deployment
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

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

// In-memory storage for bundles (replace with database in production)
const bundles = [];

// Helper functions for Shopify API
async function getShopifyProducts(shop, accessToken, limit = 10) {
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/2023-07/products.json?limit=${limit}`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    return response.data.products;
  } catch (error) {
    console.error('Error fetching Shopify products:', error.message);
    return [];
  }
}

async function getShopifyProductDetails(shop, accessToken, productId) {
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/2023-07/products/${productId}.json`,
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    return response.data.product;
  } catch (error) {
    console.error('Error fetching Shopify product details:', error.message);
    return null;
  }
}

// API Endpoints for Bundle Management
app.get('/api/bundles', (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(200).json({ bundles });
});

app.post('/api/bundles', async (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { title, description, price, compareAtPrice, status, items } = req.body;
    
    // Validate required fields
    if (!title || !price || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create new bundle
    const newBundle = {
      id: uuidv4(),
      shop,
      title,
      description,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      status: status || 'draft',
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bundles.push(newBundle);
    res.status(201).json(newBundle);
  } catch (error) {
    console.error('Error creating bundle:', error.message);
    res.status(500).json({ error: 'Failed to create bundle' });
  }
});

app.get('/api/bundles/:id', (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const bundle = bundles.find(b => b.id === req.params.id && b.shop === shop);
  
  if (!bundle) {
    return res.status(404).json({ error: 'Bundle not found' });
  }

  res.status(200).json(bundle);
});

app.put('/api/bundles/:id', (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const bundleIndex = bundles.findIndex(b => b.id === req.params.id && b.shop === shop);
  
  if (bundleIndex === -1) {
    return res.status(404).json({ error: 'Bundle not found' });
  }

  try {
    const { title, description, price, compareAtPrice, status, items } = req.body;
    
    // Validate required fields
    if (!title || !price || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update bundle
    bundles[bundleIndex] = {
      ...bundles[bundleIndex],
      title,
      description,
      price: parseFloat(price),
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      status: status || 'draft',
      items,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json(bundles[bundleIndex]);
  } catch (error) {
    console.error('Error updating bundle:', error.message);
    res.status(500).json({ error: 'Failed to update bundle' });
  }
});

app.delete('/api/bundles/:id', (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const bundleIndex = bundles.findIndex(b => b.id === req.params.id && b.shop === shop);
  
  if (bundleIndex === -1) {
    return res.status(404).json({ error: 'Bundle not found' });
  }

  bundles.splice(bundleIndex, 1);
  res.status(204).send();
});

// Get shop products for bundle creation
app.get('/api/products', async (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const limit = req.query.limit || 50;
    const products = await getShopifyProducts(shop, accessToken, limit);
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

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
    
    // Store the shop domain as well
    res.cookie('shopify_shop', shop, { 
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
  const shop = req.query.shop || req.signedCookies.shopify_shop;
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
        <link rel="stylesheet" href="/bundles.css">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <header>
          <div class="header-content">
            <h2>Custom Bundles</h2>
            <div class="shop-name">${shop}</div>
          </div>
        </header>
        
        <div class="container">
          <div class="card">
            <h1>Shopify Custom Bundles App</h1>
            
            <div style="background-color: #d8f4ea; border: 1px solid #95e1c9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
              <h2 style="margin-top: 0;">✓ Installation Complete!</h2>
              <p>Your Custom Bundles app has been successfully installed on ${shop}.</p>
            </div>
            
            <h3>Next Steps:</h3>
            <ul>
              <li>Create your first product bundle</li>
              <li>Configure bundle settings</li>
              <li>Promote your bundles to increase sales</li>
            </ul>
            
            <div style="margin-top: 24px; display: flex; gap: 16px;">
              <a href="/bundles/manage" class="button">Manage Bundles</a>
              <a href="/bundles" class="button button-secondary">View Storefront</a>
            </div>
          </div>
          
          <div class="card">
            <h2>Quick Stats</h2>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;">
              <div style="background-color: #f6f6f7; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 32px; font-weight: 600; color: var(--primary-color);">${bundles.length}</div>
                <div>Total Bundles</div>
              </div>
              <div style="background-color: #f6f6f7; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 32px; font-weight: 600; color: var(--primary-color);">${bundles.filter(b => b.status === 'active').length}</div>
                <div>Active Bundles</div>
              </div>
              <div style="background-color: #f6f6f7; padding: 16px; border-radius: 4px; text-align: center;">
                <div style="font-size: 32px; font-weight: 600; color: var(--primary-color);">0</div>
                <div>Bundle Orders</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Bundle Management Dashboard
app.get('/bundles/manage', (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  if (!shop || !accessToken) {
    // If not authenticated, redirect to auth
    return res.redirect(`/auth?shop=${shop || 'your-shop.myshopify.com'}`);
  }

  // Display the bundle management interface
  res.send(`
    <html>
      <head>
        <title>Bundle Manager - Custom Bundles</title>
        <link rel="stylesheet" href="/bundles.css">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <header>
          <div class="header-content">
            <h2>Custom Bundles</h2>
            <div class="shop-name">${shop}</div>
          </div>
        </header>
        
        <div class="container">
          <div class="page-title">
            <h1>Bundle Manager</h1>
            <button class="button" id="createBundleBtn">Create Bundle</button>
          </div>
          
          <div class="card" id="bundleList">
            <div class="loading-state">Loading bundles...</div>
          </div>
        </div>
        
        <!-- Create Bundle Modal -->
        <div id="bundleModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Create New Bundle</h2>
              <span class="close">&times;</span>
            </div>
            
            <form id="bundleForm">
              <div class="form-group">
                <label for="title">Bundle Title</label>
                <input type="text" id="title" name="title" required placeholder="e.g., Summer Essentials Bundle">
              </div>
              
              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" rows="3" placeholder="Describe your bundle..."></textarea>
              </div>
              
              <div class="form-group">
                <label for="price">Bundle Price</label>
                <input type="number" id="price" name="price" step="0.01" required placeholder="e.g., 99.99">
              </div>
              
              <div class="form-group">
                <label for="compareAtPrice">Compare-at Price (Optional)</label>
                <input type="number" id="compareAtPrice" name="compareAtPrice" step="0.01" placeholder="e.g., 129.99">
              </div>
              
              <div class="form-group">
                <label for="status">Status</label>
                <select id="status" name="status">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
              
              <h3>Bundle Items</h3>
              <div id="bundleItems">
                <!-- Items will be added here dynamically -->
              </div>
              
              <button type="button" class="button button-secondary" id="addItemBtn">Add Item</button>
              
              <div style="margin-top: 24px; text-align: right;">
                <button type="button" class="button button-secondary" id="cancelBtn" style="margin-right: 8px;">Cancel</button>
                <button type="submit" class="button">Save Bundle</button>
              </div>
            </form>
          </div>
        </div>
        
        <script src="/bundles.js"></script>
      </body>
    </html>
  `);
});

// Storefront bundle display
app.get('/bundles/:id', async (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;
  const bundleId = req.params.id;

  try {
    // Get bundle details
    const bundle = bundles.find(b => b.id === bundleId);
    
    if (!bundle) {
      return res.status(404).send('Bundle not found');
    }

    // Get product details for each item in the bundle
    const bundleItems = [];
    
    if (bundle.items && Array.isArray(bundle.items)) {
      for (const item of bundle.items) {
        // Extract the numeric ID from the Shopify product ID
        const productIdMatch = item.productId.match(/\/Product\/(\d+)$/);
        const productId = productIdMatch ? productIdMatch[1] : null;
        
        if (productId) {
          const product = await getShopifyProductDetails(shop, accessToken, productId);
          if (product) {
            bundleItems.push({
              ...item,
              product
            });
          }
        }
      }
    }

    // Calculate savings
    const originalPrice = bundleItems.reduce((sum, item) => {
      // Use the first variant's price as the item price
      const variantPrice = item.product.variants && item.product.variants.length > 0 
        ? parseFloat(item.product.variants[0].price) 
        : 0;
      return sum + variantPrice;
    }, 0);
    
    const bundlePrice = bundle.price;
    const savings = originalPrice - bundlePrice;
    const savingsPercentage = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

    // Get primary bundle image (from first product)
    const bundleImage = bundleItems.length > 0 && bundleItems[0].product.image 
      ? bundleItems[0].product.image.src 
      : 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-5_large.png';

    // Render the bundle page
    res.send(`
      <html>
        <head>
          <title>${bundle.title} - Custom Bundle</title>
          <link rel="stylesheet" href="/bundles.css">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <header>
            <div class="header-content">
              <h2>Gift Bundles</h2>
              <div>
                <a href="/bundles" style="text-decoration: none; color: inherit; margin-right: 15px;">Shop</a>
                <a href="/cart" style="text-decoration: none; color: inherit;">Cart</a>
              </div>
            </div>
          </header>
          
          <div class="bundle-detail-page">
            <div style="margin: 15px 0; font-size: 14px; color: #666;">
              <a href="/bundles" style="color: inherit; text-decoration: none;">Gift Sets</a> / ${bundle.title}
            </div>
            
            <div class="bundle-detail-container">
              <!-- Left column - Bundle image -->
              <div class="bundle-detail-image">
                <img src="${bundleImage}" alt="${bundle.title}">
              </div>
              
              <!-- Right column - Bundle details and form -->
              <div class="bundle-detail-info">
                <div class="bestseller-badge">BestSeller</div>
                <h1>${bundle.title}</h1>
                
                <div class="bundle-price">
                  SGD $${bundlePrice.toFixed(2)}
                  ${originalPrice > bundlePrice ? `
                    <span class="bundle-savings">${savingsPercentage}% OFF</span>
                  ` : ''}
                </div>
                
                <form id="bundle-form" action="/cart/add" method="post">
                  <input type="hidden" name="bundle_id" value="${bundle.id}">
                  
                  <div class="whats-included">
                    <h2>What's included</h2>
                    
                    ${bundleItems.map((item, index) => {
                      const product = item.product;
                      
                      return `
                        <div class="bundle-item-row">
                          <h3>${item.title || product.title}</h3>
                          
                          ${item.options && item.options.length > 0 ? 
                            item.options.map(option => {
                              // Determine if this is a color or size option
                              const isColor = option.type.toLowerCase() === 'color';
                              const isSize = option.type.toLowerCase() === 'size';
                              
                              if (isColor) {
                                return `
                                  <div class="color-selector">
                                    <label>Colour ${option.type}</label>
                                    <div class="color-options">
                                      ${option.values.map((value, i) => {
                                        let bgColor = '#ccc';
                                        // Map common color names to hex values
                                        if (value.toLowerCase().includes('pink')) bgColor = '#f8c0c8';
                                        if (value.toLowerCase().includes('blue')) bgColor = '#a0c8f0';
                                        if (value.toLowerCase().includes('grey') || value.toLowerCase().includes('gray')) bgColor = '#a0a0a0';
                                        if (value.toLowerCase().includes('white')) bgColor = '#ffffff';
                                        if (value.toLowerCase().includes('black')) bgColor = '#333333';
                                        if (value.toLowerCase().includes('green')) bgColor = '#a0d6a0';
                                        
                                        return `
                                          <div class="color-option ${i === 0 ? 'selected' : ''}" 
                                               style="background-color: ${bgColor};"
                                               data-value="${value}" 
                                               data-item-index="${index}"
                                               data-option-type="color"
                                               onclick="selectOption(this)"></div>
                                        `;
                                      }).join('')}
                                    </div>
                                    <input type="hidden" name="items[${index}][color]" id="color-input-${index}" value="${option.values[0]}">
                                  </div>
                                `;
                              } else if (isSize) {
                                return `
                                  <div class="size-selector">
                                    <label>Select ${option.type}</label>
                                    <div class="size-options">
                                      ${option.values.map((value, i) => `
                                        <div class="size-option ${i === 0 ? 'selected' : ''}" 
                                             data-value="${value}" 
                                             data-item-index="${index}"
                                             data-option-type="size"
                                             onclick="selectOption(this)">${value}</div>
                                      `).join('')}
                                    </div>
                                    <input type="hidden" name="items[${index}][size]" id="size-input-${index}" value="${option.values[0]}">
                                  </div>
                                `;
                              } else {
                                return `
                                  <div class="form-group">
                                    <label for="item-option-${index}">${option.type}:</label>
                                    <select name="items[${index}][option]" id="item-option-${index}" required>
                                      ${option.values.map(value => {
                                        const variant = product.variants.find(v => v.title.includes(value));
                                        const price = variant ? variant.price : product.variants[0].price;
                                        const comparePrice = variant && variant.compare_at_price ? variant.compare_at_price : null;
                                        
                                        return `
                                          <option 
                                            value="${value}" 
                                            data-variant-id="${variant ? variant.id : ''}"
                                            data-price="${price}"
                                            data-compare-price="${comparePrice || price}"
                                          >${value}</option>
                                        `;
                                      }).join('')}
                                    </select>
                                  </div>
                                `;
                              }
                            }).join('') 
                            : 
                            `<input type="hidden" name="items[${index}][option]" value="default">`
                          }
                          
                          <input type="hidden" name="items[${index}][product_id]" value="${product.id}">
                          <input type="hidden" name="items[${index}][title]" value="${item.title || product.title}">
                        </div>
                      `;
                    }).join('')}
                  </div>
                  
                  <!-- Select headwear section similar to Raph&Remy -->
                  <div class="form-group">
                    <h3>Select one headwear below</h3>
                    <div class="form-group">
                      <select name="headwear_option" id="headwear-option" required>
                        <option value="beanie">Premium Bamboo Reversible Slouch Baby Beanie</option>
                        <option value="headband">Premium 2.5" Newborn Baby Headbands & Clips Trio Pack</option>
                      </select>
                    </div>
                  </div>
                  
                  <!-- Free gift card section -->
                  <div class="form-group">
                    <h3>Free gift card (choose option)</h3>
                    <div class="form-group">
                      <select name="gift_card_option" id="gift-card-option" required>
                        <option value="loved">You Are Loved Little One - Gift Card</option>
                        <option value="parenting">You Guys Are Going To Nail This Whole Parenting Thing - Gift Card</option>
                        <option value="love">With Love - Gift Card</option>
                      </select>
                    </div>
                  </div>
                  
                  <!-- Add to cart button -->
                  <div class="add-to-cart-row">
                    <button type="submit" class="add-to-cart">Add to cart</button>
                  </div>
                </form>
                
                <!-- Bundle description -->
                <div class="bundle-description-full">
                  <h2>Description</h2>
                  <p>${bundle.description || 'Our best-selling celebratory gift set packed with premium key essential items. Exploring first foods, teething and little growing bodies, this luxurious gift set is not only extremely useful for every new parent, but a total crowd-pleaser to unbox.'}</p>
                </div>
                
                <!-- Reviews section -->
                <div class="reviews-section">
                  <h2>Reviews</h2>
                  <div class="review">
                    <div class="review-content">"Today this gift arrived and the whole family just loved it! We've had an amazing unboxing experience and the gifts are just beautiful and so sweet, ❤️ we are really touched!"</div>
                    <div class="review-author">Lavania</div>
                  </div>
                  <div class="review">
                    <div class="review-content">"What amazing quality and oof, can't stop feeling them. Im a convert and a fan!"</div>
                    <div class="review-author">Jaime</div>
                  </div>
                  <div class="review">
                    <div class="review-content">"I adore these items! Especially the bamboo onesie and bib!"</div>
                    <div class="review-author">Tara</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Related products section -->
            <div class="related-products">
              <h2>You may also like</h2>
              <div class="product-grid">
                ${bundles.filter(b => b.id !== bundleId && b.status === 'active').slice(0, 4).map(relatedBundle => `
                  <a href="/bundles/${relatedBundle.id}" class="product-card">
                    <div class="product-image" style="background-image: url('${bundleImage}')"></div>
                    <div class="product-details">
                      <div class="product-title">${relatedBundle.title}</div>
                      <div class="product-price">
                        $${relatedBundle.price.toFixed(2)}
                        ${relatedBundle.compareAtPrice ? `
                          <span class="compare-price">$${relatedBundle.compareAtPrice.toFixed(2)}</span>
                        ` : ''}
                      </div>
                    </div>
                  </a>
                `).join('')}
              </div>
            </div>
          </div>
          
          <script>
            // Function to handle option selection (colors, sizes)
            function selectOption(element) {
              const optionType = element.dataset.optionType;
              const itemIndex = element.dataset.itemIndex;
              const value = element.dataset.value;
              
              // Remove selected class from siblings
              const siblings = element.parentNode.querySelectorAll(\`.\${optionType}-option\`);
              siblings.forEach(sib => sib.classList.remove('selected'));
              
              // Add selected class to clicked element
              element.classList.add('selected');
              
              // Update hidden input
              document.getElementById(\`\${optionType}-input-\${itemIndex}\`).value = value;
            }
          </script>
          <script src="/bundles.js"></script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering bundle page:', error);
    res.status(500).send('Error loading bundle details');
  }
});

// Storefront bundles display
app.get('/bundles', async (req, res) => {
  const shop = req.signedCookies.shopify_shop;
  const accessToken = req.signedCookies.shopify_access_token;

  try {
    // Filter active bundles
    const activeBundles = bundles.filter(bundle => bundle.status === 'active');
    
    // Get product details for each bundle's first item (for thumbnail)
    const bundlesWithImages = await Promise.all(activeBundles.map(async (bundle) => {
      let bundleImage = 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-5_large.png';
      
      if (bundle.items && bundle.items.length > 0) {
        const item = bundle.items[0];
        const productIdMatch = item.productId.match(/\/Product\/(\d+)$/);
        const productId = productIdMatch ? productIdMatch[1] : null;
        
        if (productId) {
          const product = await getShopifyProductDetails(shop, accessToken, productId);
          if (product && product.image) {
            bundleImage = product.image.src;
          }
        }
      }
      
      return {
        ...bundle,
        image: bundleImage
      };
    }));

    // Render the bundles page
    res.send(`
      <html>
        <head>
          <title>Gift Bundles - Shop Our Collections</title>
          <link rel="stylesheet" href="/bundles.css">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <header>
            <div class="header-content">
              <h2>Gift Bundles</h2>
              <div>
                <a href="/bundles" style="text-decoration: none; color: inherit; margin-right: 15px;">Shop</a>
                <a href="/cart" style="text-decoration: none; color: inherit;">Cart</a>
              </div>
            </div>
          </header>
          
          <div style="text-align: center; background-color: #f1f1f1; padding: 10px 0; margin-bottom: 20px;">
            <strong>NOTHING OVER $200</strong>
          </div>
          
          <div class="bundle-page">
            <div class="bundle-hero">
              <h1>Shop Our Gift Bundles</h1>
              <div class="bundle-description">
                Discover our expertly curated gift bundles, perfect for any occasion. 
                Each bundle offers exceptional value with savings built right in!
              </div>
              
              <div style="margin: 20px 0; display: flex; justify-content: center; gap: 10px; font-size: 14px; color: #666;">
                <div>Worldwide shipping. Free delivery for orders above $99.</div>
                <div>|</div>
                <div>Bundle Bonanza: Up to 25% off in Bundle Deals.</div>
              </div>
            </div>
            
            <div class="product-grid">
              ${bundlesWithImages.length > 0 ? bundlesWithImages.map(bundle => {
                // Calculate savings percentage if compareAtPrice exists
                const savingsPercentage = bundle.compareAtPrice 
                  ? Math.round(((bundle.compareAtPrice - bundle.price) / bundle.compareAtPrice) * 100) 
                  : 0;
                
                return `
                  <div class="product-card">
                    <a href="/bundles/${bundle.id}" style="text-decoration: none; color: inherit;">
                      <div class="product-image" style="background-image: url('${bundle.image}')"></div>
                      <div class="product-details">
                        ${savingsPercentage > 0 ? `
                          <div style="position: absolute; top: 10px; right: 10px; background-color: #000; color: white; padding: 5px 8px; font-size: 12px; font-weight: bold; border-radius: 3px;">
                            ${savingsPercentage}% OFF
                          </div>
                        ` : ''}
                        <div class="product-title">${bundle.title}</div>
                        <div class="product-price">
                          SGD $${bundle.price.toFixed(2)}
                          ${bundle.compareAtPrice ? `
                            <span class="compare-price">$${bundle.compareAtPrice.toFixed(2)}</span>
                          ` : ''}
                        </div>
                        <div style="margin-top: 12px;">
                          <span class="button button-small" style="background-color: #000; width: 100%; text-align: center;">View Bundle</span>
                        </div>
                      </div>
                    </a>
                  </div>
                `;
              }).join('') : `
                <div class="empty-state" style="grid-column: 1 / -1">
                  <h2>No bundles available</h2>
                  <p>Check back soon for our curated bundle collections!</p>
                </div>
              `}
            </div>
            
            <!-- Footer section with features -->
            <div style="margin-top: 60px; display: flex; justify-content: space-between; text-align: center; padding: 30px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
              <div style="flex: 1;">
                <h3 style="font-size: 16px; font-weight: 600;">Supremely Soft Fabrics</h3>
                <p style="color: #666; font-size: 14px;">Premium quality materials for comfort</p>
              </div>
              <div style="flex: 1;">
                <h3 style="font-size: 16px; font-weight: 600;">Thoughtfully Curated</h3>
                <p style="color: #666; font-size: 14px;">Perfect combinations for every occasion</p>
              </div>
              <div style="flex: 1;">
                <h3 style="font-size: 16px; font-weight: 600;">Eco-Friendly Packaging</h3>
                <p style="color: #666; font-size: 14px;">Sustainable and beautiful presentation</p>
              </div>
            </div>
            
            <!-- Reviews section -->
            <div style="margin: 60px 0; text-align: center;">
              <h2 style="margin-bottom: 30px;">What Our Customers Say</h2>
              <div style="display: flex; justify-content: space-between; gap: 30px;">
                <div style="flex: 1; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                  <p style="font-style: italic; color: #333;">"Today this gift arrived and the whole family just loved it! We've had an amazing unboxing experience and the gifts are just beautiful and so sweet."</p>
                  <p style="font-weight: 500; margin-top: 15px;">Lavania</p>
                </div>
                <div style="flex: 1; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                  <p style="font-style: italic; color: #333;">"What amazing quality and oof, can't stop feeling them. Im a convert and a fan!"</p>
                  <p style="font-weight: 500; margin-top: 15px;">Jaime</p>
                </div>
                <div style="flex: 1; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                  <p style="font-style: italic; color: #333;">"I adore these items! Especially the bamboo onesie and bib!"</p>
                  <p style="font-weight: 500; margin-top: 15px;">Tara</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Simple footer -->
          <footer style="background-color: #f8f8f8; padding: 40px 0; text-align: center;">
            <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                <div style="text-align: left;">
                  <h3 style="margin-bottom: 15px; font-size: 16px;">Shop</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 8px;"><a href="/bundles" style="color: #666; text-decoration: none;">All Bundles</a></li>
                    <li style="margin-bottom: 8px;"><a href="/bundles" style="color: #666; text-decoration: none;">Gift Sets</a></li>
                    <li style="margin-bottom: 8px;"><a href="/bundles" style="color: #666; text-decoration: none;">Build-A-Gift</a></li>
                  </ul>
                </div>
                <div style="text-align: left;">
                  <h3 style="margin-bottom: 15px; font-size: 16px;">About</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 8px;"><a href="#" style="color: #666; text-decoration: none;">Our Story</a></li>
                    <li style="margin-bottom: 8px;"><a href="#" style="color: #666; text-decoration: none;">Sustainability</a></li>
                    <li style="margin-bottom: 8px;"><a href="#" style="color: #666; text-decoration: none;">Premium Materials</a></li>
                  </ul>
                </div>
                <div style="text-align: left;">
                  <h3 style="margin-bottom: 15px; font-size: 16px;">Support</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin-bottom: 8px;"><a href="#" style="color: #666; text-decoration: none;">FAQ</a></li>
                    <li style="margin-bottom: 8px;"><a href="#" style="color: #666; text-decoration: none;">Contact</a></li>
                    <li style="margin-bottom: 8px;"><a href="#" style="color: #666; text-decoration: none;">Returns Policy</a></li>
                  </ul>
                </div>
              </div>
              <div style="color: #999; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
                &copy;2025 Custom Bundles. All rights reserved.
              </div>
            </div>
          </footer>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering bundles page:', error);
    res.status(500).send('Error loading bundles');
  }
});

// Add bundle to cart endpoint
app.post('/cart/add', (req, res) => {
  // In a real implementation, this would add items to the Shopify cart via API
  // For this example, we'll just redirect to a success page
  res.redirect('/cart');
});

// Simple mock cart page
app.get('/cart', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Shopping Cart - Custom Bundles</title>
        <link rel="stylesheet" href="/bundles.css">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <header>
          <div class="header-content">
            <h2>Shopping Cart</h2>
          </div>
        </header>
        
        <div class="container">
          <div class="card">
            <h1>Your Cart</h1>
            <p>Bundle added to cart successfully!</p>
            <p>In a real implementation, this would show your Shopify cart.</p>
            <a href="/" class="button">Continue Shopping</a>
          </div>
        </div>
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
        <link rel="stylesheet" href="/bundles.css">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body>
        <header>
          <div class="header-content">
            <h2>Custom Bundles</h2>
          </div>
        </header>
        
        <div class="container">
          <div class="card">
            <h1>Shopify Custom Bundles App</h1>
            <p>Your custom bundle application is running successfully.</p>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <span>API Key:</span>
              <span style="color: ${process.env.SHOPIFY_API_KEY ? '#108043' : '#de3618'}; font-weight: 500;">
                ${process.env.SHOPIFY_API_KEY ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <span>API Secret:</span>
              <span style="color: ${process.env.SHOPIFY_API_SECRET ? '#108043' : '#de3618'}; font-weight: 500;">
                ${process.env.SHOPIFY_API_SECRET ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
              <span>HOST:</span>
              <span>${process.env.HOST || 'Not configured'}</span>
            </div>
          </div>
          
          <div class="card">
            <h3>Install on your store:</h3>
            <p>To install this app on your Shopify store, use the link:</p>
            <code style="background-color: #f6f6f7; padding: 8px; border-radius: 4px; display: block; margin: 16px 0;">
              ${process.env.HOST}/auth?shop=your-store.myshopify.com
            </code>
            <p>Replace "your-store.myshopify.com" with your actual store domain.</p>
            
            <div style="margin-top: 16px; display: flex; gap: 16px;">
              <a href="/auth?shop=fva1ra-vz.myshopify.com" class="button">Install on Demo Store</a>
              <a href="/bundles" class="button button-secondary">View Bundles Storefront</a>
            </div>
          </div>
        </div>
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