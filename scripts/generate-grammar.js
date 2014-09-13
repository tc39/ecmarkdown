'use strict';
var pegjs = require('pegjs');

var grammarText = '';
process.stdin.on('data', function (data) {
    grammarText += data;
});
process.stdin.on('end', function () {
    var parserSource = pegjs.buildParser(grammarText, { output: 'source' });
    process.stdout.write('module.exports = ');
    process.stdout.write(parserSource);
});
