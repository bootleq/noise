#!/bin/bash

ADDON="noise"
ignore="'*.txt' '*.bat' '*.sh' '*.xpi' '*.lnk' '.*' Thumbs.db Desktop.ini build"
eval rsync -rt . build/ `echo --exclude "${ignore// / --exclude }"`
cd build/chrome/$ADDON
zip -r $ADDON.jar .
mv $ADDON.jar ../
cd ../../   # build/
rm -rf chrome/$ADDON
zip -r $ADDON.xpi .
cd ..
mv -f build/$ADDON.xpi .
rm -rf build
