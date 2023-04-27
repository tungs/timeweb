# timeweb
**timeweb** is a JavaScript library that overwrites native time handling in a web page, creating a virtual timeline independent of real time.

## <a name="scope" href="#scope">#</a> Scope
**timeweb** overwrites these time-related features in web pages:
* [`performance.now()`][performance.now], [`Date.now()`][Date.now], [`new Date()`][new Date], and [`Date()`][Date-function]
* [`requestAnimationFrame()`][requestAnimationFrame] and [`cancelAnimationFrame()`][cancelAnimationFrame]
* [`setTimeout()`][setTimeout], [`setInterval()`][setInterval], [`clearTimeout()`][clearTimeout], and [`clearInterval()`][clearInterval]
* [CSS Transitions][] and [Animations][CSS Animations]
* [SVG Animations][SVG Animation]
* [Videos][video element]
* [*element*`.animate()`][Element.prototype.animate]
* [`new CustomEvent().timeStamp`][CustomEvent.timeStamp]

## <a name="limitations" href="#limitations">#</a> **timeweb** Limitations
These time-related features are known not to work:
* iframes with time-related content
* event.timeStamp
* [Audio analyser nodes](https://developer.mozilla.org/en-US/docs/Web/HTML/API/AnalyserNode)

Additionally **timeweb** is limited by what can be overwritten in browser by JavaScript and not everything may work as intended. Please [file an issue](https://github.com/tungs/timeweb/issues) if you think something should work.

## Read Me Contents
* [Use](#use)
* [How it works](#how-it-works)

## <a name="use" href="#use">#</a> Script Use
* Copy `dist/timeweb.js` to the desired directory.
* Include it **before** any time-handling JavaScript in the HTML file:
  `<script src="path/to/timeweb.js"></script>`
* Use `timeweb.goTo` to go to a virtual time, in milliseconds. For instance, `timeweb.goTo(5000);` goes to 5 seconds on the virtual time line. It can only go forward. Note that currently `requestAnimationFrame` is called once per `timeweb.goTo` regardless of the previous virtual time.

## <a name="how-it-works" href="#how-it-works">#</a> How it works
For JavaScript functions, **timeweb** overwrites a page's native time-handling functions and objects ([`new Date()`][new Date], [`Date.now`][Date.now], [`performance.now`][performance.now], [`requestAnimationFrame`][requestAnimationFrame], [`setTimeout`][setTimeout], [`setInterval`][setInterval], [`cancelAnimationFrame`][cancelAnimationFrame], [`clearTimeout`][clearTimeout], and [`clearInterval`][clearInterval]) to custom ones that use a virtual timeline, which can be stepped through programmatically.

For [videos][video element]/[SVGs][SVG Animation], **timeweb** detects when `video` and `svg` elements are created or added to the page by using a mutation observer and overwriting `document.createElement`. It pauses those elements and seeks when needed.

For animations available through the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)([CSS Transitions][], [CSS Animations][], and [*element*`.animate()`][Element.prototype.animate]), **timeweb** detects new animations through `transitionstart`, `animationrun` listeners, `document.getAnimations`, and overwriting `Element.prototype.animate`. It pauses the animations and seeks when needed.

This work was inspired by [a talk by Noah Veltman](https://github.com/veltman/d3-unconf), who described altering a document's [`Date.now`][Date.now] and [`performance.now`][performance.now] functions to refer to a virtual time and using `puppeteer` to change that virtual time and take snapshots.

[performance.now]: https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
[Date.now]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
[new Date]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date
[Date-function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#return_value
[requestAnimationFrame]: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
[cancelAnimationFrame]: https://developer.mozilla.org/en-US/docs/Web/API/window/cancelAnimationFrame
[setTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/window/setTimeout
[setInterval]: https://developer.mozilla.org/en-US/docs/Web/API/window/setInterval
[clearTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/window/clearTimeout
[clearInterval]: https://developer.mozilla.org/en-US/docs/Web/API/window/clearInterval
[CSS Transitions]: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions
[CSS Animations]: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations
[SVG Animation]:  https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animate
[video element]: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video
[Element.prototype.animate]: https://developer.mozilla.org/en-US/docs/Web/API/Element/animate
[CustomEvent.timeStamp]: https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp