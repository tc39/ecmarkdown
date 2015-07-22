'use strict';
module.exports = Tokenizer;

function Tokenizer(str) {
  this.str = str;
  this._eof = false;
  this.pos = 0;
  this.queue = []; // stores tokens when we peek so we don't have to rematch

  this._newline = true;
  this._lookahead = [];
}

Tokenizer.prototype.scanDigits = function scanDigits() {
  var startPos = this.pos;

  while (this.str[this.pos].match(/\d/)) {
    this.pos++;
  }

  return this.str.slice(startPos, this.pos);
};

function isWhitespace(chr) {
  return chr === ' ' || chr === '\t';
}

Tokenizer.prototype.scanWhitespace = function scanWhitespace() {
  var startPos = this.pos;

  while (this.pos < this.str.length && isWhitespace(this.str[this.pos])) {
    this.pos++;
  }

  return this.str.slice(startPos, this.pos);
};

function isChars(chr) {
  return chr !== '*' &&
         chr !== '_' &&
         chr !== '`' &&
         chr !== '"' &&
         chr !== '<' &&
         chr !== '|' &&
         chr !== '~' &&
         chr !== '\n' &&
         chr !== ' ' &&
         chr !== '\t';
}

Tokenizer.prototype.scanChars = function scanChars() {
  var startPos = this.pos;
  var endPos = startPos;
  var len = this.str.length;
  var chr;

  while (endPos < len) {
    chr = this.str[endPos];

    if (isChars(chr)) {
      endPos = ++this.pos;
    } else if (chr === '<') {
      var tag = this.tryScanTag();

      if (tag) {
        this._lookahead.push({ name: 'tag', contents: tag});
        break;
      }

      var comment = this.tryScanComment();

      if (comment) {
        this._lookahead.push({ name: 'comment', contents: comment});
        break;
      }

      endPos = ++this.pos;
    } else {
      break;
    }
  }

  return this.str.slice(startPos, endPos);
};

Tokenizer.prototype.tryScanTag = function tryScanTag() {
  if (this.str[this.pos] !== '<') {
    return;
  }

  // TODO: handle directives like <! doctype...>
  if (this.str[this.pos + 1] !== '/' && !this.str[this.pos + 1].match(/\w/)) {
    return;
  }

  var match = this.str.slice(this.pos).match(/^<[\/\w][^>]*>/);
  if (!match) {
    return;
  }

  this.pos += match[0].length;

  return match[0];
};

Tokenizer.prototype.tryScanComment = function tryScanComment() {
  var match = this.str.slice(this.pos).match(/^<!--[\w\W]*-->/);
  if (!match) {
    return;
  }

  this.pos += match[0].length;

  return match[0];
};

// Attempts to match any of the tokens at the given index of str
Tokenizer.prototype.matchToken = function matchToken() {
  var str = this.str;

  while (true) {
    if (this.pos === str.length) {
      this._eof = true;
      this.enqueue({ name: 'EOF', done: true });
      return;
    }

    if (this._newline) {
      this._newline = false;

      var ws = this.scanWhitespace();

      if (str[this.pos].match(/\d/)) {
        var digits = this.scanDigits();
        if (str[this.pos] === '.' && str[this.pos + 1] === ' ') {
          this.enqueue({ name: 'list', contents: ws + digits + '. ' });
          this.pos += 2;
          return;
        } else {
          if (ws.length > 0) {
            this.enqueue({ name: 'whitespace', contents: ws });
          }
          this.enqueue({ name: 'chars', contents: digits + this.scanChars() });
          return;
        }
      } else if (ws.length > 0) {
        this.enqueue({ name: 'whitespace', contents: ws });
        return;
      }
    }

    var chr = str[this.pos];

    switch (chr) {
      case '*': this.pos++; this.enqueue({name: 'star', contents: chr}); return;
      case '_': this.pos++; this.enqueue({name: 'underscore', contents: chr}); return;
      case '`': this.pos++; this.enqueue({name: 'tick', contents: chr}); return;
      case '|': this.pos++; this.enqueue({name: 'pipe', contents: chr}); return;
      case '"': this.pos++; this.enqueue({name: 'string', contents: chr}); return;
      case '~': this.pos++; this.enqueue({name: 'tilde', contents: chr}); return;
      case '\n':
        if (str[this.pos + 1] === '\n') {
          this.pos += 2;
          this.enqueue({name: 'parabreak', contents: '\n\n'});
        } else {
          this.pos += 1;
          this._newline = true;
          this.enqueue({name: 'linebreak', contents: '\n'});
        }
        return;
      default:
        if (isWhitespace(chr)) {
          this.enqueue({name: 'whitespace', contents: this.scanWhitespace()});
          return;
        } else if (isChars(chr)) {
          this.enqueue({name: 'chars', contents: this.scanChars()});
          return;
        } else if (chr === '<') {
          if (this.str[this.pos + 1] === '!' && this.str[this.pos + 2] === '-' && this.str[this.pos + 3] === '-') {
            var comment = this.tryScanComment();
            if (comment) {
              this.enqueue({name: 'comment', contents: comment});
              return;
            }
          } else {
            var tag = this.tryScanTag();
            if (tag) {
              this.enqueue({name: 'tag', contents: tag});
              return;
            }
          }

          // didn't find a valid comment or tag, so fall back to chars.
          this.enqueue({name: 'chars', contents: this.scanChars()});

          return;
        } else {
          // Don't think it's possible to reach here.
          throw new Error('Unexpected token ' + chr + ' at offset ' + this.pos);
        }
    }
  }
};

Tokenizer.prototype.enqueue = function enqueue(tok) {
  this.queue.push(tok);

  if (this._lookahead.length === 0) {
    return;
  }

  for (var i = 0; i < this._lookahead.length; i++) {
    this.queue.push(this._lookahead[i]);
  }

  this._lookahead = [];
};

Tokenizer.prototype.dequeue = function dequeue() {
  return this.queue.shift();
};

Tokenizer.prototype.peek = function peek(dist) {
  dist = dist || 1;

  while (!this._eof && this.queue.length < dist) {
    this.matchToken();
  }

  if (this.queue.length < dist) {
    // return eof
    return this.queue[this.queue.length - 1];
  }

  return this.queue[dist - 1];
};

Tokenizer.prototype.next = function next() {
  this.previous = this.peek();
  // leave EOF in the queue.
  if (this.previous.name !== 'EOF') {
    this.dequeue();
  }
  return this.previous;
};
