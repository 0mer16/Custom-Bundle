// Bundle Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Element references
  const bundleModal = document.getElementById('bundleModal');
  const createBundleBtn = document.getElementById('createBundleBtn');
  const createFirstBundleBtn = document.getElementById('createFirstBundleBtn');
  const closeBtn = document.querySelector('.close');
  const cancelBtn = document.getElementById('cancelBtn');
  const addItemBtn = document.getElementById('addItemBtn');
  const bundleForm = document.getElementById('bundleForm');
  const bundleItemsContainer = document.getElementById('bundleItems');
  const bundleList = document.getElementById('bundleList');
  let itemCount = 0;
  let editingBundleId = null;
  
  // Initialize
  loadBundles();
  loadProducts();
  
  // Event listeners
  if (createBundleBtn) {
    createBundleBtn.addEventListener('click', () => openModal());
  }
  
  if (createFirstBundleBtn) {
    createFirstBundleBtn.addEventListener('click', () => openModal());
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal());
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => closeModal());
  }
  
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => addItemToForm());
  }
  
  if (bundleForm) {
    bundleForm.addEventListener('submit', handleFormSubmit);
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === bundleModal) {
      closeModal();
    }
  });
  
  // Load all bundles from the API
  async function loadBundles() {
    try {
      const response = await fetch('/api/bundles');
      if (!response.ok) throw new Error('Failed to load bundles');
      
      const data = await response.json();
      if (bundleList) {
        renderBundleList(data.bundles);
      }
    } catch (error) {
      console.error('Error loading bundles:', error);
      showNotification('Error loading bundles', 'error');
    }
  }
  
  // Load products from the API
  async function loadProducts() {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to load products');
      
      const data = await response.json();
      window.products = data; // Store for later use
    } catch (error) {
      console.error('Error loading products:', error);
      window.products = []; // Fallback
    }
  }
  
  // Render the bundle list
  function renderBundleList(bundles) {
    if (!bundleList) return;
    
    if (bundles.length === 0) {
      // Show empty state
      bundleList.innerHTML = `
        <div class="empty-state">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 11H5V21H19V11Z" stroke="#637381" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17 7H7L5 11H19L17 7Z" stroke="#637381" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 7V3" stroke="#637381" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h2>No bundles yet</h2>
          <p>Create your first bundle to offer multiple products together with customizable options.</p>
          <button class="button" id="emptyStateCreateBtn">Create First Bundle</button>
        </div>
      `;
      
      // Add event listener to the new button
      document.getElementById('emptyStateCreateBtn').addEventListener('click', () => openModal());
    } else {
      // Create table with bundles
      bundleList.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Bundle</th>
              <th>Items</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${bundles.map(bundle => `
              <tr>
                <td>
                  <strong>${bundle.title}</strong>
                  <div>${bundle.description ? bundle.description.substring(0, 50) + (bundle.description.length > 50 ? '...' : '') : ''}</div>
                </td>
                <td>${bundle.items?.length || 0} items</td>
                <td>$${bundle.price.toFixed(2)}</td>
                <td><span class="status-badge status-${bundle.status}">${bundle.status}</span></td>
                <td>
                  <button class="button button-secondary edit-bundle" data-id="${bundle.id}">Edit</button>
                  <button class="button button-secondary button-small delete-bundle" data-id="${bundle.id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      // Add event listeners to buttons
      document.querySelectorAll('.edit-bundle').forEach(button => {
        button.addEventListener('click', (e) => editBundle(e.target.dataset.id));
      });
      
      document.querySelectorAll('.delete-bundle').forEach(button => {
        button.addEventListener('click', (e) => deleteBundle(e.target.dataset.id));
      });
    }
  }
  
  // Open modal
  function openModal(bundle = null) {
    // Reset form
    if (bundleForm) bundleForm.reset();
    if (bundleItemsContainer) bundleItemsContainer.innerHTML = '';
    itemCount = 0;
    editingBundleId = null;
    
    // If editing a bundle
    if (bundle) {
      editingBundleId = bundle.id;
      
      // Fill form with bundle data
      document.getElementById('title').value = bundle.title;
      document.getElementById('description').value = bundle.description || '';
      document.getElementById('price').value = bundle.price;
      document.getElementById('compareAtPrice').value = bundle.compareAtPrice || '';
      document.getElementById('status').value = bundle.status;
      
      // Add items
      if (bundle.items && Array.isArray(bundle.items)) {
        bundle.items.forEach(item => addItemToForm(item));
      }
      
      // Update modal title
      document.querySelector('.modal-header h2').textContent = 'Edit Bundle';
    } else {
      // Update modal title for new bundle
      document.querySelector('.modal-header h2').textContent = 'Create New Bundle';
    }
    
    // Show modal
    if (bundleModal) bundleModal.style.display = 'block';
  }
  
  // Close modal
  function closeModal() {
    if (bundleModal) bundleModal.style.display = 'none';
  }
  
  // Add item to form
  function addItemToForm(itemData = null) {
    itemCount++;
    
    const itemHtml = `
      <div class="bundle-item" data-item-id="${itemCount}">
        <div class="bundle-item-header">
          <h4>Item #${itemCount}</h4>
          <button type="button" class="button button-secondary remove-item" data-item-id="${itemCount}">Remove</button>
        </div>
        
        <div class="form-group">
          <label for="item-title-${itemCount}">Item Title</label>
          <input type="text" id="item-title-${itemCount}" name="items[${itemCount}][title]" required placeholder="e.g., Choose your onesie" 
            value="${itemData?.title || ''}">
        </div>
        
        <div class="form-group">
          <label for="item-product-${itemCount}">Product</label>
          <select id="item-product-${itemCount}" name="items[${itemCount}][productId]" required>
            <option value="">Select a product</option>
            ${(window.products || []).map(product => 
              `<option value="${product.id}" ${itemData?.productId === product.id ? 'selected' : ''}>${product.title}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>Options</label>
          <div class="item-options" id="item-options-${itemCount}">
            ${itemData?.options && Array.isArray(itemData.options) && itemData.options.length > 0 ? 
              itemData.options.map((option, index) => `
                <div class="option-row">
                  <select name="items[${itemCount}][options][${index}][type]">
                    <option value="design" ${option.type === 'design' ? 'selected' : ''}>Design</option>
                    <option value="size" ${option.type === 'size' ? 'selected' : ''}>Size</option>
                    <option value="color" ${option.type === 'color' ? 'selected' : ''}>Color</option>
                  </select>
                  <input type="text" name="items[${itemCount}][options][${index}][values]" 
                    placeholder="Values (comma separated)" value="${option.values || ''}">
                </div>
              `).join('') : 
              `<div class="option-row">
                <select name="items[${itemCount}][options][0][type]">
                  <option value="design">Design</option>
                  <option value="size">Size</option>
                  <option value="color">Color</option>
                </select>
                <input type="text" name="items[${itemCount}][options][0][values]" placeholder="Values (comma separated)">
              </div>`
            }
          </div>
          <button type="button" class="button button-secondary add-option" data-item-id="${itemCount}">Add Option</button>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" name="items[${itemCount}][required]" ${itemData?.required !== false ? 'checked' : ''}>
            Required item
          </label>
        </div>
      </div>
    `;
    
    bundleItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
    
    // Add event listener for the new remove button
    document.querySelectorAll(`.remove-item[data-item-id="${itemCount}"]`).forEach(button => {
      button.addEventListener('click', function() {
        const itemId = this.getAttribute('data-item-id');
        const itemElement = document.querySelector(`.bundle-item[data-item-id="${itemId}"]`);
        if (itemElement) itemElement.remove();
      });
    });
    
    // Add event listener for the new add option button
    document.querySelectorAll(`.add-option[data-item-id="${itemCount}"]`).forEach(button => {
      button.addEventListener('click', function() {
        const itemId = this.getAttribute('data-item-id');
        const optionsContainer = document.getElementById(`item-options-${itemId}`);
        const optionCount = optionsContainer.querySelectorAll('.option-row').length;
        
        const optionHtml = `
          <div class="option-row">
            <select name="items[${itemId}][options][${optionCount}][type]">
              <option value="design">Design</option>
              <option value="size">Size</option>
              <option value="color">Color</option>
            </select>
            <input type="text" name="items[${itemId}][options][${optionCount}][values]" placeholder="Values (comma separated)">
          </div>
        `;
        
        optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
      });
    });
  }
  
  // Handle form submission
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
      // Collect form data
      const formData = new FormData(bundleForm);
      const bundleData = {
        title: formData.get('title'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        compareAtPrice: formData.get('compareAtPrice') ? parseFloat(formData.get('compareAtPrice')) : null,
        status: formData.get('status'),
        items: []
      };
      
      // Process items
      const bundleItems = document.querySelectorAll('.bundle-item');
      bundleItems.forEach(item => {
        const itemId = item.dataset.itemId;
        
        // Extract options
        const options = [];
        const optionRows = item.querySelectorAll('.option-row');
        optionRows.forEach((row, index) => {
          const type = row.querySelector(`select[name="items[${itemId}][options][${index}][type]"]`).value;
          const values = row.querySelector(`input[name="items[${itemId}][options][${index}][values]"]`).value;
          
          if (values.trim()) {
            options.push({
              type,
              values: values.split(',').map(v => v.trim())
            });
          }
        });
        
        bundleData.items.push({
          title: item.querySelector(`input[id="item-title-${itemId}"]`).value,
          productId: item.querySelector(`select[id="item-product-${itemId}"]`).value,
          required: item.querySelector(`input[name="items[${itemId}][required]"]`).checked,
          options
        });
      });
      
      // API call
      const url = editingBundleId ? `/api/bundles/${editingBundleId}` : '/api/bundles';
      const method = editingBundleId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundleData)
      });
      
      if (!response.ok) throw new Error('Failed to save bundle');
      
      // Success
      showNotification(editingBundleId ? 'Bundle updated successfully' : 'Bundle created successfully', 'success');
      closeModal();
      loadBundles(); // Refresh bundle list
    } catch (error) {
      console.error('Error saving bundle:', error);
      showNotification('Error saving bundle', 'error');
    }
  }
  
  // Edit bundle
  async function editBundle(bundleId) {
    try {
      const response = await fetch(`/api/bundles/${bundleId}`);
      if (!response.ok) throw new Error('Failed to load bundle details');
      
      const bundle = await response.json();
      openModal(bundle);
    } catch (error) {
      console.error('Error loading bundle for editing:', error);
      showNotification('Error loading bundle details', 'error');
    }
  }
  
  // Delete bundle
  async function deleteBundle(bundleId) {
    if (!confirm('Are you sure you want to delete this bundle?')) return;
    
    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete bundle');
      
      showNotification('Bundle deleted successfully', 'success');
      loadBundles(); // Refresh bundle list
    } catch (error) {
      console.error('Error deleting bundle:', error);
      showNotification('Error deleting bundle', 'error');
    }
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
});

// Storefront Bundle Display
document.addEventListener('DOMContentLoaded', function() {
  const bundleForm = document.getElementById('bundle-form');
  const bundleItems = document.querySelectorAll('.bundle-product-item');
  const bundleTotal = document.getElementById('bundle-total');
  const bundleOriginalTotal = document.getElementById('bundle-original-total');
  
  if (bundleForm) {
    // Update price when selections change
    bundleForm.addEventListener('change', updateBundlePrice);
    
    // Handle form submission
    bundleForm.addEventListener('submit', handleBundleSubmit);
  }
  
  // Calculate and update bundle price
  function updateBundlePrice() {
    if (!bundleItems.length) return;
    
    let totalPrice = 0;
    let originalPrice = 0;
    
    bundleItems.forEach(item => {
      const selectElement = item.querySelector('select');
      if (selectElement && selectElement.value) {
        const option = selectElement.options[selectElement.selectedIndex];
        const price = parseFloat(option.dataset.price || 0);
        const comparePrice = parseFloat(option.dataset.comparePrice || price);
        
        totalPrice += price;
        originalPrice += comparePrice;
      }
    });
    
    // Update displayed prices
    if (bundleTotal) {
      bundleTotal.textContent = `$${totalPrice.toFixed(2)}`;
    }
    
    if (bundleOriginalTotal && originalPrice > totalPrice) {
      bundleOriginalTotal.textContent = `$${originalPrice.toFixed(2)}`;
      bundleOriginalTotal.style.display = 'inline';
    } else if (bundleOriginalTotal) {
      bundleOriginalTotal.style.display = 'none';
    }
  }
  
  // Handle bundle form submission
  async function handleBundleSubmit(e) {
    e.preventDefault();
    
    try {
      const formData = new FormData(bundleForm);
      
      // Add to cart endpoint
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to add bundle to cart');
      
      // Success - redirect to cart
      window.location.href = '/cart';
    } catch (error) {
      console.error('Error adding bundle to cart:', error);
      alert('Error adding bundle to cart. Please try again.');
    }
  }
  
  // Initialize price on page load
  updateBundlePrice();
}); 