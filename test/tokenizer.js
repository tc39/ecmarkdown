'use strict';
/*global describe, it, beforeEach */

var assert = require('assert');
var Tokenizer = require('../lib/tokenizer');

function assertTok(tok, name, contents) {
  assert.equal(tok.name, name);
  assert.equal(tok.contents, contents);
}

describe('Tokenizer#peek', function () {
  var t;

  beforeEach(function () {
    t = new Tokenizer('a *b* c');
  });

  it('should return the next token', function () {
    assertTok(t.peek(), 'chars', 'a');
  });

  it('should return later tokens when given an offset', function () {
    assertTok(t.peek(2), 'whitespace', ' ');
  });

  it('should not consume tokens', function () {
    assertTok(t.peek(2), 'whitespace', ' ');
    assertTok(t.peek(1), 'chars', 'a');
  });

  it('should handle skipping buffering tokens', function () {
    assertTok(t.peek(2), 'whitespace', ' ');
    assertTok(t.peek(3), 'star', '*');
    assertTok(t.peek(), 'chars', 'a');
  });

  it('should handle EOF properly', function () {
    assertTok(t.peek(7), 'chars', 'c');
    assertTok(t.peek(8), 'EOF');
    assertTok(t.peek(9), 'EOF');
    assertTok(t.peek(10), 'EOF');
  });
});

describe('Tokenizer#next', function () {
  it('should handle EOF properly', function () {
    var t = new Tokenizer('a b');
    assertTok(t.next(), 'chars', 'a');
    assertTok(t.next(), 'whitespace', ' ');
    assertTok(t.next(), 'chars', 'b');
    assertTok(t.next(), 'EOF');
    assertTok(t.next(), 'EOF');
    assertTok(t.next(), 'EOF');
    assertTok(t.next(), 'EOF');
  });
});

function testBasicToken(name, token) {
  describe(name, function () {
    it('is scanned properly at the start', function () {
      var t = new Tokenizer(token + 'b');
      assertTok(t.next(), name, token);
      assertTok(t.next(), 'chars', 'b');
      assertTok(t.next(), 'EOF');
    });

    it('is scanned properly after whitespace', function () {
      var t = new Tokenizer(' ' + token);
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), name, token);
      assertTok(t.next(), 'EOF');
    });

    it('is scanned properly after chars', function () {
      var t = new Tokenizer('b' + token);
      assertTok(t.next(), 'chars', 'b');
      assertTok(t.next(), name, token);
      assertTok(t.next(), 'EOF');
    });

    it('is scanned properly after linebreak', function () {
      var t = new Tokenizer('\n' + token);

      if (token === '\n') {
        assertTok(t.next(), 'parabreak', '\n\n');
      } else if (token === '\n\n') {
        assertTok(t.next(), 'parabreak', '\n\n');
        assertTok(t.next(), 'linebreak', '\n');
      } else {
        assertTok(t.next(), 'linebreak', '\n');
        assertTok(t.next(), name, token);
      }

      assertTok(t.next(), 'EOF');
    });

    it('is scanned properly after parabreak', function () {
      var t = new Tokenizer('\n\n' + token);
      assertTok(t.next(), 'parabreak', '\n\n');
      assertTok(t.next(), name, token);
      assertTok(t.next(), 'EOF');
    });
  });
}

describe('Token:', function () {
  testBasicToken('star', '*');
  testBasicToken('underscore', '_');
  testBasicToken('tick', '`');
  testBasicToken('pipe', '|');
  testBasicToken('string', '"');
  testBasicToken('tilde', '~');
  testBasicToken('linebreak', '\n');
  testBasicToken('parabreak', '\n\n');

  describe('linebreak', function () {
    // TODO: Fix this
    it('does not consider \\r a linebreak', function () {
      var t = new Tokenizer('\r\nfoo');
      assertTok(t.next(), 'chars', '\r');
      assertTok(t.next(), 'linebreak', '\n');
    });
  });

  describe('list', function () {
    it('considers a list at the start of the string a list', function () {
      var t = new Tokenizer('1. foo');
      assertTok(t.next(), 'list', '1. ');
      assertTok(t.next(), 'chars', 'foo');
    });

    it('does not consider a list in the middle of the string a list', function () {
      var t = new Tokenizer('foo 1. foo');
      assertTok(t.next(), 'chars', 'foo');
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), 'chars', '1.');
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), 'chars', 'foo');
    });

    // note that this will not parse as a list but the lexer considers it one
    // since it doesn't know if we're in a paragraph or a list.
    it('considers a list after a newline a list', function () {
      var t = new Tokenizer('foo\n1. foo');
      assertTok(t.next(), 'chars', 'foo');
      assertTok(t.next(), 'linebreak', '\n');
      assertTok(t.next(), 'list', '1. ');
      assertTok(t.next(), 'chars', 'foo');
    });

    it('does not consider a number without a dot a list', function () {
      var t = new Tokenizer('1 foo');
      assertTok(t.next(), 'chars', '1');
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), 'chars', 'foo');
    });

    it('does not consider a number and a dot without a trailing space a list', function () {
      var t = new Tokenizer('1.foo');
      assertTok(t.next(), 'chars', '1.foo');
    });

    it('handles preceding whitespace', function () {
      var t = new Tokenizer(' \t 1. foo');
      assertTok(t.next(), 'list', ' \t 1. ');
      assertTok(t.next(), 'chars', 'foo');
    });
  });

  describe('HTML comments', function () {

    // this appears to be a deviation from GMD but seems like a good idea.
    it('allows linebreaks', function () {
      var t = new Tokenizer('<!--\n-->foo');
      assertTok(t.next(), 'comment', '<!--\n-->');
      assertTok(t.next(), 'chars', 'foo');
    });

    it('can follow characters', function () {
      var t = new Tokenizer('foo<!--\n-->foo');
      assertTok(t.next(), 'chars', 'foo');
      assertTok(t.next(), 'comment', '<!--\n-->');
      assertTok(t.next(), 'chars', 'foo');
    });

    it('need the closing tag', function () {
      var t = new Tokenizer('foo<!-- --foo');
      assertTok(t.next(), 'chars', 'foo<!--');
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), 'chars', '--foo');
    });
  });

  describe('HTML tags', function () {

    // this appears to be a deviation from GMD but seems like a good idea.
    it('allows linebreaks', function () {
      var t = new Tokenizer('<p\n>foo</p>');
      assertTok(t.next(), 'tag', '<p\n>');
      assertTok(t.next(), 'chars', 'foo');
      assertTok(t.next(), 'tag', '</p>');
    });

    it('can follow characters', function () {
      var t = new Tokenizer('foo<br>foo');
      assertTok(t.next(), 'chars', 'foo');
      assertTok(t.next(), 'tag', '<br>');
      assertTok(t.next(), 'chars', 'foo');
    });

    it('need the closing angle bracket', function () {
      var t = new Tokenizer('foo<br foo');
      assertTok(t.next(), 'chars', 'foo<br');
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), 'chars', 'foo');

      t = new Tokenizer('<br foo');
      assertTok(t.next(), 'chars', '<br');
      assertTok(t.next(), 'whitespace', ' ');
      assertTok(t.next(), 'chars', 'foo');
    });

  });
});
