if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const compression = require('compression');
const mongoose = require('mongoose');
const path = require('path');


const fileUploadMiddleWare = require('./middlewares/file-upload');


const app = express();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/product');
const cartRoutes = require('./routes/order');

// app.use(compression());
// app.use(cookieParser());
app.use(cors());
app.use(bodyParser.json());
app.use(fileUploadMiddleWare)
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader (
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === "OPTIONS") {
        res.setHeader('Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET"');
        return res.status (200).json({});
    }
    next();
})

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/orders', cartRoutes);

app.use((err, req, res, next) => {
    console.log(err)
    res.status(err.statusCode || 500).json({ message: err.message, data: err.data });
})

mongoose.connect(process.env.DATABASE_URL).then(() => {
    app.listen(process.env.PORT || 8000);
    console.log('Server running on port %s', process.env.PORT || 8000);
}).catch(err => {
    console.log(err);
})