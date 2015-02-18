// -*- mode: js; fill-column: 79; -*-

// // tests
// sexp -2
// sexp (list 1 2 3 4)
// sexp 'a
// sexp '-2
// sexp '100
// sexp '(1 2 3 4)
// sexp '(1 2 3 foob)
// sexp (foo-bar 10)
// sexp (list (add 3 4) 2 3 4)
// sexp (+ 1 2)
// sexp (+ 1 2 3 4)
// sexp (- 1 2 3 4)
// sexp (* 1 2 3 4)
// sexp (/ 1 2 3 4)
// sexp (and foo bar)
// sexp (define boo (not quux))
// sexp (define glbl 100)
// sexp (map (lambda (e) (pow e e)) (list 1 2 3 4))

// sexp (define l1 (let ((a (adds p q)) (b 20)) (mult a b) foo))
// sexp (define l2 (let ((a (lambda (p) (first p))) (b 20)) (a b) foo))
// sexp (define l3 (let loop ((a 10) (b 2)) (if (> a 15) a (loop (* a b) 10))))

// sexp (foo (ab))
// sexp (foo (a b))
// sexp (foo (list 1 2 3 4 5))

// sexp (if (< a 10) 1 -2)
// sexp (if (< a 10) (foo a) (bar b))
// sexp (if (< a 10) (foo a) (if (> b 20) (bar b) (quux c)))
// sexp (if (< a 10) (begin quux (foo a)) (if (> b 20) (bar b) (quux c)))
// sexp (define a (if (flip) 1 0))
// sexp (when (< a 10) (baz 100) (foo 1))
// sexp (unless (< a 10) (baz 100) (foo 1))
// sexp (cond ((< a 0) (foo 10) (quux 80))
//            ((< a 20) (bar 20))
//            (#t (panic "something broke!")))
// sexp (cond (#t 1))

// sexp (define (foo a b)
//       bar
//       (cond (((ab a 0) (foo 10) (quux 80))
// 	    ((cd a 20) (bar 20))
// 	    (else1 (panic "something broke!")))))
// sexp (define cc (lambda args (sum args)))
// sexp (define aa (lambda (p q) (mult p q)))
// sexp (define ll (lambda (p q . rest) (bar (mult p q) rest)))

// sexp (define (aa p q) (mult p q))
// sexp (define (bb p q) (lambda (e) (mult p q e)))
// sexp (define (pp p q . args) (foob (mult p q) args))

// sexp (define ap1 ((lambda (a b) (+ a b)) 3 4))
// sexp (define ap2 ((lambda args (sum args)) 3 4))
// sexp (define ap3 ((lambda (a b . rest) (sum (cons (+ a b) rest))) 3 4 5 6))

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
