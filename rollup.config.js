export default [
  {
    input: 'src/browser.js',
    output: [
      {
        file: 'dist/timeweb.js',
        name: 'timeweb',
        format: 'umd'
      },
      {
        file: 'dist/timeweb.module.js',
        format: 'es'
      }
    ]
  }
];