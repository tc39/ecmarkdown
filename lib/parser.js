'use strict';

// Ecmarkdown is parsed according to the following:
// * A document is composed of multiple paragraphs (parseDocument)
// * A paragraph can be either a list or non-list (parseParagraph)
//   * A list is composed of many list items. Each list item is a segment (parseList & parseListItem)
//   * A non-list is a segment (parseNonList)
// * A segment is a list of text (literal text) and formats (*, |, etc.) (parseSegment)
// * formats are also a segment
//
// The `contents` property of a text node is a string. In all other nodes, it's an array.

module.exports = class Parser {
  constructor(tokenizer) {
    this._t = tokenizer;
  }

  parseDocument() {
    const graphs = [];

    while (true) {
      let tok = this._t.peek();
      if (tok.name === 'EOF') {
        break;
      }

      graphs.push(this.parseParagraph());

      tok = this._t.peek();
      if (tok.name !== 'EOF' && tok.name !== 'parabreak') {
        throw new Error('Expected parabreak, got ' + this._t.peek().name);
      }

      this._t.next();
    }

    return graphs;
  }

  parseParagraph() {
    const tok = this._t.peek();

    // consume and ignore any leading linebreaks
    while (isWhitespace(tok)) {
      this._t.next();
      tok = this._t.peek();
    }

    if (tok.name === 'list') {
      return this.parseList(tok);
    } else {
      return this.parseNonList();
    }
  }

  parseList(startTok) {
    const match = startTok.contents.match(/(\s*)([^\.]+)\. /);
    const node = { name: 'list', indent: match[1].length, start: match[2], contents: [] };

    while (this._t.peek().name === 'list' && this._t.peek().contents.match(/\s*/)[0].length === node.indent) {
      node.contents.push(this.parseListItem(node.indent));
    }

    return node;
  }

  parseNonList() {
    return { name: 'non-list', contents: this.parseSegment() };
  }

  parseListItem(indent) {
    // consume list token
    this._t.next();

    const itemNode = { name: 'list-item', contents: [] };
    itemNode.contents = itemNode.contents.concat(this.parseSegment(true));

    // list items are some text followed by potentially a sub-list.
    if (this._t.peek().name === 'list') {
      const match = this._t.peek().contents.match(/(\s*)([^\.]+)\. /);

      if (match[1].length > indent) {
        itemNode.contents.push(this.parseList(this._t.peek()));
      }
    }

    return itemNode;
  }

  parseSegment(inList, fmtStack) {
    let seg = [];
    fmtStack = fmtStack || [];

    while (isSegmentNode(this._t.previous, this._t.peek(), inList, fmtStack)) {
      const tok = this._t.peek();

      if (tok.name === 'text' || tok.name === 'whitespace' || tok.name === 'linebreak') {
        seg.push(this.parseText(inList, fmtStack));
      } else if (isFormatToken(tok)) {
        const node = this.parseFormat(tok.name, inList, fmtStack);
        seg = seg.concat(node);
      } else if (tok.name === 'comment' || tok.name === 'tag') {
        seg.push(tok);
        this._t.next();
      } else if (tok.name === 'list') {
        pushOrJoin(seg, { name: 'text', contents: tok.contents });
        this._t.next();
      } else {
        throw new Error('Unexpected token ' + tok.name);
      }
    }

    return seg;
  }

  // Text is either text tokens or whitespace tokens
  // list tokens are considered part of text if we're not in a list
  // format tokens are considered part of text if they're not a valid format
  parseText(inList, fmtStack) {
    const node = { name: 'text', contents: '' };
    let tok = this._t.peek();

    while (tok.name !== 'EOF' &&
          (!inList || tok.name !== 'list') &&
          (isText(tok) || isWhitespace(tok) || !isValidFormat(this._t.previous, tok, this._t.peek(2), fmtStack))
    ) {
      this._t.next();
      node.contents += tok.contents;
      tok = this._t.peek();
    }

    return node;
  }

  parseFormat(format, inList, fmtStack) {
    const startTok = this._t.next();
    const node = { name: format, contents: [] };

    node.contents = this.parseSegment(inList, fmtStack.concat(format));

    const endTok = this._t.peek();

    // segment ended but we don't have a close format. Convert this node into a text node.
    if (endTok.name !== format) {
      unshiftOrJoin(node.contents, { name: 'text', contents: startTok.contents });

      return node.contents;
    } else {
      this._t.next(); // consume end format.

      if (node.name === 'pipe') {
        const ntNode = parseNonTerminal(node.contents[0].contents);

        if (ntNode === null) {
          // failed to parse a non-terminal, so convert to text.
          unshiftOrJoin(node.contents, { name: 'text', contents: '|' });
          pushOrJoin(node.contents, { name: 'text', contents: '|' });

          return node.contents;
        } else {
          return [ntNode];
        }
      } else if (node.name === 'string') {
        // add quotes to text content
        unshiftOrJoin(node.contents, { name: 'text', contents: '"' });
        pushOrJoin(node.contents, { name: 'text', contents: '"' });
      }
    }

    return [node];
  }
};

function isFormatToken(tok) {
  return tok.name === 'star' || tok.name === 'underscore' || tok.name === 'tilde' ||
         tok.name === 'string' || tok.name === 'tick' || tok.name === 'pipe';
}

function isWhitespace(node) {
  return node.name === 'whitespace' || node.name === 'linebreak';
}

function isAlphaNumeric(c) {
  if (!c) {
    return false;
  }
  return !!c.match(/[\w\d]/);
}

function isText(node) {
  return node.name === 'text';
}

// Backtick can work anywhere, other format tokens have more stringent requirements.
// This aligns with gmd semantics. Also a fmtStack length of 1 indicates that we already
// have a format on the stack and so any format seen is invalid.
function isValidFormat(prev, cur, next, fmtStack) {
  if (!isFormatToken(cur)) {
    return false;
  }

  // can't nest formats
  if (fmtStack.length === 1 && cur.name !== fmtStack[0]) {
    return false;
  }

  if (cur.name === 'tick') {
    return true;
  }

  return (fmtStack.indexOf(cur.name) === -1 && // format not on stack, so looking for start
          !isAlphaNumeric(prev.contents[prev.contents.length - 1]) && // previous character isn't alphanumeric
          !isWhitespace(next)) || // next token isn't whitespace
         (fmtStack.indexOf(cur.name) > -1 && // format on stack, so looking for end
          !isWhitespace(prev) && // previous isn't whitespace
          (next.name === 'EOF' || !isAlphaNumeric(next.contents[0]))); // next is EOF or not alphanumeric
}

function isSegmentNode(prev, tok, inList, fmtStack) {
  return tok.name !== 'parabreak' &&
         tok.name !== 'EOF' &&
         (!inList || tok.name !== 'list' || (inList && tok.name === 'list' && prev.name !== 'linebreak')) &&
         fmtStack.indexOf(tok.name) === -1;
}

// appends a text token or appends to the last token's contents if the last token is text
function pushOrJoin(list, node) {
  const last = list[list.length - 1];
  if (list.length > 0 && last.name === 'text') {
    last.contents += node.contents;
  } else {
    list.push(node);
  }
}

// unshifts a text token or prepends to the last token's contents if the first token is text
function unshiftOrJoin(list, node) {
  const first = list[0];
  if (list.length > 0 && first.name === 'text') {
    first.contents = node.contents + first.contents;
  } else {
    list.unshift(node);
  }
}

// Parsing of non-terminals, eg. |foo[?Param]_opt|
// TODO: Rationalize with Grammarkdown (? instead of _opt)
const nonTerminalRe = /^([A-Za-z]+)(?:\[([^\]]+)\])?(_opt)?$/;
function parseNonTerminal(str) {
  const match = str.match(nonTerminalRe);

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
