# Shopify Custom Bundles App

A Shopify app that allows store owners to create and manage custom product bundles similar to the Raph & Remy gift set example. Customers can select options like designs and sizes for each bundle item.

## Features

- **Admin Dashboard**: Create and manage bundle offers with customizable products
- **Custom Bundle Builder**: Set up bundles with multiple products, each with their own options (designs/sizes/colors)
- **Bundle Product Page**: Beautiful custom product page for bundle offerings
- **Option Selection**: Allow customers to select designs, sizes, or colors for each item in the bundle
- **Bundle Pricing**: Special bundle pricing compared to buying items individually
- **Shopify Integration**: Seamlessly works with your Shopify store and checkout process

## Installation

### Prerequisites

- Shopify Partner account
- Node.js version 16 or higher
- npm or yarn

### Setup Instructions

1. Clone this repository
```
git clone https://github.com/yourusername/shopify-custom-bundles.git
cd shopify-custom-bundles
```

2. Install dependencies
```
npm install
```

3. Configure your Shopify app credentials
   - Create a new app in your Shopify Partner dashboard
   - Set the app URL to your development URL
   - Copy your API key and API secret
   - Create a `.env` file in the root directory and add your credentials:

```
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SCOPES=read_products,write_products,read_orders,write_orders,read_customers,write_customers
HOST=your_development_url
```

4. Start the development server
```
npm run dev
```

5. Install the app on your development store

## Usage

### Creating a Bundle

1. Go to the Custom Bundles section in your Shopify admin
2. Click "Add Bundle"
3. Fill in the bundle details:
   - Title and description
   - Bundle price
   - Optional "compare at" price
   - Bundle image

4. Add items to your bundle:
   - Select products from your store
   - Set option types (designs, sizes, colors)
   - Define option values
   - Mark items as required or optional

5. Save your bundle and publish when ready

### Embedding a Bundle on Your Store

There are two ways to display your bundles on your store:

#### 1. Using a Dedicated Bundle Page

Each bundle gets its own unique URL that you can link to from your navigation or other pages:
```
https://your-store.myshopify.com/pages/bundles/[bundle-id]
```

#### 2. Using the Bundle Embed

Add this code to any page where you want to display a specific bundle:

```liquid
{% assign bundle_id = 'your-bundle-id' %}
{% render 'bundle-display', bundle_id: bundle_id %}
```

## Customization

### Styling

The bundle display comes with default styling that matches most Shopify themes. You can customize the appearance by modifying the CSS in the `bundle-page.liquid` template or by adding custom CSS to your theme.

### Templates

- `bundle-page.liquid`: The main template for dedicated bundle pages
- `bundle-display.liquid`: The template for embedded bundles

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact support at [your-email@example.com].

## License

This project is licensed under the MIT License - see the LICENSE file for details. 