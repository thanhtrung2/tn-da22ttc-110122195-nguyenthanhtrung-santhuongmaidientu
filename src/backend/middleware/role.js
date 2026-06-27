const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
        }
        if (!roles.includes(req.user.vai_tro)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này' });
        }
        next();
    };
};

module.exports = { authorize };
