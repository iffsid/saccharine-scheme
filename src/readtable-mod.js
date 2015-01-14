// -*- mode: js2; fill-column: 79; -*-
var sweet = require("sweet.js")

var readtable = sweet.currentReadtable().extend({
  // "*": function(ch, reader) {
  //   // needswork: check if previous or next char was part of an identifier,
  //   // if so, transform current char to '_'. so *foo* -> _foo_
  //   reader.readPunctuator();
  //   return reader.makeIdentifier('mul');
  // },
  "/": function(ch, reader) {
    reader.readPunctuator();
    // reader.index++;
    return reader.makeIdentifier('div');
  }
})

module.exports = readtable;
