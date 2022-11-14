#!/usr/bin/env node

'use strict';

const {exec} = require('node:child_process');
const yargs = require('yargs/yargs');

const argv = yargs(process.argv.slice(2)).options({
  s: {alias: 'source-dir', nargs: 1, type: 'string'},
  p: {alias: 'profile', nargs: 1, type: 'string'},
}).check(({sourceDir, profile}) => {
  if (Array.isArray(sourceDir)) {
    return "Too many argument for 'source-dir'.";
  }
  if (Array.isArray(profile)) {
    return "Too many argument for 'profile'.";
  }
  return true;
}).argv;

const options = [
  '--start-url about:addons',
  '--start-url about:debugging',
  '--verbose',
  '--browser-console',
];

const profile = argv.profile;
if (profile) {
  options.push(`--firefox-profile=${profile} --profile-create-if-missing`);
}

const sourceDir = argv.sourceDir;
if (sourceDir) {
  options.push(`--source-dir=${sourceDir}`);
}

const main = () => {
  const cmd = `web-ext run ${options.join(' ')}`;

  console.log(`# Running command:\n  ${cmd}`);

  exec(cmd, (error, _stdout, _stderr) => {
    if (error) {
      console.error("\n", error);
      return;
    }
  });
};

main();
