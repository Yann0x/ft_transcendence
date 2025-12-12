#! /bin/sh

set -e

cd /data

echo  $DISP_BOLD $DISP_ORANGE "Installing packages dependencies" $DISP_DFLT 
npm i

if [ -d /certs/ && -f /certs/selfsigned.crt ]; then
    echo  $DISP_BOLD $DISP_ORANGE "Detecte Certificate" $DISP_DFLT 
else 
    echo  $DISP_BOLD $DISP_ORANGE "Generating self-signed certificate for https" $DISP_DFLT 
    mkdir -p /certs
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /certs/selfsigned.key \
        -out /certs/selfsigned.crt \
        -subj "/C=US/ST=Denial/L=Springfield/O=Dis/CN=www.example.com"
fi

echo  $DISP_BOLD $DISP_ORANGE "Running server" $DISP_DFLT 
exec $@