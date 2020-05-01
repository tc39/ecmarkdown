import type { Token, Position } from './node-types';

import type { Options } from './ecmarkdown';

const tagRegexp = /^<[/!]?(\w[\w-]*)(\s+[\w]+(\s*=\s*("[^"]*"|'[^']*'|[^><"'=``]+))?)*\s*>/;
const commentRegexp = /^<!--[\w\W]*?-->/;
const digitRegexp = /\d/;
const blockTags = new Set([
  'emu-note',
  'emu-clause',
  'emu-intro',
  'emu-annex',
  'emu-biblio',
  'emu-import',
  'emu-table',
  'emu-figure',
  'emu-example',
  'emu-see-also-para',
  'emu-alg',
  'doctype',
  // following from commonmark (moved pre and script to opaque)
  'address',
  'article',
  'aside',
  'base',
  'basefont',
  'blockquote',
  'body',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'legend',
  'li',
  'link',
  'main',
  'menu',
  'menuitem',
  'meta',
  'nav',
  'noframes',
  'ol',
  'optgroup',
  'option',
  'p',
  'param',
  'section',
  'source',
  'title',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'ul',
]);

const opaqueTags = new Set([
  'emu-grammar',
  'emu-production',
  'emu-eqn',
  'pre',
  'code',
  'script',
  'style',
]);

export class Tokenizer {
  str: string;
  _trackPositions: boolean;
  _eof: boolean;
  pos: number;
  queue: Token[];
  _newline: boolean;
  _lookahead: Token[];
  previous: Token | undefined;
  line: number;
  column: number;

  constructor(str: string, options?: Options) {
    this.str = str;
    this._trackPositions = !!(options && options.trackPositions);
    this._eof = false;
    this.pos = 0;
    this.line = 1;
    this.column = 0;
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
      this.column++;
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
      const start = this.getLocation();
      chr = this.str[this.pos];

      if (chr === '\\') {
        out += this.scanEscape();
      } else if (isChars(chr)) {
        out += chr;
        this.pos++;
      } else if (chr === '<') {
        const tag = this.tryScanTag();

        if (tag) {
          this.enqueueLookahead({ name: 'tag', contents: tag[0] }, start);
          break;
        }

        const comment = this.tryScanComment();

        if (comment) {
          this.enqueueLookahead({ name: 'comment', contents: comment }, start);
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

  scanToEOL() {
    let start = this.pos;
    let len = this.str.length;
    while (this.pos < len && this.str[this.pos] !== '\n') {
      this.pos++;
    }

    if (this.str[this.pos] === '\n') {
      this.pos++;
    }

    return this.str.slice(start, this.pos);
  }

  scanToEndTag(endTag: string) {
    let start = this.pos;
    let len = this.str.length;
    while (this.pos < len) {
      const tag = this.tryScanTag();

      if (tag) {
        if (tag[1] === endTag && tag[0][1] === '/') {
          break;
        }
      } else {
        this.pos++;
      }
    }

    return this.str.slice(start, this.pos);
  }

  tryScanTag() {
    if (this.str[this.pos] !== '<') {
      return;
    }

    // TODO: handle directives like <! doctype...>
    if (
      this.str[this.pos + 1] !== '/' &&
      this.str[this.pos + 1] !== '!' &&
      !this.str[this.pos + 1].match(/\w/)
    ) {
      return;
    }

    const match = this.str.slice(this.pos).match(tagRegexp);
    if (!match) {
      return;
    }

    this.pos += match[0].length;

    return match;
  }

  tryScanComment() {
    const match = this.str.slice(this.pos).match(commentRegexp);
    if (!match) {
      return;
    }

    this.pos += match[0].length;

    return match[0];
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

        const ws = this.scanWhitespace();
        const start = this.getLocation();

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
            if (blockTags.has(tag[1])) {
              const rest = this.scanToEOL();
              this.enqueue({ name: 'blockTag', contents: ws + tag[0] + rest }, start);
              this._newline = true;
            } else if (opaqueTags.has(tag[1]) && tag[2] !== '/') {
              const rest = this.scanToEndTag(tag[1]);
              this.enqueue({ name: 'opaqueTag', contents: ws + tag[0] + rest }, start);
            } else {
              if (ws.length > 0) {
                this.enqueue({ name: 'whitespace', contents: ws }, start);
              }
              this.enqueue({ name: 'tag', contents: tag[0] }, start);
            }

            return;
          }

          const comment = this.tryScanComment();

          if (comment) {
            const rest = this.scanToEOL();
            this.enqueue({ name: 'blockTag', contents: ws + comment + rest }, start);
            this._newline = true;
            return;
          }
        } else if (str[this.pos] === '#') {
          while (this.pos < this.str.length && str[this.pos] === '#') {
            this.pos++;
          }

          const level = this.pos - start.offset;
          if (level > 6 || !isWhitespace(this.str[this.pos])) {
            // rescan with newline  false
            this.pos = start.offset;
            if (ws.length > 0) {
              this.enqueue({ name: 'whitespace', contents: ws }, start);
            }
          } else {
            this.scanWhitespace();
            const contents = ws + this.str.slice(start.offset, this.pos);
            this.enqueue({ name: 'header', level, contents }, start);
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

          if (str[this.pos + 1] === '\n') {
            this.pos += 2;
            this.enqueue({ name: 'parabreak', contents: '\n\n' }, start);
          } else {
            this.pos += 1;
            this.enqueue({ name: 'linebreak', contents: '\n' }, start);
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
                this.enqueue({ name: 'comment', contents: comment }, start);
                return;
              }
            } else {
              const tag = this.tryScanTag();
              if (tag) {
                this.enqueue({ name: 'tag', contents: tag[0] }, start);
                return;
              }
            }

            // didn't find a valid comment or tag, so fall back to text.
            this.enqueue({ name: 'text', contents: this.scanChars() }, start);

            return;
          } else {
            // Don't think it's possible to reach here.
            throw new Error('Unexpected token ' + chr + ' at offset ' + this.pos);
          }
      }
    }
  }

  getLocation() {
    return {
      offset: this.pos,
      line: this.line,
      column: this.column,
    };
  }

  enqueueLookahead(tok: Token, pos: Position) {
    this.locate(tok, pos);
    this._lookahead.push(tok);
  }

  enqueue(tok: Token, pos: Position) {
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

  locate(tok: Token, startPos: Position) {
    if (this._trackPositions) {
      if (tok.name === 'linebreak') {
        this.column = 0;
        ++this.line;
      } else if (tok.name === 'parabreak') {
        this.column = 0;
        this.line += 2;
      } else {
        let width = this.pos - startPos.offset;
        this.column += width;
      }
      tok.location = {
        start: startPos,
        end: this.getLocation(),
      };
    }
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
