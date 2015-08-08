'use strict';

// Ecmarkdown is parsed according to the following:
// * A document is composed of multiple paragraphs (parseDocument)
// * A paragraph can be either a list or non-list (parseParagraph)
//   * A list is composed of many list items. Each list item is a fragment (parseList & parseListItem)
//   * A non-list is a fragment (parseNonList)
// * A fragment is a list of text (literal text) and formats (*, |, etc.) (parseFragment)
// * formats are also a fragment
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
    let tok = this._t.peek();

    // consume and ignore any leading linebreaks
    while (isWhitespace(tok)) {
      this._t.next();
      tok = this._t.peek();
    }

    if (isList(tok)) {
      return this.parseList();
    } else {
      return this.parseNonList();
    }
  }

  parseList() {
    const startTok = this._t.peek();

    let node;
    if (startTok.name === 'ul') {
      const match = startTok.contents.match(/(\s*)\* /);
      node = { name: 'ul', indent: match[1].length, contents: [] };
    } else {
      const match = startTok.contents.match(/(\s*)([^\.]+)\. /);
      node = { name: 'ol', indent: match[1].length, start: Number(match[2]), contents: [] };
    }

    while (true) {
      const tok = this._t.peek();

      if (!isList(tok)) {
        break;
      }

      let tokMatch = tok.contents.match(/\s*/)[0];
      if (tokMatch.length !== node.indent) {
        // part of a different list
        break;
      }

      node.contents.push(this.parseListItem(node.indent));
    }

    return node;
  }

  parseNonList() {
    return { name: 'non-list', contents: this.parseFragment() };
  }

  parseListItem(indent) {
    // consume list token
    this._t.next();

    const itemNode = { name: 'list-item', contents: [] };
    itemNode.contents = itemNode.contents.concat(this.parseFragment(true));

    const listItemTok = this._t.peek();

    // list items are some text followed by potentially a sub-list.
    if (isList(listItemTok)) {
      const match = listItemTok.contents.match(/^(\s*)/);

      if (match[1].length > indent) {
        itemNode.contents.push(this.parseList(this._t.peek()));
      }
    }

    return itemNode;
  }

  parseFragment(inList, fmtStack) {
    let seg = [];
    fmtStack = fmtStack || [];

    while (true) {
      const tok = this._t.peek();

      if (tok.name === 'parabreak' || tok.name === 'EOF') {
        break;
      } else if (tok.name === 'text' || tok.name === 'whitespace' || tok.name === 'linebreak') {
        seg.push(this.parseText(inList, fmtStack));
      } else if (isFormatToken(tok)) {
        if (fmtStack.indexOf(tok.name) > -1) { // only one format
          // this format token closes a format on the stack so ends this fragment
          // parseText handles checking for whether the close format was contextually
          // valid
          break;
        } else if (fmtStack.length === 0) {
          // valid format
          const node = this.parseFormat(tok.name, inList, fmtStack);
          seg = seg.concat(node);
        } else {
          // invalid format
          pushOrJoin(seg, { name: 'text', contents: tok.contents });
          this._t.next();
        }
      } else if (tok.name === 'comment' || tok.name === 'tag') {
        seg.push(tok);
        this._t.next();
      } else if (isList(tok)) {
        if (inList && this._t.previous.name === 'linebreak') {
          break;
        } else {
          pushOrJoin(seg, { name: 'text', contents: tok.contents });
        }
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

    while (true) {
      const tok = this._t.peek();

      if (tok.name === 'text' || isWhitespace(tok)) {
        node.contents += tok.contents;
        this._t.next();
        continue;
      }

      if (tok.name === 'EOF') {
        break;
      }

      if (inList && isList(tok)) {
        break;
      }

      if (isFormatToken(tok)) {
        // check if format token is valid
        //
        // tick is always valid
        if (tok.name === 'tick') {
          break;
        }

        // can only have one format on the stack.
        if (fmtStack.length < 1 || tok.name === fmtStack[0]) {
          const prev = this._t.previous;
          const next = this._t.peek(2);
          const onStack = fmtStack.indexOf(tok.name) > -1;

          if ((!onStack && isValidStartFormat(prev, tok, next)) ||
              (onStack && isValidEndFormat(prev, tok, next))) {
            break;
          }
        }
      }

      node.contents += tok.contents;

      this._t.next();
    }

    return node;
  }

  parseFormat(format, inList, fmtStack) {
    const startTok = this._t.next();
    const node = { name: format, contents: [] };

    if (startTok.name === 'underscore') {
      if (this._t.peek().name === 'text') {
        node.contents = [this._t.next()];
      }
    } else {
      node.contents = this.parseFragment(inList, fmtStack.concat(format));
    }

    const endTok = this._t.peek();

    // fragment ended but we don't have a close format. Convert this node into a text node.
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
      }
    }

    return [node];
  }
};

function isFormatToken(tok) {
  return tok.name === 'star' || tok.name === 'underscore' || tok.name === 'tilde' ||
         tok.name === 'tick' || tok.name === 'pipe';
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

function isList(tok) {
  return tok.name === 'ol' || tok.name === 'ul';
}

// Backtick can work anywhere, other format tokens have more stringent requirements.
// This aligns with gmd semantics. Also a fmtStack length of 1 indicates that we already
// have a format on the stack and so any format seen is invalid.
function isValidStartFormat(prev, cur, next) {
  if (cur.name === 'tick') {
    return true;
  }

  return !isAlphaNumeric(prev.contents[prev.contents.length - 1]) && !isWhitespace(next);
}

function isValidEndFormat(prev, cur, next) {
  if (cur.name === 'tick') {
    return true;
  }

  return !isWhitespace(prev) && (next.name === 'EOF' || !isAlphaNumeric(next.contents[0]));
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
