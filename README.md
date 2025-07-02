Noise
=====

Make sound response when event happen.

- Firefox Add-on: https://addons.mozilla.org/firefox/addon/noise/
- Chrome Web Store: https://chromewebstore.google.com/detail/noise/bhookghbiabmdcjpphjikookipcddidk


Available Events
----------------

- Browser startup
- Download start / completed / interrupted / failed
- Tab opened / closed / attached / attention / pin / unpin
- Tab groups created / moved / updated / closed
- Window opened / closed
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

Lint the temporary build (Firefox only):

    yarn we:lint

Package a zip file:

    yarn build:prod
    yarn build:prod:chrome


Resource License
----------------

Some resources in this project have their own license.

- The two default sounds **五色鳥 上** / **下** (Taiwan Barbet's Call A / B)
  encoded in `defaults.json`,

  were adapted from [Sunny Tseng][]'s recording [xeno-canto.org/559593][],

  thus are licensed under [CC BY-NC-SA 4.0][].


Alternatives
------------

### Firefox

- [Notification Sound][]
- [Download Sound][]

### Chrome

- [Download Sound][Download Sound - Chrome] - can use speech output as a sound
- [Navigational Sounds][]


About Findbar Wrapped
---------------------

Firefox (135 onwards) users can bring the old **Findbar wrapped** sound alive,
by setting `accessibility.typeaheadfind.wrappedSoundURL` in `about:config`,
which accepts values like `beep` or `file:///C:/your.wav`.



[web-ext]: https://github.com/mozilla/web-ext
[Notification Sound]: https://addons.mozilla.org/firefox/addon/notification-sound/
[Download Sound]: https://addons.mozilla.org/firefox/addon/download-sound/
[Download Sound - Chrome]: https://chromewebstore.google.com/detail/download-sound/fmcbineojopoamfhaabogigdbpbklnld
[Navigational Sounds]: https://chromewebstore.google.com/detail/navigational-sounds/plhoioliblcddpmljieonfdndcmjmkpd
[Sunny Tseng]: https://sunnytseng.ca/
[xeno-canto.org/559593]: https://www.xeno-canto.org/559593
[CC BY-NC-SA 4.0]: https://creativecommons.org/licenses/by-nc-sa/4.0/
