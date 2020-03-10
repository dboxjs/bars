import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import eslint from 'rollup-plugin-eslint';
import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import istanbul from 'rollup-plugin-istanbul';
import uglify from 'rollup-plugin-uglify';

export default {
  entry: 'scatter.js',
  format: 'cjs',
  moduleName: 'dbox-scatter',
  plugins: [
    resolve({ jsnext: true }),
    commonjs(),
    eslint({
      exclude: 'node_modules/**'
    }),
    babel(babelrc()),
    istanbul({
      exclude: ['test/*.js', 'node_modules/**/*']
    }),
    uglify()
  ],
  dest: 'dist/scatter.js',
  sourceMap: 'inline'
};
