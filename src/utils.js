export function isThenable(o) {
  return o && (o.then instanceof Function);
}

/* Quasi-Async Functions */
// These functions are asynchronous only if necessary
// They might not be necessary if awaiting resolved promises
// immediately continues the function, though according to
// https://stackoverflow.com/q/64367903 awaiting resolved promises
// isn't necessarily synchronous.
// These Quasi-Async functions are an alternative to the async model.
// Promises can be returned, but only if necessary (maybe-promise objects)
// They can be chained with themselves and each other, where they take
// arguments that are maybe-promises and functions that can return maybe-promises.
// An additional potential optimization could be
// to use a promise that calls `then` immediately after resolving
// These quasi-async functions are implemented instead of async/await because:
// 1. Some functions need to run immediately afterwards
//   (like copying WebGL canvas data after painting)
// 2. Potential performance (though this should be benchmarked, since this
//   impementation adds overhead with additional functions)
// 3. (To a much lesser extent) Compatibility for browsers without async/await
export function quasiAsyncThen(a, fnB) {
  if (isThenable(a)) {
    return a.then(fnB);
  } else {
    return fnB();
  }
}

// if the loop body returns a promise, wait until
// that promise resolves before continuing the loop
export function quasiAsyncTimesLoop(iterations, body, i) {
  i = i || 0;
  while (i < iterations) {
    let r = body(i++);
    if (isThenable(r)) {
      return r.then(function () {
        quasiAsyncTimesLoop(iterations, body, i);
      });
    }
  }
}

export function quasiAsyncWhileLoop(condition, body) {
  while (condition()) {
    let r = body();
    if (isThenable(r)) {
      return r.then(function () {
        quasiAsyncWhileLoop(condition, body);
      });
    }
  }
}


export function quasiAsyncIterateArray(array, body) {
  var i = 0;
  return quasiAsyncWhileLoop(
    function () {
      return i < array.length;
    },
    function () {
      return body(array[i++]);
    }
  );
}