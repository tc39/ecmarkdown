'use strict';
var beautifyWithBugs = require('js-beautify').html;
var inlineElements = require('inline-elements');

module.exports = function beautify(html) {
    var originalOutput = beautifyWithBugs(html, {
        indent_size: 2,
        wrap_line_length: 0,
        unformatted: ['emu-const', 'emu-val'].concat(inlineElements)
    });

    // https://github.com/beautify-web/js-beautify/issues/524
    var fixNewlines = originalOutput.replace(/(<\/code>|<\/var>|<\/emu-[^>]+>)\n *<\/li>/g, '$1</li>');

    // https://github.com/beautify-web/js-beautify/issues/525
    var fixExtraSpaces = fixNewlines.replace(/>  </g, '> <');

    return fixExtraSpaces;
};
