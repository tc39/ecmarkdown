'use strict';
const assert = require('assert');
const { parseAlgorithm } = require('../');

describe('Parser', function () {
  function assertNodeLocation(node, name, location) {
    assert.equal(node.name, name);
    assert.deepEqual(node.location, location);
  }
  function stripLocations(node) {
    return JSON.parse(JSON.stringify(node, (k, v) => (k === 'location' ? undefined : v)));
  }
  it('tracks positions', function () {
    const algorithm = parseAlgorithm('  1. [id="thing"] a\n  2. b c');
    assertNodeLocation(algorithm, 'algorithm', {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 2, column: 9, offset: 28 },
    });
    const list = algorithm.contents;
    assertNodeLocation(list, 'ol', {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 2, column: 9, offset: 28 },
    });
    const item0 = list.contents[0];
    assertNodeLocation(item0, 'ordered-list-item', {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 2, column: 1, offset: 20 },
    });
    assertNodeLocation(item0.contents[0], 'text', {
      start: { line: 1, column: 19, offset: 18 },
      end: { line: 1, column: 20, offset: 19 },
    });
    const item1 = list.contents[1];
    assertNodeLocation(item1, 'ordered-list-item', {
      start: { line: 2, column: 1, offset: 20 },
      end: { line: 2, column: 9, offset: 28 },
    });
    assertNodeLocation(item1.contents[0], 'text', {
      start: { line: 2, column: 6, offset: 25 },
      end: { line: 2, column: 9, offset: 28 },
    });
  });

  it('does not consider comments to be text', function () {
    const algorithm = stripLocations(parseAlgorithm('1. Foo. <!-- bar --> baz.'));
    assert.deepStrictEqual(algorithm, {
      name: 'algorithm',
      contents: {
        name: 'ol',
        indent: 0,
        start: 1,
        contents: [
          {
            name: 'ordered-list-item',
            id: null,
            contents: [
              {
                contents: 'Foo. ',
                name: 'text',
              },
              {
                contents: '<!-- bar -->',
                name: 'comment',
              },
              {
                contents: ' baz.',
                name: 'text',
              },
            ],
            sublist: null,
          },
        ],
      },
    });
  });
});
