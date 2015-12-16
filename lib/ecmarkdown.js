'use strict';
const escapeHtml = require('escape-html');
const Emitter = require('./EcmarkupEmitter.js');
const Parser = require('./parser.js');
const Tokenizer = require('./tokenizer.js');

exports.document = function (ecmarkdown) {
  return Emitter.emit(parse(ecmarkdown));
};

exports.fragment = function (ecmarkdown) {
  const frag = parseFragment(escapeHtml(ecmarkdown));
  return Emitter.emit(frag);
};

function parse(emd) {
  const t = new Tokenizer(emd);
  const p = new Parser(t);
  return p.parseDocument();
}

function parseFragment(emd) {
  const t = new Tokenizer(emd);
  const p = new Parser(t);
  return p.parseFragment({ allowParabreak: true });
}
