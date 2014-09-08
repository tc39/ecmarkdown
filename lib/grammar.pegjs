{
    function ignoreNull(v) {
        return v !== null ? v : '';
    }
}

start = items:(listItem "\n")+ lastItem:listItem? {
    var result = '<ol>\n';
    for (var i = 0; i < items.length; ++i) {
        result += items[i][0] + items[i][1]; // this feels awkward; anything better?
    }
    return result + lastItem + '\n</ol>';
}

listItem = "0. " content:atom+ {
    return '  <li>' + content.join('') + '</li>';
}

atom = variable
     / code
     / normalText

normalText = $[^\n]

variable = "_" initialSegment:variableSegment otherSegments:$("_" variableSegment)* "_" {
    return '<var>' + initialSegment + otherSegments + '</var>';
}

variableSegment = $[^\n_ ]+

code = "`" segment:codeSegment "`" {
    return '<code>' + segment + '</code>';
}

codeSegment = $[^\n`]+
