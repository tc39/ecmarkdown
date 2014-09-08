var fs = require("fs");
var path = require("path");
var pegjs = require("pegjs");

// TODO: don't generate the parser each time, duh.
var grammar = fs.readFileSync(path.resolve(__dirname, "grammar.pegjs"), { encoding: "utf8" });
var parser = pegjs.buildParser(grammar);

export default function translate(ecmkarkdown) {
    return parser.parse(ecmkarkdown);
}
