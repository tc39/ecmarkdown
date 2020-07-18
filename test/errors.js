'use strict';

const assert = require('assert');
const { parseAlgorithm } = require('..');

let locationMarker = {};
let M = locationMarker;
function positioned(literalParts, ...interpolatedParts) {
  let markerIndex = interpolatedParts.indexOf(locationMarker);
  if (markerIndex < 0 || markerIndex !== interpolatedParts.lastIndexOf(locationMarker)) {
    throw new Error('positioned template tag must interpolate the location marker exactly once');
  }
  let offset, line, column;
  let str = literalParts[0];
  for (let i = 0; i < literalParts.length - 1; ++i) {
    if (i === markerIndex) {
      offset = str.length;
      let lines = str.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else {
      str += String(interpolatedParts[i]);
    }
    str += literalParts[i + 1];
  }
  return { offset, line, column, source: str };
}

function assertError(parse, { offset, line, column, source }, message) {
  let reported = true;

  try {
    parse(source);
    reported = false;
  } catch (e) {
    assert.deepStrictEqual(
      {
        offset: e.offset,
        line: e.line,
        column: e.column,
        message: e.message,
      },
      { offset, line, column, message }
    );
  }
  assert.equal(reported, true, 'should have thrown an error');
}

function assertAlgError(obj, message) {
  assertError(parseAlgorithm, obj, message);
}

describe('errors', function () {
  it('simple error location', function () {
    assertAlgError(
      positioned`
      1. a
${M}      * b
    `,
      'Unexpected token ul; expected EOF'
    );

    assertAlgError(
      positioned`
      1. a${M}

    `,
      'Unexpected token parabreak; expected EOF'
    );
  });
});
