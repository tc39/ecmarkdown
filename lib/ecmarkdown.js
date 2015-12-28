'use strict';
const Emitter = require('./EcmarkupEmitter.js');
const Parser = require('./parser.js');
const Tokenizer = require('./tokenizer.js');

module.exports = ecmarkdownText => {
  const t = new Tokenizer(ecmarkdownText);
  const p = new Parser(t);
  const ast = p.parseDocument();
  return Emitter.emit(ast);
};
