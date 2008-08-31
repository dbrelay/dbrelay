#include "common.h"

/* Test for SQLPutData */

static char software_version[] = "$Id: putdata.c,v 1.9 2004/10/28 13:16:18 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

static const char test_text[] =
	"Nel mezzo del cammin di nostra vita\n" "mi ritrovai per una selva oscura\n" "che' la diritta via era smarrita.";

#define BYTE_AT(n) (((n) * 245 + 123) & 0xff)

int
main(int argc, char *argv[])
{
	SQLLEN ind;
	int len = strlen(test_text), n, i;
	const char *p;
	SQLPOINTER ptr;
	unsigned char buf[256], *pb;
	SQLRETURN retcode;

	Connect();

	/* create table to hold data */
	Command(Statement, "CREATE TABLE #putdata (c TEXT NULL, b IMAGE NULL)");

	if (SQLBindParameter(Statement, 1, SQL_PARAM_INPUT, SQL_C_CHAR, SQL_LONGVARCHAR, 0, 0, (SQLPOINTER) 123, 0, &ind) !=
	    SQL_SUCCESS)
		ODBC_REPORT_ERROR("Unable to bind output parameter");
	/* length required */
	ind = SQL_LEN_DATA_AT_EXEC(len);

	/* 
	 * test for char 
	 */

	if (SQLPrepare(Statement, (SQLCHAR *) "INSERT INTO #putdata(c) VALUES(?)", SQL_NTS) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("Unable to prepare statement");

	if (SQLExecute(Statement) != SQL_NEED_DATA)
		ODBC_REPORT_ERROR("Wrong result executing statement");

	p = test_text;
	n = 5;
	if (SQLParamData(Statement, &ptr) != SQL_NEED_DATA)
		ODBC_REPORT_ERROR("Wrong result from SQLParamData");
	if (ptr != (SQLPOINTER) 123)
		ODBC_REPORT_ERROR("Wrong pointer from SQLParamData");
	while (*p) {
		int l = strlen(p);

		if (l < n)
			n = l;
		if (SQLPutData(Statement, (char *) p, n) != SQL_SUCCESS)
			ODBC_REPORT_ERROR("Wrong result from SQLPutData");
		p += n;
		n *= 2;
	}
	if (SQLParamData(Statement, &ptr) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("Wrong result from SQLParamData");

	if (SQLParamData(Statement, &ptr) != SQL_ERROR)
		ODBC_REPORT_ERROR("Wrong result from SQLParamData");

	/* check state  and reset some possible buffers */
	Command(Statement, "DECLARE @i INT");

	/* update row setting binary field */
	for (i = 0; i < 255; ++i)
		buf[i] = BYTE_AT(i);

	/* 
	 * test for binary 
	 */

	if (SQLBindParameter(Statement, 1, SQL_PARAM_INPUT, SQL_C_BINARY, SQL_LONGVARBINARY, 0, 0, (SQLPOINTER) 4567, 0, &ind) !=
	    SQL_SUCCESS)
		ODBC_REPORT_ERROR("Unable to bind output parameter");
	ind = SQL_LEN_DATA_AT_EXEC(254);

	if (SQLPrepare(Statement, (SQLCHAR *) "UPDATE #putdata SET b = ?", SQL_NTS) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("Unable to prepare statement");

	if (SQLExecute(Statement) != SQL_NEED_DATA)
		ODBC_REPORT_ERROR("Wrong result executing statement");

	pb = buf;
	n = 7;
	if (SQLParamData(Statement, &ptr) != SQL_NEED_DATA)
		ODBC_REPORT_ERROR("Wrong result from SQLParamData");
	if (ptr != (SQLPOINTER) 4567)
		ODBC_REPORT_ERROR("Wrong pointer from SQLParamData");
	while (pb != (buf + 254)) {
		int l = buf + 254 - pb;

		if (l < n)
			n = l;
		if (SQLPutData(Statement, (char *) p, n) != SQL_SUCCESS)
			ODBC_REPORT_ERROR("Wrong result from SQLPutData");
		pb += n;
		n *= 2;
	}
	if (SQLParamData(Statement, &ptr) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("Wrong result from SQLParamData");

	if (SQLParamData(Statement, &ptr) != SQL_ERROR)
		ODBC_REPORT_ERROR("Wrong result from SQLParamData");

	/* check state  and reset some possible buffers */
	Command(Statement, "DECLARE @i2 INT");


	/* test len == 0 case from ML */
	if (SQLFreeStmt(Statement, SQL_RESET_PARAMS) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("SQLFreeStmt error");

	if (SQLPrepare(Statement, (SQLCHAR *) "INSERT INTO #putdata(c) VALUES(?)", SQL_NTS) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("Unable to prepare statement");

	if (SQLBindParameter(Statement, 1, SQL_PARAM_INPUT, SQL_C_CHAR, SQL_LONGVARCHAR, 0, 0, (PTR) 2, 0, &ind) != SQL_SUCCESS)
		ODBC_REPORT_ERROR("SQLBindParameter error");

	ind = SQL_LEN_DATA_AT_EXEC(0);

	if ((retcode = SQLExecute(Statement)) != SQL_NEED_DATA) {
		printf("Wrong result executing statement (retcode=%d)\n", (int) retcode);
		exit(1);
	}
	while (retcode == SQL_NEED_DATA) {
		retcode = SQLParamData(Statement, &ptr);
		if (retcode == SQL_NEED_DATA) {
			SQLPutData(Statement, "abc", 3);
		}
	}

	/* TODO check inserts ... */
	/* TODO test cancel inside SQLExecute */

	Disconnect();

	printf("Done.\n");
	return 0;
}
