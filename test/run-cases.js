var assert = require("assert");
var fs = require("fs");
var glob = require("glob");
var path = require("path");

import generate from "..";

// TODO: dedupe this framework with domenic/webidl-class-generator. Inputs: .markdown, .html

describe("Checking inputs against outputs", () => {
    glob.sync(path.resolve(__dirname, "cases/*.ecmarkdown")).forEach(ecmarkdownFilePath => {
        var ecmarkdownFileName = path.basename(ecmarkdownFilePath);
        var htmlFileName = path.basename(ecmarkdownFilePath, ".ecmarkdown") + ".html";
        var htmlFilePath = path.resolve(__dirname, "cases", htmlFileName);

        var ecmarkdownContents = fs.readFileSync(ecmarkdownFilePath, { encoding: "utf-8" }).trim();
        var htmlContents = fs.readFileSync(htmlFilePath, { encoding: "utf-8" }).trim();

        specify(ecmarkdownFileName, () => {
            assert.strictEqual(generate(ecmarkdownContents), htmlContents);
        });
    });
});
