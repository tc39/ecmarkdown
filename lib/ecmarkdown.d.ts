declare module 'ecmarkdown' {
  export interface Options {
    trackPositions?: boolean;
  }
  export function parse(str: string, options?: Options): Parser.DocumentNode;
  export function emit(ast: Parser.DocumentNode): string;
  export function process(str: string, options?: Options): string;
}

declare module 'ecmarkdown/lib/tokenizer' {
  export = Tokenizer;

  class Tokenizer {
    constructor(ecmarkdown: string, options?: { trackPositions?: boolean });
    private _trackPositions;
    private _eof;
    private _lookahead;
    str: string;
    pos: number;
    queue: Tokenizer.Token[];
    previous: Tokenizer.Token;
    scanDigits(): string;
    scanWhitespace(): string;
    scanEscape(): string;
    scanChars(): string;
    tryScanTag(): string;
    tryScanComment(): string;
    matchToken(): void;
    enqueueLookahead(tok: Tokenizer.Token, pos: number): void;
    enqueue(tok: Tokenizer.Token, pos: number): void;
    dequeue(): Tokenizer.Token;
    peek(dist?: number): Tokenizer.Token;
    next(): Tokenizer.Token;
  }

  namespace Tokenizer {
    interface EOFToken {
      name: 'EOF';
      done: true;
      location?: { pos: number; end: number };
    }

    type Format = 'star' | 'underscore' | 'tick' | 'pipe' | 'tilde';

    interface FormatToken {
      name: Format;
      contents: string;
      location?: { pos: number; end: number };
    }

    interface ParabreakToken {
      name: 'parabreak';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface LinebreakToken {
      name: 'linebreak';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface WhitespaceToken {
      name: 'whitespace';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface TextToken {
      name: 'text';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface CommentToken {
      name: 'comment';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface BlockTagToken {
      name: 'blockTag';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface OpaqueTagToken {
      name: 'opaqueTag';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface TagToken {
      name: 'tag';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface UnorderedListToken {
      name: 'ul';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface OrderedListToken {
      name: 'ol';
      contents: string;
      location?: { pos: number; end: number };
    }

    interface HeaderToken {
      name: 'header';
      level: number;
      contents: string;
      location?: { pos: number; end: number };
    }

    type Token =
      | EOFToken
      | FormatToken
      | ParabreakToken
      | LinebreakToken
      | WhitespaceToken
      | TextToken
      | CommentToken
      | TagToken
      | UnorderedListToken
      | OrderedListToken
      | HeaderToken
      | BlockTagToken
      | OpaqueTagToken;
  }
}

declare namespace Parser {
  interface DocumentNode {
    name: 'document';
    contents: ParagraphNode[];
    location?: { pos: number; end: number };
  }

  interface HeaderNode {
    name: 'header';
    level: number;
    contents: FragmentNode[];
    location?: { pos: number; end: number };
  }

  interface BlockTagNode {
    name: 'blockTag';
    contents: string;
    location?: { pos: number; end: number };
  }

  interface OpaqueTagNode {
    name: 'opaqueTag';
    contents: string;
    location?: { pos: number; end: number };
  }

  interface TagNode {
    name: 'tag';
    contents: string;
    location?: { pos: number; end: number };
  }

  interface CommentNode {
    name: 'comment';
    contents: string;
    location?: { pos: number; end: number };
  }

  interface AlgorithmNode {
    name: 'algorithm';
    contents: OrderedListNode;
    location?: { pos: number; end: number };
  }

  interface TextNode {
    name: 'text';
    contents: string;
    location?: { pos: number; end: number };
  }

  interface StarNode {
    name: 'star';
    contents: FragmentNode[];
    location?: { pos: number; end: number };
  }

  interface UnderscoreNode {
    name: 'underscore';
    contents: FragmentNode[];
    location?: { pos: number; end: number };
  }

  interface TickNode {
    name: 'tick';
    contents: FragmentNode[];
    location?: { pos: number; end: number };
  }

  interface TildeNode {
    name: 'tilde';
    contents: FragmentNode[];
    location?: { pos: number; end: number };
  }

  interface PipeNode {
    name: 'pipe';
    nonTerminal: string;
    params: string;
    optional: boolean;
    contents: null;
    location?: { pos: number; end: number };
  }

  type FormatNode = StarNode | UnderscoreNode | TickNode | TildeNode | PipeNode;

  interface UnorderedListNode {
    name: 'ul';
    indent: number;
    contents: ListItemNode[];
    location?: { pos: number; end: number };
  }

  interface OrderedListNode {
    name: 'ol';
    indent: number;
    start: number;
    contents: ListItemNode[];
    location?: { pos: number; end: number };
  }

  interface ListItemNode {
    name: 'list-item';
    contents: ListItemContentNode[];
    location?: { pos: number; end: number };
  }

  interface NonListNode {
    name: 'non-list';
    contents: FragmentNode[];
    location?: { pos: number; end: number };
  }

  type ListItemContentNode = FragmentNode | ListNode;

  type FragmentNode = TextNode | FormatNode | CommentNode | TagNode;

  type ListNode = UnorderedListNode | OrderedListNode;

  type ParagraphNode =
    | HeaderNode
    | BlockTagNode
    | OpaqueTagNode
    | AlgorithmNode
    | NonListNode
    | ListNode;

  type Node =
    | DocumentNode
    | HeaderNode
    | BlockTagNode
    | OpaqueTagNode
    | TagNode
    | CommentNode
    | AlgorithmNode
    | TextNode
    | StarNode
    | UnderscoreNode
    | TickNode
    | TildeNode
    | PipeNode
    | UnorderedListNode
    | OrderedListNode
    | ListItemNode
    | NonListNode;
}

declare module 'ecmarkdown/lib/parser' {
  import Tokenizer = require('ecmarkdown/lib/tokenizer');

  export = Parser;

  class Parser {
    constructor(tokenizer: Tokenizer, options?: { trackPositions?: boolean });
    parseDocument(): Parser.DocumentNode;
    parseParagraphs(): Parser.ParagraphNode[];
    parseParagraph(): Parser.ParagraphNode;
    parseAlgorithm(): Parser.AlgorithmNode;
    parseList(): Parser.ListNode;
    parseNonList(): Parser.NonListNode;
    parseListItem(indent: number): Parser.ListItemNode;
    parseFragment(inList?: boolean, fmtStack?: Tokenizer.Format[]): Parser.FragmentNode[];
    parseText(inList: boolean, fmtStack: Tokenizer.Format[]): Parser.TextNode;
    parseFormat(
      format: Tokenizer.Format,
      inList: boolean,
      fmtStack?: Tokenizer.Format[]
    ): Parser.FragmentNode[];
    private _t;
    private _posStack;
    private pushPos;
    private popPos;
    private getPos;
    private getEnd;
    private finish;
  }
}

declare module 'ecmarkdown/lib/Emitter' {
  import Parser = require('ecmarkdown/lib/parser');

  export = Emitter;

  abstract class Emitter {
    str: string;
    static emit(doc: Parser.DocumentNode): string;
    emit(node: Parser.Node): string;
    emitNode(node: Parser.Node): void;
    abstract emitDocument(node: Parser.DocumentNode): void;
    abstract emitAlgorithm(node: Parser.AlgorithmNode): void;
    abstract emitOrderedList(node: Parser.OrderedListNode): void;
    abstract emitUnorderedList(node: Parser.UnorderedListNode): void;
    abstract emitListItem(node: Parser.ListItemNode): void;
    abstract emitText(node: Parser.TextNode): void;
    abstract emitPipe(node: Parser.PipeNode): void;
    abstract emitStar(node: Parser.StarNode): void;
    abstract emitUnderscore(node: Parser.UnderscoreNode): void;
    abstract emitTick(node: Parser.TickNode): void;
    abstract emitTilde(node: Parser.TildeNode): void;
    abstract emitParagraph(node: Parser.NonListNode): void;
    abstract emitTag(
      node: Parser.CommentNode | Parser.TagNode | Parser.BlockTagNode | Parser.OpaqueTagNode
    ): void;
    abstract emitHeader(node: Parser.HeaderNode): void;
    abstract emitFragment(fragment: Parser.FragmentNode[]): void;
  }
}

declare module 'ecmarkdown/lib/EcmarkupEmitter' {
  import Parser = require('ecmarkdown/lib/parser');
  import Emitter = require('ecmarkdown/lib/Emitter');

  export = EcmarkupEmitter;

  class EcmarkupEmitter extends Emitter {
    emitDocument(node: Parser.DocumentNode): void;
    emitAlgorithm(node: Parser.AlgorithmNode): void;
    emitHeader(node: Parser.HeaderNode): void;
    emitOrderedList(node: Parser.OrderedListNode): void;
    emitUnorderedList(node: Parser.UnorderedListNode): void;
    emitListItem(node: Parser.ListItemNode): void;
    emitStar(node: Parser.StarNode): void;
    emitUnderscore(node: Parser.UnderscoreNode): void;
    emitParagraph(node: Parser.NonListNode): void;
    emitTag(
      node: Parser.CommentNode | Parser.TagNode | Parser.BlockTagNode | Parser.OpaqueTagNode
    ): void;
    emitText(node: Parser.TextNode): void;
    emitTick(node: Parser.TickNode): void;
    emitTilde(node: Parser.TildeNode): void;
    emitFragment(fragment: Parser.FragmentNode[]): void;
    emitPipe(node: Parser.PipeNode): void;
    wrapFragment(wrapping: string, fragment: Parser.FragmentNode[]): void;
  }
}
