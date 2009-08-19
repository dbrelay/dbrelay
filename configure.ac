
AC_INIT([dbrelay], [0.01])
AC_PREREQ(2.53)
AC_REVISION($Revision: 1.0 $)

AC_PREFIX_DEFAULT(/usr/local)

# ------------------------------------------------------------
# Checks for programs.
# ------------------------------------------------------------

AM_INIT_AUTOMAKE

AC_PROG_CC

AC_CONFIG_FILES( Makefile \
        src/Makefile \
        util/Makefile \
        html/Makefile \
)

AC_ARG_WITH(freetds,
AS_HELP_STRING([--with-freetds=DIR], [build with support for FreeTDS in DIR]))
if test "$with_freetds"; then
        if echo "$with_freetds" | grep -v '^/'; then
                with_freetds="$PWD/$with_freetds"
        fi
	freetds=true
fi
AM_CONDITIONAL(FREETDS, test "$freetds" = "true")

AC_ARG_WITH(mysql,
AS_HELP_STRING([--with-mysql=DIR], [build with support for MySQL in DIR]))
if test "$with_mysql"; then
        if echo "$with_mysql" | grep -v '^/'; then
                with_mysql="$PWD/$with_mysql"
        fi
	mysql=true
fi

AM_CONDITIONAL(MYSQL, test "$mysql" = "true")

AC_ARG_WITH(odbc,
AS_HELP_STRING([--with-odbc=DIR], [build with support for ODBC in DIR]))
if test "$with_odbc"; then
        if echo "$with_odbc" | grep -v '^/'; then
                with_odbc="$PWD/$with_odbc"
        fi
        odbc=true
fi
AM_CONDITIONAL(ODBC, test "$odbc" = "true")


TDSDIR=freetds-0.82
PCREDIR=pcre-7.8
NGXDIR=nginx-0.7.61

BUILD=`pwd`
cd src
rm -fr $PCREDIR
rm -fr $TDSDIR
rm -fr $NGXDIR
tar xvfz $PCREDIR.tgz
tar xvfz $TDSDIR.tgz
tar xvfz $NGXDIR.tar.gz
cd ..



# FreeTDS configuration
if test "x$freetds" = "xtrue"; then
   echo
   echo Now configuring FreeTDS
   echo
   cd src/$TDSDIR
   patch -N -p0 < ../../patches/freetds.patch
   ./configure --prefix=$BUILD/$TDSDIR --with-tdsver=8.0
fi

# DB Relay configuration
echo
echo Now configuring DB Relay
echo
cd $BUILD
cd src/dbrelay

if test "x$freetds" = "xtrue"; then
   ./configure --prefix=$prefix --with-nginx=$BUILD/src/$NGXDIR --with-freetds=$BUILD/src/$TDSDIR
   cd include; make
else
   ./configure --prefix=$prefix --with-nginx=$BUILD/src/$NGXDIR --with-mysql=/usr/local/mysql
   cd include; make
fi

# NGINX configuration
echo
echo Now configuring nginx
echo
cd $BUILD
cd src/$NGXDIR
patch -N -p0 < ../../patches/nginx.wrapper.patch
patch -N -p0 < ../../patches/nginx.conf.patch
patch -N -p0 < ../../patches/nginx.makefile.patch

./configure --prefix=$prefix --with-pcre=$BUILD/src/$PCREDIR/ --add-module=$BUILD/src/dbrelay/src

cd ../..
echo $prefix

AC_OUTPUT
