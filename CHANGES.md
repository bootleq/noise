CHANGES
=======

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
