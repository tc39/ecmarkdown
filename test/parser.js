'use strict';
const assert = require('assert');
const { parseAlgorithm } = require('../');

describe('Parser', function () {
  it('tracks positions', function () {
    const baseSource = '  1. [id="thing"] a\n  2. b c';
    const assertNodeLocation = makeAssertLocation(baseSource);
    const algorithm = parseAlgorithm(baseSource);
    assertNodeLocation(algorithm, baseSource);
    const list = algorithm.contents;
    assertNodeLocation(list, '  1. [id="thing"] a\n  2. b c');
    const item0 = list.contents[0];
    assertNodeLocation(item0, '  1. [id="thing"] a\n');
    assertNodeLocation(item0.contents[0], 'a');
    const item1 = list.contents[1];
    assertNodeLocation(item1, '  2. b c');
    assertNodeLocation(item1.contents[0], 'b c');
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

// this gives one-based line and column numbers
function offsetToLineAndColumn(string, offset) {
  const lines = string.split('\n');
  let line = 0;
  let seen = 0;
  while (true) {
    if (line >= lines.length) {
      throw new Error(`offset ${offset} exceeded string ${JSON.stringify(string)}`);
    }
    if (seen + lines[line].length >= offset) {
      break;
    }
    seen += lines[line].length + 1; // +1 for the '\n'
    ++line;
  }
  const column = offset - seen;
  return { line: line + 1, column: column + 1 };
}

function stripLocations(node) {
  return JSON.parse(JSON.stringify(node, (k, v) => (k === 'location' ? undefined : v)));
}

function makeAssertLocation(baseSource) {
  return function assertNodeLocation(node, nodeSource) {
    let { start, end } = node.location;
    assert.strictEqual(baseSource.substring(start.offset, end.offset), nodeSource);
    // prettier-ignore
    let { line: startLine, column: startColumn } =
    offsetToLineAndColumn(baseSource, start.offset);
    assert.strictEqual(start.line, startLine);
    assert.strictEqual(start.column, startColumn);
    // prettier-ignore
    let { line: endLine, column: endColumn } =
    offsetToLineAndColumn(baseSource, end.offset);
    assert.strictEqual(end.line, endLine);
    assert.strictEqual(end.column, endColumn);
  };
}
