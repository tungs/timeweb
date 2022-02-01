describe('timeweb should load', function () {
  var page;
  before(async function () {
    page = await newPage('basic.html');
  });
  after(async function () {
    return page.close();
  });
  it('as a global object', async function () {
    expect(await page.evaluate(
      () => typeof timeweb
    )).to.equal('object');
  });
  it('has a goTo function', async function () {
    expect(await page.evaluate(
      () => timeweb.goTo instanceof Function
    )).to.be.true;
  });
  it('has an on function', async function () {
    expect(await page.evaluate(
      () => timeweb.on instanceof Function
    )).to.be.true;
  });
  it('has an off function', async function () {
    expect(await page.evaluate(
      () => timeweb.off instanceof Function
    )).to.be.true;
  });
});
