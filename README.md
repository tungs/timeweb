# timeweb
**timeweb** is a JavaScript library that overwrites the native time-handling JavaScript functions in a web page, creating a virtual timeline independent of real time.

## <a name="limitations" href="#limitations">#</a> **timeweb** Limitations
**timeweb** only overwrites JavaScript functions and rudimentary time-handling for video elements, so pages where changes occur via other means (e.g. through transitions/animations from CSS rules) will likely not render as intended.

## Read Me Contents
* [Use](#use)
* [How it works](#how-it-works)

## <a name="use" href="#use">#</a> Script Use
* Copy `dist/timeweb.js` to the desired directory.
* Include it **before** any time-handling JavaScript in the HTML file:
  `<script src="path/to/timeweb.js"></script>`
* Use `timeweb.goTo` to go to a virtual time, in milliseconds. For instance, `timeweb.goTo(5000);` goes to 5 seconds on the virtual time line. It can only go forward. Note that currently `requestAnimationFrame` is called once per `timeweb.goTo` regardless of the previous virtual time.

## <a name="how-it-works" href="#how-it-works">#</a> How it works
**timeweb** overwrites a page's native time-handling JavaScript functions and objects (`new Date()`, `Date.now`, `performance.now`, `requestAnimationFrame`, `setTimeout`, `setInterval`, `cancelAnimationFrame`, `cancelTimeout`, and `cancelInterval`) to custom ones that use a virtual timeline, which can be stepped through programmatically.

This work was inspired by [a talk by Noah Veltman](https://github.com/veltman/d3-unconf), who described altering a document's `Date.now` and `performance.now` functions to refer to a virtual time and using `puppeteer` to change that virtual time and take snapshots.