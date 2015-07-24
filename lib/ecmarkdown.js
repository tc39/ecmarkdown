'use strict';
const escapeHtml = require('escape-html');
const emitter = require('./emitter.js');
const Parser = require('./parser.js');
const Tokenizer = require('./tokenizer.js');

exports.document = function (ecmarkdown) {
  return emitter.document(parse(ecmarkdown));
};

exports.fragment = function (ecmarkdown) {
  return emitter.fragment(parse(escapeHtml(ecmarkdown)));
};

function parse(emd) {
  const t = new Tokenizer(emd);
  const p = new Parser(t);
  return p.parseDocument();
}
