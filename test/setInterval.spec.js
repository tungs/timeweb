describe('Virtual setInterval', function () {
  var page;
  beforeEach(async function () {
    page = await newPage('basic.html');
  });
  afterEach(async function () {
    return page.close();
  });

  // TODO tests:
  // check whether delay is converted to a signed 32-bit integer

  [
    { name: 'With a function', init: () => (window.interval = () => setInterval(()=>{})) },
    { name: 'With a function and interval', init: () => (window.interval = () => setInterval(()=>{}, 10)) },
    { name: 'With a function, interval, and argument', init: () => (window.interval = () => setInterval(()=>{}, 10, 11)) },
    { name: 'With a string', init: () => (window.interval = () => setInterval('\'\'')) },
    { name: 'With a string and interval', init: () => (window.interval = () => setInterval('\'\'', 10)) },
  ].forEach(function ({ name, init}) {
    describe(name, function () {
      beforeEach(async function () {
        await page.evaluate(init);
      });
      it('should return a positive integer id', async function () {
        expect(await page.evaluate(function () {
          return window.interval(function () {});
        })).to.be.above(0).and.to.satisfy(Number.isInteger);
      });
    });
  });


  [
    {
      name: 'should be able to pass multiple arguments to a callback',
      init: () => {
        setInterval(function (...args) {
          window.state = args.join(' ');
        }, 10, 'arg1', 'arg2', 'arg3', 'arg4');
      },
      timed: true,
      expected: 'arg1 arg2 arg3 arg4'
    },
    {
      name: 'with an interval, should be able to be passed a string',
      init: () => {
        setInterval('window.state = \'evaluated\';', 10);
      },
      timed: true,
      expected: 'evaluated'
    },
    {
      name: 'without an interval, should be able to be passed a string',
      init: () => {
        setInterval('window.state = \'evaluated\';');
      },
      timed: false,
      expected: 'evaluated'
    }
  ].forEach(function ({ name, init, timed, expected }) {
    describe(name, function () {
      beforeEach(async function () {
        await page.evaluate(function () {
          window.state = 'not ran';
        });
        await page.evaluate(init);
      });
      it('and not run it before a goTo', async function () {
        expect(await page.evaluate(function () {
          return window.state;
        })).to.equal('not ran');
      });
      if (timed) {
        it('and not run it before its interval', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(5);
            return window.state;
          })).to.equal('not ran');
        });
      }
      it('and run it after its interval', async function () {
        expect(await page.evaluate(async function () {
          await timeweb.goTo(20);
          return window.state;
        })).to.equal(expected);
      });
    });
  });

  describe('Callbacks over multiple intervals', function () {
    [
      {
        name: 'with a function',
        init() {
          window.state = 0;
          setInterval(function () {
            window.state++;
          }, 10);
        }
      },
      {
        name: 'with a string',
        init() {
          window.state = 0;
          setInterval('window.state++', 10);
        }
      },
    ].forEach(function ({ name, init }) {
      describe(name, function () {
        beforeEach(async function () {
          await page.evaluate(init);
        });
        it('should be called with sequential goTos', async function () {
          expect(await page.evaluate(async function () {
            var i;
            for (i = 0; i < 5; i++) {
              await timeweb.goTo(i * 10 + 0.5);
              if (window.state !== i) {
                return 'Expected: ' + i + ' Got: ' + window.state;
              }
            }
            return window.state;
          })).to.equal(4);
        });
        it('should be called with one goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(40.5);
            return window.state;
          })).to.equal(4);
        });
      });
    });
  });

  describe('Multiple intervals', function () {
    var unsortedTimes = [
      10, 60, 20, 40, 80, 30
    ];
    var sortedTimes = unsortedTimes.sort((a, b) => a - b);
    beforeEach(async function () {
      await page.evaluate(function ({ unsortedTimes, sortedTimes }) {
        window.state = [];
        window.unsortedTimes = unsortedTimes;
        window.sortedTimes = sortedTimes;
      }, { unsortedTimes, sortedTimes });
    });
    [
      { name: 'with sequential times', times: sortedTimes },
      { name: 'with nonsequential times', times: unsortedTimes }
    ].forEach(function ({ name, times }) {
      describe(name, function () {
        beforeEach(async function () {
          await page.evaluate(function ({ times }) {
            times.forEach(function (time) {
              let intervalRan = false;
              setInterval(function () {
                if (!intervalRan) {
                  window.state.push(time.toString());                  
                  intervalRan = true;
                }
              }, time);
            });
          }, { times });
        });
        it('should be able to process multiple intervals seperately', async function () {
          expect(await page.evaluate(async function () {
            for (let i = 0; i < sortedTimes.length; i++) {
              await timeweb.goTo(sortedTimes[i] + 0.5);
            }
            return window.state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        it('should not run multiple intervals before their times', async function () {
          expect(await page.evaluate(async function () {
            for (let i = 0; i < sortedTimes.length; i++) {
              await timeweb.goTo(sortedTimes[i] + 0.5);
              var expected = sortedTimes.slice(0, i + 1).join(' ');
              if (window.state.join(' ') !== expected) {
                return 'Expected: ' + expected + ' Got: ' + window.state.join(' ');
              }
            }
            return window.state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        var midTime = sortedTimes[Math.ceil((sortedTimes.length)/2)];
        it('should be able to process multiple intervals in one goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(sortedTimes[sortedTimes.length - 1] + 0.5);
            return window.state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        it('should not run multiple intervals before their times in one goTo', async function () {
          expect(await page.evaluate(async function ({ time }) {
            await timeweb.goTo(time);
            return window.state.join(' ');
          }, { time: midTime + 0.5 })).to.equal(
            sortedTimes
              .filter(t => (t <= midTime))
              .map(t => t.toString())
              .join(' ')
          );
        });
      });
    });
  });


});