'use strict';
var path = require('path');
var Bluebird = require('bluebird');
var baselineTester = Bluebird.promisify(require('baseline-tester'));
var ecmarkdown = require('..');

Bluebird.try(function () {
    return baselineTester(ecmarkdown.list, {
        casesDirectory: path.resolve(__dirname, 'list-cases'),
        inputExtension: 'ecmarkdown',
        outputExtension: 'html'
    });
})
.then(function () {
    return baselineTester(ecmarkdown.paragraph, {
        casesDirectory: path.resolve(__dirname, 'paragraph-cases'),
        inputExtension: 'ecmarkdown',
        outputExtension: 'html'
    });
})
.done();
