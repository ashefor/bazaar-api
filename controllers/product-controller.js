const Product = require('../models/product');
const slugify = require('slugify')
const { validationResult } = require('express-validator');
const crypto = require('crypto');

exports.addProduct = async (req, res, next) => {
    const errors = validationResult(req);
    const files = req.files;
    const { product_name, product_description, product_price, product_category } = req.body;
    try {
        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            throw error
        }
        if (!files) {
            const error = new Error('No image provided');
            error.statusCode = 422;
            throw error
        }
        // files.forEach((file) => {
        //     const filePath = `images/${file.filename}`;
        //     fs.rename(file.path, filePath, (err) => {
        //       if (err) {
        //         // Handle error appropriately and send an error response
        //         return res.status(500).json({ error: 'Failed to store the file' });
        //       }
        //     });
        //   });
        const mainImageUrl = files[0].path;
        const productImages = files.slice(1).map((file) => file.path);
        const product = new Product({
            main_image: mainImageUrl,
            product_images: productImages,
            product_category,
            product_description,
            product_price,
            product_name
        })
        await product.save();
        res.status(201).json({
            message: 'Product created successfully',
            product: product
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }

}

exports.getProducts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = req.query.page_size || 12;
    try {
        let totalItems = await Product.countDocuments().exec();
        let totalPages = Math.ceil(totalItems / perPage)
        let pageStart = (currentPage - 1) * perPage + 1
        let pageLimit = perPage * (currentPage) > totalItems ? totalItems : perPage * (currentPage);
        const products = await Product.find().skip((currentPage - 1) * perPage).limit(perPage).exec();
        res.status(200).json({
            message: 'Fetched products successfully',
            products: products,
            currentPage: currentPage,
            totalItems: totalItems,
            totalPages: totalPages,
            pageLimit: pageLimit,
            pageStart: pageStart,
            pageSize: perPage
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}

exports.getSingleProduct = async (req, res, next) => {
    const product_slug = req.params.product_slug;
    const errors = validationResult(req);
    try {
        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            throw error
        }
        const product = await Product.findOne({product_slug: product_slug}).exec();
        if (!product) {
            const error = new Error('Could not find product');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            message: 'Fetched product successfully',
            product: product
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}