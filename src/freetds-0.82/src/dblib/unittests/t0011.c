/* 
 * Purpose: Test binding of string types
 * Functions: dbbind dbcmd dbcolname dbnextrow dbnumcols dbopen dbresults dbsqlexec 

 */

#include "common.h"

static char software_version[] = "$Id: t0011.c,v 1.12 2007/12/04 02:06:38 jklowden Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

int failed = 0;
const char long_column[] = "This is a really long column to ensure that the next row ends properly.";
const char short_column[] = "Short column";

void insert_row(DBPROCESS * dbproc, char *cmd);
int select_rows(DBPROCESS * dbproc, int bind_type);

int
main(int argc, char **argv)
{
	LOGINREC *login;
	DBPROCESS *dbproc;
	char cmd[2048];

	read_login_info(argc, argv);
	fprintf(stdout, "Start\n");

	dbinit();

	fprintf(stdout, "About to logon\n");

	login = dblogin();
	DBSETLPWD(login, PASSWORD);
	DBSETLUSER(login, USER);
	DBSETLAPP(login, "t0011");

	fprintf(stdout, "About to open\n");

	dbproc = dbopen(login, SERVER);
	if (strlen(DATABASE))
		dbuse(dbproc, DATABASE);
	dbloginfree(login);

	fprintf(stdout, "Dropping table\n");
	dbcmd(dbproc, "drop table #dblib0011");
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}

	fprintf(stdout, "creating table\n");
	dbcmd(dbproc, "create table #dblib0011 (i int not null, c1 char(200) not null, c2 char(200) null, vc varchar(200) null)");
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}

	fprintf(stdout, "insert\n");

	sprintf(cmd, "insert into #dblib0011 values (1, '%s','%s','%s')", long_column, long_column, long_column);
	insert_row(dbproc, cmd);
	sprintf(cmd, "insert into #dblib0011 values (2, '%s','%s','%s')", short_column, short_column, short_column);
	insert_row(dbproc, cmd);
	sprintf(cmd, "insert into #dblib0011 values (3, '%s',NULL,NULL)", short_column);
	insert_row(dbproc, cmd);

	failed = select_rows(dbproc, STRINGBIND);

	dbexit();

	fprintf(stdout, "dblib %s on %s\n", (failed ? "failed!" : "okay"), __FILE__);
	return failed ? 1 : 0;
}

int
select_rows(DBPROCESS * dbproc, int bind_type)
{
	char teststr[1024];
	char teststr2[1024];
	char testvstr[1024];
	DBINT testint;
	DBINT i;


	fprintf(stdout, "select\n");
	dbcmd(dbproc, "select * from #dblib0011 order by i");
	dbsqlexec(dbproc);


	if (dbresults(dbproc) != SUCCEED) {
		failed = 1;
		fprintf(stdout, "Was expecting a result set.");
		exit(1);
	}

	for (i = 1; i <= dbnumcols(dbproc); i++) {
		printf("col %d is %s\n", i, dbcolname(dbproc, i));
	}

	if (SUCCEED != dbbind(dbproc, 1, INTBIND, 0, (BYTE *) & testint)) {
		fprintf(stderr, "Had problem with bind\n");
		return 1;
	}
	if (SUCCEED != dbbind(dbproc, 2, bind_type, 0, (BYTE *) teststr)) {
		fprintf(stderr, "Had problem with bind\n");
		return 1;
	}
	if (SUCCEED != dbbind(dbproc, 3, bind_type, 0, (BYTE *) teststr2)) {
		fprintf(stderr, "Had problem with bind\n");
		return 1;
	}
	if (SUCCEED != dbbind(dbproc, 4, bind_type, 0, (BYTE *) testvstr)) {
		fprintf(stderr, "Had problem with bind\n");
		return 1;
	}

	i = 0;
	while (dbnextrow(dbproc) == REG_ROW) {
		i++;
		if (testint != i) {
			fprintf(stdout, "Failed.  Expected i to be |%d|, was |%d|\n", testint, i);
			return 1;
		}
		printf("c:  %s$\n", teststr);
		printf("c2: %s$\n", teststr2);
		printf("vc: %s$\n", testvstr);
		if (bind_type == STRINGBIND) {
		} else {
		}
	}
	return 0;
}

void
insert_row(DBPROCESS * dbproc, char *cmd)
{
	fprintf(stdout, "%s\n", cmd);
	dbcmd(dbproc, cmd);
	dbsqlexec(dbproc);
	while (dbresults(dbproc) != NO_MORE_RESULTS) {
		/* nop */
	}
}
