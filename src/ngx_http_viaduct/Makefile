CC=gcc
CFLAGS=-DCMDLINE -I ../freetds-0.82/include
OBJS=main.o db.o log.o json.o stringbuf.o

viaduct: $(OBJS)
	echo $(CC) -o $@ $(OBJS)
	$(CC) -o $@ -liconv $(OBJS) ../freetds-0.82/src/dblib/.libs/libsybdb.a ../freetds-0.82/src/tds/.libs/libtds.a 
 
clean:
	rm -f viaduct *.o
 


