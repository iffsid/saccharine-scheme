// -*- mode: js2; fill-column: 79; -*-
var sweet = require("sweet.js")

var readtable = sweet.currentReadtable().extend({
  "/": function(ch, reader) {
    reader.readPunctuator();
    return reader.makeIdentifier('div');
  },
  "'": function(ch, reader) {
    reader.index++;
    return reader.makeIdentifier('quote');
  },
  // "-": function(ch, reader) {
  //   var src = reader.source;
  //   var ccode = function(i){return src[i].charCodeAt(0);};
  //   if (reader.isIdentifierPart(ccode(reader.index-1))) {
  //     var nxti = reader.index+1;
  //     reader.index--;
  //     while (reader.isIdentifierPart(ccode(reader.index))) {reader.index--}
  //     reader.index++;
  //     var pre = reader.readIdentifier();
  //     reader.index = nxti;
  //     var post = reader.isIdentifierPart(ccode(nxti)) ? reader.readIdentifier() : {value: ""};
  //     return reader.makeIdentifier(pre.value + "_" + post.value)
  //   } else {
  //     return null;
  //   }
  // }
})

module.exports = readtable;
