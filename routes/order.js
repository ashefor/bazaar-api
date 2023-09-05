const express = require('express');

const router = express.Router();
const orderController = require('../controllers/order-controller');
const isAuth = require('../middlewares/is-auth');

router.post('/create', isAuth, orderController.initiateOrder);

router.get('/summary', isAuth, orderController.verifyAndCreateOrder);

router.get('/invoice/:order_id', isAuth, orderController.viewInvoice);

router.get('/', isAuth, orderController.getOrders);

module.exports = router;