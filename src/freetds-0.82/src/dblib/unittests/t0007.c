/* 
 * Purpose: Test binding strings and ints, attempt 2nd query with results pending. 
 * Functions: dbbind dbcmd dbnextrow dbopen dbresults dbsqlexec 
 */

#include "common.h"


static char software_version[] = "$Id: t0007.c,v 1.17 2007/12/04 02:06:38 jklowden Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };



static void
create_tables(DBPROCESS * dbproc, int rows_to_add)
{
	int i;
	char cmd[1024];


	fprintf(stdout, "creating table\n");
	dbcmd(dbproc, "create table #dblib0007 (i int not null, s char(12) not null)");
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}

	fprintf(stdout, "insert\n");
	for (i = 1; i < rows_to_add; i++) {
		sprintf(cmd, "insert into #dblib0007 values (%d, 'row %07d')", i, i);
		fprintf(stdout, "%s\n", cmd);
		dbcmd(dbproc, cmd);
		dbsqlexec(dbproc);
		while (dbresults(dbproc) != NO_MORE_RESULTS) {
			/* nop */
		}
	}
}				/* create_tables()  */


static int
start_query(DBPROCESS * dbproc, const char *cmd)
{
	int i;

	fprintf(stdout, "%s\n", cmd);
	if (SUCCEED != dbcmd(dbproc, cmd)) {
		return 0;
	}
	if (SUCCEED != dbsqlexec(dbproc)) {
		return 0;
	}
	add_bread_crumb();

	if (dbresults(dbproc) != SUCCEED) {
		add_bread_crumb();
		return 0;
	}
	add_bread_crumb();

	for (i = 1; i <= dbnumcols(dbproc); i++) {
		add_bread_crumb();
		printf("col %d is %s\n", i, dbcolname(dbproc, i));
		add_bread_crumb();
	}
	return 1;
}				/* start_query()  */

int
main(int argc, char **argv)
{
	LOGINREC *login;
	DBPROCESS *dbproc;
	int i;
	char teststr[1024];
	DBINT testint;
	int failed = 0;
	int expected_error;

	set_malloc_options();

	read_login_info(argc, argv);

	fprintf(stdout, "Start\n");
	add_bread_crumb();

	dbinit();

	add_bread_crumb();
	dberrhandle(syb_err_handler);
	dbmsghandle(syb_msg_handler);

	fprintf(stdout, "About to logon\n");

	add_bread_crumb();
	login = dblogin();
	DBSETLPWD(login, PASSWORD);
	DBSETLUSER(login, USER);
	DBSETLAPP(login, "t0007");

	fprintf(stdout, "About to open\n");

	add_bread_crumb();
	dbproc = dbopen(login, SERVER);
	if (strlen(DATABASE))
		dbuse(dbproc, DATABASE);
	add_bread_crumb();
	dbloginfree(login);
	add_bread_crumb();

	add_bread_crumb();

	create_tables(dbproc, 10);

	if (!start_query(dbproc, "select * from #dblib0007 where i<=5 order by i")) {
		fprintf(stderr, "%s:%d: start_query failed\n", __FILE__, __LINE__);
		failed = 1;
	}

	add_bread_crumb();
	dbbind(dbproc, 1, INTBIND, 0, (BYTE *) & testint);
	add_bread_crumb();
	dbbind(dbproc, 2, STRINGBIND, 0, (BYTE *) teststr);
	add_bread_crumb();

	add_bread_crumb();

	for (i = 1; i <= 2; i++) {
	char expected[1024];

		sprintf(expected, "row %07d", i);

		add_bread_crumb();

		if (i % 5 == 0) {
			dbclrbuf(dbproc, 5);
		}

		testint = -1;
		strcpy(teststr, "bogus");

		add_bread_crumb();
		if (REG_ROW != dbnextrow(dbproc)) {
			fprintf(stderr, "Failed.  Expected a row\n");
			abort();
		}
		add_bread_crumb();
		if (testint != i) {
			fprintf(stderr, "Failed.  Expected i to be %d, was %d\n", i, (int) testint);
			abort();
		}
		if (0 != strncmp(teststr, expected, strlen(expected))) {
			fprintf(stdout, "Failed.  Expected s to be |%s|, was |%s|\n", expected, teststr);
			abort();
		}
		printf("Read a row of data -> %d %s\n", (int) testint, teststr);
	}


	fprintf(stdout, "second select.  Should fail.\n");

	expected_error = 20019;
	dbsetuserdata(dbproc, (BYTE*) &expected_error);

	if (start_query(dbproc, "select * from #dblib0007 where i>=5 order by i")) {
		fprintf(stderr, "%s:%d: start_query should have failed but didn't\n", __FILE__, __LINE__);
		failed = 1;
	}

	add_bread_crumb();
	dbexit();
	add_bread_crumb();

	fprintf(stdout, "dblib %s on %s\n", (failed ? "failed!" : "okay"), __FILE__);
	free_bread_crumb();
	return failed ? 1 : 0;
}
