const express = require('express');
const { body, check } = require('express-validator');
const User = require('../models/user');
const authController = require('../controllers/auth-controller');
const isAuth = require('../middlewares/is-auth');

const router = express.Router();

router.post('/login', [
    body('email', 'Email is invalid').trim().isEmail().normalizeEmail(),
    body('password', 'Password must be at least 6 characters long').trim().isLength({ min: 6 }),
], authController.login);
router.post('/register', [
    body('email').isEmail().normalizeEmail().custom((value, { req }) => {
        return User.findOne({ email: value }).then(userDoc => {
            if (userDoc) {
                return Promise.reject('User exists already, please pick a different one.');
            }
        })
    }).withMessage('User exists already, please pick a different one.'),
    body('password').trim().isLength({ min: 6 }).isAlphanumeric().withMessage('Password must be at least 6 characters long'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords have to match!');
        }
        return true
    }),
    body('first_name').trim().not().isEmpty()
], authController.signup);
router.post('/reset-password', [
    body('email', 'Email is invalid').trim().isEmail().normalizeEmail()
], authController.resetPassword);

router.post('/set-new-password', [
    body('password').trim().isLength({ min: 6 }).isAlphanumeric().withMessage('Password must be at least 6 characters long'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords have to match!');
        }
        return true
    }),
], authController.setNewPassword);

router.get('/verify-email/:token/:email',[
    check('email', 'Email is invalid').trim().isEmail().normalizeEmail()
], authController.verifyEmail);

router.get('/resend-verify-email/:email',[
    check('email', 'Email is invalid').trim().isEmail().normalizeEmail()
], authController.resendVerificationEmail);

router.post('/change-password', isAuth, [
    body('old_password').trim().isLength({ min: 6 }).isAlphanumeric().withMessage('Password must be at least 6 characters long'),
    body('new_password').trim().isLength({ min: 6 }).isAlphanumeric().withMessage('Password must be at least 6 characters long'),
    body('confirm_password').custom((value, { req }) => {
        if (value !== req.body.new_password) {
            throw new Error('Passwords have to match!');
        }
        return true
    }),
], authController.changePassword)

module.exports = router;