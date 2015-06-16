'use strict';

var escapeHtml = require('escape-html');
var beautify = require('./beautify.js');
var emitter = require('./emitter.js');
var parse = require('./parser.js');

exports.document = function (ecmarkdown) {
  return beautify(emitter.document(parse(ecmarkdown)));
};

exports.fragment = function (ecmarkdown) {
  return beautify(emitter.fragment(parse(escapeHtml(ecmarkdown))));
};
