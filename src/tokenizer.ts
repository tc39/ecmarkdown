import type { Unlocated, Token, AttrToken, Position } from './node-types';

const tagRegexp = /^<[/!]?(\w[\w-]*)(\s+[\w]+(\s*=\s*("[^"]*"|'[^']*'|[^><"'=``]+))?)*\s*>/;
const commentRegexp = /^<!--[\w\W]*?-->/;
const attrRegexp = /^\[ *[\w-]+ *= *"[^"\n]*" *(?:, *[\w-]+ *= *"[^"\n]*" *)*] /;
const digitRegexp = /\d/;

const opaqueTags = new Set(['emu-grammar', 'emu-production', 'pre', 'code', 'script', 'style']);

export class Tokenizer {
  str: string;
  _eof: boolean;
  pos: number;
  queue: Token[];
  _newline: boolean;
  _lookahead: Token[];
  previous: Token | undefined;
  line: number;
  column: number;

  constructor(str: string) {
    this.str = str;
    this._eof = false;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.queue = []; // stores tokens when we peek so we don't have to rematch

    this._newline = true;
    this._lookahead = [];
    this.previous = undefined;
  }

  scanDigits() {
    const startPos = this.pos;

    while (this.pos < this.str.length && this.str[this.pos].match(digitRegexp)) {
      this.pos++;
    }

    return this.str.slice(startPos, this.pos);
  }

  scanWhitespace() {
    const startPos = this.pos;

    while (this.pos < this.str.length && isWhitespace(this.str[this.pos])) {
      this.pos++;
    }

    return this.str.slice(startPos, this.pos);
  }

  scanEscape() {
    this.pos++; // consume slash

    if (this.pos === this.str.length) {
      return '\\';
    }

    const chr = this.str[this.pos];
    this.pos++;

    if (isFormat(chr) || chr === '\\') {
      return chr;
    } else {
      return '\\' + chr;
    }
  }

  scanChars() {
    const len = this.str.length;
    let out = '';
    let chr;

    while (this.pos < len) {
      chr = this.str[this.pos];

      if (chr === '\\') {
        out += this.scanEscape();
      } else if (isChars(chr)) {
        out += chr;
        this.pos++;
      } else if (chr === '<') {
        if (this.tryScanComment() || this.tryScanTag()) {
          break;
        }

        out += chr;
        this.pos++;
      } else {
        break;
      }
    }

    return out;
  }

  scanToEndTag(endTag: string) {
    let start = this.pos;
    let len = this.str.length;
    while (this.pos < len) {
      const tag = this.tryScanTag();

      if (tag) {
        this.pos += tag[0].length;
        if (tag[1] === endTag && tag[0][1] === '/') {
          break;
        }
      } else {
        this.pos++;
      }
    }

    return this.str.slice(start, this.pos);
  }

  // does not actually consume the tag
  // you should manually `this.pos += tag[0].length;` if you end up consuming it
  tryScanTag() {
    if (this.str[this.pos] !== '<') {
      return;
    }

    const match = this.str.slice(this.pos).match(tagRegexp);
    if (!match) {
      return;
    }

    return match;
  }

  // does not actually consume the comment
  // you should manually `this.pos += comment.length;` if you end up consuming it
  tryScanComment() {
    const match = this.str.slice(this.pos).match(commentRegexp);
    if (!match) {
      return;
    }

    return match[0];
  }

  // attribute tokens are only valid immediately after list tokens, so we let this be called by the parser.
  tryScanListItemAttributes() {
    const match = this.str.slice(this.pos).match(attrRegexp);
    if (!match) {
      return [];
    }

    const parts = match[0].matchAll(/([\w-]+) *= *"([^"\n]*)"/g);
    const tokens = [];
    let offset = 0;
    for (const part of parts) {
      this.pos += part.index! - offset;
      // updating column manually is kind of cheating, but whatever
      // it only works because we know attributes can't contain linebreaks
      // doing this allows us to avoid having tokens for the `,` and the ` ` between attributes
      this.column += part.index! - offset;
      const tokStart = this.getLocation();
      const tok: Unlocated<AttrToken> = {
        name: 'attr',
        key: part[1],
        value: part[2],
      };
      this.pos += part[0].length;
      this.locate(tok, tokStart);
      offset = part.index! + part[0].length;
      tokens.push(tok);
    }
    this.pos += match[0].length - offset;
    this.column += match[0].length - offset;
    return tokens;
  }

  // Attempts to match any of the tokens at the given index of str
  matchToken() {
    const str = this.str;

    while (true) {
      if (this.pos === str.length) {
        this._eof = true;
        this.enqueue({ name: 'EOF', done: true }, this.getLocation());
        return;
      }

      if (this._newline) {
        this._newline = false;

        const start = this.getLocation();
        const ws = this.scanWhitespace();

        if (this.pos >= str.length) {
          if (ws.length > 0) {
            this.enqueue({ name: 'whitespace', contents: ws }, start);
            return;
          }
        } else if (str[this.pos].match(/\d/)) {
          const digits = this.scanDigits();
          if (str[this.pos] === '.' && str[this.pos + 1] === ' ') {
            this.pos += 2;
            this.enqueue({ name: 'ol', contents: ws + digits + '. ' }, start);
            return;
          } else {
            if (ws.length > 0) {
              this.enqueue({ name: 'whitespace', contents: ws }, start);
            }
            this.enqueue({ name: 'text', contents: digits + this.scanChars() }, start);
            return;
          }
        } else if (str[this.pos] === '*' && str[this.pos + 1] === ' ') {
          this.pos += 2;
          this.enqueue({ name: 'ul', contents: ws + '* ' }, start);
          return;
        } else if (str[this.pos] === '<') {
          const tag = this.tryScanTag();

          if (tag) {
            if (opaqueTags.has(tag[1]) && tag[2] !== '/') {
              this.pos += tag[0].length;
              const rest = this.scanToEndTag(tag[1]);
              this.enqueue({ name: 'opaqueTag', contents: ws + tag[0] + rest }, start);
            } else {
              if (ws.length > 0) {
                this.enqueue({ name: 'whitespace', contents: ws }, start);
              }
              const tagStart = this.getLocation();
              this.pos += tag[0].length;
              this.enqueue({ name: 'tag', contents: tag[0] }, tagStart);
            }

            return;
          }

          const comment = this.tryScanComment();

          if (comment) {
            this.pos += comment.length;
            this.enqueue({ name: 'comment', contents: ws + comment }, start);
            // this._newline = true;
            return;
          }
        } else if (ws.length > 0) {
          this.enqueue({ name: 'whitespace', contents: ws }, start);
          return;
        }
      }

      const start = this.getLocation();
      const chr = str[this.pos];

      switch (chr) {
        case '*':
          this.pos++;
          this.enqueue({ name: 'star', contents: chr }, start);
          return;
        case '_':
          this.pos++;
          this.enqueue({ name: 'underscore', contents: chr }, start);
          return;
        case '`':
          this.pos++;
          this.enqueue({ name: 'tick', contents: chr }, start);
          return;
        case '|':
          this.pos++;
          this.enqueue({ name: 'pipe', contents: chr }, start);
          return;
        case '~':
          this.pos++;
          this.enqueue({ name: 'tilde', contents: chr }, start);
          return;
        case '\n':
          this._newline = true;

          {
            const pos = this.pos;
            let nextPos = pos + 1;
            while (nextPos < str.length && str[nextPos] === '\n') {
              nextPos++;
            }

            this.pos = nextPos;
            if (nextPos === pos + 1) {
              this.enqueue({ name: 'linebreak', contents: '\n' }, start);
            } else {
              this.enqueue({ name: 'parabreak', contents: str.slice(pos, nextPos) }, start);
            }
          }
          return;
        default:
          if (isWhitespace(chr)) {
            this.enqueue({ name: 'whitespace', contents: this.scanWhitespace() }, start);
            return;
          } else if (isChars(chr)) {
            this.enqueue({ name: 'text', contents: this.scanChars() }, start);
            return;
          } else if (chr === '<') {
            if (
              this.str[this.pos + 1] === '!' &&
              this.str[this.pos + 2] === '-' &&
              this.str[this.pos + 3] === '-'
            ) {
              const comment = this.tryScanComment();
              if (comment) {
                this.pos += comment.length;
                this.enqueue({ name: 'comment', contents: comment }, start);
                return;
              }
            } else {
              const tag = this.tryScanTag();
              if (tag) {
                this.pos += tag[0].length;
                if (opaqueTags.has(tag[1]) && tag[2] !== '/') {
                  const rest = this.scanToEndTag(tag[1]);
                  this.enqueue({ name: 'opaqueTag', contents: tag[0] + rest }, start);
                } else {
                  this.enqueue({ name: 'tag', contents: tag[0] }, start);
                }
                return;
              }
            }

            // didn't find a valid comment or tag, so fall back to text.
            this.enqueue({ name: 'text', contents: this.scanChars() }, start);

            return;
          } else {
            // Don't think it's possible to reach here.
            this.raise(`Unexpected token ${chr}`, start);
          }
      }
    }
  }

  getLocation(): Position {
    return {
      offset: this.pos,
      line: this.line,
      column: this.column,
    };
  }

  enqueue(tok: Unlocated<Token>, pos: Position) {
    this.locate(tok, pos);
    this.queue.push(tok);

    if (this._lookahead.length === 0) {
      return;
    }

    for (let i = 0; i < this._lookahead.length; i++) {
      this.queue.push(this._lookahead[i]);
    }

    this._lookahead = [];
  }

  dequeue() {
    return this.queue.shift();
  }

  peek(dist = 1) {
    while (!this._eof && this.queue.length < dist) {
      this.matchToken();
    }

    if (this.queue.length < dist) {
      // return eof
      return this.queue[this.queue.length - 1];
    }

    return this.queue[dist - 1];
  }

  next() {
    this.previous = this.peek();
    // leave EOF in the queue.
    if (this.previous.name !== 'EOF') {
      this.dequeue();
    }
    return this.previous;
  }

  // This is kind of an abuse of "asserts": we're not _asserting_ that `tok` has `location`, but rather arranging that this be so.
  // I don't think TS has a good way to model that, though.
  locate(tok: Unlocated<Token>, startPos: Position): asserts tok is Token;
  locate(tok: Unlocated<AttrToken>, startPos: Position): asserts tok is AttrToken;
  locate(tok: Unlocated<Token | AttrToken>, startPos: Position) {
    if (tok.name === 'linebreak') {
      this.column = 1;
      ++this.line;
    } else if (tok.name === 'parabreak') {
      let size = tok.contents.length;
      this.column = 1;
      this.line += size;
    } else {
      let width = this.pos - startPos.offset;
      this.column += width;
    }
    // @ts-ignore
    tok.location = {
      start: startPos,
      end: this.getLocation(),
    };
  }

  expect(name: Token['name']) {
    let lookahead = this.peek();
    if (lookahead.name === name) {
      return;
    }
    this.raise(`Unexpected token ${lookahead.name}; expected ${name}`, lookahead.location.start);
  }

  raise(message: string, pos: Position) {
    let e = new SyntaxError(message);
    // @ts-ignore
    e.offset = pos.offset;
    // @ts-ignore
    e.line = pos.line;
    // @ts-ignore
    e.column = pos.column;
    throw e;
  }
}

function isWhitespace(chr: string) {
  return chr === ' ' || chr === '\t';
}

function isChars(chr: string) {
  return !isFormat(chr) && chr !== '\n' && chr !== ' ' && chr !== '\t';
}

function isFormat(chr: string) {
  return chr === '*' || chr === '_' || chr === '`' || chr === '<' || chr === '|' || chr === '~';
}
