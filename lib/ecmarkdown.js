'use strict';
var parser = require('./generated-parser.js');

module.exports = function translate(ecmarkdown) {
    return parser.parse(ecmarkdown.trim() + '\n');
};
