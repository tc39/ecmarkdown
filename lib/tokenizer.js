'use strict';

const tagRegexp = /^<[\/!]?(\w[\w\-]*)(\s+[\w]+(\s*=\s*("[^"]*"|'[^']*'|[^><"'=``]+))?)*\s*>/;
const commentRegexp = /^<!--[\w\W]*?-->/;
const digitRegexp = /\d/;
const blockTags = new Set([
  'emu-note',
  'emu-clause',
  'emu-intro',
  'emu-annex',
  'doctype',
  // following from commonmark (moved pre and script to opaque)
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body', 'caption', 'center', 'col', 'colgroup', 'dd',
  'details', 'dialog', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame',
  'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'legend', 'li', 'link', 'main',
  'menu', 'menuitem', 'meta', 'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'section', 'source', 'title',
  'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul'
]);

const opaqueTags = new Set([
  'emu-grammar',
  'emu-production',
  'pre',
  'code',
  'script',
  'style'
]);

module.exports = class Tokenizer {
  constructor(str) {
    this.str = str;
    this._eof = false;
    this.pos = 0;
    this.queue = []; // stores tokens when we peek so we don't have to rematch

    this._newline = true;
    this._lookahead = [];
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
        const tag = this.tryScanTag();

        if (tag) {
          this._lookahead.push({ name: 'tag', contents: tag[0] });
          break;
        }

        const comment = this.tryScanComment();

        if (comment) {
          this._lookahead.push({ name: 'comment', contents: comment });
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

    this.pos++;

    return this.str.slice(start, this.pos);
  }

  scanToEndTag(endTag) {
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
    if (this.str[this.pos + 1] !== '/' && this.str[this.pos + 1] !== '!' && !this.str[this.pos + 1].match(/\w/)) {
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
        this.enqueue({ name: 'EOF', done: true });
        return;
      }

      if (this._newline) {
        this._newline = false;

        const ws = this.scanWhitespace();

        if (this.pos >= str.length) {
          if (ws.length > 0) {
            this.enqueue({ name: 'whitespace', contents: ws });
            return;
          }
        } else if (str[this.pos].match(/\d/)) {
          const digits = this.scanDigits();
          if (str[this.pos] === '.' && str[this.pos + 1] === ' ') {
            this.enqueue({ name: 'ol', contents: ws + digits + '. ' });
            this.pos += 2;
            return;
          } else {
            if (ws.length > 0) {
              this.enqueue({ name: 'whitespace', contents: ws });
            }
            this.enqueue({ name: 'text', contents: digits + this.scanChars() });
            return;
          }
        } else if (str[this.pos] === '*' && str[this.pos + 1] === ' ') {
          this.enqueue({ name: 'ul', contents: ws + '* ' });
          this.pos += 2;
          return;
        } else if (str[this.pos] === '<') {
          const tag = this.tryScanTag();

          if (tag) {
            if (blockTags.has(tag[1])) {
              const rest = this.scanToEOL();
              this.enqueue({ name: 'blockTag', contents: ws + tag[0] + rest });
              this._newline = true;
            } else if (opaqueTags.has(tag[1]) && tag[2] !== '/') {
              const rest = this.scanToEndTag(tag[1]);
              this.enqueue({ name: 'opaqueTag', contents: ws + tag[0] + rest });
            } else {
              if (ws.length > 0) {
                this.enqueue({ name: 'whitespace', contents: ws });
              }
              this.enqueue({ name: 'tag', contents: tag[0] });
            }

            return;
          }
        } else if (str[this.pos] === '#') {
          const start = this.pos;
          while (this.pos < this.str.length && str[this.pos] === '#') {
            this.pos++;
          }

          const level = this.pos - start;
          if (level > 6 || !isWhitespace(this.str[this.pos])) {
            if (ws.length > 0) {
              this.enqueue({ name: 'whitespace', contents: ws });
            }

            // rescan with newline  false
            this.pos = start;
          } else {
            const tok = { name: 'header', level };
            this.scanWhitespace();
            tok.contents = ws + this.str.slice(start, this.pos);
            this.enqueue(tok);
            return;
          }
        } else if (ws.length > 0) {
          this.enqueue({ name: 'whitespace', contents: ws });
          return;
        }
      }

      const chr = str[this.pos];

      switch (chr) {
        case '*': this.pos++; this.enqueue({ name: 'star', contents: chr }); return;
        case '_': this.pos++; this.enqueue({ name: 'underscore', contents: chr }); return;
        case '`': this.pos++; this.enqueue({ name: 'tick', contents: chr }); return;
        case '|': this.pos++; this.enqueue({ name: 'pipe', contents: chr }); return;
        case '~': this.pos++; this.enqueue({ name: 'tilde', contents: chr }); return;
        case '\n':
          this._newline = true;

          if (str[this.pos + 1] === '\n') {
            this.pos += 2;
            this.enqueue({ name: 'parabreak', contents: '\n\n' });
          } else {
            this.pos += 1;
            this.enqueue({ name: 'linebreak', contents: '\n' });
          }
          return;
        default:
          if (isWhitespace(chr)) {
            this.enqueue({ name: 'whitespace', contents: this.scanWhitespace() });
            return;
          } else if (isChars(chr)) {
            this.enqueue({ name: 'text', contents: this.scanChars() });
            return;
          } else if (chr === '<') {
            if (this.str[this.pos + 1] === '!' && this.str[this.pos + 2] === '-' && this.str[this.pos + 3] === '-') {
              const comment = this.tryScanComment();
              if (comment) {
                this.enqueue({ name: 'comment', contents: comment });
                return;
              }
            } else {
              const tag = this.tryScanTag();
              if (tag) {
                this.enqueue({ name: 'tag', contents: tag[0] });
                return;
              }
            }

            // didn't find a valid comment or tag, so fall back to text.
            this.enqueue({ name: 'text', contents: this.scanChars() });

            return;
          } else {
            // Don't think it's possible to reach here.
            throw new Error('Unexpected token ' + chr + ' at offset ' + this.pos);
          }
      }
    }
  }

  enqueue(tok) {
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

  peek(dist) {
    dist = dist || 1;

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
};

function isWhitespace(chr) {
  return chr === ' ' || chr === '\t';
}

function isChars(chr) {
  return !isFormat(chr) &&
         chr !== '\n' &&
         chr !== ' ' &&
         chr !== '\t';
}

function isFormat(chr) {
  return chr === '*' ||
         chr === '_' ||
         chr === '`' ||
         chr === '<' ||
         chr === '|' ||
         chr === '~';
}
