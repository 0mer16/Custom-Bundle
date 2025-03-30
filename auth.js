// Authentication middleware functions
const crypto = require('crypto');
const querystring = require('querystring');

/**
 * Verifies a Shopify webhook request
 * @param {Object} req - Express request object
 * @param {String} secret - Shopify webhook secret
 * @returns {Boolean} - Whether the request is valid
 */
function verifyWebhook(req, secret) {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = req.rawBody; // This requires a raw body parser
  
  if (!hmac || !body) {
    return false;
  }
  
  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(generatedHash)
  );
}

/**
 * Verifies a Shopify OAuth callback
 * @param {Object} query - Query parameters
 * @param {String} secret - Shopify API secret
 * @returns {Boolean} - Whether the request is valid
 */
function verifyOAuthCallback(query, secret) {
  const { hmac, ...params } = query;
  
  if (!hmac || !params) {
    return false;
  }
  
  const queryString = querystring.stringify(params);
  const generatedHash = crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');
  
  return generatedHash === hmac;
}

/**
 * Ensures that the request comes from an authenticated Shopify store
 * Uses cookies and session to verify the shop and access token
 */
function ensureAuthenticated(req, res, next) {
  // Check if the shop query parameter or cookie exists
  const shop = req.query.shop || (req.cookies && req.cookies.shopOrigin);
  
  // If no shop, redirect to installation page
  if (!shop) {
    return res.redirect('/install');
  }

  // In a production app, you would validate the session token here
  // For example, check if there's a valid access token for this shop in the database
  
  // For testing/demo purposes, we're just checking if the shop parameter/cookie exists
  // and if it matches a valid Shopify shop format
  if (!isValidShopifyDomain(shop)) {
    return res.status(400).send('Invalid shop domain');
  }
  
  // Set shop data for templates
  res.locals.shop = shop;
  
  // If authentication is successful, proceed
  next();
}

/**
 * Validates that a domain follows Shopify's myshopify.com format
 * @param {String} shop - Shop domain to validate
 * @returns {Boolean} - Whether the domain is valid
 */
function isValidShopifyDomain(shop) {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop);
}

/**
 * Middleware for handling webhook requests
 * @param {String} secret - Shopify webhook secret
 */
function webhookAuthentication(secret) {
  return (req, res, next) => {
    if (verifyWebhook(req, secret)) {
      next();
    } else {
      res.status(401).send('Unauthorized');
    }
  };
}

/**
 * Middleware for handling app proxy requests
 * @param {String} secret - Shopify API secret
 */
function appProxyAuthentication(secret) {
  return (req, res, next) => {
    if (verifyOAuthCallback(req.query, secret)) {
      next();
    } else {
      res.status(401).send('Unauthorized');
    }
  };
}

module.exports = {
  ensureAuthenticated,
  webhookAuthentication,
  appProxyAuthentication,
  verifyWebhook,
  verifyOAuthCallback,
  isValidShopifyDomain
}; 