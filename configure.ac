#
# DB Relay is an HTTP module built on the NGiNX webserver platform which 
# communicates with a variety of database servers and returns JSON formatted 
# data.
# 
# Copyright (C) 2008-2010 Getco LLC
# 
# This program is free software: you can redistribute it and/or modify it 
# under the terms of the GNU General Public License as published by the Free 
# Software Foundation, either version 3 of the License, or (at your option) 
# any later version. In addition, redistributions in source code and in binary 
# form must 
# include the above copyright notices, and each of the following disclaimers. 
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
# 
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT OWNERS AND CONTRIBUTORS “AS IS” 
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
# ARE DISCLAIMED.  IN NO EVENT SHALL ANY COPYRIGHT OWNERS OR CONTRIBUTORS BE 
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
# POSSIBILITY OF SUCH DAMAGE.
#

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

AC_ARG_WITH(magic,
AS_HELP_STRING([--with-magic=MAGIC], [prepend MAGIC to beginning of each query.]))

TDSDIR=freetds-0.82
PCREDIR=pcre-7.8
NGXDIR=nginx-0.7.64

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
# for now, always build freeds
#if test "x$freetds" = "xtrue"; then
   echo
   echo Now configuring FreeTDS
   echo
   cd src/$TDSDIR
   patch -N -p0 < ../../patches/freetds.patch
   ./configure --prefix=$BUILD/$TDSDIR --with-tdsver=8.0
#fi

# DB Relay configuration
echo
echo Now configuring DB Relay
echo
cd $BUILD
cd src/ngx_dbrelay

if test "x$freetds" = "xtrue"; then
   ./configure --prefix=$prefix --with-nginx=$BUILD/src/$NGXDIR --with-freetds=$BUILD/src/$TDSDIR
   cd include; make
elif test "x$odbc" = "xtrue"; then
   ./configure --prefix=$prefix --with-nginx=$BUILD/src/$NGXDIR --with-odbc=$with_odbc --with-magic="$with_magic"
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
cp ../../html/index.html html/index.html

./configure --prefix=$prefix --with-pcre=$BUILD/src/$PCREDIR/ --add-module=$BUILD/src/ngx_dbrelay/src

cd ../..
echo $prefix

AC_OUTPUT
