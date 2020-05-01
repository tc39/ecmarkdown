export type Position = {
  line: number;
  column: number;
  offset: number;
};

export type LocationRange = {
  start: Position;
  end: Position;
};

export type EOFToken = {
  name: 'EOF';
  done: true;
  location?: LocationRange;
};

export type Format = 'star' | 'underscore' | 'tick' | 'pipe' | 'tilde';

export type FormatToken = {
  name: Format;
  contents: string;
  location?: LocationRange;
};

export type ParabreakToken = {
  name: 'parabreak';
  contents: string;
  location?: LocationRange;
};

export type LinebreakToken = {
  name: 'linebreak';
  contents: string;
  location?: LocationRange;
};

export type WhitespaceToken = {
  name: 'whitespace';
  contents: string;
  location?: LocationRange;
};

export type TextToken = {
  name: 'text';
  contents: string;
  location?: LocationRange;
};

export type CommentToken = {
  name: 'comment';
  contents: string;
  location?: LocationRange;
};

export type BlockTagToken = {
  name: 'blockTag';
  contents: string;
  location?: LocationRange;
};

export type OpaqueTagToken = {
  name: 'opaqueTag';
  contents: string;
  location?: LocationRange;
};

export type TagToken = {
  name: 'tag';
  contents: string;
  location?: LocationRange;
};

export type UnorderedListToken = {
  name: 'ul';
  contents: string;
  location?: LocationRange;
};

export type OrderedListToken = {
  name: 'ol';
  contents: string;
  location?: LocationRange;
};

export type HeaderToken = {
  name: 'header';
  level: number;
  contents: string;
  location?: LocationRange;
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
  location?: LocationRange;
};

export type HeaderNode = {
  name: 'header';
  level: number;
  contents: FragmentNode[];
  location?: LocationRange;
};

export type BlockTagNode = {
  name: 'blockTag';
  contents: string;
  location?: LocationRange;
};

export type OpaqueTagNode = {
  name: 'opaqueTag';
  contents: string;
  location?: LocationRange;
};

export type TagNode = {
  name: 'tag';
  contents: string;
  location?: LocationRange;
};

export type CommentNode = {
  name: 'comment';
  contents: string;
  location?: LocationRange;
};

export type AlgorithmNode = {
  name: 'algorithm';
  contents: OrderedListNode;
  location?: LocationRange;
};

export type TextNode = {
  name: 'text';
  contents: string;
  location?: LocationRange;
};

export type StarNode = {
  name: 'star';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type UnderscoreNode = {
  name: 'underscore';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type TickNode = {
  name: 'tick';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type TildeNode = {
  name: 'tilde';
  contents: FragmentNode[];
  location?: LocationRange;
};

export type PipeNode = {
  name: 'pipe';
  nonTerminal: string;
  params: string;
  optional: boolean;
  contents: null;
  location?: LocationRange;
};

export type FormatNode = StarNode | UnderscoreNode | TickNode | TildeNode | PipeNode;

export type UnorderedListNode = {
  name: 'ul';
  indent: number;
  contents: ListItemNode[];
  location?: LocationRange;
};

export type OrderedListNode = {
  name: 'ol';
  indent: number;
  start: number;
  contents: ListItemNode[];
  location?: LocationRange;
};

export type ListItemNode = {
  name: 'list-item';
  contents: ListItemContentNode[];
  location?: LocationRange;
};

export type NonListNode = {
  name: 'non-list';
  contents: FragmentNode[];
  location?: LocationRange;
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
