const sveltePreprocess = require('svelte-preprocess');

const production = !process.env.ROLLUP_WATCH;

module.exports = {
  // enable run-time checks when not in production
  dev: !production,
  // css: css => {
  //   css.write('public/build/bundle.css');
  // },
  preprocess: sveltePreprocess(),
}