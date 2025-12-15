#!/bin/sh
set -e

echo -e $DISP_BOLD $DISP_ORANGE "Installing dependencies..." $DISP_DFLT
npm install

echo $DISP_BOLD $DISP_ORANGE "Starting development server..." $DISP_DFLT
exec $@
