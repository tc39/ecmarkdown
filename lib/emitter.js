'use strict';

exports.document = function (doc) {
  return doc.map(emit).join('');
};

exports.fragment = function (doc) {
  if (doc.length === 0) {
    return '';
  }

  return doc.map(function (para) {
    return para.contents.map(emit).join('');
  }).join(' ');
};

function emit(node) {
  let str = '';

  if (node.name === 'ol' || node.name === 'ul') {
    str += '<' + node.name;
    if (node.name === 'ol' && node.start !== 1) {
      str += ' start="' + node.start + '"';
    }
    str += '>';
    str += node.contents.map(function (item) {
      return '<li>' + item.contents.map(emit).join('') + '</li>';
    }).join('');
    str += '</' + node.name + '>';
  } else if (node.name === 'text') {
    str += node.contents;
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

const wrappers = {
  star: 'emu-val',
  underscore: 'var',
  tick: 'code',
  string: 'code',
  tilde: 'emu-const'
};

function wrap(atom) {
  const wrapping = wrappers[atom.name];

  return '<' + wrapping + '>' + atom.contents.map(emit).join('') + '</' + wrapping + '>';
}
