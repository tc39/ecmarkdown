'use strict';
const path = require('path');
const Bluebird = require('bluebird');
const baselineTester = Bluebird.promisify(require('baseline-tester'));
const ecmarkdown = require('..');

Bluebird.try(function () {
  return baselineTester(ecmarkdown.document, {
    casesDirectory: path.resolve(__dirname, 'list-cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html'
  });
})
.then(function () {
  return baselineTester(ecmarkdown.document, {
    casesDirectory: path.resolve(__dirname, 'paragraph-cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html'
  });
})
.then(function () {
  return baselineTester(ecmarkdown.fragment, {
    casesDirectory: path.resolve(__dirname, 'fragment-cases'),
    inputExtension: 'ecmarkdown',
    outputExtension: 'html'
  });
})
.done();
