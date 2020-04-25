'use strict';
const Tokenizer = require('./tokenizer.js');
const escapeHtml = require('escape-html');

// The `contents` property of a text node is a string. In all other nodes, it's an array.

module.exports = class Parser {
  constructor(tokenizer, options) {
    this._t = tokenizer;
    this._posStack = options && options.trackPositions ? [] : undefined;
  }

  static parse(str, options) {
    let tokenizer = new Tokenizer(str, options);
    return new Parser(tokenizer, options).parseDocument();
  }

  parseDocument() {
    this.pushPos();
    return this.finish({ name: 'document', contents: this.parseParagraphs() });
  }

  parseParagraphs() {
    const graphs = [];

    while (true) {
      let tok = this._t.peek();
      if (tok.name === 'EOF') {
        break;
      }

      // consume leading whitespace
      if (tok.name === 'parabreak' || tok.name === 'linebreak') {
        this._t.next();
        continue;
      }

      graphs.push(this.parseParagraph());

      tok = this._t.peek();
      if (tok.name === 'parabreak') {
        this._t.next();
      }
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

    if (tok.name === 'header') {
      this.pushPos();
      this._t.next();
      return this.finish({
        name: 'header',
        level: tok.level,
        contents: this.parseFragment({ oneLine: true }),
      });
    }
    if (tok.name === 'blockTag') {
      this.pushPos();
      this._t.next();
      return this.finish({ name: 'blockTag', contents: tok.contents });
    } else if (tok.name === 'opaqueTag') {
      this.pushPos();
      this._t.next();
      return this.finish({ name: 'opaqueTag', contents: tok.contents });
    } else if (tok.name === 'ol') {
      return this.parseAlgorithm();
    } else if (tok.name === 'ul') {
      return this.parseList();
    } else {
      return this.parseNonList();
    }
  }

  parseAlgorithm() {
    this.pushPos();
    return this.finish({ name: 'algorithm', contents: this.parseList() });
  }

  parseList() {
    this.pushPos();
    const startTok = this._t.peek();

    let node;
    if (startTok.name === 'ul') {
      const match = startTok.contents.match(/(\s*)\* /);
      node = { name: 'ul', indent: match[1].length, contents: [] };
    } else {
      const match = startTok.contents.match(/(\s*)([^.]+)\. /);
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

    return this.finish(node);
  }

  parseNonList() {
    this.pushPos();
    return this.finish({ name: 'non-list', contents: this.parseFragment({}) });
  }

  parseListItem(indent) {
    this.pushPos();
    // consume list token
    this._t.next();

    const contents = this.parseFragment({ inList: true });

    const listItemTok = this._t.peek();

    // list items are some text followed by potentially a sub-list.
    if (isList(listItemTok)) {
      const match = listItemTok.contents.match(/^(\s*)/);

      if (match[1].length > indent) {
        contents.push(this.parseList(this._t.peek()));
      }
    }

    return this.finish({ name: 'list-item', contents });
  }

  parseFragment(opts, closingFormatKind) {
    let frag = [];

    while (true) {
      const tok = this._t.peek();

      if (
        tok.name === 'opaqueTag' ||
        tok.name === 'blockTag' ||
        tok.name === 'header' ||
        tok.name === 'EOF'
      ) {
        break;
      } else if (tok.name === 'parabreak') {
        break;
      } else if (
        tok.name === 'text' ||
        tok.name === 'whitespace' ||
        tok.name === 'linebreak' ||
        tok.name === 'parabreak'
      ) {
        if (tok.name === 'linebreak' && opts.oneLine) {
          this._t.next();
          break;
        } else {
          frag.push(this.parseText(opts, closingFormatKind));
        }
      } else if (isFormatToken(tok)) {
        if (closingFormatKind !== undefined) {
          if (tok.name === closingFormatKind) {
            break;
          } else {
            // invalid format
            this.pushPos();
            this._t.next();
            pushOrJoin(frag, this.finish({ name: 'text', contents: tok.contents }));
          }
        } else {
          // valid format
          frag = frag.concat(this.parseFormat(tok.name, opts));
        }
      } else if (tok.name === 'comment' || tok.name === 'tag') {
        frag.push(tok);
        this._t.next();
      } else if (isList(tok)) {
        if (opts.inList) {
          break;
        } else {
          this.pushPos();
          this._t.next();
          pushOrJoin(frag, this.finish({ name: 'text', contents: tok.contents }));
        }
      } else {
        throw new Error('Unexpected token ' + tok.name);
      }
    }

    return frag;
  }

  // Text is either text tokens or whitespace tokens
  // list tokens are considered part of text if we're not in a list
  // format tokens are considered part of text if they're not a valid format
  parseText(opts, closingFormatKind) {
    this.pushPos();
    let contents = '';

    while (true) {
      let tok = this._t.peek();

      if (tok.name === 'linebreak' && opts.oneLine) {
        break;
      }

      let wsChunk = '';
      while (isWhitespace(tok)) {
        wsChunk += tok.contents;
        this._t.next();
        tok = this._t.peek();
      }

      if (
        tok.name === 'EOF' ||
        tok.name === 'parabreak' ||
        tok.name === 'header' ||
        tok.name === 'opaqueTag' ||
        tok.name === 'blockTag' ||
        (opts.inList && isList(tok))
      ) {
        break;
      }

      contents += wsChunk;

      if (isFormatToken(tok)) {
        // check if format token is valid
        //
        // tick is always valid
        if (tok.name === 'tick') {
          break;
        }

        if (closingFormatKind === undefined || tok.name === closingFormatKind) {
          const prev = this._t.previous;
          const next = this._t.peek(2);
          const closing = tok.name === closingFormatKind;

          if (
            (!closing && isValidStartFormat(prev, tok, next)) ||
            (closing && isValidEndFormat(prev, tok))
          ) {
            break;
          }
        }
      }

      if (tok.name === 'tag') {
        break;
      }

      if (tok.name === 'text' || isWhitespace(tok)) {
        contents += escapeHtml(tok.contents);
        this._t.next();
        continue;
      }

      // By default just take the token's contents
      contents += tok.contents;

      this._t.next();
    }

    return this.finish({ name: 'text', contents });
  }

  parseFormat(format, opts) {
    const startTok = this._t.next();
    let contents = [];

    if (startTok.name === 'underscore') {
      if (this._t.peek().name === 'text') {
        contents = [this._t.next()];
      }
    } else {
      contents = this.parseFragment(opts, format);
    }

    const endTok = this._t.peek();
    const pos = this.getPos(startTok);
    const end = this.getPos(endTok);

    // fragment ended but we don't have a close format. Convert this node into a text node.
    if (endTok.name !== format) {
      unshiftOrJoin(contents, this.finish({ name: 'text', contents: startTok.contents }, pos, end));
      return contents;
    } else {
      this._t.next(); // consume end format.

      if (contents.length === 0) {
        // empty formats not allowed
        return [
          this.finish({ name: 'text', contents: startTok.contents + endTok.contents }, pos, end),
        ];
      } else if (format === 'tick') {
        contents = contents.map(childNode =>
          childNode.name === 'tag'
            ? { ...childNode, name: 'text', contents: escapeHtml(childNode.contents) }
            : childNode
        );
      } else if (format === 'pipe') {
        const ntNode = parseNonTerminal(contents[0].contents);

        if (ntNode === null) {
          // failed to parse a non-terminal, so convert to text.
          const firstPos = this.getPos(contents[0]);
          const lastEnd = this.getEnd(contents[contents.length - 1]);
          unshiftOrJoin(contents, this.finish({ name: 'text', contents: '|' }, pos, firstPos));
          pushOrJoin(contents, this.finish({ name: 'text', contents: '|' }, lastEnd, end));

          return contents;
        } else {
          return [this.finish(ntNode, pos, end)];
        }
      }
    }

    return [this.finish({ name: format, contents }, pos, end)];
  }

  pushPos() {
    if (this._posStack) {
      this._posStack.push(this.getPos());
    }
  }

  popPos() {
    return this._posStack ? this._posStack.pop() : -1;
  }

  getPos(node) {
    if (node === undefined) {
      node = this._t.peek();
    }
    return this._posStack && node.location ? node.location.pos : -1;
  }

  getEnd(node) {
    return this._posStack && node.location ? node.location.end : -1;
  }

  finish(node, pos, end) {
    if (pos === undefined) {
      pos = this.popPos();
    }
    if (end === undefined) {
      end = this.getPos();
    }
    if (this._posStack) {
      node.location = { pos, end };
    }
    return node;
  }
};

function isFormatToken(tok) {
  return (
    tok.name === 'star' ||
    tok.name === 'underscore' ||
    tok.name === 'tilde' ||
    tok.name === 'tick' ||
    tok.name === 'pipe'
  );
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
// This aligns with gmd semantics.
function isValidStartFormat(prev, cur, next) {
  if (cur.name === 'tick') {
    return true;
  }

  return !isAlphaNumeric(prev.contents[prev.contents.length - 1]) && !isWhitespace(next);
}

function isValidEndFormat(prev, cur) {
  if (cur.name === 'tick') {
    return true;
  }

  return !isWhitespace(prev);
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

// Parsing of non-terminals, eg. |foo[?Param]_opt| or |foo[?Param]?|
const nonTerminalRe = /^([A-Za-z0-9]+)(?:\[([^\]]+)\])?(_opt|\?)?$/;
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
    contents: null,
  };
}
