const { DataType } = require('@shopify/shopify-api');
const Bundle = require('../models/Bundle');

/**
 * Bundle controller for managing bundles
 */
const bundleController = {
  /**
   * Get all bundles
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Bundles list
   */
  async getBundles(req, res) {
    try {
      const session = res.locals.shopify.session;
      const client = new res.locals.shopify.api.clients.Graphql({ session });

      // In a real app, you would query your database for bundles
      // This is a mockup using Shopify's metafield API
      const response = await client.query({
        data: {
          query: `query {
            app {
              metafields(first: 10, namespace: "custom_bundles") {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
            }
          }`
        }
      });

      // Parse metafields as bundles
      const bundles = response.body.data.app.metafields.edges.map(edge => {
        const rawBundle = JSON.parse(edge.node.value);
        return {
          id: edge.node.key,
          ...rawBundle
        };
      });

      return res.status(200).json({
        bundles: bundles.map(bundle => Bundle.transform(bundle))
      });
    } catch (error) {
      console.error('Error fetching bundles:', error);
      return res.status(500).json({ error: 'Failed to fetch bundles' });
    }
  },

  /**
   * Get a specific bundle by ID
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Bundle data
   */
  async getBundle(req, res) {
    try {
      const { id } = req.params;
      const session = res.locals.shopify.session;
      const client = new res.locals.shopify.api.clients.Graphql({ session });

      // In a real app, you would query your database for the bundle by ID
      // This is a mockup using Shopify's metafield API
      const response = await client.query({
        data: {
          query: `query {
            app {
              metafield(namespace: "custom_bundles", key: "${id}") {
                key
                value
              }
            }
          }`
        }
      });

      if (!response.body.data.app.metafield) {
        return res.status(404).json({ error: 'Bundle not found' });
      }

      const rawBundle = JSON.parse(response.body.data.app.metafield.value);
      const bundle = {
        id: response.body.data.app.metafield.key,
        ...rawBundle
      };

      return res.status(200).json({
        bundle: Bundle.transform(bundle)
      });
    } catch (error) {
      console.error('Error fetching bundle:', error);
      return res.status(500).json({ error: 'Failed to fetch bundle' });
    }
  },

  /**
   * Create a new bundle
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - New bundle data
   */
  async createBundle(req, res) {
    try {
      const bundleData = req.body;
      const session = res.locals.shopify.session;
      const client = new res.locals.shopify.api.clients.Graphql({ session });

      // Generate a unique ID for the bundle
      const bundleId = `bundle_${Date.now()}`;

      // In a real app, you would save this to your database
      // This is a mockup using Shopify's metafield API
      const response = await client.query({
        data: {
          query: `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                namespace
                value
              }
              userErrors {
                field
                message
              }
            }
          }`,
          variables: {
            metafields: [
              {
                namespace: "custom_bundles",
                key: bundleId,
                value: JSON.stringify(bundleData),
                ownerId: "gid://shopify/App/1234567890" // Replace with your app's ID
              }
            ]
          }
        }
      });

      if (response.body.data.metafieldsSet.userErrors.length > 0) {
        return res.status(400).json({ 
          errors: response.body.data.metafieldsSet.userErrors 
        });
      }

      const bundle = {
        id: bundleId,
        ...bundleData
      };

      return res.status(201).json({
        bundle: Bundle.transform(bundle),
        message: 'Bundle created successfully'
      });
    } catch (error) {
      console.error('Error creating bundle:', error);
      return res.status(500).json({ error: 'Failed to create bundle' });
    }
  },

  /**
   * Update an existing bundle
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Updated bundle data
   */
  async updateBundle(req, res) {
    try {
      const { id } = req.params;
      const bundleData = req.body;
      const session = res.locals.shopify.session;
      const client = new res.locals.shopify.api.clients.Graphql({ session });

      // Update the bundle data with the current timestamp
      bundleData.updatedAt = new Date();

      // In a real app, you would update this in your database
      // This is a mockup using Shopify's metafield API
      const response = await client.query({
        data: {
          query: `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                namespace
                value
              }
              userErrors {
                field
                message
              }
            }
          }`,
          variables: {
            metafields: [
              {
                namespace: "custom_bundles",
                key: id,
                value: JSON.stringify(bundleData),
                ownerId: "gid://shopify/App/1234567890" // Replace with your app's ID
              }
            ]
          }
        }
      });

      if (response.body.data.metafieldsSet.userErrors.length > 0) {
        return res.status(400).json({ 
          errors: response.body.data.metafieldsSet.userErrors 
        });
      }

      const bundle = {
        id,
        ...bundleData
      };

      return res.status(200).json({
        bundle: Bundle.transform(bundle),
        message: 'Bundle updated successfully'
      });
    } catch (error) {
      console.error('Error updating bundle:', error);
      return res.status(500).json({ error: 'Failed to update bundle' });
    }
  },

  /**
   * Delete a bundle
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object} - Deletion status
   */
  async deleteBundle(req, res) {
    try {
      const { id } = req.params;
      const session = res.locals.shopify.session;
      const client = new res.locals.shopify.api.clients.Graphql({ session });

      // In a real app, you would delete this from your database
      // This is a mockup using Shopify's metafield API
      const response = await client.query({
        data: {
          query: `mutation metafieldDelete($input: MetafieldDeleteInput!) {
            metafieldDelete(input: $input) {
              deletedId
              userErrors {
                field
                message
              }
            }
          }`,
          variables: {
            input: {
              id: `gid://shopify/Metafield/${id}`
            }
          }
        }
      });

      if (response.body.data.metafieldDelete.userErrors.length > 0) {
        return res.status(400).json({ 
          errors: response.body.data.metafieldDelete.userErrors 
        });
      }

      return res.status(200).json({
        message: 'Bundle deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting bundle:', error);
      return res.status(500).json({ error: 'Failed to delete bundle' });
    }
  }
};

module.exports = bundleController; 