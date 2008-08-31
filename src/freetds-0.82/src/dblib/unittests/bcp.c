/* 
 * Purpose: Test bcp functions
 * Functions: bcp_batch bcp_bind bcp_done bcp_init bcp_sendrow 
 */

#include "common.h"

#include <assert.h>

#if HAVE_SYS_STAT_H
#include <sys/stat.h>
#endif /* HAVE_SYS_STAT_H */

#include "bcp.h"

static char software_version[] = "$Id: bcp.c,v 1.14 2007/11/26 08:52:40 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

static char cmd[512];
static int init(DBPROCESS * dbproc, const char *name);
static void test_bind(DBPROCESS * dbproc);

/*
 * Static data for insertion
 */
int not_null_bit = 1;
char not_null_char[] = "a char";
char not_null_varchar[] = "a varchar";
char not_null_datetime[] 		= "Dec 17 2003  3:44PM";
char not_null_smalldatetime[] 	= "Dec 17 2003  3:44PM";
char not_null_money[] = "12.34";
char not_null_smallmoney[] = "12.34";
char not_null_float[] = "12.34";
char not_null_real[] = "12.34";
char not_null_decimal[] = "12.34";
char not_null_numeric[] = "12.34";
int not_null_int        = 1234;
int not_null_smallint   = 1234;
int not_null_tinyint    = 123;


static int
init(DBPROCESS * dbproc, const char *name)
{
	int res = 0;
	RETCODE rc;

	fprintf(stdout, "Dropping %s.%s..%s\n", SERVER, DATABASE, name);
	add_bread_crumb();
	sprintf(cmd, "if exists (select 1 from sysobjects where type = 'U' and name = '%s') drop table %s", name, name);
	dbcmd(dbproc, cmd);
	add_bread_crumb();
	dbsqlexec(dbproc);
	add_bread_crumb();
	while ((rc=dbresults(dbproc)) == SUCCEED) {
		/* nop */
	}
	if (rc != NO_MORE_RESULTS)
		return 1;
	add_bread_crumb();

	fprintf(stdout, "Creating %s.%s..%s\n", SERVER, DATABASE, name);

	dbcmd(dbproc, create_table_sql);
#if 1
	dbfcmd(dbproc, 	"select colid, cast(c.name as varchar(30)) as name, c.length "
			", '  '+ substring('NY', convert(bit,(c.status & 8))+1,1) as Nulls " 
			"from syscolumns as c left join systypes as t on c.usertype = t.usertype "
			"where c.id = object_id('%s') order by colid", name );
#endif
	if (dbsqlexec(dbproc) == FAIL) {
		add_bread_crumb();
		res = 1;
	}
	while ((rc=dbresults(dbproc)) == SUCCEED) {
		dbprhead(dbproc);
		dbprrow(dbproc);
		while ((rc=dbnextrow(dbproc)) == REG_ROW) {
			dbprrow(dbproc);
		}
	}
	if (rc != NO_MORE_RESULTS)
		return 1;
	fprintf(stdout, "%s\n", res? "error" : "ok");
	return res;
}

#define VARCHAR_BIND(x) \
	bcp_bind( dbproc, (unsigned char *) &x, prefixlen, strlen(x), NULL, termlen, SYBVARCHAR, col++ )

#define INT_BIND(x) \
	bcp_bind( dbproc, (unsigned char *) &x, prefixlen, -1, NULL, termlen, SYBINT4,    col++ )

#define NULL_BIND(x, type) \
	bcp_bind( dbproc, (unsigned char *) &x, prefixlen, 0, NULL, termlen, type,    col++ )

static void
test_bind(DBPROCESS * dbproc)
{
	enum { prefixlen = 0 };
	enum { termlen = 0 };
	enum NullValue { IsNull, IsNotNull };

	RETCODE fOK;
	int col=1;

	/* non nulls */
	fOK = INT_BIND(not_null_bit);
	assert(fOK == SUCCEED); 

	fOK = VARCHAR_BIND(not_null_char);
	assert(fOK == SUCCEED); 
	fOK = VARCHAR_BIND(not_null_varchar);
	assert(fOK == SUCCEED); 

	fOK = VARCHAR_BIND(not_null_datetime);
	assert(fOK == SUCCEED); 
	fOK = VARCHAR_BIND(not_null_smalldatetime);
	assert(fOK == SUCCEED); 

	fOK = VARCHAR_BIND(not_null_money);
	assert(fOK == SUCCEED); 
	fOK = VARCHAR_BIND(not_null_smallmoney);
	assert(fOK == SUCCEED); 

	fOK = VARCHAR_BIND(not_null_float);
	assert(fOK == SUCCEED); 
	fOK = VARCHAR_BIND(not_null_real);
	assert(fOK == SUCCEED); 

	fOK = VARCHAR_BIND(not_null_decimal);
	assert(fOK == SUCCEED); 
	fOK = VARCHAR_BIND(not_null_numeric);
	assert(fOK == SUCCEED); 

	fOK = INT_BIND(not_null_int);
	assert(fOK == SUCCEED); 
	fOK = INT_BIND(not_null_smallint);
	assert(fOK == SUCCEED); 
	fOK = INT_BIND(not_null_tinyint);
	assert(fOK == SUCCEED); 

	/* nulls */
	fOK = NULL_BIND(not_null_char, SYBVARCHAR);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_varchar, SYBVARCHAR);
	assert(fOK == SUCCEED); 

	fOK = NULL_BIND(not_null_datetime, SYBVARCHAR);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_smalldatetime, SYBVARCHAR);
	assert(fOK == SUCCEED); 

	fOK = NULL_BIND(not_null_money, SYBVARCHAR);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_smallmoney, SYBVARCHAR);
	assert(fOK == SUCCEED); 

	fOK = NULL_BIND(not_null_float, SYBVARCHAR);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_real, SYBVARCHAR);
	assert(fOK == SUCCEED); 

	fOK = NULL_BIND(not_null_decimal, SYBVARCHAR);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_numeric, SYBVARCHAR);
	assert(fOK == SUCCEED); 

	fOK = NULL_BIND(not_null_int, SYBINT4);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_smallint, SYBINT4);
	assert(fOK == SUCCEED); 
	fOK = NULL_BIND(not_null_tinyint, SYBINT4);
	assert(fOK == SUCCEED); 

}

int
main(int argc, char **argv)
{
	LOGINREC *login;
	DBPROCESS *dbproc;
	int i, rows_sent=0;
	int failed = 0;
	const char *s;
	const char *table_name = "all_types_bcp_unittest";

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
	DBSETLAPP(login, "bcp.c unit test");
	BCP_SETL(login, 1);

	fprintf(stdout, "About to open %s.%s\n", SERVER, DATABASE);

	add_bread_crumb();
	dbproc = dbopen(login, SERVER);
	if (strlen(DATABASE))
		dbuse(dbproc, DATABASE);
	add_bread_crumb();
	dbloginfree(login);
	add_bread_crumb();

	add_bread_crumb();

	if (init(dbproc, table_name))
		exit(1);

	/* set up and send the bcp */
	sprintf(cmd, "%s..%s", DATABASE, table_name);
	fprintf(stdout, "preparing to insert into %s ... ", cmd);
	if (bcp_init(dbproc, cmd, NULL, NULL, DB_IN) == FAIL) {
		fprintf(stdout, "failed\n");
    		exit(1);
	}
	fprintf(stdout, "OK\n");

	test_bind(dbproc);

	fprintf(stdout, "Sending same row 10 times... \n");
	for (i=0; i<10; i++) {
		if (bcp_sendrow(dbproc) == FAIL) {
			fprintf(stdout, "send failed\n");
		        exit(1);
		}
	}
	
	fprintf(stdout, "Sending 5 more rows ... \n");
	for (i=15; i <= 27; i++) {
		int type = dbcoltype(dbproc, i);
		int len = (type == SYBCHAR || type == SYBVARCHAR)? dbcollen(dbproc, i) : -1;
		if (bcp_collen(dbproc, len, i) == FAIL) {
			fprintf(stdout, "bcp_collen failed for column %d\n", i);
		        exit(1);
		}
	}
	for (i=0; i<5; i++) {
		if (bcp_sendrow(dbproc) == FAIL) {
			fprintf(stdout, "send failed\n");
		        exit(1);
		}
	}
#if 1
	rows_sent = bcp_batch(dbproc);
	if (rows_sent == -1) {
		fprintf(stdout, "batch failed\n");
	        exit(1);
	}
#endif

	fprintf(stdout, "OK\n");

	/* end bcp.  */
	if ((rows_sent += bcp_done(dbproc)) == -1)
	    printf("Bulk copy unsuccessful.\n");
	else
	    printf("%d rows copied.\n", rows_sent);


	printf("done\n");

	add_bread_crumb();
#if 0
	fprintf(stdout, "select * from %s\n", table_name);
	dbfcmd(dbproc, "select * from %s\n", table_name);
#endif
#if 1
	dbfcmd(dbproc, 	"select   'nullable_char' as col, count(*) nrows"
				", datalength(nullable_char) as len, nullable_char as value "
			"from %s group by nullable_char\n", table_name);
	dbfcmd(dbproc, 	"UNION\n"
			"select   'nullable_varchar' as col, count(*) nrows"
				", datalength(nullable_varchar) as len, nullable_varchar as value "
			"from %s group by nullable_varchar\n", table_name);
	dbfcmd(dbproc, 	"UNION\n"
			"select   'nullable_int' as col, count(*) nrows"
				", datalength(nullable_int) as len, cast(nullable_int as varchar(6))as value "
			"from %s group by nullable_int\n", table_name);
	dbfcmd(dbproc, "order by col, len, nrows\n");

	dbsqlexec(dbproc);
	while ((i=dbresults(dbproc)) == SUCCEED) {
		dbprhead(dbproc);
		dbprrow(dbproc);
		while ((i=dbnextrow(dbproc)) == REG_ROW) {
			dbprrow(dbproc);
		}
	}
#endif
	if ((s = getenv("BCP")) != NULL && 0 == strcmp(s, "nodrop")) {
		fprintf(stdout, "BCP=nodrop: '%s..%s' kept\n", DATABASE, table_name);
	} else {
		fprintf(stdout, "Dropping table %s\n", table_name);
		add_bread_crumb();
		sprintf(cmd, "drop table %s", table_name);
		dbcmd(dbproc, cmd);
		add_bread_crumb();
		dbsqlexec(dbproc);
		add_bread_crumb();
		while (dbresults(dbproc) != NO_MORE_RESULTS) {
			/* nop */
		}
	}
	add_bread_crumb();
	dbexit();
	add_bread_crumb();

	failed = 0;

	fprintf(stdout, "dblib %s on %s\n", (failed ? "failed!" : "okay"), __FILE__);
	free_bread_crumb();
	return failed ? 1 : 0;
}
