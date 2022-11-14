const path = require('path');
const webpack = require('webpack');
const dartSass = require('sass');
const manifest = require('./manifest.json')
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');


if (process.env.NODE_ENV == null) {
  process.env.NODE_ENV = 'development';
}

const ENV = process.env.NODE_ENV;

const plugins = [
  new webpack.DefinePlugin({
    "process.env.NODE_ENV": JSON.stringify(ENV),
  }),
  new CleanWebpackPlugin(),
  new CopyWebpackPlugin({
    patterns: [
      "./manifest.json",
      "./icon.png",
      "./options/options.html",
      { from: "./_locales", to: "_locales" },
    ],
  }),
  new MiniCssExtractPlugin(),
];

if (ENV == 'production') {
  plugins.push(
    new ZipPlugin({
      path: path.resolve(__dirname, 'dist'),
      filename: `noise-${manifest.version}.zip`,
      fileOptions: {
        mtime: new Date(),
        mode: 0o100664,
      }
    })
  );
}

module.exports = {
  mode: ENV,
  entry: {
    background: './background.js',
    content: './content.js',
    options: './options/index.js',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
  },
  optimization: {
    minimize: false,
  },
  devtool: ENV == 'development' ? 'source-map' : false,
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              implementation: dartSass,
            },
          },
        ],
      },
    ]
  },
  plugins: plugins,
}
