import type {
  Node,
  PipeNode,
  TildeNode,
  TickNode,
  TextNode,
  TagNode,
  NonListNode,
  UnderscoreNode,
  StarNode,
  ListItemNode,
  OrderedListNode,
  UnorderedListNode,
  HeaderNode,
  AlgorithmNode,
  DocumentNode,
  BlockTagNode,
  OpaqueTagNode,
  CommentNode,
} from './node-types';

export class Emitter {
  str: string;

  constructor() {
    this.str = '';
  }

  emit(node: Node) {
    this.emitNode(node);

    return this.str;
  }

  static emit(doc: Node) {
    const emitter = new Emitter();
    return emitter.emit(doc);
  }

  emitNode(node: Node | Node[]) {
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
        // @ts-ignore
        throw new Error("Can't emit " + node.name);
    }
  }

  emitDocument(document: DocumentNode) {
    document.contents.forEach(p => this.emitNode(p));
  }

  emitAlgorithm(algorithm: AlgorithmNode) {
    this.str += '<emu-alg>';
    this.emitOrderedList(algorithm.contents);
    this.str += '</emu-alg>';
  }

  emitHeader(header: HeaderNode) {
    this.wrapFragment('h' + header.level, header.contents);
  }

  emitOrderedList(ol: OrderedListNode) {
    this.str += '<ol';
    if (ol.start !== 1) {
      this.str += ' start="' + ol.start + '"';
    }
    this.str += '>';
    ol.contents.forEach((item: ListItemNode) => this.emitListItem(item));
    this.str += '</ol>';
  }

  emitUnorderedList(ul: UnorderedListNode) {
    this.str += '<ul>';
    ul.contents.forEach((item: ListItemNode) => this.emitListItem(item));
    this.str += '</ul>';
  }

  emitListItem(li: ListItemNode) {
    this.str += '<li>';
    this.emitFragment(li.contents);
    this.str += '</li>';
  }

  emitStar(node: StarNode) {
    this.wrapFragment('emu-val', node.contents);
  }

  emitUnderscore(node: UnderscoreNode) {
    this.wrapFragment('var', node.contents);
  }

  emitParagraph(p: NonListNode) {
    this.str += '<p>';
    this.emitFragment(p.contents);
    this.str += '</p>';
  }

  emitTag(tag: BlockTagNode | OpaqueTagNode | CommentNode | TagNode) {
    this.str += tag.contents;
  }

  emitText(text: TextNode) {
    this.str += text.contents;
  }

  emitTick(node: TickNode) {
    this.wrapFragment('code', node.contents);
  }

  emitTilde(node: TildeNode) {
    this.wrapFragment('emu-const', node.contents);
  }

  emitFragment(fragment: Node[]) {
    fragment.forEach(p => this.emitNode(p));
  }

  emitPipe(pipe: PipeNode) {
    this.str += '<emu-nt';

    if (pipe.params) {
      this.str += ' params="' + pipe.params + '"';
    }

    if (pipe.optional) {
      this.str += ' optional';
    }

    this.str += '>' + pipe.nonTerminal + '</emu-nt>';
  }

  wrapFragment(wrapping: string, fragment: Node[]) {
    this.str += `<${wrapping}>`;
    this.emitFragment(fragment);
    this.str += `</${wrapping}>`;
  }
}
