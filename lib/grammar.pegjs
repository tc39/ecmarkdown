{
    var actions = require('./actions');
    var state = actions.makeInitialState();
}

// Entry points

list = lines:(dents $[0-9]+ ". " listItem "\n")+                           { return actions.list(lines, state); }

paragraph = atoms:atom+                                                    { return actions.paragraph(atoms); }

// Supporting productions

dents = spaces:"  "*                                                       { return actions.dents(spaces, state); }

listItem = atoms:atom+                                                     { return actions.listItem(atoms); }

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
