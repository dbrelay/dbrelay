/*
 * test SQLBindParameter with text and Sybase 
 * test from Keith Woodard (bug #885122)
 */
#include "common.h"

static char software_version[] = "$Id: convert_error.c,v 1.7 2005/08/03 06:24:50 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

static int test_num = 0;

static int
success(int ident, SQLRETURN r)
{
	if (r == SQL_SUCCESS || r == SQL_SUCCESS_WITH_INFO)
		return 1;
	printf("failed: num:%d ident:%d sqlreturn:%d\n", test_num, ident, (int) r);

	if (Statement) {
		SQLCHAR buf[4096];
		SQLCHAR state[6];
		SQLINTEGER nativeerrorcode;
		SQLSMALLINT tmp;

		memset(state, 0, sizeof(state));
		memset(buf, 0, sizeof(buf));
		SQLGetDiagRec(SQL_HANDLE_STMT, Statement, 1, state, &nativeerrorcode, buf, 4096, &tmp);
		printf("%s\n", buf);
	}
	Disconnect();
	exit(1);
}

static void
Test(const char *bind1, SQLSMALLINT type1, const char *bind2, SQLSMALLINT type2)
{
	char sql[512];
	char *val = "test";
	SQLLEN ind = 4;
	int id = 1;

	SQLFreeStmt(Statement, SQL_RESET_PARAMS);

	++test_num;
	sprintf(sql, "insert into #test_output values (%s, %s)", bind1, bind2);

	success(2, SQLPrepare(Statement, (SQLCHAR *) sql, strlen(sql)));
	if (bind1[0] == '?')
		success(3, SQLBindParameter(Statement, id++, SQL_PARAM_INPUT, SQL_C_LONG, type1, 3, 0, &test_num, 0, &ind));
	if (bind2[0] == '?')
		success(4,
			SQLBindParameter(Statement, id++, SQL_PARAM_INPUT, SQL_C_CHAR, type2, strlen(val) + 1, 0, (SQLCHAR *) val,
					 0, &ind));
	success(5, SQLExecute(Statement));
}

int
main(int argc, char **argv)
{
	use_odbc_version3 = 1;
	Connect();

	Command(Statement, "create table #test_output (id int, msg text)");

	Test("?", SQL_INTEGER, "?", SQL_LONGVARCHAR);
	Test("123", SQL_INTEGER, "?", SQL_LONGVARCHAR);
	Test("?", SQL_INTEGER, "'foo'", SQL_LONGVARCHAR);
	Test("?", SQL_INTEGER, "?", SQL_VARCHAR);

	/*
	 * Sybase cannot pass this test without complicated query parsing.
	 * Query with blob columns cannot be prepared so prepared query must
	 * be emulated loosing column informations from server and Sybase do
	 * not convert implicitly VARCHAR to INT
	 */
	if (db_is_microsoft())
		Test("?", SQL_VARCHAR, "?", SQL_LONGVARCHAR);
	else
		++test_num;

	Disconnect();

	return 0;
}
