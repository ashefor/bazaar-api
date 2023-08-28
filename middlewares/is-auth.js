const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeaders = req.headers['authorization'];
    if (!authHeaders) {
        const err = new Error('Not authenticated');
        err.statusCode = 401;
        throw err;
    }
    const token =  authHeaders.split(' ')[1];
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        error.statusCode = 403;
        throw error;
    }

    if(!decodedToken) {
        const err = new Error('Token not authenticated')
        err.statusCode = 401;
        throw err;
    }
    // console.log(decodedToken)
    req.user = decodedToken;
    next();
}
