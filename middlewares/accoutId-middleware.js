const crypto = require('crypto');

module.exports = (req, res, next) => {
    const reqAccountId = req.accountId;
    let accountId;
    if (reqAccountId) {
        accountId = reqAccountId;
    } else {
        accountId = crypto.randomUUID();
    }
    req.accountId = accountId;
    next();
}
