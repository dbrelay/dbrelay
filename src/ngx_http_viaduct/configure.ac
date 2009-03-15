AC_INIT(ngx_http_viaduct_module, 0.01)
AC_CONFIG_SRCDIR(src/ngx_http_viaduct_module.c)
AC_PREREQ(2.53)
AC_REVISION($Revision: 1.0 $)

# ------------------------------------------------------------
# Checks for programs.
# ------------------------------------------------------------
AC_PROG_CC

AM_INIT_AUTOMAKE
AC_CONFIG_HEADERS(include/config.h)
AC_CONFIG_FILES( Makefile \
        src/Makefile \
)

AC_ARG_WITH(nginx,
AS_HELP_STRING([--with-nginx=DIR], [build with support for nginx in DIR]))
if test "$with_nginx"; then
        NGINX_INC="-I$with_nginx/include"
        CPPFLAGS="$CPPFLAGS $NGINX_INC"
fi

AC_ARG_WITH(freetds,
AS_HELP_STRING([--with-freetds=DIR], [build with support for FreeTDS in DIR]))
if test "$with_freetds"; then
        if echo "$with_freetds" | grep -v '^/'; then
                with_freetds="$PWD/$with_freetds"
        fi
        FREETDS_INC="-I$with_freetds/include"
        CPPFLAGS="$CPPFLAGS $FREETDS_INC"
        FREETDS_LIB="-L$with_freetds/src/dblib/.libs/ -L$with_freetds/src/tds/.libs/ -lsybdb -ltds"
        LDFLAGS="$LDFLAGS $FREETDS_LIB"
	freetds=true
        AC_DEFINE(HAVE_FREETDS, 1, [Define to 1 if building with FreeTDS support.])
fi
AM_CONDITIONAL(FREETDS, test "$freetds" = "true")

AC_ARG_WITH(mysql,
AS_HELP_STRING([--with-mysql=DIR], [build with support for MySQL in DIR]))
if test "$with_mysql"; then
        if echo "$with_mysql" | grep -v '^/'; then
                with_mysql="$PWD/$with_mysql"
        fi
        MYSQL_INC="-I$with_mysql/include"
        CPPFLAGS="$CPPFLAGS $MYSQL_INC"
        MYSQL_LIB="-L$with_mysql/lib/ -lmysqlclient"
        LDFLAGS="$LDFLAGS $MYSQL_LIB"
	mysql=true
        AC_DEFINE(HAVE_MYSQL, 1, [Define to 1 if building with MySQL support.])
fi
AM_CONDITIONAL(MYSQL, test "$mysql" = "true")


AC_CHECK_TYPES([semun])
if test "$ac_cv_type_semun" = "no"; then
  AC_MSG_CHECKING(if sem.h defines semun)
  AC_TRY_COMPILE([#include <sys/types.h>
      #include <sys/ipc.h>
      #include <sys/sem.h>],
  [union semun s;],
  [ac_cv_type_semun=yes AC_DEFINE(HAVE_SEMUN) AC_MSG_RESULT(yes)],
  [AC_MSG_RESULT(no)])
fi

AC_MSG_CHECKING([for SO_NOSIGPIPE])
AC_EGREP_CPP(we_have_sonosigpipe,
[#include <sys/socket.h>
#ifdef SO_NOSIGPIPE
we_have_sonosigpipe
#endif
], AC_DEFINE([HAVE_SO_NOSIGPIPE], [1], [Define to 1 if you have the SO_NOSIGPIPE socketoption.]) haveSO_NOSIGPIPE=yes, haveSO_NOSIGPIPE=no)
AC_MSG_RESULT([$haveSO_NOSIGPIPE])

AC_MSG_CHECKING(for MSG_NOSIGNAL)
AC_EGREP_CPP(we_have_MSG_NOSIGNAL,
[#include <linux/socket.h>
#ifdef MSG_NOSIGNAL
we_have_MSG_NOSIGNAL
#endif
], AC_DEFINE([HAVE_MSG_NOSIGNAL], [1], [Define to 1 if you have the MSG_NOSIGNAL socket flag.]) haveMSG_NOSIGNAL=yes, haveMSG_NOSIGNAL=no)
AC_MSG_RESULT([$haveMSG_NOSIGNAL])

AC_OUTPUT

