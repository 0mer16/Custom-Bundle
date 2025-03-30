import React, { useState, useEffect } from 'react';
import {
  Banner,
  Button,
  Card,
  Heading,
  Layout,
  RadioButton,
  Select,
  Stack,
  TextStyle,
  Thumbnail,
} from '@shopify/polaris';

const BundleDisplay = ({ bundleId, shopDomain }) => {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);

  // Fetch bundle data on component mount
  useEffect(() => {
    const fetchBundle = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/storefronts/${shopDomain}/bundles/${bundleId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bundle');
        }
        
        const data = await response.json();
        setBundle(data.bundle);
        
        // Initialize selected options
        const initialOptions = {};
        data.bundle.items.forEach((item) => {
          initialOptions[item.id] = {
            productId: item.productId,
            variantId: '',
            options: {},
          };
          
          // Set default option values
          item.options.forEach((option) => {
            initialOptions[item.id].options[option.type] = 
              option.values.length > 0 ? option.values[0] : '';
          });
        });
        
        setSelectedOptions(initialOptions);
      } catch (error) {
        console.error('Error fetching bundle:', error);
        setError('Unable to load bundle. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (bundleId && shopDomain) {
      fetchBundle();
    }
  }, [bundleId, shopDomain]);

  // Handle option selection changes
  const handleOptionChange = (itemId, optionType, value) => {
    setSelectedOptions((prevOptions) => ({
      ...prevOptions,
      [itemId]: {
        ...prevOptions[itemId],
        options: {
          ...prevOptions[itemId].options,
          [optionType]: value,
        },
      },
    }));
  };

  // Handle variant selection changes
  const handleVariantChange = (itemId, variantId) => {
    setSelectedOptions((prevOptions) => ({
      ...prevOptions,
      [itemId]: {
        ...prevOptions[itemId],
        variantId,
      },
    }));
  };

  // Add bundle to cart
  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      
      // Check if all required selections have been made
      const missingSelections = [];
      bundle.items.forEach((item) => {
        if (item.required && !selectedOptions[item.id].variantId) {
          missingSelections.push(item.title);
        }
      });
      
      if (missingSelections.length > 0) {
        setError(`Please complete your selection for: ${missingSelections.join(', ')}`);
        return;
      }
      
      // Prepare selected items for cart
      const items = [];
      Object.keys(selectedOptions).forEach((itemId) => {
        const option = selectedOptions[itemId];
        if (option.variantId) {
          items.push({
            variantId: option.variantId,
            quantity: 1,
          });
        }
      });
      
      // Add items to cart
      const response = await fetch(`/api/storefronts/${shopDomain}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          attributes: {
            bundle_id: bundleId,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add items to cart');
      }
      
      // Redirect to cart
      window.location.href = '/cart';
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError('Failed to add items to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return <div>Loading bundle...</div>;
  }

  if (error) {
    return (
      <Banner status="critical">
        <p>{error}</p>
      </Banner>
    );
  }

  if (!bundle) {
    return (
      <Banner status="warning">
        <p>Bundle not found</p>
      </Banner>
    );
  }

  return (
    <div className="custom-bundle-container">
      <div className="bundle-header">
        <Heading element="h1">{bundle.title}</Heading>
        {bundle.description && <p>{bundle.description}</p>}
        
        <div className="bundle-pricing">
          <TextStyle variation="strong" element="span" className="bundle-price">
            ${bundle.price}
          </TextStyle>
          
          {bundle.compareAtPrice && (
            <TextStyle variation="subdued" element="span" className="bundle-compare-price">
              ${bundle.compareAtPrice}
            </TextStyle>
          )}
        </div>
      </div>
      
      <Layout>
        {bundle.items.map((item) => (
          <Layout.Section key={item.id}>
            <Card>
              <Card.Section>
                <Stack alignment="center">
                  {item.image && (
                    <Stack.Item>
                      <Thumbnail source={item.image} alt={item.title} />
                    </Stack.Item>
                  )}
                  
                  <Stack.Item fill>
                    <Heading>{item.title}</Heading>
                    {item.description && <p>{item.description}</p>}
                  </Stack.Item>
                  
                  {item.required && (
                    <Stack.Item>
                      <Badge status="info">Required</Badge>
                    </Stack.Item>
                  )}
                </Stack>
              </Card.Section>
              
              <Card.Section title="Select Options">
                {item.options.map((option, index) => (
                  <div key={index} className="bundle-option">
                    <Heading element="h3">{option.type.charAt(0).toUpperCase() + option.type.slice(1)}</Heading>
                    
                    <Stack>
                      {option.values.map((value, valueIndex) => (
                        <Stack.Item key={valueIndex}>
                          {option.type === 'design' || option.type === 'color' ? (
                            <Stack vertical>
                              <RadioButton
                                label={value}
                                checked={selectedOptions[item.id]?.options[option.type] === value}
                                onChange={() => handleOptionChange(item.id, option.type, value)}
                              />
                              
                              {option.type === 'color' && (
                                <div 
                                  className="color-swatch" 
                                  style={{ 
                                    backgroundColor: value.toLowerCase(),
                                    border: `2px solid ${selectedOptions[item.id]?.options[option.type] === value ? '#000' : 'transparent'}`
                                  }}
                                />
                              )}
                            </Stack>
                          ) : (
                            <RadioButton
                              label={value}
                              checked={selectedOptions[item.id]?.options[option.type] === value}
                              onChange={() => handleOptionChange(item.id, option.type, value)}
                            />
                          )}
                        </Stack.Item>
                      ))}
                    </Stack>
                  </div>
                ))}
                
                {item.variants && item.variants.length > 0 && (
                  <Select
                    label="Size"
                    options={item.variants.map((variant) => ({
                      label: variant.title,
                      value: variant.id,
                    }))}
                    value={selectedOptions[item.id]?.variantId || ''}
                    onChange={(value) => handleVariantChange(item.id, value)}
                    placeholder="Select a size"
                  />
                )}
              </Card.Section>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
      
      <div className="bundle-actions">
        <Button
          primary
          size="large"
          loading={addingToCart}
          onClick={handleAddToCart}
        >
          Add Bundle to Cart - ${bundle.price}
        </Button>
      </div>
      
      <style jsx>{`
        .custom-bundle-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .bundle-header {
          margin-bottom: 30px;
          text-align: center;
        }
        
        .bundle-pricing {
          margin: 20px 0;
        }
        
        .bundle-price {
          font-size: 24px;
          margin-right: 10px;
        }
        
        .bundle-compare-price {
          font-size: 18px;
          text-decoration: line-through;
        }
        
        .bundle-actions {
          margin-top: 30px;
          text-align: center;
        }
        
        .bundle-option {
          margin-bottom: 20px;
        }
        
        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: inline-block;
          margin-top: 5px;
        }
      `}</style>
    </div>
  );
};

export default BundleDisplay; 