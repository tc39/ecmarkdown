'use strict';
var beautifyWithBugs = require('js-beautify').html;
var inlineElements = require('inline-elements');

module.exports = function beautify(html) {
  var originalOutput = beautifyWithBugs(html, {
    indent_size: 2,
    wrap_line_length: 0,
    unformatted: ['emu-const', 'emu-val', 'emu-nt'].concat(inlineElements)
  });

  // https://github.com/beautify-web/js-beautify/issues/524#issuecomment-82791022
  var fixNewlines = originalOutput.replace(/(<\/emu-[^>]+>)\n *<\/li>/g, '$1</li>');

  // Remove empty =""s
  var withSimplifiedAttributes = fixNewlines.replace(/=""/g, '');

  return withSimplifiedAttributes;
};
