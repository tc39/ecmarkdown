'use strict';

module.exports = class Emitter {
  constructor() {
    this.str = '';
  }

  emit(node) {
    this.emitNode(node);

    return this.str;
  }

  static emit(doc) {
    const emitter = new Emitter();
    return emitter.emit(doc);
  }

  emitNode(node) {
    if (Array.isArray(node)) {
      this.emitFragment(node);
      return;
    }

    switch (node.name) {
      case 'document':
        this.emitDocument(node);
        break;
      case 'algorithm':
        this.emitAlgorithm(node);
        break;
      case 'ol':
        this.emitOrderedList(node);
        break;
      case 'ul':
        this.emitUnorderedList(node);
        break;
      case 'list-item':
        this.emitListItem(node);
        break;
      case 'text':
        this.emitText(node);
        break;
      case 'pipe':
        this.emitPipe(node);
        break;
      case 'star':
        this.emitStar(node);
        break;
      case 'underscore':
        this.emitUnderscore(node);
        break;
      case 'tick':
        this.emitTick(node);
        break;
      case 'tilde':
        this.emitTilde(node);
        break;
      case 'non-list':
        this.emitParagraph(node);
        break;
      case 'comment':
      case 'tag':
      case 'blockTag':
      case 'opaqueTag':
        this.emitTag(node);
        break;
      case 'header':
        this.emitHeader(node);
        break;
      default:
        throw new Error('Can\'t emit ' + node.name);
    }
  }

  emitDocument(document) {
    document.contents.forEach(p => this.emitNode(p));
  }

  emitAlgorithm(algorithm) {
    this.str += '<emu-alg>';
    this.emitOrderedList(algorithm.contents);
    this.str += '</emu-alg>';
  }

  emitHeader(header) {
    this.wrapFragment('h' + header.level, header.contents);
  }

  emitOrderedList(ol) {
    this.str += '<ol';
    if (ol.start !== 1) {
      this.str += ' start="' + ol.start + '"';
    }
    this.str += '>';
    ol.contents.forEach(item => this.emitListItem(item));
    this.str += '</ol>';
  }

  emitUnorderedList(ul) {
    this.str += '<ul>';
    ul.contents.forEach(item => this.emitListItem(item));
    this.str += '</ul>';
  }

  emitListItem(li) {
    this.str += '<li>';
    this.emitFragment(li.contents);
    this.str += '</li>';
  }

  emitStar(node) {
    this.wrapFragment('emu-val', node.contents);
  }

  emitUnderscore(node) {
    this.wrapFragment('var', node.contents);
  }

  emitParagraph(p) {
    this.str += '<p>';
    this.emitFragment(p.contents);
    this.str += '</p>';
  }

  emitTag(tag) {
    this.str += tag.contents;
  }

  emitText(text) {
    this.str += text.contents;
  }

  emitTick(node) {
    this.wrapFragment('code', node.contents);
  }

  emitTilde(node) {
    this.wrapFragment('emu-const', node.contents);
  }

  emitFragment(fragment) {
    fragment.forEach(p => this.emitNode(p));
  }

  emitPipe(pipe) {
    this.str += '<emu-nt';

    if (pipe.params) {
      this.str += ' params="' + pipe.params + '"';
    }

    if (pipe.optional) {
      this.str += ' optional';
    }

    this.str += '>' + pipe.nonTerminal + '</emu-nt>';
  }

  wrapFragment(wrapping, fragment) {
    this.str += `<${wrapping}>`;
    this.emitFragment(fragment);
    this.str += `</${wrapping}>`;
  }
};
