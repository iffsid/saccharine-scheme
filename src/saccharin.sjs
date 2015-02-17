// -*- mode: js; fill-column: 79; -*-

// basic datatype name restriction
macro bdata {
  rule { list }
  rule { vector }
}

macro letFamily {
  rule { let }
  // * needs to be contextually expanded to a js-safe identifier char
  // rule { let* }
  rule { letrec }
}

/*
  Needswork:
  1. plus, minus, mult, div, and, or, not, nor, xnor, lt, gt, leq, geq, eq, equal
     need to act on any number of arguments
     distinguish the fn names, maybe as __plus__ ?
 */

macro sexp {
  // booleans
  case {_ #t} => {return #{true}}
  case {_ #f} => {return #{false}}
  // operators
  case {_ (+ $e:invokeRec(sexp) ...)} => {return #{plus($e (,) ...)}}
  case {_ (- $e:invokeRec(sexp) ...)} => {return #{minus($e (,) ...)}}
  case {_ (* $e:invokeRec(sexp) ...)} => {return #{mul($e (,) ...)}}
  // `\` is handled by readtable and is renamed to `div`
  case {_ (div $e:invokeRec(sexp) ...)} => {return #{div($e (,) ...)}}
  case {_ (= $e:invokeRec(sexp) ...)} => {return #{eq($e (,) ...)}}
  case {_ (> $e:invokeRec(sexp) ...)} => {return #{gt($e (,) ...)}}
  case {_ (< $e:invokeRec(sexp) ...)} => {return #{lt($e (,) ...)}}
  case {_ (>= $e:invokeRec(sexp) ...)} => {return #{geq($e (,) ...)}}
  case {_ (<= $e:invokeRec(sexp) ...)} => {return #{leq($e (,) ...)}}
  // // control flow
  case {_ (if $cond:invokeRec(sexp) $te ...)} => {
    if (#{$te ...}.length !== 2) {
      throwSyntaxError("saccharine-scheme",
		       "'if' takes exactly one 'then' and one 'else' clause.",
                       #{$te ...})
    }
    letstx $then ... = #{$te ...}.slice(0,1);
    letstx $else ... = #{$te ...}.slice(1,2);
    return #{
      if ($cond) { scheme {$then ...} } else { scheme {$else ...} }
    }
  }
  case {_ (cond ( ($($cond:invokeRec(sexp) $body ...))  ... ))} => {
    return #{$(if ($cond) {scheme {$body ...}}) (else) ...}
  }
  case {_ (when $cond:invokeRec(sexp) $body ...)} => {
    return #{if ($cond) {scheme {$body ...}}}
  }
  case {_ (unless $cond:invokeRec(sexp) $body ...)} => {
    return #{if (!($cond)) {scheme {$body ...}}}
  }
  // let family -- early/late binding how?
  case {_ (let $name (($($id $val:invokeRec(sexp))) ...) $body ...)} => {
    return #{
      function ($id (,) ...) {
	var $name = function($id (,) ...) {
  	  scheme {$body ...}
	};
	return $name($val (,) ...)
      }()
    }
  }
  case {_ ($lf:letFamily (($($id $val:invokeRec(sexp))) ...) $body ...)} => {
    return #{
      (function ($id (,) ...) {
  	scheme {$body ...}
      }($val (,) ...))
    }
  }
  case {_ (begin $body ...)} => {
    return #{
      (function () {
	scheme {$body ...}
      }())
    }
  }
  // canonical define -- with lambda
  case {_ (define $name:ident $body)} => {
    return #{var $name = sexp $body ;}
  }
  // define dotted args
  case {_ (define ($name $args ... . $rest) $body ...)} => {
    var _len = makeValue(#{$args ...}.length, #{here});
    var _l = [], i = 0; while(i<_len.token.value) _l.push(i++);
    letstx $ids ... = _l.map(function(e){return makeValue(e,#{here})});
    letstx $len = [_len];
    return #{
      var $name = function() {
	$(var $args = arguments[$ids]) (;) ...
	  var $rest = [].slice.call(arguments).slice($len);
	scheme {$body ...}
      }
    }
  }
  // define non-doted args
  case {_ (define ($name $args ...) $body ...)} => {
    return #{var $name = function ($args (,) ...) {scheme {$body ...}} ;}
  }
  // lambda with list args
  case {_ (lambda $p:ident $body ...)} => {
    return #{function () {var $p = [].slice.call(arguments); scheme {$body ...}}}
  }
  // lambda with dotted args
  case {_ (lambda ($args ... . $rest) $body ...)} => {
    var _len = makeValue(#{$args ...}.length, #{here});
    var _l = [], i = 0; while(i<_len.token.value) _l.push(i++);
    letstx $ids ... = _l.map(function(e){return makeValue(e,#{here})});
    letstx $len = [_len];
    return #{
      function() {
	$(var $args = arguments[$ids]) (;) ...
	  var $rest = [].slice.call(arguments).slice($len);
	scheme {$body ...}
      }
    }
  }
  // canonical lambda
  case {_ (lambda ($p ...) $body ...)} => {
    return #{function ($p (,) ...) {scheme {$body ...}}}
  }
  // scheme list/vector --> js array
  case {_ ($bd:bdata $e:invokeRec(sexp) ...)} => {return #{[$e (,) ...]}}
  // quote
  // if identifier, stringify
  case {_ quote $e:ident} => {
    return [makeValue(unwrapSyntax(#{$e}), #{here})]
  }
  // if literal, pass through
  case {_ quote $e:lit} => {return #{$e}}
  // if sexp, map quote through it -- this doesn't error of quotes are nested
  case {_ quote($e ...)} => {
    return #{[$(sexp quote $e) (,) ...]}
  }
  // fn application
  // needswork: invalidate keywords
  case {_ ($fn $args ...)} => {
    return #{($(sexp $fn)($(sexp $args) (,) ...))}
  }
  // comments
  // case {_ ; $rest ...} => {return ${'%u2044' $rest ...}}
  // pass everything else through as is
  case {_ $p} => {return #{$p}}
}

macro scheme {
  case {_ { $stmt ... } } => {
    var _len = #{$stmt ...}.length;
    var _r = #{$stmt ...}[_len-1];
    if (_r.token.hasOwnProperty('inner')
	&& (_r.token.inner[0].token.value == 'if'
	    || _r.token.inner[0].token.value == 'cond'
	    || _r.token.inner[0].token.value == 'let')) {
      return #{
	$(sexp $stmt) (;) ...
      }
    } else {
      letstx $nub ... = _len > 1 ? #{$stmt ...}.slice(0,_len-1) : [];
      letstx $r = [_r];
      return #{
	$(sexp $nub) (;) ...
	return sexp $r
	} ;
    }
  }
}

macro schemeG {
  rule { {$stmt:invokeRec(sexp) ...} } => {
    $stmt ...
  }
}

export sexp;
export scheme;
export schemeG;
