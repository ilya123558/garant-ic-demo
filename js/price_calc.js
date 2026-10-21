/* Страница price.php: модальное окно «Получить расчёт» / «Подобрать комплект».
   Заявка уходит в общий обработчик form_2.php (forma=pricecalc) без перезагрузки страницы. */
(function () {
    var modal = document.getElementById('calc-modal');
    if (!modal) return;

    var form = modal.querySelector('.calc-form');
    var success = modal.querySelector('.calc-success');
    var fail = modal.querySelector('.calc-form-fail');
    var head = modal.querySelector('.calc-modal-head');
    var title = modal.querySelector('#calc-modal-title');
    var submit = form.querySelector('.calc-form-submit');
    var source = form.querySelector('[name="final_order"]');
    var lastFocus = null;

    // Заголовок окна и пометка для письма — в зависимости от нажатой кнопки.
    // Письмо уходит в KOI8-R: в пометке без «ёлочек» и других символов вне этой кодировки.
    var SOURCES = {
        calc: { title: 'Получить расчёт', order: 'Цены, кнопка "Получить расчет" (перед прайс-листом)' },
        pick: { title: 'Подобрать комплект', order: 'Цены, кнопка "Подобрать комплект" (универсальная линейка)' }
    };

    var MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    var fields = {
        fio: {
            input: form.querySelector('[name="fio"]'),
            check: function (v) { return v.length >= 2 ? '' : 'Укажите, как к вам обращаться'; }
        },
        phone: {
            input: form.querySelector('[name="phone"]'),
            check: function (v) {
                if (!v) return 'Укажите телефон';
                var digits = v.replace(/\D/g, '');
                return (v.indexOf('_') === -1 && digits.length >= 10 && digits.length <= 12) ? '' : 'Проверьте номер телефона';
            }
        },
        mail: {
            input: form.querySelector('[name="useremail"]'),
            check: function (v) {
                if (!v) return 'Укажите e-mail';
                return MAIL_RE.test(v) ? '' : 'Проверьте e-mail';
            }
        }
    };

    function setError(field, msg) {
        var box = field.input.parentNode;
        box.querySelector('.calc-error').textContent = msg;
        if (msg) {
            box.classList.add('invalid');
            field.input.setAttribute('aria-invalid', 'true');
        } else {
            box.classList.remove('invalid');
            field.input.removeAttribute('aria-invalid');
        }
    }

    function validate(field) {
        var msg = field.check(field.input.value.trim());
        setError(field, msg);
        return !msg;
    }

    function validateAll() {
        var firstBad = null;
        for (var k in fields) {
            if (!validate(fields[k]) && !firstBad) firstBad = fields[k].input;
        }
        if (firstBad) firstBad.focus();
        return !firstBad;
    }

    // Ошибка поля снимается, как только пользователь его исправил
    for (var key in fields) {
        (function (field) {
            field.input.addEventListener('input', function () {
                if (field.input.getAttribute('aria-invalid')) validate(field);
            });
            field.input.addEventListener('blur', function () {
                if (field.input.value.trim()) validate(field);
            });
        })(fields[key]);
    }

    // Маска телефона — тот же плагин, что и в остальных формах сайта (на мобильных, как и там, без маски)
    var $ = window.jQuery;
    var mobile = typeof window.is_mobile === 'function' && window.is_mobile();
    if ($ && $.fn && $.fn.mask && !mobile) {
        $(fields.phone.input).mask('+7 (999) 999-99-99');
    }

    function resetForm() {
        form.reset();
        for (var k in fields) setError(fields[k], '');
        head.hidden = false;
        form.hidden = false;
        success.hidden = true;
        fail.hidden = true;
        submit.disabled = false;
        submit.textContent = 'Отправить';
    }

    function open(kind) {
        var src = SOURCES[kind] || SOURCES.calc;
        resetForm();
        title.textContent = src.title;
        source.value = src.order;
        lastFocus = document.activeElement;
        modal.hidden = false;
        document.documentElement.classList.add('calc-lock');
        fields.fio.input.focus();
    }

    function close() {
        if (modal.hidden) return;
        modal.hidden = true;
        document.documentElement.classList.remove('calc-lock');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Вызываются из разметки: onclick="openCalc('calc')", onclick="closeCalc()" — как togglePrice
    window.openCalc = open;
    window.closeCalc = close;

    document.addEventListener('keydown', function (e) {
        if (modal.hidden) return;
        if (e.key === 'Escape' || e.key === 'Esc') {
            close();
            return;
        }
        // Tab не уходит из окна
        if (e.key === 'Tab') {
            var items = modal.querySelectorAll('button, input:not([type="hidden"]), a[href]');
            var list = [];
            for (var i = 0; i < items.length; i++) {
                if (items[i].offsetParent !== null && items[i].tabIndex !== -1) list.push(items[i]);
            }
            if (!list.length) return;
            var first = list[0], last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
            else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
        }
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        fail.hidden = true;
        if (!validateAll()) return;

        submit.disabled = true;
        submit.textContent = 'Отправляем…';

        // form_2.php после отправки письма отвечает редиректом на done.php.
        // redirect: 'manual' — редирект считаем успехом и остаёмся на странице цен.
        fetch(form.getAttribute('action'), {
            method: 'POST',
            body: new FormData(form),
            credentials: 'same-origin',
            redirect: 'manual'
        }).then(function (res) {
            if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400) || res.redirected) {
                head.hidden = true;
                form.hidden = true;
                success.hidden = false;
                success.querySelector('button').focus();
            } else {
                throw new Error('status ' + res.status);
            }
        }).catch(function () {
            fail.hidden = false;
            submit.disabled = false;
            submit.textContent = 'Отправить';
        });
    });
})();
