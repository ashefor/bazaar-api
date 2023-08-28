const express = require('express');

const router = express.Router();
const accountIdMiddleware = require('../middlewares/accoutId-middleware');
const orderController = require('../controllers/order-controller');
const isAuth = require('../middlewares/is-auth');

router.post('/create', isAuth, orderController.initiateOrder);

router.get('/summary', isAuth, orderController.verifyAndCreateOrder);

router.get('/', isAuth, orderController.getOrders);

module.exports = router;