CHANGES
=======

## 3.?.? (?)

* Add tab groups open / close / move events.
* Fix missing to remove tabs.onTabUpdated listener on Firefox.

## 3.3.0 (2025-06-23)

* Add window open / close events.
* Add fullscreen enter / leave events.
* Add compositionstart event, for example when start composition with IME.
* Add clibpoard paste event.
* Tab close event now have an option to ignore itself when closing window.
* Avoid unnecessary event listener for disabled events.

## 3.2.0 (2025-06-20)

* Support various Tab events: opened / closed / attached / pin / unpin.
* Also a tab "attention" event (Firefox only), for example a background tab raises a modal dialog.

## 3.1.1 (2023-01-29)

* Chrome manifest v3 support, requires Chrome version 109+
* Minor fix error message when unload content script

## 3.1.0 (2022-11-21)

* Improve efficiency by defer execution and skip unnecessary listener binding.
* Respect tab's "muted" state, don't play sound when muted. Exception: Download and HTTP Request events doesn't follow this currently.

## 3.0.0 (2022-11-16)

* Improve development process with webpack.
* Allow import with new items appended, instead of just overwrite.
* Options page: Fix Accept button overlapped when no Sound attached.
* Options page: Various improvements and fixes.
* Remove upgrade instruction for users from Firefox 57 downward.

## 2.3.0 (2019-04-22)

* Options page: discard many UI and use back standard input for a11y compatibility.
* Options page: fix exception during permission update.
* Options page: minor enhancements to focus / keyboard navigation.

## 2.2.3 (2019-04-14)

* Options page: fix upload button inaccessible with only keyboard (#9).
* Options page: fix Event editing has no response.

## 2.2.2 (2018-10-17)

* Upgrade some outdated node packages.

## 2.2.1 (2018-04-05)

* Add "Download Failure" event.

## 2.1.1 (2017-11-11)

* Options page now automatcally start editing when adding new sound/event.

## 2.1.0 (2017-11-08)

* Allow customize event name.

* Add "HTTP Request Completed" event.

  It occurs when webpage load finish, you can further set status code filter to,
  for example, catch only `404` not found results.

  This event requires `webRequest` permission.

* With above new event, introduced new "options" UI.
  When select certain event, a circle icon will appear in "Options" column,
  click it to review/edit available options.

* Options UI enhancements and fixes, thanks to @rayman89's suggestion (#7).

## 2.0.0 (2017-11-04)

* Same as beta, just do release.

## 2.0.0b (2017-10-31)

* Major update to support WebExtensions.

## 1.4.3 (2017-04-17)

* Explicitly flag not compatible with multiprocess (e10s) Firefox.

## 1.1.3 (2009) ~ 1.4.2 (2015-12-21)

* See [versions on AMO][].


[versions on AMO]: https://addons.mozilla.org/firefox/addon/noise/versions/
