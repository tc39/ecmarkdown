'use strict';

var escapeHtml = require('escape-html');
var beautify = require('./beautify.js');
var Tokenizer = require('./tokenizer.js');
var Emitter = require('./emitter.js')

exports.document = function (ecmarkdown) {
  return beautify(Emitter.document(parse(ecmarkdown)));
};

exports.list = exports.document;

exports.fragment = function (ecmarkdown) {
  return beautify(Emitter.fragment(parse(escapeHtml(ecmarkdown))));
};


// Ecmarkdown is parsed according to the following:
// * A document is composed of multiple paragraphs (parseDocument)
// * A paragraph can be either a list or non-list (parseParagraph)
//   * A list is composed of many list items. Each list item is a segment (parseList & parseListItem)
//   * A non-list is a segment (parseNonList)
// * A segment is a list of chars (literal text) and formats (*, |, etc.) (parseSegment)
// * formats are also a segment
//
// The `contents` property of a chars node is a string. In all other nodes, it's an array.
function parse(emd) {
  var t = new Tokenizer(emd);
  var res = parseDocument();

  return res;

  // Chars are either chars tokens or whitespace tokens
  // list tokens are considered part of chars if we're not in a list
  // format tokens are considered part of chars if they're not a valid format
  function parseChars(inList, fmtStack) {
    var node = { name: 'chars', contents: '' };
    var tok = t.peek();

    while (tok.name !== 'EOF' &&
          (!inList || tok.name !== 'list') &&
          (isChars(tok) || isWhitespace(tok) || !isValidFormat(t.previous, tok, t.peek(2), fmtStack))
    ) {
      t.next();
      node.contents += tok.contents;
      tok = t.peek();
    }

    return node;
  }

  function parseFormat(format, inList, fmtStack) {
    var startTok = t.next();
    var node = { name: format, contents: []};

    node.contents = parseSegment(inList, fmtStack.concat(format));

    var endTok = t.peek();

    // segment ended but we don't have a close format. Convert this node into a chars node.
    if (endTok.name !== format) {
      unshiftOrJoin(node.contents, { name: 'chars', contents: startTok.contents });

      return node.contents;
    } else {
      t.next(); // consume end format.

      if (node.name === 'pipe') {
        var ntNode = parseNonTerminal(node.contents[0].contents);

        if (ntNode === null) {
          // failed to parse a non-terminal, so convert to chars.
          unshiftOrJoin(node.contents, {name: 'chars', contents: '|'});
          pushOrJoin(node.contents, {name: 'chars', contents: '|'});

          return node.contents;
        } else {
          return [ntNode];
        }

      } else if(node.name === 'string') {
        // add quotes to chars content
        unshiftOrJoin(node.contents, {name: 'chars', contents: '"'});
        pushOrJoin(node.contents, {name: 'chars', contents: '"'});
      }
    }

    return [node];
  }

  function parseSegment(inList, fmtStack) {
    var seg = [];
    fmtStack = fmtStack || [];

    while (isSegmentNode(t.previous, t.peek(), inList, fmtStack)) {
      var tok = t.peek();

      if (tok.name === 'chars' || tok.name === 'whitespace' || tok.name === 'linebreak') {
        seg.push(parseChars(inList, fmtStack));
      } else if (isFormatToken(tok)) {
        var node = parseFormat(tok.name, inList, fmtStack)
        seg = seg.concat(node);
      } else if (tok.name === 'comment' || tok.name === 'tag') {
        seg.push(tok);
        t.next();
      } else if(tok.name === 'list') {
        pushOrJoin(seg, {name: 'chars', contents: tok.contents});
        t.next();
      } else {
        throw new Error('Unexpected token ' + tok.name);
      }
    }

    return seg;
  }


  function parseNonList() {
    return { name: 'non-list', contents: parseSegment()};
  }

  function parseList(startTok) {
    var match = startTok.contents.match(/(\s*)([^\.]+)\. /);
    var node = { name: 'list', indent: match[1].length, start: match[2], contents: [] };

    while (t.peek().name === 'list' && t.peek().contents.match(/\s*/)[0].length === node.indent) {
      node.contents.push(parseListItem(node.indent));
    }

    return node;
  }

  function parseListItem(indent) {
    var item = t.next();

    var itemNode = { name: 'list-item', contents: [] };
    itemNode.contents = itemNode.contents.concat(parseSegment(true));

    // list items are some text followed by potentially a sub-list.
    if (t.peek().name === 'list') {
      var match = t.peek().contents.match(/(\s*)([^\.]+)\. /);

      if (match[1].length > indent) {
        itemNode.contents.push(parseList(t.peek()));
      }
    }

    return itemNode;
  }

  function parseParagraph() {
    var tok = t.peek();

    // consume and ignore any leading linebreaks
    while(isWhitespace(tok)) {
      t.next();
      tok = t.peek();
    }

    if (tok.name === 'list') {
      return parseList(tok);
    } else {
      return parseNonList();
    }
  }

  function parseDocument() {
    var graphs = [];

    while (true) {
      var tok = t.peek();
      if (tok.name === 'EOF') {
        break;
      }

      graphs.push(parseParagraph());

      tok = t.peek();
      if(tok.name !== 'EOF' && tok.name !== 'parabreak') {
        throw new Error("Expected parabreak, got " + t.peek().name);;
      }

      t.next();
    }

    return graphs;
  }

}

function isFormatToken(tok) {
  return tok.name === 'star' || tok.name === 'underscore' || tok.name === 'tilde' ||
         tok.name === 'string' || tok.name === 'tick' || tok.name === 'pipe';
}

function isWhitespace(node) {
  return node.name === 'whitespace' || node.name === 'linebreak';
}

function isAlphaNumeric(c) {
  if(!c) {
    return false;
  }
  return !!c.match(/[\w\d]/);
}

function isChars(node) {
  return node.name === 'chars';
}

// Backtick can work anywhere, other format tokens have more stringent requirements.
// This aligns with gmd semantics. Also a fmtStack length of 1 indicates that we already
// have a format on the stack and so any format seen is invalid.
function isValidFormat(prev, cur, next, fmtStack) {
  if (!isFormatToken(cur)) {
    return false;
  }

  // can't nest formats
  if(fmtStack.length === 1 && cur.name !== fmtStack[0]) {
    return false;
  }

  if(cur.name === 'tick') {
    return true;
  }

  return (fmtStack.indexOf(cur.name) === -1 && !isAlphaNumeric(prev.contents[prev.contents.length - 1]) && !isWhitespace(next)) ||
         (fmtStack.indexOf(cur.name) > -1 && !isWhitespace(prev) && (next.name === 'EOF' || !isAlphaNumeric(next.contents[0])));
}

function isSegmentNode(prev, tok, inList, fmtStack) {
  return tok.name !== 'parabreak' &&
         tok.name !== 'EOF' &&
         (!inList || tok.name !== 'list' || (inList && tok.name === 'list' && prev.name !== 'linebreak')) &&
         fmtStack.indexOf(tok.name) === -1;
}

// appends a chars token or appends to the last token's contents if the last token is chars
function pushOrJoin(list, node) {
  var last = list[list.length - 1];
  if(list.length > 0 && last.name === 'chars') {
    last.contents += node.contents;
  } else {
    list.push(node);
  }
}

// unshifts a chars token or prepends to the last token's contents if the first token is chars
function unshiftOrJoin(list, node) {
  var first = list[0];
  if(list.length > 0 && first.name === 'chars') {
    first.contents = node.contents + first.contents;
  } else {
    list.unshift(node);
  }
}

// Parsing of non-terminals, eg. |foo[?Param]_opt|
// TODO: Rationalize with Grammarkdown (? instead of _opt)
var nonTerminalRe = /^([A-Za-z]+)(?:\[([^\]]+)\])?(_opt)?$/;
function parseNonTerminal(str) {
  var match = str.match(nonTerminalRe);

  if (!match) {
    return null;
  }

  return {
    name: 'pipe',
    nonTerminal: match[1],
    params: match[2],
    optional: !!match[3],
    contents: null
  };
}
