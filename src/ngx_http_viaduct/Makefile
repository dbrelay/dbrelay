CC=gcc -g
CFLAGS=-DCMDLINE -I ../freetds-0.82/include
CFLAGS+=-DNGX_DARWIN=1
OBJS=db.o log.o json.o stringbuf.o shmem.o client.o mssql.o
MAINOBJS=main.o $(OBJS)
LOCKOBJS=locktime.o $(OBJS)
CONNOBJS=connector.o $(OBJS)
CLTOBJS=clientmain.o $(OBJS)
# Linux
#LIBS=-lrt
# OS X
LIBS=-liconv

viaduct: $(MAINOBJS)
	echo $(CC) -o $@ $(MAINOBJS)
	$(CC) -o $@ $(LIBS) $(MAINOBJS) ../freetds-0.82/src/dblib/.libs/libsybdb.a ../freetds-0.82/src/tds/.libs/libtds.a 
 
locktime: $(LOCKOBJS)
	echo $(CC) -o $@ $(LOCKOBJS)
	$(CC) -o $@ $(LIBS) $(LOCKOBJS) ../freetds-0.82/src/dblib/.libs/libsybdb.a ../freetds-0.82/src/tds/.libs/libtds.a 

connector: $(CONNOBJS)
	echo $(CC) -o $@ $(CONNOBJS)
	$(CC) -o $@ $(LIBS) $(CONNOBJS) ../freetds-0.82/src/dblib/.libs/libsybdb.a ../freetds-0.82/src/tds/.libs/libtds.a 

client: $(CLTOBJS)
	echo $(CC) -o $@ $(CLTOBJS)
	$(CC) -o $@ $(LIBS) $(CLTOBJS) ../freetds-0.82/src/dblib/.libs/libsybdb.a ../freetds-0.82/src/tds/.libs/libtds.a 

clean:
	rm -f viaduct *.o
 


