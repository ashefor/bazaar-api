const { Schema, default: mongoose } = require("mongoose");

const productSchema = new Schema({
    product_name: {
        type: Schema.Types.String,
        required: true
    },
    product_description: {
        type: Schema.Types.String,
        required: true
    },
    product_price: {
        type: Schema.Types.Number,
        required: true
    },
    product_size: {
        type: Schema.Types.String,
        default: 'S'
    },
    product_color: {
        type: Schema.Types.String,
        default: 'black'
    },
    product_features: [],
    main_image: {
        type: Schema.Types.String,
        required: true
    },
    product_images: [
        {
            type: Schema.Types.String,
            required: true
        }
    ],
    product_category: {
        type: Schema.Types.String,
        required: true
    },
}, {
    timestamps: true
})

module.exports = mongoose.model('Product', productSchema);