{
    var actions = require('./actions');
    var state = actions.makeInitialState();
}

// ## Entry points

list = lines:(listLine / comment)+                                         { return actions.list(lines, state); }

fragment = atoms:atom+                                                     { return actions.fragment(atoms); }

// ## Supporting productions

dents = spaces:indentSpaces                                                { return actions.dents(spaces, state); }

// The prelude here ensures we don't gobble up any dents unless we are definitely in a list line instead of a comment
listLine = &(indentSpaces number)
           dents:dents number:number ". " li:listItem "\n"                 { return actions.listLine(dents,
                                                                                                     number, li); }

listItem = atoms:atom+                                                     { return actions.listItem(atoms); }

comment = dents:dents "<!--" content:$(!"-->" .)* "-->" "\n"?              { return actions.comment(dents, content); }

atom = variable
     / code
     / string
     / value
     / specConstant
     / nonterminal
     / normalText

variable = "_" first:variableSegment rest:$("_" variableSegment &"_")* "_" { return actions.variable(first, rest); }

variableSegment = $[^\n_ ]+

code = "`" content:$[^\n`]+ "`"                                            { return actions.code(content); }

string = "\"" content:$[^\n"]+ "\""                                        { return actions.string(content); }

value = "*" content:$[^\n* ]+ "*"                                          { return actions.value(content); }

specConstant = "~" content:$[^\n~ ]+ "~"                                   { return actions.specConstant(content); }

nonterminal = "|" name:$[a-z]i+ params:("[" $[^\]]+ "]")? opt:"_opt"? "|"  { return actions.nonterminal(name,
                                                                                                        params, opt); }

normalText = $[^\n]

indentSpaces = "  "*

number = $[0-9]+
