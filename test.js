#!/usr/bin/env node

'use strict';

const {exec} = require('node:child_process');
const {argv} = require('yargs');

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
