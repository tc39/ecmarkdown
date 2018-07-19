'use strict';
const assert = require('assert');
const Tokenizer = require('../lib/tokenizer.js');
const Parser = require('../lib/parser.js');

describe('Parser', function () {
  function assertNode(node, name, location) {
    assert.equal(node.name, name);
    assert.deepEqual(node.location, location);
  }
  it('tracks positions', function () {
    const tokenizer = new Tokenizer('1. a\n2. b', { trackPositions: true });
    const parser = new Parser(tokenizer, { trackPositions: true });
    const document = parser.parseDocument();
    assertNode(document, 'document', { pos: 0, end: 9 });
    const algorithm = document.contents[0];
    assertNode(algorithm, 'algorithm', { pos: 0, end: 9 });
    const list = algorithm.contents;
    assertNode(list, 'ol', { pos: 0, end: 9 });
    const item0 = list.contents[0];
    assertNode(item0, 'list-item', { pos: 0, end: 5 });
    assertNode(item0.contents[0], 'text', { pos: 3, end: 5 });
    const item1 = list.contents[1];
    assertNode(item1, 'list-item', { pos: 5, end: 9 });
    assertNode(item1.contents[0], 'text', { pos: 8, end: 9 });
  });
});
