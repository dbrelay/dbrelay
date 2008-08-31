#include "common.h"

/* test RAISERROR in a store procedure, from Tom Rogers tests */

/* TODO add support for Sybase */

static char software_version[] = "$Id: raiserror.c,v 1.19 2007/11/26 06:25:11 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

#define SP_TEXT "{?=call #tmp1(?,?,?)}"
#define OUTSTRING_LEN 20
#define INVALID_RETURN (-12345)

static const char create_proc[] =
	"CREATE PROCEDURE #tmp1\n"
	"    @InParam int,\n"
	"    @OutParam int OUTPUT,\n"
	"    @OutString varchar(20) OUTPUT\n"
	"AS\n"
	"%s"
	"     SET @OutParam = @InParam\n"
	"     SET @OutString = 'This is bogus!'\n"
	"     SELECT 'Here is the first row' AS FirstResult\n"
	"     RAISERROR('An error occurred.', @InParam, 1)\n"
	"%s"
	"     RETURN (0)";

static SQLSMALLINT ReturnCode;
static char OutString[OUTSTRING_LEN];
static int g_nocount, g_second_select;

#ifdef TDS_NO_DM
static const int tds_no_dm = 1;
#else
static const int tds_no_dm = 0;
#endif

static void
TestResult(SQLRETURN result0, int level, const char *func)
{
	SQLCHAR SqlState[6];
	SQLINTEGER NativeError;
	char MessageText[1000];
	SQLSMALLINT TextLength;
	SQLRETURN result = result0;

	if (result == SQL_NO_DATA && strcmp(func, "SQLFetch") == 0)
		result = SQL_SUCCESS_WITH_INFO;

	if ((level <= 10 && result != SQL_SUCCESS_WITH_INFO) || (level > 10 && result != SQL_ERROR) || ReturnCode != INVALID_RETURN) {
		fprintf(stderr, "%s failed!\n", func);
		exit(1);
	}

	/*
	 * unixODBC till 2.2.11 do not support getting error if SQL_NO_DATA
	 */
	if (!tds_no_dm && result0 == SQL_NO_DATA && strcmp(func, "SQLFetch") == 0)
		return;

	SqlState[0] = 0;
	MessageText[0] = 0;
	NativeError = 0;
	/* result = SQLError(SQL_NULL_HENV, SQL_NULL_HDBC, Statement, SqlState, &NativeError, MessageText, 1000, &TextLength); */
	result = SQLGetDiagRec(SQL_HANDLE_STMT, Statement, 1, SqlState, &NativeError, (SQLCHAR *) MessageText, sizeof(MessageText),
			       &TextLength);
	printf("Func=%s Result=%d DIAG REC 1: State=%s Error=%d: %s\n", func, (int) result, SqlState, (int) NativeError, MessageText);
	if (!SQL_SUCCEEDED(result)) {
		fprintf(stderr, "SQLGetDiagRec error!\n");
		exit(1);
	}

	if (strstr(MessageText, "An error occurred") == NULL) {
		fprintf(stderr, "Wrong error returned!\n");
		fprintf(stderr, "Error returned: %s\n", MessageText);
		exit(1);
	}
}

#define MY_ERROR(msg) ReportError(msg, line, __FILE__)

static void
CheckData(const char *s, int line)
{
	char buf[80];
	SQLLEN ind;
	SQLRETURN result;

	result = SQLGetData(Statement, 1, SQL_C_CHAR, buf, sizeof(buf), &ind);
	if (result != SQL_SUCCESS && result != SQL_ERROR)
		MY_ERROR("SQLFetch invalid result");

	if (result == SQL_ERROR) {
		buf[0] = 0;
		ind = 0;
	}

	if (strlen(s) != ind || strcmp(buf, s) != 0)
		MY_ERROR("Invalid result");
}

#define CheckData(s) CheckData(s, __LINE__)

static void
CheckReturnCode(SQLRETURN result, SQLSMALLINT expected, int line)
{
	if (ReturnCode == expected && (expected != INVALID_RETURN || strcmp(OutString, "Test") == 0)
	    && (expected == INVALID_RETURN || strcmp(OutString, "This is bogus!") == 0))
		return;

	printf("SpDateTest Output:\n");
	printf("   Result = %d\n", (int) result);
	printf("   Return Code = %d\n", (int) ReturnCode);
	printf("   OutString = \"%s\"\n", OutString);
	MY_ERROR("Invalid ReturnCode");
}

#define CheckReturnCode(res, exp) CheckReturnCode(res, exp, __LINE__)

static void
Test(int level)
{
	SQLRETURN result;
	SQLSMALLINT InParam = level;
	SQLSMALLINT OutParam = 1;
	SQLLEN cbReturnCode = 0, cbInParam = 0, cbOutParam = 0;
	SQLLEN cbOutString = SQL_NTS;

	char sql[80];

	printf("ODBC %d nocount %s select %s level %d\n", use_odbc_version3 ? 3 : 2,
	       g_nocount ? "yes" : "no", g_second_select ? "yes" : "no", level);

	ReturnCode = INVALID_RETURN;
	memset(&OutString, 0, sizeof(OutString));

	/* test with SQLExecDirect */
	sprintf(sql, "RAISERROR('An error occurred.', %d, 1)", level);
	result = CommandWithResult(Statement, sql);

	TestResult(result, level, "SQLExecDirect");

	/* test with SQLPrepare/SQLExecute */
	if (!SQL_SUCCEEDED(SQLPrepare(Statement, (SQLCHAR *) SP_TEXT, strlen(SP_TEXT)))) {
		fprintf(stderr, "SQLPrepare failure!\n");
		exit(1);
	}

	SQLBindParameter(Statement, 1, SQL_PARAM_OUTPUT, SQL_C_SSHORT, SQL_INTEGER, 0, 0, &ReturnCode, 0, &cbReturnCode);
	SQLBindParameter(Statement, 2, SQL_PARAM_INPUT, SQL_C_SSHORT, SQL_INTEGER, 0, 0, &InParam, 0, &cbInParam);
	SQLBindParameter(Statement, 3, SQL_PARAM_OUTPUT, SQL_C_SSHORT, SQL_INTEGER, 0, 0, &OutParam, 0, &cbOutParam);
	strcpy(OutString, "Test");
	SQLBindParameter(Statement, 4, SQL_PARAM_OUTPUT, SQL_C_CHAR, SQL_VARCHAR, OUTSTRING_LEN, 0, OutString, OUTSTRING_LEN,
			 &cbOutString);

	result = SQLExecute(Statement);

	if (result != SQL_SUCCESS)
		ODBC_REPORT_ERROR("query should success");

	CheckData("");
	if (SQLFetch(Statement) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("SQLFetch returned failure");
	CheckData("Here is the first row");

	result = SQLFetch(Statement);
	if (use_odbc_version3) {
		SQLCHAR SqlState[6];
		SQLINTEGER NativeError;
		char MessageText[1000];
		SQLSMALLINT TextLength;
		SQLRETURN expected;

		if (result != SQL_NO_DATA)
			ODBC_REPORT_ERROR("SQLFetch should return NO DATA");
		result = SQLGetDiagRec(SQL_HANDLE_STMT, Statement, 1, SqlState, &NativeError, (SQLCHAR *) MessageText,
				       sizeof(MessageText), &TextLength);
		if (result != SQL_NO_DATA)
			ODBC_REPORT_ERROR("SQLGetDiagRec should return NO DATA");
		result = SQLMoreResults(Statement);
		expected = level > 10 ? SQL_ERROR : SQL_SUCCESS_WITH_INFO;
		if (result != expected)
			ODBC_REPORT_ERROR("SQLMoreResults returned unexpected result");
		if (use_odbc_version3 && !g_second_select && g_nocount) {
			CheckReturnCode(result, 0);
			ReturnCode = INVALID_RETURN;
			TestResult(result, level, "SQLMoreResults");
			ReturnCode = 0;
		} else {
			TestResult(result, level, "SQLMoreResults");
		}
		CHECK_ROWS(-1);
	} else {
		TestResult(result, level, "SQLFetch");
	}

	if (driver_is_freetds())
		CheckData("");

	if (!g_second_select) {
		CHECK_ROWS(-1);
		CheckReturnCode(result, g_nocount ? 0 : INVALID_RETURN);

		result = SQLMoreResults(Statement);
#ifdef ENABLE_DEVELOPING
		if (result != SQL_NO_DATA)
			ODBC_REPORT_ERROR("SQLMoreResults should return NO DATA");

		CHECK_ROWS(-2);
#endif
		CheckReturnCode(result, 0);
		return;
	}

	if (!use_odbc_version3 || !g_nocount) {
		result = SQLMoreResults(Statement);
		if (result != SQL_SUCCESS)
			ODBC_REPORT_ERROR("SQLMoreResults returned failure");
	}

	CheckReturnCode(result, INVALID_RETURN);

	CheckData("");
	if (SQLFetch(Statement) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("SQLFetch returned failure");
	CheckData("Here is the last row");

	if (SQLFetch(Statement) != SQL_NO_DATA)
		ODBC_REPORT_ERROR("SQLFetch returned failure");
	CheckData("");

	if (!use_odbc_version3 || g_nocount)
		CheckReturnCode(result, 0);
#ifdef ENABLE_DEVELOPING
	else
		CheckReturnCode(result, INVALID_RETURN);
#endif

	/* FIXME how to handle return in store procedure ??  */
	result = SQLMoreResults(Statement);
#ifdef ENABLE_DEVELOPING
	if (result != SQL_NO_DATA)
		ODBC_REPORT_ERROR("SQLMoreResults return other data");
#endif

	CheckReturnCode(result, 0);

	CheckData("");
}

static void
Test2(int nocount, int second_select)
{
	SQLRETURN result;
	char sql[512];

	g_nocount = nocount;
	g_second_select = second_select;

	/* this test do not work with Sybase */
	if (!db_is_microsoft())
		return;

	sprintf(sql, create_proc, nocount ? "     SET NOCOUNT ON\n" : "",
		second_select ? "     SELECT 'Here is the last row' AS LastResult\n" : "");
	result = CommandWithResult(Statement, sql);
	if (result != SQL_SUCCESS && result != SQL_NO_DATA)
		ODBC_REPORT_ERROR("Unable to create temporary store");

	Test(5);

	Test(11);

	Command(Statement, "DROP PROC #tmp1");
}

int
main(int argc, char *argv[])
{
	Connect();

	Test2(0, 1);

	Test2(1, 1);

	Disconnect();

	use_odbc_version3 = 1;

	Connect();

	Test2(0, 1);
	Test2(1, 1);

	Test2(0, 0);
	Test2(1, 0);

	Disconnect();

	printf("Done.\n");
	return 0;
}
