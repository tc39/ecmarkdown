'use strict';
var path = require('path');
var baselineTester = require('baseline-tester');
var generate = require('..');

baselineTester(generate, {
    casesDirectory: path.resolve(__dirname, 'cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html'
});
