'use strict';
var parser = require('./generated-parser.js');
var escapeHtml = require('escape-html');

exports.list = function (ecmarkdown) {
    return parser.parse(ecmarkdown.trim() + '\n', { startRule: 'list' });
};

exports.fragment = function (ecmarkdown) {
    return parser.parse(escapeHtml(ecmarkdown.trim()), { startRule: 'fragment' });
};
