const { Schema, mongo, default: mongoose } = require("mongoose");

const userSchema = new Schema({
    email: {
        type: Schema.Types.String,
        required: true,
        unique: true
    },
    verified: {
        type: Schema.Types.Boolean,
        default: false
    },
    password: {
        type: Schema.Types.String,
        required: true,
    },
    resetToken: {
        type: Schema.Types.String
    },
    resetTokenExpiration: {
        type: Schema.Types.Date
    },
    first_name: {
        type: Schema.Types.String,
        required: true
    },
    last_name: {
        type: Schema.Types.String,
    },
    cart: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Cart',
        },
    ]
}, {
    timestamps: true
})

module.exports = mongoose.model('User', userSchema);