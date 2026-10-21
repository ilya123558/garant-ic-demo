// Заглушка вместо form_2.php: ничего не сохраняет и не отправляет, отвечает тем же редиректом, что и настоящий обработчик.
module.exports = (req, res) => {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Allow', 'POST');
        return res.end();
    }
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
};
