module.exports = Tokenizer;

var tokens = {
  star: /\*/,
  underscore: /_/,
  tick: /`/,
  pipe: /\|/,
  string: /"/,
  tilde: /~/,
  parabreak: /\n\n/,
  linebreak: /\n/,
  list: /[ \t]*\d+\. /,
  whitespace: /[\s]+/,
  comment: /<!--[\w\W]*-->/,
  tag: /<[\/\w][^>]*>/,
  chars: /[^*_`"~|\s\n][^*_`"~<|\s\n]*/
};

var tokNames = Object.keys(tokens);
var tokRe = new RegExp(
  tokNames.map(function (key) {
    return '(^' + tokens[key].toString().slice(1, -1) + ')';
  })
  .join('|')
);

// Attempts to match any of the tokens at the given index of str
function matchAt(str, index) {
  var match = tokRe.exec(str.slice(index));
  if (!match) {
    return null;
  }

  for (var i = 1; i < match.length; i++) {
    if (match[i] !== undefined) {
      if (match[0].length === 0) {
        throw 'Matched 0-length with ' + tokNames[i - 1];
      }
      return { name: tokNames[i - 1], contents: match[0] };
    }
  }
}

function Tokenizer(str) {
  this.str = str;
  this.pos = 0;
  this.queue = []; // stores tokens when we peek so we don't have to rematch
}

Tokenizer.prototype.peek = function(dist) {
  if (this.pos > this.str.length) {
    throw 'No more tokens!';
  }

  dist = dist || 1;

  // check if we've got the token already
  if(this.queue.length >= dist) {
    return this.queue[dist - 1];
  }

  // offset our position by any tokens already in the queue
  var curPos = this.pos;
  for(var i = 0; i < this.queue.length; i++) {
    curPos += this.queue[i].contents.length;
  }

  // match remaining tokens
  var match;
  for (var i = this.queue.length; i < dist; i++) {
    if (curPos === this.str.length) {
      return { name: 'EOF', done: true };
    }

    match = matchAt(this.str, curPos);
    if (!match) {
      throw 'Unexpected token ' + this.str.slice(this.pos);
    }

    curPos += match.contents.length;
    this.queue.push(match);
  }

  return match;
}

Tokenizer.prototype.next = function() {
  this.previous = this.peek();

  if (this.previous.name !== 'EOF') {
    this.pos += this.previous.contents.length;
  }

  this.queue.shift();

  return this.previous;
}
