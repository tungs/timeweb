import json from '@rollup/plugin-json';

export default [
  {
    input: 'src/index.js',
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
    ],
    plugins: [ json() ]
  }
];