const https = require('https');
const crypto = require('crypto');
const Order = require('../models/order');
const User = require('../models/user');

exports.initiateOrder = async (req, res, next) => {
    const { items, shipping } = req.body;
    let resp = res;
    const reference = `bzorder-${crypto.randomBytes(3).toString('hex')}`;

    try {
        if (!items) {
            const error = new Error('Can not add empty items to order');
            error.statusCode = 422;
            throw error
        }

        const params = JSON.stringify({
            email: req.user.email,
            amount: shipping.total * 100,
            reference,
            callback_url: `${process.env.CALLBACK_URL}/${reference}`,
            metadata: {
                shipping,
                items,
                user: req.user
            }
        })

        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        }
        const paystackReq = https.request(options, res => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', () => {
                const reqData = JSON.parse(data);
                console.log(reqData)
                resp.status(201).json({
                    ...reqData,
                    message: 'Order created successfully'
                })
            })
        }).on('error', error => {
            console.error(error)
            next(error)
        })

        paystackReq.write(params)
        paystackReq.end();


    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}

exports.verifyAndCreateOrder = async (req, res, next) => {
    const { reference } = req.query;
    let resp = res
    try {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${encodeURIComponent(reference)}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        }

        const paystackReq = https.request(options, res => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            });

            res.on('end', async() => {
                const reqData = JSON.parse(data);
                const innerData = reqData.data;
                // console.log(innerData.metadata.items);
                order = new Order({
                    items: [...innerData.metadata.items],
                    user: innerData.metadata.user.userId,
                    shipping: innerData.metadata.shipping
                });
                await order.save();
                await order.populate('items.product');

                resp.status(201).json({
                    message: 'Order created successfully',
                    order
                })
            })
        }).on('error', error => {
            // console.error(error);
            next(error)
        })
        paystackReq.end();
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}

exports.getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user.userId }).populate('items.product').exec();
        res.status(200).json({
            message: 'Fetched orders successfully',
            orders
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}