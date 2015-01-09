'use strict';
var parser = require('./generated-parser.js');

exports.list = function (ecmarkdown) {
    return parser.parse(ecmarkdown.trim() + '\n', { startRule: 'list' });
};

exports.paragraph = function (ecmarkdown) {
    return parser.parse(ecmarkdown.trim(), { startRule: 'paragraph' });
};
