describe('Virtual setTimeout', function () {
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
    { name: 'With a function', init: () => (window.timeout = () => setTimeout(()=>{})) },
    { name: 'With a function and timeout', init: () => (window.timeout = () => setTimeout(()=>{}, 10)) },
    { name: 'With a function, timeout, and argument', init: () => (window.timeout = () => setTimeout(()=>{}, 10, 11)) },
    { name: 'With a string', init: () => (window.timeout = () => setTimeout('\'\'')) },
    { name: 'With a string and timeout', init: () => (window.timeout = () => setTimeout('\'\'', 10)) },
  ].forEach(function ({ name, init}) {
    describe(name, function () {
      beforeEach(async function () {
        await page.evaluate(init);
      });
      it('should return a positive integer id', async function () {
        expect(await page.evaluate(function () {
          return window.timeout(function () {});
        })).to.be.above(0).and.to.satisfy(Number.isInteger);
      });
    });
  });


  [
    {
      name: 'should be able to pass multiple arguments to a callback',
      init: () => {
        setTimeout(function (...args) {
          window.state = args.join(' ');
        }, 10, 'arg1', 'arg2', 'arg3', 'arg4');
      },
      timed: true,
      expected: 'arg1 arg2 arg3 arg4'
    },
    {
      name: 'with a timeout, should be able to be passed a string',
      init: () => {
        setTimeout('window.state = \'evaluated\';', 10);
      },
      timed: true,
      expected: 'evaluated'
    },
    {
      name: 'without a timeout, should be able to be passed a string',
      init: () => {
        setTimeout('window.state = \'evaluated\';');
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
        it('and not run it before its timeout', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(5);
            return window.state;
          })).to.equal('not ran');
        });
      }
      it('and run it after its timeout', async function () {
        expect(await page.evaluate(async function () {
          await timeweb.goTo(20);
          return window.state;
        })).to.equal(expected);
      });
    });
  });

  describe('Multiple timeouts', function () {
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
              setTimeout(function () {
                window.state.push(time.toString());
              }, time);
            });
          }, { times });
        });
        it('should be able to process multiple timeouts seperately', async function () {
          expect(await page.evaluate(async function () {
            for (let i = 0; i < sortedTimes.length; i++) {
              await timeweb.goTo(sortedTimes[i] + 0.5);
            }
            return window.state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        it('should not run multiple timeouts before their times', async function () {
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
        it('should be able to process multiple timeouts in one goTo', async function () {
          expect(await page.evaluate(async function () {
            await timeweb.goTo(sortedTimes[sortedTimes.length - 1] + 0.5);
            return window.state.join(' ');
          })).to.equal(sortedTimes.map(t => t.toString()).join(' '));
        });
        it('should not run multiple timeouts before their times in one goTo', async function () {
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

  describe('Chained timeouts', function () {
    beforeEach(async function () {
      await page.evaluate(function () {
        window.state = 0;
        window.run = function () {
          window.state++;
          setTimeout(window.run, 10);
        };
        setTimeout(window.run, 10);
      });
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