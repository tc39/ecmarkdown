export type EOFToken = {
  name: 'EOF';
  done: true;
  location?: { pos: number; end: number };
};

export type Format = 'star' | 'underscore' | 'tick' | 'pipe' | 'tilde';

export type FormatToken = {
  name: Format;
  contents: string;
  location?: { pos: number; end: number };
};

export type ParabreakToken = {
  name: 'parabreak';
  contents: string;
  location?: { pos: number; end: number };
};

export type LinebreakToken = {
  name: 'linebreak';
  contents: string;
  location?: { pos: number; end: number };
};

export type WhitespaceToken = {
  name: 'whitespace';
  contents: string;
  location?: { pos: number; end: number };
};

export type TextToken = {
  name: 'text';
  contents: string;
  location?: { pos: number; end: number };
};

export type CommentToken = {
  name: 'comment';
  contents: string;
  location?: { pos: number; end: number };
};

export type BlockTagToken = {
  name: 'blockTag';
  contents: string;
  location?: { pos: number; end: number };
};

export type OpaqueTagToken = {
  name: 'opaqueTag';
  contents: string;
  location?: { pos: number; end: number };
};

export type TagToken = {
  name: 'tag';
  contents: string;
  location?: { pos: number; end: number };
};

export type UnorderedListToken = {
  name: 'ul';
  contents: string;
  location?: { pos: number; end: number };
};

export type OrderedListToken = {
  name: 'ol';
  contents: string;
  location?: { pos: number; end: number };
};

export type HeaderToken = {
  name: 'header';
  level: number;
  contents: string;
  location?: { pos: number; end: number };
};

export type Token =
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

export type NotEOFToken = Exclude<Token, EOFToken>;

export type DocumentNode = {
  name: 'document';
  contents: ParagraphNode[];
  location?: { pos: number; end: number };
};

export type HeaderNode = {
  name: 'header';
  level: number;
  contents: FragmentNode[];
  location?: { pos: number; end: number };
};

export type BlockTagNode = {
  name: 'blockTag';
  contents: string;
  location?: { pos: number; end: number };
};

export type OpaqueTagNode = {
  name: 'opaqueTag';
  contents: string;
  location?: { pos: number; end: number };
};

export type TagNode = {
  name: 'tag';
  contents: string;
  location?: { pos: number; end: number };
};

export type CommentNode = {
  name: 'comment';
  contents: string;
  location?: { pos: number; end: number };
};

export type AlgorithmNode = {
  name: 'algorithm';
  contents: OrderedListNode;
  location?: { pos: number; end: number };
};

export type TextNode = {
  name: 'text';
  contents: string;
  location?: { pos: number; end: number };
};

export type StarNode = {
  name: 'star';
  contents: FragmentNode[];
  location?: { pos: number; end: number };
};

export type UnderscoreNode = {
  name: 'underscore';
  contents: FragmentNode[];
  location?: { pos: number; end: number };
};

export type TickNode = {
  name: 'tick';
  contents: FragmentNode[];
  location?: { pos: number; end: number };
};

export type TildeNode = {
  name: 'tilde';
  contents: FragmentNode[];
  location?: { pos: number; end: number };
};

export type PipeNode = {
  name: 'pipe';
  nonTerminal: string;
  params: string;
  optional: boolean;
  contents: null;
  location?: { pos: number; end: number };
};

export type FormatNode = StarNode | UnderscoreNode | TickNode | TildeNode | PipeNode;

export type UnorderedListNode = {
  name: 'ul';
  indent: number;
  contents: ListItemNode[];
  location?: { pos: number; end: number };
};

export type OrderedListNode = {
  name: 'ol';
  indent: number;
  start: number;
  contents: ListItemNode[];
  location?: { pos: number; end: number };
};

export type ListItemNode = {
  name: 'list-item';
  contents: ListItemContentNode[];
  location?: { pos: number; end: number };
};

export type NonListNode = {
  name: 'non-list';
  contents: FragmentNode[];
  location?: { pos: number; end: number };
};

export type ListItemContentNode = FragmentNode | ListNode;

export type FragmentNode = TextNode | FormatNode | CommentNode | TagNode;

export type ListNode = UnorderedListNode | OrderedListNode;

export type ParagraphNode =
  | HeaderNode
  | BlockTagNode
  | OpaqueTagNode
  | AlgorithmNode
  | NonListNode
  | ListNode;

export type Node =
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
