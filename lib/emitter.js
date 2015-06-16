'use strict';

exports.document = function (doc) {
  return doc.map(emit).join('');
};

exports.fragment = function (doc) {
  if (doc.length === 0) {
    return '';
  }

  return doc[0].contents.map(emit).join('');
};

function emit(node) {
  var str = '';

  if (node.name === 'list') {
    if (node.start === '1') {
      str += '<ol>';
    } else {
      str += '<ol start="' + node.start + '">';
    }
    str += node.contents.map(function (item) {
      return '<li>' + item.contents.map(emit).join('') + '</li>';
    }).join('');
    str += '</ol>';
  } else if (node.name === 'chars') {
    // trim any trailing line breaks and indents
    str += node.contents.replace(/\n+\s*$/, '');
  } else if (node.name === 'pipe') {
    str += '<emu-nt';

    if (node.params) {
      str += ' params="' + node.params + '"';
    }

    if (node.optional) {
      str += ' optional';
    }

    str += '>' + node.nonTerminal + '</emu-nt>';
  } else if (node.name === 'non-list') {
    str += '<p>';
    str += node.contents.map(function (item) {
      return emit(item);
    }).join('');
    str += '</p>';
  } else if (node.name === 'comment' || node.name === 'tag') {
    str += node.contents;
  } else {
    str += wrap(node);
  }

  return str;
}

var wrappers = {
  star: 'emu-val',
  underscore: 'var',
  tick: 'code',
  string: 'code',
  tilde: 'emu-const'
};

function wrap(atom) {
  var wrapping = wrappers[atom.name];

  return '<' + wrapping + '>' + atom.contents.map(emit).join('') + '</' + wrapping + '>';
}
