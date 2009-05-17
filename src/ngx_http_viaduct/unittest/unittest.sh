#!/bin/sh

if [ "$1" = "" ]
then
   echo "Usage: $0 <testname>"
   exit 1
fi

OPTH="-h"`grep '^HOST=' PWD | cut -f2 -d=`
OPTD="-d"`grep '^DATABASE=' PWD | cut -f2 -d=`
if [ "$OPTD" = "-d" ]; then OPTD=""; fi
OPTU="-u"`grep '^USER=' PWD | cut -f2 -d=`
OPTW="-w"`grep '^PASSWORD=' PWD | cut -f2 -d=`
if [ "$OPTW" = "-w" ]; then OPTW=""; fi

TESTNAME=$1

JS=`which js 2> /dev/null`
if [ "$JS" = "" ]
then
   ../src/viaduct $OPTU $OPTH $OPTD -tunittest -f${TESTNAME}.sql 2> /dev/null | cat
else
   ../src/viaduct $OPTU $OPTH $OPTD -tunittest -f${TESTNAME}.sql 2> /dev/null | sed -e 's/^/ /' | $JS ${TESTNAME}.js
fi

