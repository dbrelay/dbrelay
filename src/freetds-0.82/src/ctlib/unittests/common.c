#if HAVE_CONFIG_H
#include <config.h>
#endif /* HAVE_CONFIG_H */

#include <stdio.h>

#if HAVE_STDLIB_H
#include <stdlib.h>
#endif /* HAVE_STDLIB_H */

#if HAVE_STRING_H
#include <string.h>
#endif /* HAVE_STRING_H */

#include <ctpublic.h>
#include "common.h"
#include "ctlib.h"

static char software_version[] = "$Id: common.c,v 1.16 2007/12/26 18:45:17 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

char USER[512];
char SERVER[512];
char PASSWORD[512];
char DATABASE[512];

COMMON_PWD common_pwd = {0};

int cslibmsg_cb_invoked = 0;
int clientmsg_cb_invoked = 0;
int servermsg_cb_invoked = 0;

CS_RETCODE
read_login_info(void)
{
	FILE *in;
	char line[512];
	char *s1, *s2;
	
	if (common_pwd.initialized) {
		strcpy(USER, common_pwd.USER);
		strcpy(SERVER, common_pwd.SERVER);
		strcpy(PASSWORD, common_pwd.PASSWORD);
		strcpy(DATABASE, common_pwd.DATABASE);
		return CS_SUCCEED;
	}

	in = fopen("../../../PWD", "r");
	if (!in) {
		fprintf(stderr, "Can not open PWD file\n\n");
		return CS_FAIL;
	}

	while (fgets(line, 512, in)) {
		s1 = strtok(line, "=");
		s2 = strtok(NULL, "\n");
		if (!s1 || !s2) {
			continue;
		}
		if (!strcmp(s1, "UID")) {
			strcpy(USER, s2);
		} else if (!strcmp(s1, "SRV")) {
			strcpy(SERVER, s2);
		} else if (!strcmp(s1, "PWD")) {
			strcpy(PASSWORD, s2);
		} else if (!strcmp(s1, "DB")) {
			strcpy(DATABASE, s2);
		}
	}
	fclose(in);
	return CS_SUCCEED;
}

CS_RETCODE
try_ctlogin(CS_CONTEXT ** ctx, CS_CONNECTION ** conn, CS_COMMAND ** cmd, int verbose)
{
CS_RETCODE ret;
char query[30];
TDSCONTEXT *tds_ctx;

	/* read login information from PWD file */
	ret = read_login_info();
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "read_login_info() failed!\n");
		}
		return ret;
	}
	ret = cs_ctx_alloc(CS_VERSION_100, ctx);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "Context Alloc failed!\n");
		}
		return ret;
	}

	/* Force default date format, some tests rely on it */
	tds_ctx = (TDSCONTEXT *) (*ctx)->tds_ctx;
	if (tds_ctx && tds_ctx->locale && tds_ctx->locale->date_fmt) {
		free(tds_ctx->locale->date_fmt);
		tds_ctx->locale->date_fmt = strdup("%b %d %Y %I:%M%p");
	}

	ret = ct_init(*ctx, CS_VERSION_100);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "Library Init failed!\n");
		}
		return ret;
	}
	ret = ct_con_alloc(*ctx, conn);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "Connect Alloc failed!\n");
		}
		return ret;
	}
	ret = ct_con_props(*conn, CS_SET, CS_USERNAME, USER, CS_NULLTERM, NULL);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "ct_con_props() SET USERNAME failed!\n");
		}
		return ret;
	}
	ret = ct_con_props(*conn, CS_SET, CS_PASSWORD, PASSWORD, CS_NULLTERM, NULL);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "ct_con_props() SET PASSWORD failed!\n");
		}
		return ret;
	}
	ret = ct_connect(*conn, SERVER, CS_NULLTERM);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "Connection failed!\n");
		}
		return ret;
	}
	ret = ct_cmd_alloc(*conn, cmd);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "Command Alloc failed!\n");
		}
		return ret;
	}

	strcpy(query, "use ");
	strncat(query, DATABASE, 20);

	ret = run_command(*cmd, query);
	if (ret != CS_SUCCEED)
		return ret;

	return CS_SUCCEED;
}


CS_RETCODE
try_ctlogout(CS_CONTEXT * ctx, CS_CONNECTION * conn, CS_COMMAND * cmd, int verbose)
{
CS_RETCODE ret;

	ret = ct_cancel(conn, NULL, CS_CANCEL_ALL);
	if (ret != CS_SUCCEED) {
		if (verbose) {
			fprintf(stderr, "ct_cancel() failed!\n");
		}
		return ret;
	}
	ct_cmd_drop(cmd);
	ct_close(conn, CS_UNUSED);
	ct_con_drop(conn);
	ct_exit(ctx, CS_UNUSED);
	cs_ctx_drop(ctx);

	return CS_SUCCEED;
}

/* Run commands from which we expect no results returned */
CS_RETCODE
run_command(CS_COMMAND * cmd, const char *sql)
{
CS_RETCODE ret, results_ret;
CS_INT result_type;

	if (cmd == NULL) {
		return CS_FAIL;
	}

	ret = ct_command(cmd, CS_LANG_CMD, sql, CS_NULLTERM, CS_UNUSED);
	if (ret != CS_SUCCEED) {
		fprintf(stderr, "ct_command() failed\n");
		return ret;
	}
	ret = ct_send(cmd);
	if (ret != CS_SUCCEED) {
		fprintf(stderr, "ct_send() failed\n");
		return ret;
	}
	while ((results_ret = ct_results(cmd, &result_type)) == CS_SUCCEED) {
		switch ((int) result_type) {
		case CS_CMD_SUCCEED:
			break;
		case CS_CMD_DONE:
			break;
		case CS_CMD_FAIL:
			fprintf(stderr, "ct_results() result_type CS_CMD_FAIL.\n");
			/* return CS_FAIL; */
			break;
		default:
			fprintf(stderr, "ct_results() unexpected result_type.\n");
			return CS_FAIL;
		}
	}
	switch ((int) results_ret) {
	case CS_END_RESULTS:
		break;
	case CS_FAIL:
		fprintf(stderr, "ct_results() failed.\n");
		return CS_FAIL;
		break;
	default:
		fprintf(stderr, "ct_results() unexpected return.\n");
		return CS_FAIL;
	}

	return CS_SUCCEED;
}

CS_INT
cslibmsg_cb(CS_CONTEXT * connection, CS_CLIENTMSG * errmsg)
{
	cslibmsg_cb_invoked++;
	fprintf(stderr, "\nCS-Library Message:\n");
	fprintf(stderr, "number %d layer %d origin %d severity %d number %d\n",
		errmsg->msgnumber,
		CS_LAYER(errmsg->msgnumber),
		CS_ORIGIN(errmsg->msgnumber), CS_SEVERITY(errmsg->msgnumber), CS_NUMBER(errmsg->msgnumber));
	fprintf(stderr, "msgstring: %s\n", errmsg->msgstring);
	fprintf(stderr, "osstring: %s\n", (errmsg->osstringlen > 0)
		? errmsg->osstring : "(null)");
	return CS_SUCCEED;
}



CS_RETCODE
clientmsg_cb(CS_CONTEXT * context, CS_CONNECTION * connection, CS_CLIENTMSG * errmsg)
{
	clientmsg_cb_invoked++;
	fprintf(stderr, "\nOpen Client Message:\n");
	fprintf(stderr, "number %d layer %d origin %d severity %d number %d\n",
		errmsg->msgnumber,
		CS_LAYER(errmsg->msgnumber),
		CS_ORIGIN(errmsg->msgnumber), CS_SEVERITY(errmsg->msgnumber), CS_NUMBER(errmsg->msgnumber));
	fprintf(stderr, "msgstring: %s\n", errmsg->msgstring);
	fprintf(stderr, "osstring: %s\n", (errmsg->osstringlen > 0)
		? errmsg->osstring : "(null)");
	return CS_SUCCEED;
}

CS_RETCODE
servermsg_cb(CS_CONTEXT * context, CS_CONNECTION * connection, CS_SERVERMSG * srvmsg)
{
	servermsg_cb_invoked++;
	fprintf(stderr, "\nServer Message:\n");
	fprintf(stderr, "number %d severity %d state %d line %d\n",
		srvmsg->msgnumber, srvmsg->severity, srvmsg->state, srvmsg->line);
	fprintf(stderr, "server: %s\n", (srvmsg->svrnlen > 0)
		? srvmsg->svrname : "(null)");
	fprintf(stderr, "proc: %s\n", (srvmsg->proclen > 0)
		? srvmsg->proc : "(null)");
	fprintf(stderr, "text: %s\n", srvmsg->text);
	return CS_SUCCEED;
}
