{
    var actions = require('./actions');
    var state = actions.makeInitialState();
}

list = lines:(dents listItem "\n")+                                        { return actions.list(lines, state); }

dents = spaces:"  "*                                                       { return actions.dents(spaces, state); }

listItem = "0. " atoms:atom+                                               { return actions.listItem(atoms); }

atom = variable
     / code
     / value
     / normalText

variable = "_" first:variableSegment rest:$("_" variableSegment &"_")* "_" { return actions.variable(first, rest); }

variableSegment = $[^\n_ ]+

code = "`" content:$[^\n`]+ "`"                                            { return actions.code(content); }

value = "*" content:$[^\n* ]+ "*"                                          { return actions.value(content); }

normalText = $[^\n]
