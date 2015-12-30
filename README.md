# Ecmarkdown

**Ecmarkdown** is a Markdown-inspired syntax for writing text and algorithms in the style of [the ECMAScript spec](https://tc39.github.io/ecma262/). This package will convert Ecmarkdown input to HTML output.

## Examples

### An algorithm

Some of Ecmarkdown's biggest benefits are when using it to write algorithm steps, without the many formalities HTML requires for list items and inline formatting of common algorithmic constructs.

```
1. Assert: Type(_iterator_) is Object.
1. Assert: _completion_ is a Completion Record.
1. Let _hasReturn_ be HasProperty(_iterator_, `"return"`).
1. ReturnIfAbrupt(_hasReturn_).
  1. If _hasReturn_ is *true*, then
    1. Let _innerResult_ be Invoke(_iterator_, `"return"`, ( )).
    1. If _completion_.[[type]] is not ~throw~ and _innerResult_.[[type]] is ~throw~, then
      1. Return _innerResult_.
1. Return _completion_.
```

will be converted to

```html
<emu-alg>
  <ol>
    <li>Assert: Type(<var>iterator</var>) is Object.</li>
    <li>Assert: <var>completion</var> is a Completion Record.</li>
    <li>Let <var>hasReturn</var> be HasProperty(<var>iterator</var>, <code>"return"</code>).</li>
    <li>ReturnIfAbrupt(<var>hasReturn</var>).
      <ol>
        <li>If <var>hasReturn</var> is <emu-val>true</emu-val>, then
          <ol>
            <li>Let <var>innerResult</var> be Invoke(<var>iterator</var>, <code>"return"</code>, ( )).</li>
            <li>If <var>completion</var>.[[type]] is not <emu-const>throw</emu-const> and <var>innerResult</var>.[[type]] is <emu-const>throw</emu-const>, then
              <ol>
                <li>Return <var>innerResult</var>.</li>
              </ol>
            </li>
          </ol>
        </li>
      </ol>
    </li>
    <li>Return <var>completion</var>.</li>
  </ol>
</emu-alg>
```

### A full document

Ecmarkdown can also be used on entire documents at a time, freely mixing in HTML (and Ecmarkup) tags and headers.

```
<emu-intro>
  # Introduction

  This is a document describing Ecmarkdown.
</emu-intro>

<emu-clause id="c1">
  # Clause 1
  This is paragraph content. You can reference _variables_ and other
  inline formatting in paragraphs too.

  1. Numeric lists are implicitly counted as algorithms.
  2. Everyone loves algorithms.

  This is paragraph content.

  ## Syntax

  Second-level headings are rare in most Ecmarkdown documents, as
  `<emu-clause>` plus first-level headings usually serve better. But
  in some cases you want a heading that does not show up in the table
  of contents, so you can use `##` or `###` syntax.

  <emu-grammar>
    Foo :
      `bar` Baz
  </emu-grammar>

  The contents of `<emu-grammar>`, `<emu-production>`, `<pre>`,
  `<code>`, `<script>`, and `<style>` tags are left alone by Ecmarkdown.

  <emu-clause id="sub-clause">
    # Foo(_p1_, _p2_)
    Notice how headers can also use Ecmarkdown inline elements.
  </emu-clause>

  <aside>This content will *not* be processed by Ecmarkdown.
  But this content will be, since it's on a new line.
  </aside>
</emu-clause>
```

This produces the output

```html
<emu-intro>
  <h1>Introduction</h1>
  <p>This is a document describing Ecmarkdown.</p>
</emu-intro>

<emu-clause id="c1">
  <h1>Clause 1</h1>
  <p>This is paragraph content. You can reference <var>variables</var> and other
  inline formatting in paragraphs too.</p>

  <emu-alg>
    <ol>
      <li>Numeric lists are implicitly counted as algorithms.</li>
      <li>Everyone loves algorithms.</li>
    </ol>
  </emu-alg>

  <p>This is paragraph content.</p>

  <h2>Syntax</h2>
  <p>Second-level headings are rare in most Ecmarkdown documents, as
  <code>&lt;emu-clause&gt;</code> plus first-level headings usually serve better. But
  in some cases you want a heading that does not show up in the table
  of contents, so you can use <code>##</code> or <code>###</code> syntax.</p>

  <emu-grammar>
    Foo :
      `bar` Baz
  </emu-grammar>

  <p>The contents of <code>&lt;emu-grammar&gt;</code>, <code>&lt;emu-production&gt;</code>, <code>&lt;pre&gt;</code>,
  <code>&lt;code&gt;</code>, <code>&lt;script&gt;</code>, and <code>&lt;style&gt;</code> tags are left alone by Ecmarkdown.</p>

  <emu-clause id="sub-clause">
    <h1>Foo(<var>p1</var>, <var>p2</var>)</h1>
    <p>Notice how headers can also use Ecmarkdown inline elements.</p>
  </emu-clause>

  <aside>This content will *not* be processed by Ecmarkdown.
    <p>But this content will be, since it&#39;s on a new line.</p>
  </aside>
</emu-clause>
```

## Syntax

### Document-Level Structure

A document generally consists of paragraphs, lists, headers, and HTML blocks. Paragraphs are the default, and are created for lines without special markup at the start of them. Except inside opaque HTML blocks, all use of `<`, `>`, `"`, and `'` are escaped to their corresponding HTML entities.

#### Headers

A header line is one beginning with between one and six `#` signs. It will be transformed into a corresponding tag from the `<h1>` through `<h6>` range. Inside a header you can use inline Ecmarkdown constructs.

#### Lists

Lists are written as a series of lines, each starting with either a number, e.g. `1.`, or a star, e.g. `*`. Inside a list item line you can use inline Ecmarkdown constructs. The first list item's number determines the starting number in the output (via `<ol start="x">`); subsequent list items' numbers are ignored.

Lists can be nested. To do so, use any number of spaces to indent; as long as the number of spaces is consistent, list items will stay together in a nested list.

#### HTML Blocks

Any line which starts with a block-level HTML tag ([as defined by CommonMark](http://spec.commonmark.org/0.22/#html-blocks), with the addition of `<emu-note>`, `<emu-clause>`, `<emu-intro>`, `<emu-annex>`, `<emu-biblio>`, `<emu-import>`, `<emu-table>`, `<emu-figure>`, `<emu-example>`, `<emu-alg>`, and `<emu-see-also-para>`) is a HTML block line. Ecmarkdown cannot be used on the line starting a HTML block, but subsequent lines before the closing tag do allow it.

#### Opaque HTML Blocks

The tags `<emu-grammar>`, `<emu-eqn>`, `<emu-production>`, `<pre>`, `<code>`, `<script>`, and `<style>` are considered opaque. Their entire contents, until their closing tag is seen, are left alone, with no Ecmarkdown processing or HTML escaping. As with ordinary HTML blocks, this only applies if the tag begins the line; if they are seen mid-line they will be treated as inline HTML.

### Inline Formatting

Inside a paragraph, list item, or header, the following inline formatting elements can appear:

**Variables** are written as `_x_` and are translated to `<var>x</var>`. Variables cannot contain whitespace or other formatting characters.

**Values** are written as `*x*` and are translated to `<emu-val>x</emu-val>`. Values cannot contain asterisks.

**Code** is written as `` `x` `` and is translated to `<code>x</code>`. Code cannot contain backticks.

**Spec-level constants** are written as `~x~` and are translated to `<emu-const>x</emu-const>`. Spec-level constants cannot contain tildes.

**Nonterminals** are written as `|x|`, `|x_opt|`, `|x[p]|`, or `|x[p]_opt|`. These are translated, respectively, into `<emu-nt>x</emu-nt>`, `<emu-nt optional>x</emu-nt>`, `<emu-nt params="p">x</emu-nt>`, or `<emu-nt params="p" optional>x</emu-nt>`. Nonterminal names can only be composed of letters and numbers. Params can be composed of anything except a closing square bracket.

All formats can be started following non-alphanumeric and non-whitespace characters and can be ended following any non-whitespace character. The one exception is code formats which can begin and end in any context.  For example, `my_SIMD_constructor` does not contain any variables while `_SIMD_Constructor` does.

You can escape any format above with a backslash. Escaping of any non-format characters will not be considered an escape and will render literally (eg. `\a` simply renders as `\a`). If you need a literal backslash before a formatting character, you must escape the backslash (eg. `\\*foo*` renders as `\<emu-val>foo</emu-val>`).

HTML tags used inside paragraphs will generally be passed through, with their contents processed further by Ecmarkdown (but not their attribute values). The exception is if the tag starts the line and is categorized as block or opaque, in which case the previous sections apply.

## Interaction with Ecmarkup

Ecmarkdown is meant to be used together with [Ecmarkup](https://github.com/bterlson/ecmarkup/). Ecmarkup provides:

* The framework for structuring and compiling a specification containing Ecmarkdown contents
* An auto-linking postprocessing step
* A target vocabulary (the `<emu-` tags) for some Ecmarkdown constructs.

In short, we expect Ecmarkdown to be embedded within a larger Ecmarkup document, used for writing algorithm steps and other text in a concise format.
