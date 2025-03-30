const Bundle = {
  schema: {
    title: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },
    image: { type: String },
    status: { type: String, enum: ['active', 'draft'], default: 'draft' },
    items: [
      {
        title: { type: String, required: true },
        description: { type: String },
        options: [
          {
            type: { type: String, enum: ['color', 'size', 'design'], required: true },
            values: [{ type: String }],
          },
        ],
        productId: { type: String, required: true },
        variantId: { type: String },
        required: { type: Boolean, default: true },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },

  /**
   * Transforms the bundle data for API responses
   * @param {Object} bundle - Bundle data
   * @returns {Object} - Transformed bundle data
   */
  transform(bundle) {
    return {
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      price: bundle.price,
      compareAtPrice: bundle.compareAtPrice,
      image: bundle.image,
      status: bundle.status,
      items: bundle.items.map((item) => ({
        title: item.title,
        description: item.description,
        options: item.options,
        productId: item.productId,
        variantId: item.variantId,
        required: item.required,
      })),
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  },
};

module.exports = Bundle; 