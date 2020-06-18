import type {
  Position,
  Token,
  NotEOFToken,
  Format,
  FormatToken,
  OrderedListToken,
  UnorderedListToken,
  WhitespaceToken,
  LinebreakToken,
  Node,
  PipeNode,
  TextNode,
  CommentNode,
  TagNode,
  OpaqueTagNode,
  FragmentNode,
  ListNode,
  OrderedListNode,
  OrderedListItemNode,
  UnorderedListItemNode,
} from './node-types';

import type { Options } from './ecmarkdown';

// TODO types for escapeHtml
// @ts-ignore
import escapeHtml from 'escape-html';

import { Tokenizer } from './tokenizer';

type ThingWithContents = Exclude<Node, PipeNode> | NotEOFToken;

type ParseFragmentOpts = { inList?: boolean };

export class Parser {
  _t: Tokenizer;
  _posStack: Position[] | undefined;

  constructor(tokenizer: Tokenizer, options?: Options) {
    this._t = tokenizer;
    this._posStack = options && options.trackPositions ? [] : undefined;
  }

  static parseAlgorithm(str: string, options?: Options) {
    let tokenizer = new Tokenizer(str, options);
    return new Parser(tokenizer, options).parseAlgorithm();
  }

  static parseFragment(str: string, options?: Options) {
    let tokenizer = new Tokenizer(str, options);
    let out = new Parser(tokenizer, options).parseFragment({});
    if (tokenizer.peek().name !== 'EOF') {
      throw new Error('expecting EOF, got ' + tokenizer.peek().name);
    }
    return out;
  }

  parseAlgorithm() {
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
      break;
    }
    if (this._t.peek().name !== 'ol') {
      throw new Error('expecting ordered list, got ' + this._t.peek().name);
    }
    this.pushPos();
    let ret = this.finish({ name: 'algorithm', contents: this.parseList() as OrderedListNode });
    if (this._t.peek().name !== 'EOF') {
      throw new Error('expecting EOF, got ' + this._t.peek().name);
    }
    return ret;
  }

  parseList() {
    this.pushPos();
    const startTok = this._t.peek() as OrderedListToken | UnorderedListToken;

    let node: ListNode;
    if (startTok.name === 'ul') {
      const match = startTok.contents.match(/(\s*)\* /);
      node = { name: 'ul', indent: match![1].length, contents: [] };
    } else {
      const match = startTok.contents.match(/(\s*)([^.]+)\. /);
      node = { name: 'ol', indent: match![1].length, start: Number(match![2]), contents: [] };
    }

    while (true) {
      const tok = this._t.peek();

      if (tok.name !== node.name) {
        break;
      }

      let tokMatch = tok.contents.match(/\s*/)![0];
      if (tokMatch.length !== node.indent) {
        // part of a different list
        break;
      }

      // @ts-ignore typescript is not smart enough to figure out that the types line up
      node.contents.push(this.parseListItem(node.name, node.indent));
    }

    return this.finish(node);
  }

  parseListItem(kind: 'ol', indent: number): OrderedListItemNode;
  parseListItem(kind: 'ul', indent: number): UnorderedListItemNode;
  parseListItem(kind: 'ol' | 'ul', indent: number): OrderedListItemNode | UnorderedListItemNode {
    this.pushPos();
    // consume list token
    this._t.next();

    const id = this._t.tryScanId();

    const contents: FragmentNode[] = this.parseFragment({ inList: true });

    const listItemTok = this._t.peek();

    // list items are some text followed by potentially a sub-list.
    let sublist: ListNode | null = null;
    if (isList(listItemTok)) {
      const match = listItemTok.contents.match(/^(\s*)/);

      if (match![1].length > indent) {
        sublist = this.parseList();
      }
    }

    let name: 'ordered-list-item' | 'unordered-list-item' =
      kind === 'ol' ? 'ordered-list-item' : 'unordered-list-item';
    return this.finish({ name, contents, sublist, id: id == null ? null : id.value });
  }

  parseFragment(opts: ParseFragmentOpts): FragmentNode[];
  parseFragment(
    opts: ParseFragmentOpts,
    closingFormatKind: Format
  ): (TextNode | CommentNode | TagNode)[];
  parseFragment(opts: ParseFragmentOpts, closingFormatKind?: Format) {
    let frag: FragmentNode[] = [];

    while (true) {
      const tok = this._t.peek();

      if (tok.name === 'EOF') {
        break;
      } else if (tok.name === 'parabreak') {
        if (this._t.peek(2).name === 'EOF') {
          this.pushPos();
          this._t.next();
          pushOrJoin(frag, this.finish({ name: 'text', contents: tok.contents }));
        }
        break;
      } else if (tok.name === 'text' || tok.name === 'whitespace' || tok.name === 'linebreak') {
        let text = this.parseText(opts, closingFormatKind);
        if (text !== null) {
          frag.push(text);
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
      } else if (tok.name === 'comment' || tok.name === 'tag' || tok.name === 'opaqueTag') {
        frag.push(tok as CommentNode | TagNode | OpaqueTagNode); // Why can't TS infer this type?
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
        // @ts-ignore
        throw new Error('Unexpected token ' + tok.name);
      }
    }

    return frag;
  }

  // Text is either text tokens or whitespace tokens
  // list tokens are considered part of text if we're not in a list
  // format tokens are considered part of text if they're not a valid format
  // returns null rather than a node with no contents
  parseText(opts: ParseFragmentOpts, closingFormatKind: Format | undefined): TextNode | null {
    this.pushPos();
    let contents = '';
    let lastRealTok = null;

    while (true) {
      let tok = this._t.peek();

      let wsChunk = '';
      while (isWhitespace(tok)) {
        wsChunk += tok.contents;
        this._t.next();
        tok = this._t.peek();
      }

      if (tok.name === 'EOF' || tok.name === 'parabreak' || (opts.inList && isList(tok))) {
        // In lists we don't need to bother representing trailing whitespace
        if (!opts.inList) {
          contents += wsChunk;
        }

        break;
      }
      if (tok.name === 'opaqueTag') {
        contents += wsChunk;
        break;
      }

      lastRealTok = tok;

      contents += wsChunk;

      if (isFormatToken(tok)) {
        // check if format token is valid
        //
        // tick is always valid
        if (tok.name === 'tick') {
          break;
        }

        if (closingFormatKind === undefined || tok.name === closingFormatKind) {
          const prev = this._t.previous as NotEOFToken;
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

      //  TODO why is this not with the earlier break?
      if (tok.name === 'tag') {
        break;
      }

      if (tok.name === 'text' || isWhitespace(tok)) {
        contents += tok.contents;
        this._t.next();
        continue;
      }

      // By default just take the token's contents
      contents += tok.contents;

      this._t.next();
    }

    if (contents === '') {
      this.popPos();
      return null;
    }

    // @ts-ignore this should be `location!.end`, but we need to wait for TS to release a bugfix before we can do that
    // see https://github.com/microsoft/TypeScript/pull/36539
    let endLoc = this._posStack && lastRealTok?.location.end;
    return this.finish({ name: 'text', contents }, undefined, endLoc);
  }

  parseFormat(format: Format, opts: ParseFragmentOpts): FragmentNode[] {
    const startTok = this._t.next() as FormatToken;
    let contents: (TextNode | CommentNode | TagNode)[] = [];

    if (startTok.name === 'underscore') {
      if (this._t.peek().name === 'text') {
        contents = [this._t.next() as TextNode];
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
        contents = contents.map(child =>
          child.name === 'tag'
            ? { ...child, name: 'text', contents: escapeHtml(child.contents) }
            : child
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
      this._posStack.push(this.getPos()!);
    }
  }

  popPos() {
    return this._posStack?.pop();
  }

  // TODO rename to getStart ?
  getPos(node: Node | Token = this._t.peek()) {
    return this._posStack && node.location?.start;
  }

  getEnd(node: Node | Token) {
    return this._posStack && node.location?.end;
  }

  finish<T extends Node>(node: T, start?: Position, end?: Position): T {
    if (this._posStack) {
      let actualStart: Position = start ?? this.popPos()!;
      let actualEnd: Position =
        end ??
        (this._t.previous === undefined
          ? { line: 1, column: 0, offset: 0 }
          : { ...this._t.previous.location!.end });
      node.location = { start: actualStart, end: actualEnd };
    }
    return node;
  }
}

function isFormatToken(tok: Token): tok is FormatToken {
  return (
    tok.name === 'star' ||
    tok.name === 'underscore' ||
    tok.name === 'tilde' ||
    tok.name === 'tick' ||
    tok.name === 'pipe'
  );
}

function isWhitespace(tok: Token): tok is WhitespaceToken | LinebreakToken {
  return tok.name === 'whitespace' || tok.name === 'linebreak';
}

function isAlphaNumeric(c: string) {
  if (!c) {
    return false;
  }
  return !!c.match(/[\w\d]/);
}

function isList(tok: Token): tok is OrderedListToken | UnorderedListToken {
  return tok.name === 'ol' || tok.name === 'ul';
}

// Backtick can work anywhere, other format tokens have more stringent requirements.
// This aligns with gmd semantics.
function isValidStartFormat(prev: NotEOFToken, cur: Token, next: Token) {
  if (cur.name === 'tick') {
    return true;
  }

  return !isAlphaNumeric(prev.contents[prev.contents.length - 1]) && !isWhitespace(next);
}

function isValidEndFormat(prev: Token, cur: Token) {
  if (cur.name === 'tick') {
    return true;
  }

  return !isWhitespace(prev);
}

// appends a text token or appends to the last token's contents if the last token is text
function pushOrJoin(list: Node[], node: Node) {
  const last = list[list.length - 1];
  if (list.length > 0 && last.name === 'text') {
    last.contents += node.contents;
  } else {
    list.push(node);
  }
}

// unshifts a text token or prepends to the last token's contents if the first token is text
function unshiftOrJoin(list: ThingWithContents[], node: ThingWithContents) {
  const first = list[0];
  if (list.length > 0 && first.name === 'text') {
    first.contents = node.contents + first.contents;
  } else {
    list.unshift(node);
  }
}

// Parsing of non-terminals, eg. |foo[?Param]_opt| or |foo[?Param]?|
const nonTerminalRe = /^([A-Za-z0-9]+)(?:\[([^\]]+)\])?(_opt|\?)?$/;
function parseNonTerminal(str: string): PipeNode | null {
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
