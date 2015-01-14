// -*- mode: js; fill-column: 79; -*-

// note:
// - cannot mix rule and case macro defns
// - ES6 apparently will have splicing
//   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_operator
// - maybe use escape codes to fool esprima?
//   http://www.javascripter.net/faq/mathsymbols.htm

// todos:
// + comparators are implemented only as binary relations, not sequential
// + neither normal 'fn' calls nor tokens can be define/lambda/let/if/cond/when/unless
// + `apply` not implemented for operators or exprs, just named fns
// + hyphenated names are being read as separate entities -- readtable edits?
//   - related: `-` --> `_` as separators
// + object props/methods as fn calls  -- regex - how?
// + division confused with regex      -- issue raised
// + quote | unquote | unquote-splice  -- issue raised about `'`

// implementation notes:
// * `return` implemented by modifying `scheme` macro to insert return for last
//   statement, except for when the last statement must involve its own return
//   statement, evaluated in the function body -- returning functions is still
//   valid because they are not evaluated in the function body.
// * `begin` implemented as `comma sequence`
// * `dotted args` implemented by creating vars corresponding to the named args
//    by indexing into the `arguments` object, and assigning the rest of the
//    object to the list after the dot

macro sexp {
  // booleans
  case {_ #t} => {return #{true}}
  case {_ #f} => {return #{false}}
  // operators
  case {_ (+ $e:invokeRec(sexp) ...)} => {return #{($e (+) ...)}}
  case {_ (- $e:invokeRec(sexp) ...)} => {return #{($e (-) ...)}}
  case {_ (* $e:invokeRec(sexp) ...)} => {return #{($e (*) ...)}}
  // case {_ (/ $e:invokeRec(sexp) ...)} => {return #{($e (/) ...)}}
  case {_ (and $e:invokeRec(sexp) ...)} => {return #{($e (&&) ...)}}
  case {_ (or $e:invokeRec(sexp) ...)} => {return #{($e (||) ...)}}
  case {_ (not $e:invokeRec(sexp))} => {return #{!($e)}}
  // comparators
  case {_ (= $e1:invokeRec(sexp) $e2:invokeRec(sexp))} => {return #{($e1 === $e2)}}
  case {_ (> $e1:invokeRec(sexp) $e2:invokeRec(sexp))} => {return #{($e1 > $e2)}}
  case {_ (< $e1:invokeRec(sexp) $e2:invokeRec(sexp))} => {return #{($e1 < $e2)}}
  case {_ (>= $e1:invokeRec(sexp) $e2:invokeRec(sexp))} => {return #{($e1 >= $e2)}}
  case {_ (<= $e1:invokeRec(sexp) $e2:invokeRec(sexp))} => {return #{($e1 <= $e2)}}
  // // control flow
  case {_ (if $cond:invokeRec(sexp) $then:invokeRec(sexp) $else:invokeRec(sexp))} => {
    return #{($cond ? $then : $else)}
  }
  case {_ (cond ( ($($cond:invokeRec(sexp) $body ...))  ... ))} => {
    return #{$(if ($cond) {scheme {$body ...}}) (else) ... ;}
  }
  case {_ (when $cond:invokeRec(sexp) $body ...)} => {
    return #{if ($cond) {scheme {$body ...}}}
  }
  case {_ (unless $cond:invokeRec(sexp) $body ...)} => {
    return #{if (!($cond)) {scheme {$body ...}}}
  }
  // let family -- might be pointless to deal with early/late binding
  // case {_ (let $name (($($id $val:invokeRec(sexp))) ...) $body ...)} => {
  //   return #{
  //     var $name = function($id (,) ...) {
  // 	scheme {$body ...}
  //     };
  //     $name($val (,) ...)
  //   }
  // }
  // case {_ (let (($($id $val:invokeRec(sexp))) ...) $body ...)} => {
  //   return #{$(var $id = $val) (;) ...
  // 	     scheme {$body ...} ;}
  // }
  case {_ (let $name (($($id $val:invokeRec(sexp))) ...) $body ...)} => {
    return #{
      function() {
  	var $name = function($id (,) ...) {
  	  scheme {$body ...}
  	};
  	$name($val (,) ...)
      }()
    }
  }
  case {_ (let (($($id $val:invokeRec(sexp))) ...) $body ...)} => {
    letstx $dname = [makeIdent("_dummy", #{here})];
    return #{
      function $dname ($id (,) ...) {
	  scheme {$body ...}
      }($val (,) ...) ;
    }
  }
  case {_ (begin $body ...)} => {return #{($(sexp $body) (,) ...)}}
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
  // lambda application - why do I need special rule for this to work?
  case {_ ((lambda ($p ...) $body ...) $args ...)} => {
    return #{function ($p (,) ...) {scheme {$body ...}}($(sexp $args) (,) ...)}
  }
  // scheme list/vector --> js array
  case {_ (list $e:invokeRec(sexp) ...)} => {return #{[$e (,) ...]}}
  case {_ (apply $fn:ident $args ...)} => {
    return #{$fn.apply(this,[$(sexp $args) (,) ...])}
  }
  // fn application
  case {_ ($fn $args ...)} => {
    return #{$fn($(sexp $args) (,) ...)}
  }
  // comments
  // case {_ ; $rest ...} => {return ${'%u2044' $rest ...}}
  // pass everything else through as is
  case {_ $p} => {return #{$p}}
}

macro scheme {
  case {_ { $stmt ... } } => {
    var _len = makeValue(#{$stmt ...}.length, #{here}).token.value;
    var _r = #{$stmt ...}[_len-1];
    if (_r.token.hasOwnProperty('inner')
	&& _r.token.inner[0].token.value == 'if'
	&& _r.token.inner[0].token.value == 'cond'
	&& _r.token.inner[0].token.value == 'let') {
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

// // tests
// sexp (list 1 2 3 4)
// sexp (quote (1 2 3 4))
// sexp (list (add 3 4) 2 3 4)
// sexp (+ 1 2 3 4)
// sexp (* 1 2 3 4)
// sexp (and foo bar)
// sexp (not quux)
sexp (let ((a (adds p q)) (b 20)) (mult a b) foo)
// sexp (let ((a (lambda (p) (first p))) (b 20)) (mult a b) foo)
// sexp (let loop ((a 10) (b 2)) (if (> a 15) a (loop (* a b) 10)))
// sexp (foo (ab))
// sexp (foo (a b))
// sexp (foo (list 1 2 3 4 5))
// sexp (if (< a 10) (foo a) (bar b))
// sexp (if (< a 10) (foo a) (if (> b 20) (bar b) (quux c)))
// sexp (if (< a 10) (begin quux (foo a)) (if (> b 20) (bar b) (quux c)))
// sexp (when (< a 10) (baz 100) (foo 1))
// sexp (unless (< a 10) (baz 100) (foo 1))
// sexp (cond (((< a 0) (foo 10) (quux 80))
// 	    ((< a 20) (bar 20))
// 	    (#t (panic "something broke!"))))

// sexp (map (lambda (e) (pow e e)) (list 1 2 3 4))
// sexp (define glbl 100)
// sexp (define (foo a b)
//       bar
//       (cond (((ab a 0) (foo 10) (quux 80))
// 	    ((cd a 20) (bar 20))
// 	    (else1 (panic "something broke!")))))
// sexp (define cc (lambda args (sum args)))
// sexp (define bb ((lambda (a b) (+ a b)) 3 4))
// sexp (define aa (lambda (p q) (mult p q)))
// sexp (define ll (lambda (p . rest) (bar (mult p q) rest)))
// sexp (define (aa p q) (mult p q))
// sexp (define (bb p q) (lambda (e) (mult p q e)))
// sexp (define (pp p q . args) (foob (mult p q) args))
// sexp (apply foo foob (mult p q) args)

// // example miniprograms
// schemeG {
//   (define (sqr e) (* e e))
//   (define (euDist a b)
//    (sqrt
//     (+
//      (sqr (- (first a) (first b)))
//      (sqr (- (second a) (second b))))))
//   (div (sum (map2 euDist ar1 ar2)) (length ar1))
// }

// schemeG {
//   (define oldL (list (list 1 2) (list 3 4) (list 5 6)))
//   (define (costFn newL)
//    (let ((sqr (lambda (e) (* e e)))
// 	 (euDist
// 	  (lambda (a b)
// 	   (sqrt (+ (sqr (- (x a) (x b))) (sqr (- (y a) (y b))))))))
//     (div (sum (map2 euDist newL oldL)) (length oldL))))
//   (costFn (list (list 1 2) (list 3 4) (list 5 5)))
// }
