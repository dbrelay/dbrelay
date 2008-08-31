#include "common.h"

#ifdef HAVE_UNISTD_H
#include <unistd.h>
#endif

#include <assert.h>

/*
 * Test timeout on prepare
 * It execute a query wait for timeout and then try to issue a new prepare/execute
 * This test a BUG where second prepare timeouts
 *
 * Test from Ou Liu, cf "Query Time Out", 2006-08-08
 */

static char software_version[] = "$Id: timeout2.c,v 1.4 2007/06/27 14:52:25 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

#if defined(__MINGW32__) || defined(WIN32)
#define sleep(s) Sleep((s)*1000)
#endif

#define CHK(func,params) \
	if (func params != SQL_SUCCESS) \
		ODBC_REPORT_ERROR(#func)

int
main(int argc, char *argv[])
{
	SQLRETURN ret;
	int i;

	Connect();

	Command(Statement, "create table #timeout(i int)");
	Command(Statement, "insert into #timeout values(1)");

	for (i = 0; i < 2; ++i) {

		printf("Loop %d\n", i);

		CHK(SQLSetStmtAttr, (Statement, SQL_ATTR_QUERY_TIMEOUT, (SQLPOINTER) 10, SQL_IS_UINTEGER));

		CHK(SQLPrepare, (Statement, (SQLCHAR*) "select * from #timeout", SQL_NTS));
		CHK(SQLExecute, (Statement));

		do {
			while ((ret=SQLFetch(Statement)) == SQL_SUCCESS)
				;
			assert(ret == SQL_NO_DATA);
		} while ((ret = SQLMoreResults(Statement)) == SQL_SUCCESS);
		assert(ret == SQL_NO_DATA);

		if (i == 0) {
			printf("Sleep 15 seconds to test if timeout occurs\n");
			sleep(15);
		}

		SQLFreeStmt(Statement, SQL_CLOSE);
		SQLFreeStmt(Statement, SQL_UNBIND);
		SQLFreeStmt(Statement, SQL_RESET_PARAMS);
		SQLCloseCursor(Statement);
	}

	Disconnect();

	return 0;
}
