// -*- mode: js2; fill-column: 79; -*-
var sweet = require("sweet.js")

var readtable = sweet.currentReadtable().extend({
  // negative numbers get wrapped up in sexps
  "-": function(ch, reader) {
    reader.readPunctuator();
    if (reader.source[reader.index].charCodeAt(0) != 32) {
      var num = reader.readNumericLiteral();
      return reader.makeDelimiter('()', [reader.makePunctuator('-'), num]);
    } else {
      return null;
    }
  },
  "/": function(ch, reader) {
    reader.readPunctuator();
    return reader.makeIdentifier('div');
  },
  "'": function(ch, reader) {
    reader.index++;
    var quoted = reader.readToken();
    var q = reader.makeIdentifier('quote');
    return reader.makeDelimiter('()', [q, quoted])
  }
})

module.exports = readtable;
