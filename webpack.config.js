const path = require('path');
const webpack = require('webpack');
const dartSass = require('sass');
const manifestFx = require('./manifest.json')
const manifestGc = require('./manifest.chrome.json')
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');


if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'development';
}

if (process.env.BROWSER != 'chrome') {
  process.env.BROWSER = 'firefox';
}

const BROWSER = process.env.BROWSER;
const ENV = process.env.NODE_ENV;

const identity = e => e;
const compact = arr => arr.filter(identity);

const plugins = [
  new webpack.DefinePlugin({
    "process.env.NODE_ENV": JSON.stringify(ENV),
  }),
  new CleanWebpackPlugin(),
  new CopyWebpackPlugin({
    patterns: compact([
      {
        from: `manifest${BROWSER == 'firefox' ? '' : `.${BROWSER}`}.json`,
        to: "manifest.json" },
      "./options/options.html",
      BROWSER == 'chrome' ? './offscreen.html' : null,
      { from: "./_locales", to: "_locales" },
      { from: "./icons", to: "icons" },
    ]),
  }),
  new MiniCssExtractPlugin(),
];

if (ENV == 'production') {
  plugins.push(
    new ZipPlugin({
      path: path.resolve(__dirname, 'dist'),
      filename: `noise-${BROWSER}-${BROWSER == 'firefox' ? manifestFx.version : manifestGc.version}.zip`,
      fileOptions: {
        mtime: new Date(),
        mode: 0o100664,
      }
    })
  );
}

const entries = Object.fromEntries(compact([
  ['content', './content.js'],
  ['options', './options/index.js'],
  (BROWSER == 'chrome'
    ? ['offscreen', './offscreen.js']
    : null)
]));

if (BROWSER != 'chrome') {
  entries['background'] = './background.js';
} else {
  entries['background.worker'] = './background.worker.js';
}

module.exports = {
  mode: ENV,
  entry: entries,
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
  },
  optimization: {
    minimize: false,
  },
  devtool: ENV == 'development' ? 'source-map' : false,
  resolve: {
    alias: {
      "webextension-polyfill": "webextension-polyfill/dist/browser-polyfill.min.js"
    }
  },
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              api: 'modern',
              implementation: dartSass,
            },
          },
        ],
      },
    ]
  },
  plugins: plugins,
}
