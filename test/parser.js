'use strict';
const assert = require('assert');
const { parseAlgorithm, parseFragment } = require('../');

describe('Parser', function () {
  it('tracks positions in algorithms', function () {
    const baseSource = '  1. [id="thing", other] a\n  2. b c\n    <figure>text</figure>';
    const assertNodeLocation = makeAssertLocation(baseSource);
    const algorithm = parseAlgorithm(baseSource);
    assertNodeLocation(algorithm, baseSource);
    const list = algorithm.contents;
    assertNodeLocation(list, '  1. [id="thing", other] a\n  2. b c\n    <figure>text</figure>');
    const item0 = list.contents[0];
    assertNodeLocation(item0, '  1. [id="thing", other] a\n');
    assertNodeLocation(item0.attrs[0], 'id="thing"');
    assertNodeLocation(item0.attrs[1], 'other');
    assertNodeLocation(item0.contents[0], 'a');
    const item1 = list.contents[1];
    assertNodeLocation(item1, '  2. b c\n    <figure>text</figure>');
    assertNodeLocation(item1.contents[0], 'b c\n    ');
    assertNodeLocation(item1.contents[1], '<figure>');
    assertNodeLocation(item1.contents[2], 'text');
    assertNodeLocation(item1.contents[3], '</figure>');
  });

  it('tracks positions in fragments', function () {
    const baseSource = 'Text |Nonterminal?| *format* x<sup>10</sup>.';
    const assertNodeLocation = makeAssertLocation(baseSource);
    const fragments = parseFragment(baseSource);
    assert.strictEqual(fragments.length, 9);
    assertNodeLocation(fragments[0], 'Text ');
    assertNodeLocation(fragments[1], '|Nonterminal?|');
    assertNodeLocation(fragments[2], ' ');
    assertNodeLocation(fragments[3], '*format*');
    assertNodeLocation(fragments[4], ' x');
    assertNodeLocation(fragments[5], '<sup>');
    assertNodeLocation(fragments[6], '10');
    assertNodeLocation(fragments[7], '</sup>');
    assertNodeLocation(fragments[8], '.');
  });

  it('tracks positions with broken formats', function () {
    for (const sample of ['x _', 'x |', '_x', '|y']) {
      const baseSource = sample;
      const assertNodeLocation = makeAssertLocation(baseSource);
      const fragments = parseFragment(baseSource);
      assert.strictEqual(fragments.length, 1);
      assertNodeLocation(fragments[0], sample);
    }
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
            attrs: [],
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
