import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  Button,
  ResourceList,
  ResourceItem,
  TextStyle,
  Badge,
  Heading,
  Modal,
  Form,
  FormLayout,
  TextField,
  Select,
  Stack,
  DropZone,
  Thumbnail,
} from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge-utils';
import { ImageMajor } from '@shopify/polaris-icons';

const BundleManager = () => {
  const app = useAppBridge();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalActive, setModalActive] = useState(false);
  const [currentBundle, setCurrentBundle] = useState(null);
  const [products, setProducts] = useState([]);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    price: '',
    compareAtPrice: '',
    status: 'draft',
    items: [],
  });
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');

  // Fetch bundles when component mounts
  useEffect(() => {
    fetchBundles();
    fetchProducts();
  }, []);

  // Fetch bundles from API
  const fetchBundles = async () => {
    try {
      setLoading(true);
      const token = await getSessionToken(app);
      const response = await fetch('/api/bundles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setBundles(data.bundles || []);
    } catch (error) {
      console.error('Error fetching bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch products from Shopify
  const fetchProducts = async () => {
    try {
      const token = await getSessionToken(app);
      const response = await fetch('/api/products', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const token = await getSessionToken(app);
      const url = currentBundle ? `/api/bundles/${currentBundle.id}` : '/api/bundles';
      const method = currentBundle ? 'PUT' : 'POST';

      // Upload image if there's a file
      let imageUrl = currentBundle?.image || '';
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        const imageResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const imageData = await imageResponse.json();
        imageUrl = imageData.url;
      }

      // Prepare bundle data
      const bundleData = {
        ...formState,
        image: imageUrl,
      };

      // Send request to API
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bundleData),
      });

      if (response.ok) {
        // Refresh bundles list
        fetchBundles();
        handleModalClose();
      } else {
        const error = await response.json();
        console.error('Error submitting bundle:', error);
      }
    } catch (error) {
      console.error('Error submitting bundle:', error);
    }
  };

  // Handle file drop for image upload
  const handleDropZoneDrop = useCallback(
    (_dropFiles, acceptedFiles, _rejectedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFile(file);
        setFileUrl(window.URL.createObjectURL(file));
      }
    },
    []
  );

  // Open modal to add a new bundle
  const handleAddBundle = () => {
    setCurrentBundle(null);
    setFormState({
      title: '',
      description: '',
      price: '',
      compareAtPrice: '',
      status: 'draft',
      items: [],
    });
    setFile(null);
    setFileUrl('');
    setModalActive(true);
  };

  // Open modal to edit an existing bundle
  const handleEditBundle = (bundle) => {
    setCurrentBundle(bundle);
    setFormState({
      title: bundle.title,
      description: bundle.description || '',
      price: bundle.price.toString(),
      compareAtPrice: bundle.compareAtPrice ? bundle.compareAtPrice.toString() : '',
      status: bundle.status,
      items: bundle.items || [],
    });
    setFileUrl(bundle.image || '');
    setFile(null);
    setModalActive(true);
  };

  // Close the modal
  const handleModalClose = () => {
    setModalActive(false);
    setCurrentBundle(null);
  };

  // Handle form field changes
  const handleChange = (field) => (value) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  // Handle adding a new item to the bundle
  const handleAddItem = () => {
    setFormState((prevState) => ({
      ...prevState,
      items: [
        ...prevState.items,
        {
          title: '',
          description: '',
          productId: '',
          options: [
            {
              type: 'design',
              values: [],
            },
          ],
          required: true,
        },
      ],
    }));
  };

  // Handle removing an item from the bundle
  const handleRemoveItem = (index) => {
    setFormState((prevState) => {
      const newItems = [...prevState.items];
      newItems.splice(index, 1);
      return {
        ...prevState,
        items: newItems,
      };
    });
  };

  // Handle changes to item fields
  const handleItemChange = (index, field) => (value) => {
    setFormState((prevState) => {
      const newItems = [...prevState.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };
      return {
        ...prevState,
        items: newItems,
      };
    });
  };

  // Handle changes to item option fields
  const handleOptionChange = (itemIndex, optionIndex, field) => (value) => {
    setFormState((prevState) => {
      const newItems = [...prevState.items];
      const newOptions = [...newItems[itemIndex].options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        [field]: value,
      };
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        options: newOptions,
      };
      return {
        ...prevState,
        items: newItems,
      };
    });
  };

  // Product options for select fields
  const productOptions = products.map((product) => ({
    label: product.title,
    value: product.id,
  }));

  // Status options for select field
  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
  ];

  // Option type options for select field
  const optionTypeOptions = [
    { label: 'Design', value: 'design' },
    { label: 'Size', value: 'size' },
    { label: 'Color', value: 'color' },
  ];

  // Render file upload preview
  const fileUpload = !file && !fileUrl ? (
    <DropZone.FileUpload actionHint="or drop files to upload" />
  ) : (
    <div style={{ padding: '1rem' }}>
      <Stack>
        <Thumbnail
          size="large"
          alt={file?.name || 'Bundle image'}
          source={fileUrl || ImageMajor}
        />
      </Stack>
    </div>
  );

  return (
    <Page
      title="Custom Bundles"
      primaryAction={{
        content: 'Add Bundle',
        onAction: handleAddBundle,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{ singular: 'bundle', plural: 'bundles' }}
              items={bundles}
              loading={loading}
              renderItem={(bundle) => (
                <ResourceItem
                  id={bundle.id}
                  media={
                    bundle.image ? (
                      <Thumbnail source={bundle.image} alt={bundle.title} />
                    ) : (
                      <Thumbnail source={ImageMajor} alt={bundle.title} />
                    )
                  }
                  accessibilityLabel={`View details for ${bundle.title}`}
                  name={bundle.title}
                  onClick={() => handleEditBundle(bundle)}
                >
                  <Stack>
                    <Stack.Item fill>
                      <h3>
                        <TextStyle variation="strong">{bundle.title}</TextStyle>
                      </h3>
                    </Stack.Item>
                    <Stack.Item>
                      <Badge status={bundle.status === 'active' ? 'success' : 'warning'}>
                        {bundle.status === 'active' ? 'Active' : 'Draft'}
                      </Badge>
                    </Stack.Item>
                    <Stack.Item>
                      <TextStyle variation="strong">${bundle.price}</TextStyle>
                    </Stack.Item>
                  </Stack>
                  <p>Items: {bundle.items.length}</p>
                </ResourceItem>
              )}
            />
          </Card>
        </Layout.Section>
      </Layout>

      <Modal
        open={modalActive}
        onClose={handleModalClose}
        title={currentBundle ? `Edit ${currentBundle.title}` : 'Add new bundle'}
        primaryAction={{
          content: 'Save',
          onAction: handleSubmit,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleModalClose,
          },
        ]}
      >
        <Modal.Section>
          <Form onSubmit={handleSubmit}>
            <FormLayout>
              <TextField
                label="Bundle Title"
                value={formState.title}
                onChange={handleChange('title')}
                autoComplete="off"
                required
              />
              <TextField
                label="Description"
                value={formState.description}
                onChange={handleChange('description')}
                multiline={4}
                autoComplete="off"
              />
              <FormLayout.Group>
                <TextField
                  label="Price"
                  value={formState.price}
                  onChange={handleChange('price')}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                  required
                />
                <TextField
                  label="Compare at Price"
                  value={formState.compareAtPrice}
                  onChange={handleChange('compareAtPrice')}
                  type="number"
                  prefix="$"
                  autoComplete="off"
                />
                <Select
                  label="Status"
                  options={statusOptions}
                  value={formState.status}
                  onChange={handleChange('status')}
                />
              </FormLayout.Group>

              <DropZone
                allowMultiple={false}
                onDrop={handleDropZoneDrop}
                label="Bundle Image"
                type="image"
              >
                {fileUpload}
              </DropZone>

              <Heading>Bundle Items</Heading>
              {formState.items.map((item, index) => (
                <Card key={index} sectioned>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Item Title"
                        value={item.title}
                        onChange={handleItemChange(index, 'title')}
                        autoComplete="off"
                        required
                      />
                      <Button onClick={() => handleRemoveItem(index)} destructive>
                        Remove
                      </Button>
                    </FormLayout.Group>
                    <TextField
                      label="Description"
                      value={item.description || ''}
                      onChange={handleItemChange(index, 'description')}
                      autoComplete="off"
                    />
                    <Select
                      label="Product"
                      options={productOptions}
                      value={item.productId}
                      onChange={handleItemChange(index, 'productId')}
                      required
                    />

                    {item.options.map((option, optionIndex) => (
                      <FormLayout.Group key={optionIndex}>
                        <Select
                          label="Option Type"
                          options={optionTypeOptions}
                          value={option.type}
                          onChange={handleOptionChange(index, optionIndex, 'type')}
                        />
                        <TextField
                          label="Option Values (comma separated)"
                          value={option.values.join(', ')}
                          onChange={(value) =>
                            handleOptionChange(index, optionIndex, 'values')(
                              value.split(',').map((v) => v.trim())
                            )
                          }
                        />
                      </FormLayout.Group>
                    ))}
                  </FormLayout>
                </Card>
              ))}

              <Button onClick={handleAddItem}>Add Item</Button>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>
    </Page>
  );
};

export default BundleManager; 