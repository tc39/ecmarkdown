'use strict';

var escapeHtml = require('escape-html');
var beautify = require('./beautify.js');
var Emitter = require('./emitter.js');
var parse = require('./parser');

exports.document = function (ecmarkdown) {
  return beautify(Emitter.document(parse(ecmarkdown)));
};

exports.fragment = function (ecmarkdown) {
  return beautify(Emitter.fragment(parse(escapeHtml(ecmarkdown))));
};
