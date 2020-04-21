'use strict';

module.exports = class Emitter {
  constructor() {
    this.str = '';
  }

  emit (node) {
    this.emitNode(node);

    return this.str;
  }

  static emit(doc) {
    const emitter = new Emitter();
    return emitter.emit(doc);
  }

  emitNode (node) {
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
};
