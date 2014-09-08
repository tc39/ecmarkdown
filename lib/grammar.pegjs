start = items:(listItem "\n")+ lastItem:listItem? {
    var result = '<ol>\n';
    for (var i = 0; i < items.length; ++i) {
        result += items[i][0] + items[i][1];
    }
    return result + lastItem + '\n</ol>';
}

listItem = "0. " text:listItemText {
    return '  <li>' + text + '</li>';
}

listItemText = chars1:[^\n_]* variable:variable? chars2:[^\n]* {
    return chars1.join('') + (variable !== null ? variable : '') + chars2.join('');
}

variable = "_" initialSegment:variableSegment otherSegments:$("_" variableSegment)* "_" {
    return '<var>' + initialSegment + otherSegments + '</var>';
}

variableSegment = chars:[^\n_ ]+ {
    return chars.join('');
}
