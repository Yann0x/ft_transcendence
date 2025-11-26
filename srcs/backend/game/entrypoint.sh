#! /bin/sh

set -e

cd /data

echo  $DISP_BOLD $DISP_ORANGE "Installing packages dependencies" $DISP_DFLT 
npm i
npm run build 

echo  $DISP_BOLD $DISP_ORANGE "Running server" $DISP_DFLT 
exec $@