/* 
 * Purpose: Test sending and receiving TEXT datatype
 * Functions: dbbind dbmoretext dbreadtext dbtxptr dbtxtimestamp dbwritetext 
 */

#include "common.h"

static char software_version[] = "$Id: t0014.c,v 1.27 2006/07/06 12:48:16 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

#define BLOB_BLOCK_SIZE 4096

int failed = 0;

char *testargs[] = { "", FREETDS_SRCDIR "/data.bin", "t0014.out" };

int
main(int argc, char **argv)
{
	const int rows_to_add = 3;
	LOGINREC *login;
	DBPROCESS *dbproc;
	DBPROCESS *blobproc;
	int i;
	DBINT testint;
	FILE *fp;
	long result, isiz;
	char *blob, *rblob;
	unsigned char *textPtr, *timeStamp;
	char objname[256];
	char sqlCmd[256];
	char rbuf[BLOB_BLOCK_SIZE];
	long numread;
	BOOL readFirstImage;

	set_malloc_options();

	read_login_info(argc, argv);
	fprintf(stdout, "Start\n");
	dbinit();

	dberrhandle(syb_err_handler);
	dbmsghandle(syb_msg_handler);

	fprintf(stdout, "About to logon\n");

	login = dblogin();
	DBSETLPWD(login, PASSWORD);
	DBSETLUSER(login, USER);
	DBSETLAPP(login, "t0014");

	fprintf(stdout, "About to open %s..%s for user '%s'\n", SERVER, DATABASE, USER);

	dbproc = dbopen(login, SERVER);
	blobproc = dbopen(login, SERVER);
	if (strlen(DATABASE)) {
		dbuse(dbproc, DATABASE);
		dbuse(blobproc, DATABASE);
	}
	dbloginfree(login);
	fprintf(stdout, "After logon\n");

	fprintf(stdout, "About to read binary input file\n");

	if (argc == 1) {
		argv = testargs;
		argc = 3;
	}
	if (argc < 3) {
		fprintf(stderr, "Usage: %s infile outfile\n", argv[0]);
		return 1;
	}

	if ((fp = fopen(argv[1], "rb")) == NULL) {
		fprintf(stderr, "Cannot open input file: %s\n", argv[1]);
		return 2;
	}
	result = fseek(fp, 0, SEEK_END);
	isiz = ftell(fp);
	result = fseek(fp, 0, SEEK_SET);

	blob = (char *) malloc(isiz);
	fread((void *) blob, isiz, 1, fp);
	fclose(fp);

	/* FIXME this test seem to not work using temporary tables (sybase?)... */
	fprintf(stdout, "Dropping table\n");
	dbcmd(dbproc, "if object_id('dblib0014') is not null drop table dblib0014");
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}

	fprintf(stdout, "creating table\n");
	dbcmd(dbproc, "create table dblib0014 (i int not null, PigTure image not null)");
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}


	fprintf(stdout, "insert\n");
	for (i = 0; i < rows_to_add; i++) {
	char cmd[1024];

		sprintf(cmd, "insert into dblib0014 values (%d, '')", i);
		fprintf(stdout, "%s\n", cmd);
		dbcmd(dbproc, cmd);
		dbsqlexec(dbproc);
		while (dbresults(dbproc) != NO_MORE_RESULTS) {
			/* nop */
		}
	}

	for (i = 0; i < rows_to_add; i++) {
		sprintf(sqlCmd, "SELECT PigTure FROM dblib0014 WHERE i = %d", i);
		dbcmd(dbproc, sqlCmd);
		dbsqlexec(dbproc);
		if (dbresults(dbproc) != SUCCEED) {
			fprintf(stderr, "Error inserting blob\n");
			return 4;
		}

		while ((result = dbnextrow(dbproc)) != NO_MORE_ROWS) {
			result = REG_ROW;
			result = DBTXPLEN;
			strcpy(objname, "dblib0014.PigTure");
			textPtr = dbtxptr(dbproc, 1);
			timeStamp = dbtxtimestamp(dbproc, 1);

			/*
			 * Use #ifdef if you want to test dbmoretext mode (needed for 16-bit apps)
			 * Use #ifndef for big buffer version (32-bit)
			 */
#if 1
/* DBWRITE_OK_FOR_OVER_4K */
			if (dbwritetext(blobproc, objname, textPtr, DBTXPLEN, timeStamp, TRUE, isiz, (BYTE*) blob) != SUCCEED)
				return 5;
#else
			if (dbwritetext(blobproc, objname, textPtr, DBTXPLEN, timeStamp, TRUE, isiz, NULL) != SUCCEED)
				return 15;
			dbsqlok(blobproc);
			dbresults(blobproc);

			numtowrite = 0;
			/* Send the update value in chunks. */
			for (numwritten = 0; numwritten < isiz; numwritten += numtowrite) {
				numtowrite = (isiz - numwritten);
				if (numtowrite > BLOB_BLOCK_SIZE)
					numtowrite = BLOB_BLOCK_SIZE;
				dbmoretext(blobproc, (DBINT) numtowrite, blob + numwritten);
			}
			dbsqlok(blobproc);
			while (dbresults(blobproc) != NO_MORE_RESULTS);

#endif
		}
	}

	fprintf(stdout, "select\n");

	dbcmd(dbproc, "select * from dblib0014 order by i");
	dbsqlexec(dbproc);

	if (dbresults(dbproc) != SUCCEED) {
		failed = 1;
		fprintf(stdout, "Was expecting a result set.");
		exit(1);
	}

	for (i = 1; i <= dbnumcols(dbproc); i++) {
		printf("col %d is %s\n", i, dbcolname(dbproc, i));
	}

	if (SUCCEED != dbbind(dbproc, 1, INTBIND, -1, (BYTE *) & testint)) {
		failed = 1;
		fprintf(stderr, "Had problem with bind\n");
		abort();
	}

	for (i = 0; i < rows_to_add; i++) {
	char expected[1024];

		sprintf(expected, "row %03d", i);

		if (REG_ROW != dbnextrow(dbproc)) {
			failed = 1;
			fprintf(stderr, "Failed.  Expected a row\n");
			exit(1);
		}
		if (testint != i) {
			failed = 1;
			fprintf(stderr, "Failed.  Expected i to be %d, was %d\n", i, (int) testint);
			abort();
		}

		/* get the image */
		strcpy(sqlCmd, "SET TEXTSIZE 2147483647");
		dbcmd(blobproc, sqlCmd);
		dbsqlexec(blobproc);

		if (dbresults(blobproc) != SUCCEED) {
			dbcancel(blobproc);
			return 16;
		}

		sprintf(sqlCmd, "SELECT PigTure FROM dblib0014 WHERE i = %d", i);
		dbcmd(blobproc, sqlCmd);
		dbsqlexec(blobproc);
		if (dbresults(blobproc) != SUCCEED) {
			fprintf(stderr, "Error extracting blob\n");
			return 6;
		}

		numread = 0;
		rblob = NULL;
		readFirstImage = FALSE;
		while ((result = dbreadtext(blobproc, rbuf, BLOB_BLOCK_SIZE)) != NO_MORE_ROWS) {
			if (result == 0) {	/* this indicates end of row */
				readFirstImage = TRUE;
			} else {
				rblob = (char*) realloc(rblob, result + numread);
				memcpy((void *) (rblob + numread), (void *) rbuf, result);
				numread += result;
			}
		}

		if (i == 0) {
			printf("Saving first blob data row to file: %s\n", argv[2]);
			if ((fp = fopen(argv[2], "wb")) == NULL) {
				fprintf(stderr, "Unable to open output file: %s\n", argv[2]);
				return 3;
			}

			result = fwrite((void *) rblob, numread, 1, fp);
			fclose(fp);
		}

		printf("Read blob data row %d --> %s %ld byte comparison\n",
		       (int) testint, (memcmp(blob, rblob, numread)) ? "failed" : "PASSED", numread);
		free(rblob);
	}

	if (dbnextrow(dbproc) != NO_MORE_ROWS) {
		failed = 1;
		fprintf(stderr, "Was expecting no more rows\n");
		exit(1);
	}

	free(blob);

	fprintf(stdout, "Dropping table\n");
	dbcmd(dbproc, "drop table dblib0014");
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}

	dbexit();

	fprintf(stdout, "dblib %s on %s\n", (failed ? "failed!" : "okay"), __FILE__);
	return failed ? 1 : 0;
}
