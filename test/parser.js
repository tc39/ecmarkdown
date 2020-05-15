'use strict';
const assert = require('assert');
const Tokenizer = require('../dist/tokenizer.js').Tokenizer;
const Parser = require('../dist/parser.js').Parser;

describe('Parser', function () {
  function assertNode(node, name, location) {
    assert.equal(node.name, name);
    assert.deepEqual(node.location, location);
  }
  it('tracks positions', function () {
    const tokenizer = new Tokenizer('  1. a\n  2. b c', { trackPositions: true });
    const parser = new Parser(tokenizer, { trackPositions: true });
    const algorithm = parser.parseAlgorithm();
    assertNode(algorithm, 'algorithm', {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 2, column: 8, offset: 15 },
    });
    const list = algorithm.contents;
    assertNode(list, 'ol', {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 2, column: 8, offset: 15 },
    });
    const item0 = list.contents[0];
    assertNode(item0, 'ordered-list-item', {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 2, column: 0, offset: 7 },
    });
    assertNode(item0.contents[0], 'text', {
      start: { line: 1, column: 5, offset: 5 },
      end: { line: 1, column: 6, offset: 6 },
    });
    const item1 = list.contents[1];
    assertNode(item1, 'ordered-list-item', {
      start: { line: 2, column: 0, offset: 7 },
      end: { line: 2, column: 8, offset: 15 },
    });
    assertNode(item1.contents[0], 'text', {
      start: { line: 2, column: 5, offset: 12 },
      end: { line: 2, column: 8, offset: 15 },
    });
  });
});
