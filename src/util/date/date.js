const moment = require('moment');

exports.getDateStringByFormat = function (date, format) {
    return moment(date).format(format);
}

exports.getNowByFormat = function (format) {
    return moment().format(format);
}

exports.getNow = function () {
    return moment();
}

exports.validateDateStringFormat = function (date, format) {
    return moment(date, format, true).isValid();
}

exports.isBefore = function (majorDate, minorDate) {
    return moment(minorDate).isBefore(majorDate)
}