// Admin Panel JavaScript for Custom Bundles App
document.addEventListener('DOMContentLoaded', function() {
  // Initialize components
  initBundleBuilder();
  initProductSearch();
  initTabs();
  initImageUpload();
  initColorPicker();
  initSizePicker();
  initDeleteButtons();
  initSaveBundle();
  
  // Show notification when page is loaded
  showNotification('Welcome to the Bundle Builder!', 'success');
});

// Main bundle data object
let bundleData = {
  title: '',
  description: '',
  handle: '',
  image: null,
  discount_type: 'percentage',
  discount_value: 0,
  products: [],
  published: false
};

// Initialize bundle builder functionality
function initBundleBuilder() {
  const addItemBtn = document.getElementById('add-bundle-item');
  const bundleItemsContainer = document.getElementById('bundle-items-container');
  
  if (addItemBtn) {
    addItemBtn.addEventListener('click', function() {
      const newItemIndex = document.querySelectorAll('.bundle-item').length;
      const newItemHtml = `
        <div class="bundle-item" data-item-index="${newItemIndex}">
          <div class="bundle-item-header">
            <h3 class="bundle-item-title">Item ${newItemIndex + 1}</h3>
            <button type="button" class="btn btn-sm btn-danger remove-item">Remove</button>
          </div>
          <div class="bundle-item-content">
            <div class="product-search">
              <div class="form-group">
                <label class="form-label">Search Product</label>
                <input type="text" class="form-control product-search-input" placeholder="Search for a product...">
                <div class="product-search-results"></div>
              </div>
            </div>
            
            <div class="selected-product-container" style="display: none;">
              <div class="selected-product-preview">
                <img src="" alt="" class="selected-product-img">
                <div class="selected-product-info">
                  <h4 class="selected-product-title"></h4>
                  <p class="selected-product-sku"></p>
                </div>
                <button type="button" class="btn btn-sm btn-danger remove-product">Change</button>
              </div>
              
              <div class="product-options">
                <div class="option-group size-option-group">
                  <label class="form-label">Sizes</label>
                  <div class="size-options">
                    <!-- Size options will be dynamically inserted here -->
                  </div>
                </div>
                
                <div class="option-group color-option-group">
                  <label class="form-label">Colors</label>
                  <div class="color-options">
                    <!-- Color options will be dynamically inserted here -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      bundleItemsContainer.insertAdjacentHTML('beforeend', newItemHtml);
      
      // Reinitialize components for the new item
      initProductSearch();
      initDeleteButtons();
      
      // Update bundle summary
      updateBundleSummary();
    });
  }
  
  // Add a default first item if no items exist
  if (bundleItemsContainer && bundleItemsContainer.children.length === 0) {
    if (addItemBtn) {
      addItemBtn.click();
    }
  }
}

// Initialize product search functionality with real Shopify API
function initProductSearch() {
  const searchInputs = document.querySelectorAll('.product-search-input');
  
  searchInputs.forEach(input => {
    // Skip already initialized
    if (input.dataset.initialized) return;
    input.dataset.initialized = 'true';
    
    const searchContainer = input.closest('.product-search');
    const resultsContainer = searchContainer.querySelector('.product-search-results');
    const selectedProductContainer = searchContainer.closest('.bundle-item-content').querySelector('.selected-product-container');
    
    // Debounce function for search
    let searchTimeout;
    
    input.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      
      const query = this.value.trim();
      if (query.length < 2) {
        resultsContainer.innerHTML = '';
        searchContainer.classList.remove('active');
        return;
      }
      
      // Show loading state
      resultsContainer.innerHTML = '<div class="search-loading">Searching products...</div>';
      searchContainer.classList.add('active');
      
      searchTimeout = setTimeout(() => {
        // Get the shop from the page data
        const shop = document.body.dataset.shop;
        
        // Fetch products from Shopify
        fetch(`/admin/api/products/search?query=${encodeURIComponent(query)}&shop=${shop}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.json();
          })
          .then(products => {
            if (products.length === 0) {
              resultsContainer.innerHTML = '<div class="no-results">No products found</div>';
              return;
            }
            
            // Render search results
            resultsContainer.innerHTML = products.map(product => `
              <div class="product-search-item" data-product-id="${product.id}">
                <img src="${product.image ? product.image.src : '/public/images/placeholder.jpg'}" alt="${product.title}" class="product-search-item-img">
                <div class="product-search-item-info">
                  <h4 class="product-search-item-title">${product.title}</h4>
                  <p class="product-search-item-price">${formatMoney(product.variants[0].price)}</p>
                </div>
              </div>
            `).join('');
            
            // Add click event for each product item
            resultsContainer.querySelectorAll('.product-search-item').forEach(item => {
              item.addEventListener('click', function() {
                const productId = this.dataset.productId;
                
                // Get full product details with variants
                fetch(`/admin/api/products/${productId}?shop=${shop}`)
                  .then(response => {
                    if (!response.ok) {
                      throw new Error('Network response was not ok');
                    }
                    return response.json();
                  })
                  .then(product => {
                    // Extract variants and options
                    const itemIndex = searchContainer.closest('.bundle-item').dataset.itemIndex;
                    const imgElement = selectedProductContainer.querySelector('.selected-product-img');
                    const titleElement = selectedProductContainer.querySelector('.selected-product-title');
                    const skuElement = selectedProductContainer.querySelector('.selected-product-sku');
                    
                    imgElement.src = product.image ? product.image.src : '/public/images/placeholder.jpg';
                    imgElement.alt = product.title;
                    titleElement.textContent = product.title;
                    skuElement.textContent = `SKU: ${product.variants[0].sku || 'N/A'}`;
                    
                    // Show selected product container
                    selectedProductContainer.style.display = 'block';
                    searchContainer.classList.remove('active');
                    input.value = product.title;
                    
                    // Extract options from product (size and color)
                    const sizeOption = product.options.find(option => 
                      option.name.toLowerCase().includes('size'));
                    
                    const colorOption = product.options.find(option => 
                      option.name.toLowerCase().includes('color') || 
                      option.name.toLowerCase().includes('colour'));
                    
                    // Generate size options if available
                    const sizeOptionsContainer = selectedProductContainer.querySelector('.size-options');
                    if (sizeOption) {
                      sizeOptionsContainer.innerHTML = sizeOption.values.map(size => `
                        <div class="size-option" data-size="${size}">${size}</div>
                      `).join('');
                      sizeOptionsContainer.closest('.option-group').style.display = 'block';
                    } else {
                      sizeOptionsContainer.innerHTML = '<div class="no-options">No size options available</div>';
                      sizeOptionsContainer.closest('.option-group').style.display = 'none';
                    }
                    
                    // Generate color options if available
                    const colorOptionsContainer = selectedProductContainer.querySelector('.color-options');
                    if (colorOption) {
                      colorOptionsContainer.innerHTML = colorOption.values.map(color => {
                        // Try to get a matching color hex code
                        const colorHex = getColorHex(color);
                        return `
                          <div class="color-option" data-color="${color}" style="background-color: ${colorHex}"></div>
                        `;
                      }).join('');
                      colorOptionsContainer.closest('.option-group').style.display = 'block';
                    } else {
                      colorOptionsContainer.innerHTML = '<div class="no-options">No color options available</div>';
                      colorOptionsContainer.closest('.option-group').style.display = 'none';
                    }
                    
                    // Initialize option selectors
                    initSizePicker();
                    initColorPicker();
                    
                    // Add product to bundle data
                    bundleData.products[itemIndex] = {
                      product_id: product.id,
                      title: product.title,
                      price: parseFloat(product.variants[0].price),
                      image: product.image ? product.image.src : null,
                      selected_options: {
                        size: sizeOption ? sizeOption.values[0] : null,
                        color: colorOption ? colorOption.values[0] : null
                      },
                      variants: product.variants.map(variant => ({
                        id: variant.id,
                        title: variant.title,
                        price: parseFloat(variant.price),
                        sku: variant.sku || '',
                        inventory_quantity: variant.inventory_quantity
                      }))
                    };
                    
                    // Update bundle summary
                    updateBundleSummary();
                  })
                  .catch(error => {
                    console.error('Error fetching product details:', error);
                    showNotification('Error loading product details', 'error');
                  });
              });
            });
          })
          .catch(error => {
            console.error('Error searching products:', error);
            resultsContainer.innerHTML = '<div class="error">Error loading products</div>';
          });
      }, 300);
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(event) {
      if (!searchContainer.contains(event.target)) {
        searchContainer.classList.remove('active');
      }
    });
    
    // Remove product button
    const removeProductBtn = searchContainer.closest('.bundle-item-content').querySelector('.remove-product');
    if (removeProductBtn) {
      removeProductBtn.addEventListener('click', function() {
        selectedProductContainer.style.display = 'none';
        input.value = '';
        
        // Remove product from bundle data
        const itemIndex = searchContainer.closest('.bundle-item').dataset.itemIndex;
        bundleData.products[itemIndex] = null;
        
        // Update bundle summary
        updateBundleSummary();
      });
    }
  });
}

// Format money values consistently
function formatMoney(value) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });
  
  return formatter.format(value);
}

// Get a hex color code for a color name
function getColorHex(colorName) {
  const colorMap = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'blue': '#0000ff',
    'green': '#008000',
    'yellow': '#ffff00',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'orange': '#ffa500',
    'grey': '#808080',
    'gray': '#808080',
    'brown': '#a52a2a',
    'navy': '#000080',
    'teal': '#008080',
    'maroon': '#800000',
    'gold': '#ffd700',
    'silver': '#c0c0c0',
    'beige': '#f5f5dc'
  };
  
  // Check if the color name exists in our map
  for (const [key, value] of Object.entries(colorMap)) {
    if (colorName.toLowerCase().includes(key)) {
      return value;
    }
  }
  
  // Return a default color if no match is found
  return '#cccccc';
}

// Initialize tabs functionality
function initTabs() {
  const tabLinks = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabLinks.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to current tab and content
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
}

// Initialize image upload functionality
function initImageUpload() {
  const dragDropArea = document.getElementById('bundle-image-upload');
  const fileInput = document.getElementById('bundle-image-file');
  const previewContainer = document.getElementById('bundle-image-preview');
  
  if (dragDropArea && fileInput) {
    // Show file dialog when clicking on drag-drop area
    dragDropArea.addEventListener('click', function() {
      fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', function() {
      handleFile(this.files[0]);
    });
    
    // Handle drag and drop
    dragDropArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      dragDropArea.classList.add('dragover');
    });
    
    dragDropArea.addEventListener('dragleave', function() {
      dragDropArea.classList.remove('dragover');
    });
    
    dragDropArea.addEventListener('drop', function(e) {
      e.preventDefault();
      dragDropArea.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });
    
    // Handle file upload
    function handleFile(file) {
      if (file && file.type.startsWith('image/')) {
        // Create form data for upload
        const formData = new FormData();
        formData.append('image', file);
        formData.append('shop', document.body.dataset.shop);
        
        // Show loading state
        previewContainer.innerHTML = '<div class="loading">Uploading image...</div>';
        previewContainer.style.display = 'block';
        dragDropArea.style.display = 'none';
        
        // Upload to server
        fetch('/admin/api/upload', {
          method: 'POST',
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Upload failed');
          }
          return response.json();
        })
        .then(data => {
          // Display uploaded image
          previewContainer.innerHTML = `
            <div class="image-preview-container">
              <img src="${data.url}" alt="Bundle Image" class="image-preview">
              <button type="button" class="btn btn-sm btn-danger remove-image">Remove</button>
            </div>
          `;
          
          // Store image URL in bundle data
          bundleData.image = data.url;
          
          // Add remove image event
          previewContainer.querySelector('.remove-image').addEventListener('click', function() {
            previewContainer.style.display = 'none';
            dragDropArea.style.display = 'block';
            previewContainer.innerHTML = '';
            bundleData.image = null;
          });
        })
        .catch(error => {
          console.error('Error uploading image:', error);
          previewContainer.innerHTML = '';
          previewContainer.style.display = 'none';
          dragDropArea.style.display = 'block';
          showNotification('Error uploading image. Please try again.', 'error');
        });
      } else {
        showNotification('Please select a valid image file.', 'error');
      }
    }
  }
}

// Initialize color picker functionality
function initColorPicker() {
  const colorOptions = document.querySelectorAll('.color-option');
  
  colorOptions.forEach(option => {
    // Skip already initialized
    if (option.dataset.initialized) return;
    option.dataset.initialized = 'true';
    
    option.addEventListener('click', function() {
      const optionGroup = this.closest('.color-option-group');
      
      // Remove selected class from all options in this group
      optionGroup.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      
      // Add selected class to current option
      this.classList.add('selected');
      
      // Update selected option in bundle data
      const itemIndex = this.closest('.bundle-item').dataset.itemIndex;
      if (bundleData.products[itemIndex]) {
        bundleData.products[itemIndex].selected_options.color = this.dataset.color;
        
        // Update variant selection based on selected options
        updateSelectedVariant(itemIndex);
      }
    });
    
    // Select first option by default
    const optionGroup = option.closest('.color-option-group');
    if (optionGroup && !optionGroup.querySelector('.color-option.selected')) {
      option.classList.add('selected');
    }
  });
}

// Initialize size picker functionality
function initSizePicker() {
  const sizeOptions = document.querySelectorAll('.size-option');
  
  sizeOptions.forEach(option => {
    // Skip already initialized
    if (option.dataset.initialized) return;
    option.dataset.initialized = 'true';
    
    option.addEventListener('click', function() {
      const optionGroup = this.closest('.size-option-group');
      
      // Remove selected class from all options in this group
      optionGroup.querySelectorAll('.size-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      
      // Add selected class to current option
      this.classList.add('selected');
      
      // Update selected option in bundle data
      const itemIndex = this.closest('.bundle-item').dataset.itemIndex;
      if (bundleData.products[itemIndex]) {
        bundleData.products[itemIndex].selected_options.size = this.dataset.size;
        
        // Update variant selection based on selected options
        updateSelectedVariant(itemIndex);
      }
    });
    
    // Select first option by default
    const optionGroup = option.closest('.size-option-group');
    if (optionGroup && !optionGroup.querySelector('.size-option.selected')) {
      option.classList.add('selected');
    }
  });
}

// Update selected variant based on size and color options
function updateSelectedVariant(itemIndex) {
  const product = bundleData.products[itemIndex];
  if (!product || !product.variants) return;
  
  const size = product.selected_options.size;
  const color = product.selected_options.color;
  
  // Find the matching variant
  const matchingVariant = product.variants.find(variant => {
    return (!size || variant.title.includes(size)) && 
           (!color || variant.title.includes(color));
  });
  
  if (matchingVariant) {
    // Update price and selected variant ID
    product.selected_variant_id = matchingVariant.id;
    product.price = parseFloat(matchingVariant.price);
    
    // Update bundle summary
    updateBundleSummary();
  }
}

// Initialize delete buttons
function initDeleteButtons() {
  const removeItemButtons = document.querySelectorAll('.remove-item');
  
  removeItemButtons.forEach(button => {
    // Skip already initialized
    if (button.dataset.initialized) return;
    button.dataset.initialized = 'true';
    
    button.addEventListener('click', function() {
      const bundleItem = this.closest('.bundle-item');
      const itemIndex = parseInt(bundleItem.dataset.itemIndex);
      
      // Remove the item from the DOM
      bundleItem.remove();
      
      // Remove the item from bundle data
      bundleData.products[itemIndex] = null;
      bundleData.products = bundleData.products.filter(p => p !== null);
      
      // Update remaining items' indices
      document.querySelectorAll('.bundle-item').forEach((item, index) => {
        item.dataset.itemIndex = index;
        item.querySelector('.bundle-item-title').textContent = `Item ${index + 1}`;
      });
      
      // Update bundle summary
      updateBundleSummary();
    });
  });
}

// Initialize save bundle functionality
function initSaveBundle() {
  const saveBtn = document.getElementById('save-bundle');
  const publishBtn = document.getElementById('publish-bundle');
  const bundleTitleInput = document.getElementById('bundle-title');
  const bundleHandleInput = document.getElementById('bundle-handle');
  const bundleDescriptionInput = document.getElementById('bundle-description');
  const discountTypeSelect = document.getElementById('discount-type');
  const discountValueInput = document.getElementById('discount-value');
  
  // Listen for input changes to update bundle data
  if (bundleTitleInput) {
    bundleTitleInput.addEventListener('input', function() {
      bundleData.title = this.value;
      
      // Auto-generate handle if empty
      if (bundleHandleInput && !bundleHandleInput.value) {
        bundleHandleInput.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        bundleData.handle = bundleHandleInput.value;
      }
    });
  }
  
  if (bundleHandleInput) {
    bundleHandleInput.addEventListener('input', function() {
      bundleData.handle = this.value;
    });
  }
  
  if (bundleDescriptionInput) {
    bundleDescriptionInput.addEventListener('input', function() {
      bundleData.description = this.value;
    });
  }
  
  if (discountTypeSelect) {
    discountTypeSelect.addEventListener('change', function() {
      bundleData.discount_type = this.value;
      updateBundleSummary();
    });
  }
  
  if (discountValueInput) {
    discountValueInput.addEventListener('input', function() {
      bundleData.discount_value = parseFloat(this.value) || 0;
      updateBundleSummary();
    });
  }
  
  // Save bundle (draft)
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      validateAndSaveBundle(false);
    });
  }
  
  // Publish bundle
  if (publishBtn) {
    publishBtn.addEventListener('click', function() {
      validateAndSaveBundle(true);
    });
  }
}

// Validate and save bundle
function validateAndSaveBundle(publish) {
  // Validate required fields
  if (!bundleData.title) {
    showNotification('Bundle title is required.', 'error');
    return;
  }
  
  if (!bundleData.handle) {
    showNotification('Bundle handle is required.', 'error');
    return;
  }
  
  if (!bundleData.image) {
    showNotification('Bundle image is required.', 'error');
    return;
  }
  
  if (bundleData.products.length === 0) {
    showNotification('Add at least one product to the bundle.', 'error');
    return;
  }
  
  // Check if all products have selected options
  for (const product of bundleData.products) {
    if (!product) {
      showNotification('Please complete all product selections.', 'error');
      return;
    }
  }
  
  // Set published state
  bundleData.published = publish;
  
  // Show saving status
  showNotification('Saving bundle...', 'info');
  
  // Get the shop from the page data
  const shop = document.body.dataset.shop;
  
  // Save to server
  fetch('/admin/api/bundles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...bundleData,
      shop
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to save bundle');
    }
    return response.json();
  })
  .then(data => {
    // Show success message
    showNotification(
      publish ? 'Bundle published successfully!' : 'Bundle saved as draft.',
      'success'
    );
    
    // Redirect to bundles list
    setTimeout(() => {
      window.location.href = `/admin/bundles?shop=${shop}`;
    }, 1500);
  })
  .catch(error => {
    console.error('Error saving bundle:', error);
    showNotification('Error saving bundle. Please try again.', 'error');
  });
}

// Update bundle summary
function updateBundleSummary() {
  const summaryContainer = document.getElementById('bundle-summary');
  
  if (summaryContainer) {
    const totalProducts = bundleData.products.filter(p => p !== null).length;
    let subtotal = 0;
    
    bundleData.products.forEach(product => {
      if (product) {
        subtotal += product.price;
      }
    });
    
    // Calculate discount
    let discount = 0;
    if (bundleData.discount_type === 'percentage') {
      discount = subtotal * (bundleData.discount_value / 100);
    } else if (bundleData.discount_type === 'fixed_amount') {
      discount = bundleData.discount_value;
    }
    
    const total = subtotal - discount;
    
    summaryContainer.innerHTML = `
      <div class="price-calculator">
        <h3>Bundle Summary</h3>
        <div class="price-row">
          <span>Total Products:</span>
          <span>${totalProducts}</span>
        </div>
        <div class="price-row">
          <span>Subtotal:</span>
          <span>${formatMoney(subtotal)}</span>
        </div>
        <div class="price-row">
          <span>Discount:</span>
          <span>${formatMoney(discount)}</span>
        </div>
        <div class="price-row total">
          <span>Total Price:</span>
          <span>${formatMoney(total)}</span>
        </div>
      </div>
    `;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    const container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-icon">
      ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
    </div>
    <div class="notification-message">${message}</div>
    <div class="notification-close">✕</div>
  `;
  
  document.getElementById('notification-container').appendChild(notification);
  
  // Add close button functionality
  notification.querySelector('.notification-close').addEventListener('click', function() {
    notification.remove();
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.remove();
  }, 5000);
} 