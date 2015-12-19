'use strict';
const Emitter = require('./Emitter');

module.exports = class EcmarkupEmitter extends Emitter {
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

