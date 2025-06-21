Noise
=====

Make sound response when event happen.

- Firefox Add-on: https://addons.mozilla.org/firefox/addon/noise/
- Chrome Web Store: https://chrome.google.com/webstore/detail/noise/bhookghbiabmdcjpphjikookipcddidk/

Available Events
----------------

- Browser startup
- Download start / completed / interrupted / failed
- Tab opened / closed / attached / attention / pin / unpin
- Back or Forward navigation
- Request completed, like 404, 500 response
- Enter or leave fullscreen mode
- Clipboard copy / paste
- Composition started


Development
-----------

Have some scripts for developer convenience, note the names without `:chrome` imply Firefox.

Make temporary build to `build` folder:

    yarn build
    yarn build:chrome

    yarn build watch
    yarn build:chrome watch

Run with [web-ext][] after temporary build (Firefox only):

    yarn we:run
    yarn we:run --profile some_firefox_profile_name
    yarn we:run -p some_profile_name -f /path/to/your/firefox/or/alias

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
- [Navigational Sounds][]



[web-ext]: https://github.com/mozilla/web-ext
[Notification Sound]: https://addons.mozilla.org/firefox/addon/notification-sound/
[Download Sound]: https://addons.mozilla.org/firefox/addon/download-sound/
[Download Sound - Chrome]: https://chrome.google.com/webstore/detail/download-sound/fmcbineojopoamfhaabogigdbpbklnld
[Navigational Sounds]: https://chromewebstore.google.com/detail/navigational-sounds/plhoioliblcddpmljieonfdndcmjmkpd
