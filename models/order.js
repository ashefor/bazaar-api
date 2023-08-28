const { Schema, default: mongoose } = require("mongoose");

const orderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Schema.Types.Number,
                required: true
            }
        }
    ],
    shipping: {
        first_name: {
            type: String,
            required: true
        },
        last_name: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        delivery: {
            type: Number,
            required: true
        },
        delivery_type: {
            type: String,
            required: true,
            default: 'standard'
        },
        tax: {
            type: Number,
            required: true,
            default: 5000
        },
        total: {
            type: Number,
            required: true
        },
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('Order', orderSchema);