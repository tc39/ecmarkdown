export type {
  OpaqueTagNode,
  TagNode,
  CommentNode,
  AlgorithmNode,
  TextNode,
  StarNode,
  UnderscoreNode,
  TickNode,
  TildeNode,
  PipeNode,
  FragmentNode,
  FormatNode,
  UnorderedListNode,
  OrderedListNode,
  ListNode,
  UnorderedListItemNode,
  OrderedListItemNode,
  Node,
} from './node-types';

export type { Observer } from './visitor';

import { Parser } from './parser';
import { visit } from './visitor';
import { Emitter } from './emitter';

let parseFragment = Parser.parseFragment;
let parseAlgorithm = Parser.parseAlgorithm;
let emit = Emitter.emit;
let fragment = (str: string) => Emitter.emit(Parser.parseFragment(str));
let algorithm = (str: string) => Emitter.emit(Parser.parseAlgorithm(str));

export { parseFragment, parseAlgorithm, visit, emit, fragment, algorithm };
