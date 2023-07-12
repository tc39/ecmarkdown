import type {
  Node,
  PipeNode,
  TildeNode,
  TickNode,
  TextNode,
  TagNode,
  UnderscoreNode,
  StarNode,
  OrderedListItemNode,
  UnorderedListItemNode,
  OrderedListNode,
  UnorderedListNode,
  AlgorithmNode,
  OpaqueTagNode,
  CommentNode,
} from './node-types';

const getIndentMatcher = unaryMemoize(
  (length: number) => new RegExp(String.raw`\n[\p{Space_Separator}\t]{1,${length}}`, 'gu'),
  Array.from({ length: 20 }, (_, i) => i + 1)
);

export class Emitter {
  str: string;
  indent: number;

  constructor() {
    this.str = '';
    this.indent = 0;
  }

  emit(node: Node | Node[]) {
    this.emitNode(node);

    return this.str;
  }

  static emit(node: Node | Node[]) {
    const emitter = new Emitter();
    return emitter.emit(node);
  }

  emitNode(node: Node | Node[]) {
    if (Array.isArray(node)) {
      this.emitFragment(node);
      return;
    }

    switch (node.name) {
      case 'algorithm':
        this.emitAlgorithm(node);
        break;
      case 'ol':
        this.emitOrderedList(node);
        break;
      case 'ul':
        this.emitUnorderedList(node);
        break;
      case 'ordered-list-item':
      case 'unordered-list-item':
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
      case 'comment':
      case 'tag':
      case 'opaqueTag':
        this.emitTag(node);
        break;
      default:
        // @ts-ignore
        throw new Error("Can't emit " + node.name);
    }
  }

  emitAlgorithm(algorithm: AlgorithmNode) {
    this.emitOrderedList(algorithm.contents);
  }

  emitOrderedList(ol: OrderedListNode) {
    this.str += '<ol';
    if (ol.start !== 1) {
      this.str += ' start="' + ol.start + '"';
    }
    this.str += '>';
    ol.contents.forEach((item: OrderedListItemNode) => this.emitListItem(item));
    this.str += '</ol>';
  }

  emitUnorderedList(ul: UnorderedListNode) {
    this.str += '<ul>';
    ul.contents.forEach((item: UnorderedListItemNode) => this.emitListItem(item));
    this.str += '</ul>';
  }

  emitListItem(li: OrderedListItemNode | UnorderedListItemNode) {
    const attrs = li.attrs.map(a => ` ${a.key}=${JSON.stringify(a.value)}`).join('');
    this.str += `<li${attrs}>`;
    const oldIndent = this.indent;
    this.indent = li.contentsIndent;
    this.emitFragment(li.contents);
    this.indent = oldIndent;
    if (li.sublist !== null) {
      if (li.sublist.name === 'ol') {
        this.emitOrderedList(li.sublist);
      } else {
        this.emitUnorderedList(li.sublist);
      }
    }
    this.str += '</li>';
  }

  emitStar(node: StarNode) {
    this.wrapFragment('emu-val', node.contents);
  }

  emitUnderscore(node: UnderscoreNode) {
    this.wrapFragment('var', node.contents);
  }

  emitTag(tag: OpaqueTagNode | CommentNode | TagNode) {
    this.str += tag.contents;
  }

  emitText(text: TextNode) {
    let contents = text.contents;
    if (this.indent) {
      const indentMatcher = getIndentMatcher(this.indent);
      contents = contents.replace(indentMatcher, '\n');
    }
    this.str += contents;
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

function unaryMemoize<K, V>(fn: (arg: K) => V, prepopulate: K[] = []) {
  const cache = new Map(prepopulate.map(arg => [arg, fn(arg)]));
  return (arg: K) => {
    let value = cache.get(arg);
    if (value === undefined && !cache.has(arg)) {
      value = fn(arg);
      cache.set(arg, value);
    }
    return value as V;
  };
}
