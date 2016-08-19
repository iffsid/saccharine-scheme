// -*- mode: js; fill-column: 79; -*-

// basic datatype name restriction
macro bdata {
  rule { list }
  rule { vector }
}

macro letFamily {
  rule { let }
  // * replaced by $$
  rule { let$$ }
  rule { letrec }
}

macro webchurchInfer {
  rule { mh_query }
  rule { hmc_query }
  rule { enumeration_query }
  rule { rejection_query }
}

/*
  Needswork:
  1. plus, minus, mult, div, and, or, not, nor, xnor, lt, gt, leq, geq, eq, equal
     need to act on any number of arguments and be provided as a compatibility layer
     distinguish the fn names, maybe as __plus__ ?
  2. Fixup quote, unquote, and unquote splicing
  3. Do keyword checking on the scheme backend
 */

macro sexp {
  case {_ eval} => {return #{_ssc_eval}}
  case {_ ()} => {return #{[]}}
  // booleans
  case {_ #t} => {return #{true}}
  case {_ #f} => {return #{false}}
  // operators
  case {_ +} => {return #{plus}}
  case {_ -} => {return #{minus}}
  case {_ *} => {return #{mul}}
  // `\` is handled by readtable and is renamed to `div`
  case {_ =} => {return #{eq}}
  case {_ >} => {return #{gt}}
  case {_ <} => {return #{lt}}
  case {_ >=} => {return #{geq}}
  case {_ <=} => {return #{leq}}
  // control flow -- case not iplemented because of keyword
  case {_ else} => {return #{true}}
  case {_ otherwise} => {return #{true}}
  case {_ (if $cond:invokeRec(sexp) $te ...)} => {
    if (#{$te ...}.length !== 2) {
      throwSyntaxError("saccharine-scheme",
  		       "'if' takes exactly one 'then' and one 'else' clause.",
                       #{$te ...})
    }
    letstx $then = #{$te ...}.slice(0,1);
    letstx $else = #{$te ...}.slice(1,2);
    return #{
      ($cond ? sexp $then : sexp $else)
    }
  }
  // case {_ (if $cond:invokeRec(sexp) $then:invokeRec(sexp) $else:invokeRec(sexp))} => {
  //   return #{($cond ? $then : $else)}
  // }
  case {_ (cond $(($cond:invokeRec(sexp) $body ...))  ... )} => {
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
      (function () {
	$(var $id = $val) (;) ...
  	scheme {$body ...}
      }())
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
  // webchurch inference restructuring
  case {_ ($wc:webchurchInfer $args ...)} => {
    var _len = #{$args ...}.length;
    // everything until the first `define` is params
    var isDefineNode = function(o) {
      return (o.token.type === 11 &&               // delimiter
	      o.token.inner[0].token.type === 3 && // identifier
	      o.token.inner[0].token.value === "define")
    }
    var _params = [], i = 0;
    while(i < _len) {
      var o = #{$args ...}[i++];
      if (!isDefineNode(o)) {_params.push(o);} else {i += _len}
    };
    var _defs = #{$args ...}.slice(_params.length, -2);
    if (_defs.length === 0) {
      throwSyntaxError("saccharine-scheme",
  		       "Queries must have at least one definition.",
                       #{$args ...})
    }
    if (_params.length === 0) {
      _params.push(makeIdent(undefined, #{here}));
    }
    letstx $params ... = _params;
    letstx $defs ... = _defs
    letstx $query = [#{$args ...}[_len - 2]];
    letstx $conditional = [#{$args ...}[_len - 1]]
    return #{
      $wc((function(){scheme {$defs ... (condition $conditional) $query}}), sexp $params (,) ...)
    }
  }
  // quote
  // if literal, pass through
  case {_ (quote ())} => {return #{[]}}
  case {_ (quote $e:lit)} => {return #{$e}}
  // if sexp, map quote through it -- this doesn't error if quotes are nested
  case {_ (quote ($e ...))} => {
    // console.log(#{$e ...})
    return #{[$(sexp (quote $e)) (,) ...]}
  }
  // otherwise, stringify
  case {_ (quote $e)} => {return [makeValue(unwrapSyntax(#{$e}), #{here})]}
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
