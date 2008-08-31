#include "common.h"

#if HAVE_UNISTD_H
#include <unistd.h>
#endif /* HAVE_UNISTD_H */

#if TIME_WITH_SYS_TIME
# if HAVE_SYS_TIME_H
#  include <sys/time.h>
# endif
# include <time.h>
#else
# if HAVE_SYS_TIME_H
#  include <sys/time.h>
# else
#  include <time.h>
# endif
#endif

#if HAVE_SYS_SOCKET_H
#include <sys/socket.h>
#endif /* HAVE_SYS_SOCKET_H */

#if HAVE_SYS_STAT_H
#include <sys/stat.h>
#endif /* HAVE_SYS_STAT_H */

#if HAVE_SYS_IOCTL_H
#include <sys/ioctl.h>
#endif /* HAVE_SYS_IOCTL_H */

#if HAVE_SYS_WAIT_H
#include <sys/wait.h>
#endif /* HAVE_SYS_WAIT_H */

/*
 * test error on connection close 
 * With a trick we simulate a connection close then we try to 
 * prepare or execute a query. This should fail and return an error message.
 */

static char software_version[] = "$Id: timeout4.c,v 1.1 2007/04/20 09:15:06 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

#if HAVE_FSTAT && defined(S_IFSOCK)

static int end_socket = -1;

static int
shutdown_last_socket(void)
{
	int max_socket = -1, i;
	int sockets[2];

	for (i = 3; i < 1024; ++i) {
		struct stat file_stat;
		if (fstat(i, &file_stat))
			continue;
		if ((file_stat.st_mode & S_IFSOCK) == S_IFSOCK)
			max_socket = i;
	}
	if (max_socket < 0)
		return 0;

	/* replace socket with a new one */
	if (socketpair(AF_UNIX, SOCK_STREAM, 0, sockets) < 0)
		return 0;

	/* substitute socket */
	close(max_socket);
	dup2(sockets[0], max_socket);

	/* close connection */
	close(sockets[0]);
	end_socket = sockets[1];
	return 1;
}

static int
Test(int direct)
{
	char buf[256];
	SQLRETURN ret;
	char sqlstate[6];
	time_t start_time, end_time;

	Connect();

	if (!shutdown_last_socket()) {
		fprintf(stderr, "Error shutting down connection\n");
		return 1;
	}

	ret = SQLSetStmtAttr(Statement, SQL_ATTR_QUERY_TIMEOUT, (SQLPOINTER) 10, SQL_IS_UINTEGER);
	if (ret != SQL_SUCCESS)
		ODBC_REPORT_ERROR("Error setting timeout");

	alarm(30);
	start_time = time(NULL);
	if (direct)
		ret = SQLExecDirect(Statement, (SQLCHAR *) "SELECT 1", SQL_NTS);
	else
		ret = SQLPrepare(Statement, (SQLCHAR *) "SELECT 1", SQL_NTS);
	end_time = time(NULL);
	alarm(0);
	if (ret != SQL_ERROR) {
		fprintf(stderr, "Error expected\n");
		return 1;
	}

	strcpy(sqlstate, "XXXXX");
	ret = SQLGetDiagRec(SQL_HANDLE_STMT, Statement, 1, (SQLCHAR *) sqlstate, NULL, (SQLCHAR *) buf, sizeof(buf), NULL);
	if (ret != SQL_SUCCESS && ret != SQL_SUCCESS_WITH_INFO) {
		fprintf(stderr, "Error not set\n");
		Disconnect();
		return 1;
	}
	sqlstate[5] = 0;
	printf("Message: %s - %s\n", sqlstate, buf);
	if (strcmp(sqlstate, "HYT00") || !strstr(buf, "Timeout")) {
		fprintf(stderr, "Invalid timeout message\n");
		return 1;
	}
	if (end_time - start_time < 10 || end_time - start_time > 26) {
		fprintf(stderr, "Unexpected connect timeout (%d)\n", (int) (end_time - start_time));
		return 1;
	}

	Disconnect();

	if (end_socket >= 0)
		close(end_socket);

	printf("Done.\n");
	return 0;
}

int
main(void)
{
	use_odbc_version3 = 1;

	if (Test(0) || Test(1))
		return 1;
	return 0;
}

#else
int
main(void)
{
	printf("Not possible for this platform.\n");
	return 0;
}
#endif
