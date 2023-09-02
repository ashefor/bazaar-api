const https = require('https');
const crypto = require('crypto');
const Order = require('../models/order');
const User = require('../models/user');
const fs = require('graceful-fs').promises;
const ejs = require('ejs');
const nodemailer = require('nodemailer');
const easyinvoice = require('easyinvoice');
const path = require('path');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});

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
            callback_url: `${process.env.CALLBACK_URL}`,
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

            res.on('end', async () => {
                const reqData = JSON.parse(data);
                const innerData = reqData.data;
                try {
                    if (!innerData) {
                        const error = new Error('Transaction not found/valid');
                        error.statusCode = 400;
                        throw error
                    }
                    let order = await Order.findOne({ trx_ref: reference, user: innerData.metadata.user.userId }).exec();
                    if (!order) {
                        order = new Order({
                            items: [...innerData.metadata.items],
                            user: innerData.metadata.user.userId,
                            shipping: innerData.metadata.shipping,
                            trx_ref: reference
                        });
                        await order.save();
                        await order.populate(['items.product', 'user']);
                        resp.status(200).json({
                            message: 'Order created successfully',
                            order
                        })
                        await sendOrderMail(order);
                    } else {
                        await order.populate(['items.product', 'user']);
                        resp.status(200).json({
                            message: 'Order created successfully',
                            order
                        })
                    }

                } catch (error) {
                    if (!error.statusCode) {
                        error.statusCode = 500
                    };
                    next(error)
                }
            })
        }).on('error', error => {
            // console.error(error);
            throw error
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
        const orders = await Order.find({ user: req.user.userId }).populate(['items.product', 'user']).exec();
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

exports.viewInvoice = async (req, res, next) => {
    const { order_id } = req.params
    try {
        const order = await Order.findOne({ _id: order_id }).populate(['items.product', 'user']).exec();
        const fileName = await createInvoiceMail(order);
        res.status(200).json({
            link: `${req.protocol}://${req.get('host')}/invoices/${fileName}`
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}

const createInvoiceMail = async (order) => {
    try {
        const data = {
            "images": {
                "logo": "https://bazaar.cptshredder.com/assets/images/ecommerce.png",
            },
            "sender": {
                "company": "Bazaar",
                "address": "Sample Street 123",
                "zip": "1234 AB",
                "city": "Lagos",
                "country": "Nigeria"
            },
            "client": {
                "company": `${order.user.first_name} ${order.user.last_name}`,
                "address": order.shipping.address,
                "zip": "4567 CD",
                "city": "Lagos",
                "country": "Nigeria"
            },
            "information": {
                "number": order._id,
                "date": new Date(order.createdAt).toDateString(),
            },
            "products": order.items.map(item => {
                return {
                    "description": item.product.product_name,
                    "quantity": item.quantity,
                    "price": item.product.product_price,
                    "tax-rate": 0
                }
            }),
            "total": order.shipping.total,
            "bottom-notice": "Thank you for shopping with us",
            "settings": {
                "currency": "NGN",
            },
        };
        const fileName = order._id + '.pdf';
        // const filePath = path.join(__dirname, `invoices/${fileName}`);
        const result = await easyinvoice.createInvoice(data);
        await fs.writeFile(`/invoices/${fileName}`, result.pdf, 'base64');
        // await fs.writeFile(path.join(process.cwd(), 'invoices', fileName), result.pdf, 'base64');
        return fileName;
    } catch (error) {
        throw error;
    }
}

const sendOrderMail = async (orderDetails) => {
    try {
        console.log(orderDetails)
        const fileName = await createInvoiceMail(orderDetails);
        const emailTemplate = await fs.readFile('./templates/order-email.ejs', 'utf8');
        const compiledTemplate = ejs.compile(emailTemplate);
        const html = compiledTemplate({
            invoice: orderDetails,
            link: `${process.env.NODE_ENV != 'production' ? process.env.BASE_URL_DEV : process.env.BASE_URL_PROD}/invoices/${fileName}`
        })
        const filePath = path.join(__dirname, `../invoices/${fileName}`);
        const mailOptions = {
            from: '"The Bazaar Team" <order@bazaar.cptshredder.com>',
            to: orderDetails.user.email,
            subject: `Invoice for Order #${orderDetails._id}`,
            html: html,
            attachments: [
                {
                    filename: fileName,
                    path: filePath
                }
            ]
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        const err = new Error(error);
        throw (err);
    }
}

