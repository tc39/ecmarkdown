import type {
  Unlocated,
  LocationRange,
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
  FragmentNode,
  ListNode,
  OrderedListNode,
  OrderedListItemNode,
  UnorderedListItemNode,
  FormatNode,
} from './node-types';

// TODO types for escapeHtml
// @ts-ignore
import escapeHtml from 'escape-html';

import { Tokenizer } from './tokenizer';

type ThingWithContents = Exclude<Node, PipeNode> | NotEOFToken;

type ParseFragmentOpts = { inList?: boolean };

export class Parser {
  _t: Tokenizer;
  _posStack: Position[];

  constructor(tokenizer: Tokenizer) {
    this._t = tokenizer;
    this._posStack = [];
  }

  static parseAlgorithm(str: string) {
    let tokenizer = new Tokenizer(str);
    return new Parser(tokenizer).parseAlgorithm();
  }

  static parseFragment(str: string) {
    let tokenizer = new Tokenizer(str);
    let out = new Parser(tokenizer).parseFragment({});
    tokenizer.expect('EOF');
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
    this._t.expect('ol');
    this.pushPos();
    let ret = this.finish({ name: 'algorithm', contents: this.parseList() as OrderedListNode });
    this._t.expect('EOF');
    return ret;
  }

  parseList() {
    this.pushPos();
    const startTok = this._t.peek() as OrderedListToken | UnorderedListToken;

    let node: Unlocated<ListNode>;
    let contentsIndent: number;
    if (startTok.name === 'ul') {
      const match = startTok.contents.match(/(\s*)\* /);
      node = { name: 'ul', indent: match![1].length, contents: [] };
      contentsIndent = match![0].length;
    } else {
      const match = startTok.contents.match(/(\s*)([^.]+)\. /);
      node = { name: 'ol', indent: match![1].length, start: Number(match![2]), contents: [] };
      contentsIndent = match![0].length;
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
      node.contents.push(this.parseListItem(node.name, node.indent, contentsIndent));
    }

    return this.finish(node);
  }

  parseListItem(kind: 'ol', indent: number, contentsIndent: number): OrderedListItemNode;
  parseListItem(kind: 'ul', indent: number, contentsIndent: number): UnorderedListItemNode;
  parseListItem(
    kind: 'ol' | 'ul',
    indent: number,
    contentsIndent: number
  ): OrderedListItemNode | UnorderedListItemNode {
    this.pushPos();
    // consume list token
    this._t.next();

    const attrs = this._t.tryScanListItemAttributes();

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
    return this.finish({ name, contents, contentsIndent, sublist, attrs });
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
          pushOrJoin(frag, text);
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
          let f = this.parseFormat(tok.name, opts);
          if (f.length === 1 && f[0].name === 'text') {
            pushOrJoin(frag, f[0]);
          } else {
            frag = frag.concat(f);
          }
        }
      } else if (
        tok.name === 'comment' ||
        tok.name === 'tag' ||
        tok.name === 'opaqueTag' ||
        tok.name === 'double-brackets'
      ) {
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
        throw new Error(
          // @ts-ignore
          `Unknown token type ${tok.name}. This is a bug in ecmarkdown; please report it.`
        );
      }
    }

    return frag;
  }

  // Text is either text tokens or whitespace tokens
  // list tokens are considered part of text if we're not in a list
  // format tokens are considered part of text if they're not a valid format
  // returns null rather than a node with no contents
  parseText(opts: ParseFragmentOpts, closingFormatKind: Format | undefined) {
    this.pushPos();
    let contents = '';
    let lastRealTok = null;

    while (true) {
      let tok = this._t.peek();

      let wsChunk = '';
      let lastWsTok = null;
      while (isWhitespace(tok)) {
        wsChunk += tok.contents;
        lastWsTok = tok;
        this._t.next();
        tok = this._t.peek();
      }

      if (tok.name === 'EOF' || tok.name === 'parabreak' || (opts.inList && isList(tok))) {
        // In lists we don't need to bother representing trailing whitespace
        if (!opts.inList) {
          contents += wsChunk;
          if (lastWsTok !== null) {
            lastRealTok = lastWsTok;
          }
        }

        break;
      }

      contents += wsChunk;

      if (lastWsTok !== null) {
        lastRealTok = lastWsTok;
      }

      if (
        tok.name === 'opaqueTag' ||
        tok.name === 'comment' ||
        tok.name === 'tag' ||
        tok.name === 'double-brackets'
      ) {
        break;
      }

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

      lastRealTok = tok;

      // By default just take the token's contents
      contents += tok.contents;

      this._t.next();
    }

    if (contents === '') {
      this.popPos();
      return null;
    }

    let endLoc = lastRealTok?.location.end;
    return this.finish({ name: 'text', contents }, undefined, endLoc);
  }

  parseFormat(
    format: Format,
    opts: ParseFragmentOpts
  ): (TextNode | CommentNode | TagNode | FormatNode)[] {
    const startTok = this._t.next() as FormatToken;
    const start = this.getPos(startTok);
    let contents: (TextNode | CommentNode | TagNode)[] = [];

    if (format === 'underscore') {
      if (this._t.peek().name === 'text') {
        contents = [this._t.next() as TextNode];
      }
    } else {
      contents = this.parseFragment(opts, format);
    }

    const nextTok = this._t.peek();

    // fragment ended but we don't have a close format. Convert this node into a text node.
    if (nextTok.name !== format) {
      const lastTok = contents[contents.length - 1] ?? startTok;
      unshiftOrJoin(
        contents,
        this.finish({ name: 'text', contents: startTok.contents }, start, lastTok.location.end)
      );
      return contents;
    }

    const end = nextTok.location.end;
    this._t.next(); // consume end format.

    if (contents.length === 0) {
      // empty formats not allowed
      return [
        this.finish({ name: 'text', contents: startTok.contents + nextTok.contents }, start, end),
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
        unshiftOrJoin(contents, this.finish({ name: 'text', contents: '|' }, start, firstPos));
        pushOrJoin(contents, this.finish({ name: 'text', contents: '|' }, lastEnd, end));

        return contents;
      } else {
        return [this.finish(ntNode, start, end)];
      }
    } else if (format === 'underscore') {
      return [
        this.finish(
          // the cast is justified by the check at the start of this function
          { name: 'underscore', contents: (contents as [TextNode])[0].contents },
          start,
          end
        ),
      ];
    }

    return [this.finish({ name: format, contents }, start, end)];
  }

  pushPos() {
    this._posStack.push(this.getPos()!);
  }

  popPos() {
    return this._posStack.pop();
  }

  // TODO rename to getStart ?
  getPos(node: Node | Token = this._t.peek()) {
    return node.location.start;
  }

  getEnd(node: Node | Token) {
    return node.location.end;
  }

  finish<T extends Unlocated<Node>>(
    node: T,
    start?: Position,
    end?: Position
  ): T & { location: LocationRange } {
    let actualStart: Position = start ?? this.popPos()!;
    let actualEnd: Position =
      end ??
      (this._t.previous === undefined
        ? { line: 1, column: 1, offset: 0 }
        : { ...this._t.previous.location!.end });
    // @ts-ignore
    node.location = { start: actualStart, end: actualEnd };
    // @ts-ignore
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
    last.location.end = node.location.end;
  } else {
    list.push(node);
  }
}

// unshifts a text token or prepends to the last token's contents if the first token is text
function unshiftOrJoin(list: ThingWithContents[], node: ThingWithContents) {
  const first = list[0];
  if (list.length > 0 && first.name === 'text') {
    first.contents = node.contents + first.contents;
    first.location.start = node.location.start;
  } else {
    list.unshift(node);
  }
}

// Parsing of non-terminals, eg. |foo[?Param]_opt| or |foo[?Param]?|
const nonTerminalRe = /^([A-Za-z0-9]+)(?:\[([^\]]+)\])?(_opt|\?)?$/;
function parseNonTerminal(str: string): Unlocated<PipeNode> | null {
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
