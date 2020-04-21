'use strict';
const Emitter = require('./EcmarkupEmitter.js');
const Parser = require('./parser.js');

module.exports = {
  parse: Parser.parse,
  emit: Emitter.emit,
  process(str, options) {
    return Emitter.emit(Parser.parse(str, options));
  }
};
