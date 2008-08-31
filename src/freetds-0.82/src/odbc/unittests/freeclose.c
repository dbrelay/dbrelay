#include "common.h"

/* TODO port to windows, use thread */

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

#if HAVE_ERRNO_H
#include <errno.h>
#endif /* HAVE_ERRNO_H */

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

#if HAVE_NETINET_IN_H
#include <netinet/in.h>
#endif /* HAVE_NETINET_IN_H */

#if defined(TDS_HAVE_PTHREAD_MUTEX) && HAVE_ALARM && HAVE_FSTAT && defined(S_IFSOCK)

#include <ctype.h>
#include <pthread.h>

#include "tds.h"

static char software_version[] = "$Id: freeclose.c,v 1.6 2007/11/26 18:12:31 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

/* this crazy test test that we do not send too much prepare ... */

static int
find_last_socket(void)
{
	int max_socket = -1, i;

	for (i = 3; i < 1024; ++i) {
		struct stat file_stat;
		if (fstat(i, &file_stat))
			continue;
		if ((file_stat.st_mode & S_IFSOCK) == S_IFSOCK)
			max_socket = i;
	}
	return max_socket;
}

static struct sockaddr remote_addr;
socklen_t remote_addr_len;

static pthread_t      fake_thread;
static TDS_SYS_SOCKET fake_sock;

static void *fake_thread_proc(void * arg);

static int
init_fake_server(int ip_port)
{
	struct sockaddr_in sin;
	TDS_SYS_SOCKET s;
	int err;

	memset(&sin, 0, sizeof(sin));
	sin.sin_addr.s_addr = INADDR_ANY;
	sin.sin_port = htons((short) ip_port);
	sin.sin_family = AF_INET;

	if (TDS_IS_SOCKET_INVALID(s = socket(AF_INET, SOCK_STREAM, 0))) {
		perror("socket");
		exit(1);
	}
	if (bind(s, (struct sockaddr *) &sin, sizeof(sin)) < 0) {
		perror("bind");
		CLOSESOCKET(s);
		return 1;
	}
	listen(s, 5);
	err = pthread_create(&fake_thread, NULL, fake_thread_proc, int2ptr(s));
	if (err != 0) {
		perror("pthread_create");
		exit(1);
	}
	return 0;
}

static void
write_all(TDS_SYS_SOCKET s, const void *buf, size_t len)
{
	int res, l;
	fd_set fds_write;

	for (; len > 0;) {
		FD_ZERO(&fds_write);
		FD_SET(s, &fds_write);

		res = select(s + 1, NULL, &fds_write, NULL, NULL);
		if (res <= 0) {
			if (errno == EINTR)
				continue;
			perror("select");
			exit(1);
		}

		l = WRITESOCKET(s, buf, len);
		if (l <= 0) {
			perror("write socket");
			exit(1);
		}
		buf = ((const char *) buf) + l;
		len -= l;
	}
}

static unsigned int inserts = 0;
static char insert_buf[256] = "";

static void
count_insert(const char* buf, size_t len)
{
	static const char search[] = "insert into";
	static unsigned char prev = 'x';
	char *p;
	unsigned char c;
	size_t insert_len;

	/* add to buffer */
	for (p = strchr(insert_buf, 0); len > 0; --len, ++buf) {
		c = (unsigned char) buf[0];
		if (prev == 0 || c != 0)
			*p++ = (c >= ' ' && c < 128) ? tolower(c) : '_';
		prev = c;
	}
	*p = 0;

	/* check it */
	while ((p=strstr(insert_buf, search)) != NULL) {
		++inserts;
		/* do not find again */
		p[0] = '_';
	}

	/* avoid buffer too long */
	insert_len = strlen(insert_buf);
	if (insert_len > sizeof(search)) {
		p = insert_buf + insert_len - sizeof(search);
		memmove(insert_buf, p, strlen(p) + 1);
	}
}

static unsigned int round_trips = 0;
static enum { sending, receiving } flow = sending;

static void *
fake_thread_proc(void * arg)
{
	TDS_SYS_SOCKET s = ptr2int(arg), server_sock;
	socklen_t len;
	char buf[128];
	struct sockaddr_in sin;
	fd_set fds_read, fds_write, fds_error;
	int max_fd = 0;

	memset(&sin, 0, sizeof(sin));
	len = sizeof(sin);
	alarm(30);
	if ((fake_sock = accept(s, (struct sockaddr *) &sin, &len)) < 0) {
		perror("accept");
		exit(1);
	}
	CLOSESOCKET(s);

	if (TDS_IS_SOCKET_INVALID(server_sock = socket(AF_INET, SOCK_STREAM, 0))) {
		perror("socket");
		exit(1);
	}

	if (connect(server_sock, &remote_addr, remote_addr_len)) {
		perror("socket");
		exit(1);
	}
	alarm(0);

	if (fake_sock > max_fd) max_fd = fake_sock;
	if (server_sock > max_fd) max_fd = server_sock;

	for (;;) {
		int res;

		FD_ZERO(&fds_read);
		FD_SET(fake_sock, &fds_read);
		FD_SET(server_sock, &fds_read);

		FD_ZERO(&fds_write);

		FD_ZERO(&fds_error);
		FD_SET(fake_sock, &fds_error);
		FD_SET(server_sock, &fds_error);

		alarm(30);
		res = select(max_fd + 1, &fds_read, &fds_write, &fds_error, NULL);
		alarm(0);
		if (res < 0) {
			if (errno == EINTR)
				continue;
			perror("select");
			exit(1);
		}

		if (FD_ISSET(fake_sock, &fds_error) || FD_ISSET(server_sock, &fds_error)) {
			fprintf(stderr, "error in select\n");
			exit(1);
		}

		/* just read and forward */
		if (FD_ISSET(fake_sock, &fds_read)) {
			if (flow != sending)
				++round_trips;
			flow = sending;

			len = READSOCKET(fake_sock, buf, sizeof(buf));
			if (len == 0)
				break;
			if (len < 0 && sock_errno != TDSSOCK_EINPROGRESS)
				break;
			count_insert(buf, len);
			write_all(server_sock, buf, len);
		}

		if (FD_ISSET(server_sock, &fds_read)) {
			if (flow != receiving)
				++round_trips;
			flow = receiving;

			len = READSOCKET(server_sock, buf, sizeof(buf));
			if (len == 0)
				break;
			if (len < 0 && sock_errno != TDSSOCK_EINPROGRESS)
				break;
			write_all(fake_sock, buf, len);
		}
	}
	CLOSESOCKET(fake_sock);
	CLOSESOCKET(server_sock);
	return NULL;
}

int
main(int argc, char **argv)
{
	SQLHSTMT hstmt = NULL;
	SQLLEN sql_nts = SQL_NTS;
	const char *query;
	SQLINTEGER id = 0;
	char string[64];
	int last_socket, port;
	const int num_inserts = 20;

	Connect();

	last_socket = find_last_socket();
	if (last_socket < 0) {
		fprintf(stderr, "Error finding last socket opened\n");
		return 1;
	}

	remote_addr_len = sizeof(remote_addr);
	if (getpeername(last_socket, &remote_addr, &remote_addr_len)) {
		fprintf(stderr, "Unable to get remote address\n");
		return 1;
	}

	Disconnect();

	/* init fake server, behave like a proxy */
	for (port = 12340; port < 12350; ++port)
		if (!init_fake_server(port))
			break;
	if (port == 12350) {
		fprintf(stderr, "Cannot bind to a port\n");
		return 1;
	}
	printf("Fake server binded at port %d\n", port);

	/* override connections */
	setenv("TDSHOST", "127.0.0.1", 1);
	sprintf(string, "%d", port);
	setenv("TDSPORT", string, 1);

	Connect();

	/* real test */
	Command(Statement, "CREATE TABLE #test(i int, c varchar(40))");

	if (!SQL_SUCCEEDED(SQLAllocHandle(SQL_HANDLE_STMT, Connection, &hstmt)))
		return 1;

	/* do not take into account connection statistics */
	round_trips = 0;
	inserts = 0;

	query = "insert into #test values (?, ?)";

	if (!SQL_SUCCEEDED(SQLBindParameter(hstmt, 1, SQL_PARAM_INPUT, SQL_C_SLONG, SQL_INTEGER, sizeof(id), 0, &id, 0, &sql_nts))
	    ||
	    !SQL_SUCCEEDED(SQLBindParameter
			   (hstmt, 2, SQL_PARAM_INPUT, SQL_C_CHAR, SQL_VARCHAR, sizeof(string), 0, string, 0, &sql_nts))) 
	{
		SQLFreeHandle(SQL_HANDLE_STMT, hstmt);
		return 1;
	}

	if (!SQL_SUCCEEDED(SQLPrepare(hstmt, (SQLCHAR *) query, SQL_NTS))) {
		SQLFreeHandle(SQL_HANDLE_STMT, hstmt);
		return 1;
	}

	for (id = 0; id < num_inserts; id++) {
		sprintf(string, "This is a test (%d)", (int) id);
		if (!SQL_SUCCEEDED(SQLExecute(hstmt))) {
			SQLFreeHandle(SQL_HANDLE_STMT, hstmt);
			return 1;
		}
		SQLFreeStmt(hstmt, SQL_CLOSE);
	}

	SQLFreeHandle(SQL_HANDLE_STMT, hstmt);

	Disconnect();

	alarm(10);
	pthread_join(fake_thread, NULL);

	if (inserts > 2 || round_trips > num_inserts * 2 + 10) {
		fprintf(stderr, "Too much round trips (%u) or insert (%u) !!!\n", round_trips, inserts);
		return 1;
	}
	printf("%u round trips %u inserts\n", round_trips, inserts);

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

