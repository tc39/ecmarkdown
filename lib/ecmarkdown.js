'use strict';
const escapeHtml = require('escape-html');
const beautify = require('./beautify.js');
const emitter = require('./emitter.js');
const parse = require('./parser.js');

exports.document = function (ecmarkdown) {
  return beautify(emitter.document(parse(ecmarkdown)));
};

exports.fragment = function (ecmarkdown) {
  return beautify(emitter.fragment(parse(escapeHtml(ecmarkdown))));
};
