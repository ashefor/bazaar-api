const User = require('../models/user');
const brcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cryto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});


const { validationResult } = require('express-validator');


const sendMail = async (token, email) => {
    const mailOptions = {
        from: '"The Bazaar Team" <help@bazaar.cptshredder.com>',
        to: email,
        subject: `Welcome to ${process.env.COMPANY_NAME} - Your Signup Was Successful! Verify Your Account Now`,
        html: `
        <table cellspacing="0" cellpadding="0" style="margin:0px auto; width: 100%; background-color:#fff;">
<tbody>
    <tr>
        <td>
            <div
                style="background-color: #fff; border: 1px solid #eee; box-sizing: border-box; font-family: Lato, Helvetica, 'Helvetica Neue', Arial, 'sans-serif'; margin: auto; max-width: 600px; overflow: hidden; width: 600px;">
                <div
                    style="padding: 65px 90px 20px; background-color: #1B3E71; background-image: url(https://static.zohocdn.com/zeptomail/assets/images/circles.4ee9fbd3db3cd183c76b.svg); background-repeat: no-repeat; background-position: top right; background-size: 140px;">
                    <h4 style="color: #fff; font-weight: normal; font-size: 16px; margin: 0; margin-bottom: 10px;">
                        Hi ,<br></h4>
                    <h2 style="color: #fff; font-size: 24px; font-weight: normal;margin: 0;">Welcome to Bazaar!<br>
                    </h2>
                </div>
                <div style="padding: 25px 90px 65px;">
                    <p style="margin: 0px 0px 30px; line-height: 20px;">
                        <span class="size" style="font-size: 14px; margin: 0px; line-height: 20px;">We're very glad that you have chosen to join the Bazaar family, your one stop shop for everything nice.</span><br>
                    </p>
                    <p style="margin: 0px; line-height: 20px;">
                        <span class="size" style="font-size: 14px; margin: 0px; line-height: 20px;">To get started with using your account, verify your account by clicking on the below link:</span><br>
                    </p>
                    <div><a href="http://localhost:4200/auth/verify-email/${token}/${email}"
                            style="border: none; border-radius: 4px; color: #fff; cursor: pointer; display: inline-block; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 24px; background-color: #1B3E71; margin: 20px 0 30px;">Verify
                            your account</a> <br></div>

                     <p style="margin: 0px 0px 30px; line-height: 20px;">
                            <span class="size" style="font-size: 14px; margin: 0px 0px 30px; line-height: 20px;">or you can copy and paste the link below into your browser <a href="http://localhost:4200/auth/verify-email/${token}/${email}">http://localhost:4200/auth/verify-email/${token}/${email}</a> </span><br>
                        </p>
                    <p style="margin: 0px 0px 30px; line-height: 20px;">
                        <span class="size" style="font-size: 14px; margin: 0px 0px 30px; line-height: 20px;">If you'd like to know more about Bazaar or want to get in touch with us, get in touch with our customer support team.</span><br>
                    </p>
                    <p style="margin: 0px; line-height: 20px;">
                        <span class="size" style="font-size: 14px; margin: 0px; line-height: 20px;">Thank you,</span><br>
                    </p>
                    <p style="margin: 0px; line-height: 20px;">
                        <span class="size" style="font-size: 14px; margin: 0px; line-height: 20px;">Team Bazaar.</span><br>
                    </p>
                </div>
            </div>
        </td>
    </tr>
</tbody>
</table>
<div><br></div>
        `,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Email Sent');
    });
}
exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    const { email, password, first_name, last_name } = req.body;
    try {
        if (!errors.isEmpty()) {
            const msg = errors.array().map(err => err.msg).join(', ');
            const error = new Error(msg);
            error.statusCode = 422;
            error.data = errors.array();
            throw error
        }
        const hashedPw = await brcrypt.hash(password, 12)
        const user = new User({
            email: email,
            password: hashedPw,
            first_name: first_name,
            last_name: last_name,
            accountId: cryto.randomUUID()
        });
        await user.save();
        const token = jwt.sign({
            email: email,
        }, process.env.JWT_SECRET, { expiresIn: '10m' });
        res.status(201).json({
            message: 'User created successfully',
            userId: user._id
        })
        sendMail(token, email)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}

exports.verifyEmail = async (req, res, next) => {
    const { token, email } = req.params;
    let decodedToken;
    if (!token) {
        const err = new Error('Email verification failed, possibly the link is invalid or expired');
        err.statusCode = 401;
        throw err;
    }
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (!decodedToken) {
            const err = new Error('Token invalid. Please request for a new verification email link')
            err.statusCode = 401;
            throw err;
        }
        const user = await User.findOne({ email: email }).exec();
        user.verified = true;
        await user.save();
        res.status(200).json({
            message: 'Email verified successfully',
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 400
        };
        next(error);
    }
}

exports.resendVerificationEmail = async (req, res, next) => {
    const errors = validationResult(req);
    const { email } = req.params;
    try {
        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            error.data = errors.array();
            throw error
        }
        const token = jwt.sign({
            email: email,
        }, process.env.JWT_SECRET, { expiresIn: '10m' });
        res.status(200).json({
            message: 'Verification email sent',
        })
        sendMail(token, email)
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error)
    }
}

exports.login = async (req, res, next) => {
    const errors = validationResult(req);
    const { email, password } = req.body;
    try {
        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            error.data = errors.array();
            throw error
        }
        const user = await User.findOne({ email: email }).exec();
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error
        }
        const isEqual = await brcrypt.compare(password, user.password)
        if (!isEqual) {
            const error = new Error('Wrong password');
            error.statusCode = 401;
            throw error
        }
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString(),
            first_name: user.first_name
        }, process.env.JWT_SECRET, { expiresIn: '1d' });
        user.password = undefined;
        res.status(200).json({
            message: 'Successful',
            token: token,
            expiresIn: 86400,
            user: user._doc
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error);
    }
}

exports.resetPassword = async (req, res, next) => {
    const errors = validationResult(req);
    const { email } = req.body;
    try {
        if (!errors.isEmpty()) {
            const msg = errors.array().map(err => err.msg).join(', ');
            const error = new Error(msg);
            error.statusCode = 422;
            error.data = errors.array();
            throw error
        }
        const user = await User.findOne({ email: email }).exec();
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error
        }
        cryto.randomBytes(32, async (err, buffer) => {
            if (err) {
                const error = new Error('Can not generate token');
                error.statusCode = 500;
                throw err
            }
            const token = buffer.toString('hex');
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            await user.save();
            res.status(200).json({
                message: 'Password reset link sent',
            })
            const mailOptions = {
                from: '"The Bazaar Team" <help@bazaar.cptshredder.com>',
                to: email,
                subject: `Password Reset Request - ${process.env.COMPANY_NAME}`,
                html: `
                <table cellspacing="0" cellpadding="0" style="background-color: #F2F2F2; border: 1px solid #eee; width: 100%;">
    <tbody>
        <tr>
            <td>
                <div
                    style="background-color: #fff; border: 1px solid #eee; border-bottom: 4px solid #027EE6; box-sizing: border-box; font-family: Lato, Helvetica, 'Helvetica Neue', Arial, 'sans-serif'; padding: 40px 50px; margin: 40px auto; max-width: 600px; overflow: hidden; width: 600px;">
                    <div
                        style="display: flex; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
                        <div
                            style="background-image: url(http://localhost:4200/assets/images/ecommerce.png); background-repeat: no-repeat; background-position: center; height: 40px; width: 40px; margin-right: 10px;">
                            <br>
                        </div>
                        <h4 style="font-weight: normal; font-size: 24px; margin: 0;">Password Reset Instructions<br>
                        </h4>
                    </div>
                    <h2 style="color: #253745; font-size: 20px; font-weight: normal; margin: 0; margin-bottom: 30px;">Hi
                    ${user.first_name},<br></h2>
                    <p style="margin: 0px 0px 30px; line-height: 22px;">
                        <span class="colour" style="color:rgb(37, 55, 69)"><span class="size" style="font-size: 14px; margin: 0px 0px 30px; line-height: 22px;">Someone (hopefully you!) has requested to change your Bazaar password. </span></span><br>
                    </p>
                    <p style="margin: 0px; line-height: 22px;">
                        <span class="colour" style="color:rgb(37, 55, 69)"><span class="size" style="font-size: 14px; margin: 0px; line-height: 22px;">Click on the below link to reset your password.</span></span><br>
                    </p><a href="http://localhost:4200/auth/set-password/?token=${token}"
                        style="border: none; border-radius: 4px; color: #fff; cursor: pointer; display: inline-block; font-size: 16px; padding: 15px 30px; background-color: #027EE6; text-decoration: none; margin: 25px 0;">Password
                        Reset</a>
                    <p style="margin: 0px 0px 30px; line-height: 22px;">
                        <span class="colour" style="color:rgb(37, 55, 69)"><span class="size" style="font-size: 14px; margin: 0px 0px 30px; line-height: 22px;">This link will only be valid for the next <b>24 hours.</b> If you did not initiate the password reset, ignore this email.</span></span><br>
                    </p>
                    <p style="margin: 0px 0px 30px; line-height: 22px;">
                        <span class="colour" style="color:rgb(37, 55, 69)"><span class="size" style="font-size: 14px; margin: 0px 0px 30px; line-height: 22px;">If you'd like to know more about us or want to get in touch with us, get in touch with our customer support team.</span></span><br>
                    </p>
                    <p style="margin: 0px; line-height: 22px;">
                        <span class="colour" style="color:rgb(37, 55, 69)"><span class="size" style="font-size: 14px; margin: 0px; line-height: 22px;">Thank you,</span></span><br>
                    </p>
                    <p style="margin: 0px; line-height: 22px;">
                        <span class="colour" style="color:rgb(37, 55, 69)"><span class="size" style="font-size: 14px; margin: 0px; line-height: 22px;">Team Bazaar.</span></span><br>
                    </p>
                </div>
            </td>
        </tr>
    </tbody>
</table>
<div><br></div>
                `,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Email Sent');
            });
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error);
    }
}

exports.setNewPassword = async (req, res, next) => {
    const errors = validationResult(req);
    const { password, resetToken } = req.body;
    try {
        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            error.data = errors.array();
            throw error
        }
        const user = await User.findOne({ resetToken: resetToken, resetTokenExpiration: { $gt: Date.now() } }).exec();
        if (!user) {
            const error = new Error('Request expired. Please reset your password again');
            error.statusCode = 401;
            throw error
        }
        const hashedPw = await brcrypt.hash(password, 12);
        user.password = hashedPw;
        user.resetToken = undefined;
        user.resetTokenExpiration = undefined;
        await user.save();
        res.status(200).json({
            message: 'Password successfully changed',
        })
        const mailOptions = {
            from: '"The Bazaar Team" <help@bazaar.cptshredder.com>',
            to: email,
            subject: `Password Reset Successful - ${process.env.COMPANY_NAME}`,
            html: `
            <div style="padding: 15px;">
  <div style="margin-bottom: 25px;">
    <img src="assets/images/ecommerce.png" width="65" style="margin: 25px auto;" alt="" srcset="">
    <p style="text-align: center; font-size: 25px; font-weight: 600;">Password reset successful!</p>
  </div>
  <div style="width: 100%; max-width: 550px; margin: auto; border-radius: 4px; ">
    <p style="margin-bottom: 25px;">Hello ${user.first_name}</p>
    <p style="margin-bottom: 25px;">
      Congratulations! Your password has been successfully set. <a style="color:blueviolet; text-decoration: underline;" href="http://localhost:4200/auth/login">You can proceed to login with your new password here</a>.
    </p>
    <hr style="margin: 25px 0;">
    <div>
      <p>Sincerely,</p>
      <p>The Bazaar team</p>
    </div>
  </div>
</div>
            `,
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Email Sent');
        });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error);
    }
}

exports.changePassword = async(req, res, next) => {
    const errors = validationResult(req);
    const { old_password, new_password } = req.body;
    try {
        if (!errors.isEmpty()) {
            const error = new Error('Validation Failed');
            error.statusCode = 422;
            error.data = errors.array();
            throw error
        }
        const user = await User.findOne({ _id: req.user.userId }).exec();
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error
        }
        const isEqual = await brcrypt.compare(old_password, user.password)
        if (!isEqual) {
            const error = new Error('Wrong password');
            error.statusCode = 403;
            throw error
        }
        const hashedPw = await brcrypt.hash(new_password, 12);
        user.password = hashedPw;
        await user.save();
        res.status(200).json({
            message: 'Password successfully changed',
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500
        };
        next(error);
    }
}