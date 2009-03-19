AM_CPPFLAGS     = -DCMDLINE $(DB_INCS)
AM_LDFLAGS     = $(DB_LIBS) @VIADUCT_EXTRA_LIBS@
bin_PROGRAMS = viaduct connector
viaduct_SOURCES = viaduct.h db.c log.c json.c stringbuf.c shmem.c client.c main.c libsybdb.a libtds.a
connector_SOURCES = viaduct.h db.c log.c json.c stringbuf.c shmem.c client.c connector.c 
EXTRA_viaduct_SOURCES = mssql.h mssql.c vmysql.h mysql.c
if FREETDS
viaduct_LDADD = mssql.o
viaduct_DEPENDENCIES = mssql.o
connector_LDADD = mssql.o
connector_DEPENDENCIES = mssql.o
endif
if MYSQL
viaduct_LDADD = mysql.o
viaduct_DEPENDENCIES = mysql.o
connector_LDADD = mysql.o
connector_DEPENDENCIES = mysql.o
endif

