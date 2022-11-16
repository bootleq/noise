Noise
=====

Make sound response when event happen.

- Firefox Add-on: https://addons.mozilla.org/firefox/addon/noise/

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

Start development, with sass files watching:

    yarn dev
    yarn dev:chrome

Make temporary build to `build` folder:

    yarn build
    yarn build:chrome

Run with [web-ext][] after temporary build (Firefox only):

    yarn test
    yarn test --profile some_firefox_profile_name

Package a zip file:

    yarn build:prod
    yarn build:prod:chrome


Alternatives
------------

- [Notification Sound][]
- [Download Sound][]


[web-ext]: https://github.com/mozilla/web-ext
[Notification Sound]: https://addons.mozilla.org/firefox/addon/notification-sound/
[Download Sound]: https://addons.mozilla.org/firefox/addon/download-sound/
