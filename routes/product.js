const express = require('express');
const { body, check } = require('express-validator');
const productController = require('../controllers/product-controller');

const router = express.Router();

router.post('/', [
    body('product_name').trim().isLength({min: 1}),
    body('product_description').trim().isLength({min: 6}),
    body('product_price').trim().notEmpty().isNumeric(),
    body('product_category').trim().notEmpty()
], productController.addProduct);

router.get('/', productController.getProducts);

router.get('/:product_slug', check('product_slug').notEmpty().trim(), productController.getSingleProduct);

module.exports = router