Noise
=====

Make sound response when event happen.

- Firefox Add-on: https://addons.mozilla.org/firefox/addon/noise/
- Chrome Web Store: https://chrome.google.com/webstore/detail/noise/bhookghbiabmdcjpphjikookipcddidk/

Available Events
----------------

- Browser startup
- Download start / completed / interrupted / failed
- Back or Forward navigation
- Request completed, like 404, 500 response
- Clipboard copy


Development
-----------

Have some scripts for developer convenience, note the names without `:chrome` imply Firefox.

Make temporary build to `build` folder:

    yarn build
    yarn build:chrome

    yarn build watch
    yarn build:chrome watch

Run with [web-ext][] after temporary build (Firefox only):

    yarn test
    yarn test --profile some_firefox_profile_name

Package a zip file:

    yarn build:prod
    yarn build:prod:chrome


Alternatives
------------

### Firefox

- [Notification Sound][]
- [Download Sound][]

### Chrome

- [Download Sound][Download Sound - Chrome] - can use speech output as a sound



[web-ext]: https://github.com/mozilla/web-ext
[Notification Sound]: https://addons.mozilla.org/firefox/addon/notification-sound/
[Download Sound]: https://addons.mozilla.org/firefox/addon/download-sound/
[Download Sound - Chrome]: https://chrome.google.com/webstore/detail/download-sound/fmcbineojopoamfhaabogigdbpbklnld
