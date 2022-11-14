Noise
=====

Make sound response when event happen.


WebExtension Compatibility
--------------------------

Compatible version (2.0 onward) is completely rewritten from legacy one.

Most old functionalities are unavailable for the time being.

Noise still aims to provide a place to manage many events and sounds, while
[WebExtensions][] has relatively more limitation, we can only gradually add
new function step by step.


Development
-----------

Start development, with sass files watching:

    yarn dev:firefox

Make temporary build to `build` folder:

    yarn build:firefox

Test run with [web-ext][] after temporary build:

    yarn test:firefox

    yarn test:firefox --profile some_firefox_profile_name

Package a zip file:

    yarn build:firefox:prod


Legacy Version (Firefox &lt; v57)
---------------------------------

Please use Noise v1.4.3.


Alternatives
------------

- [Notification Sound][]
- [Download Sound][]


[web-ext]: https://github.com/mozilla/web-ext
[WebExtensions]: https://developer.mozilla.org/en-US/Add-ons/WebExtensions
[Notification Sound]: https://addons.mozilla.org/firefox/addon/notification-sound/
[Download Sound]: https://addons.mozilla.org/firefox/addon/download-sound/
