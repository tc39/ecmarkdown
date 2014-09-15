# Ecmarkdown

**Ecmarkdown** is a Markdown-inspired syntax for writing algorithms in the style of the ECMAScript spec. This package will convert Ecmarkdown input to HTML output, allowing you to write

```
0. Assert: Type(_iterator_) is Object.
0. Assert: _completion_ is a Completion Record.
0. Let _hasReturn_ be HasProperty(_iterator_, `"return"`).
0. ReturnIfAbrupt(_hasReturn_).
  0. If _hasReturn_ is *true*, then
    0. Let _innerResult_ be Invoke(_iterator_, `"return"`, ( )).
    0. If _completion_.[[type]] is not throw and _innerResult_.[[type]] is throw, then
      0. Return _innerResult_.
0. Return _completion_.
```

instead of

```html
<ol>
  <li>Assert: Type(<var>iterator</var>) is Object.</li>
  <li>Assert: <var>completion</var> is a Completion Record.</li>
  <li>Let <var>hasReturn</var> be HasProperty(<var>iterator</var>, <code>"return"</code>).</li>
  <li>ReturnIfAbrupt(<var>hasReturn</var>).
    <ol>
      <li>If <var>hasReturn</var> is <code class="value">true</code>, then
        <ol>
          <li>Let <var>innerResult</var> be Invoke(<var>iterator</var>, <code>"return"</code>, ( )).</li>
          <li>If <var>completion</var>.[[type]] is not throw and <var>innerResult</var>.[[type]] is throw, then
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
```

## Syntax

Every Ecmarkdown fragment is a **numeric list**. They are written as a series of lines, each starting with `0. `. Lines can be indented by multiples of exactly two spaces to indicate nesting.

**Variables** are written as `_x_` and are translated to `<var>x</var>`. Variables cannot contain spaces, but can contain underscores.

**Values** are written as `*x*` and are translated to `<code class="value">x</code>`. Values cannot contain spaces or asterisks.

**Code** is written as `` `x` `` and is translated to `<code>x</code>`. Code cannot contain backticks.
