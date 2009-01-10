/*
 * Copyright (C) Getco LLC
 */

#ifndef _VIADUCTDB_H_INCLUDED_
#define _VIADUCTDB_H_INCLUDED_

#include <stdlib.h>
#include <time.h>

#ifndef CMDLINE
#include <ngx_core.h>
#endif

#include <sybdb.h>
#include "stringbuf.h"
#include "json.h"

#define VIADUCT_MAX_PARAMS 100

#define VIADUCT_LOG_SCOPE_SERVER 1
#define VIADUCT_LOG_SCOPE_CONN 2
#define VIADUCT_LOG_SCOPE_QUERY 3

#define VIADUCT_LOG_LVL_DEBUG   1
#define VIADUCT_LOG_LVL_INFO    2
#define VIADUCT_LOG_LVL_NOTICE  3
#define VIADUCT_LOG_LVL_WARN    4
#define VIADUCT_LOG_LVL_ERROR   5
#define VIADUCT_LOG_LVL_CRIT    6

#ifdef CMDLINE
   typedef struct ngx_log_s {} ngx_log_t;
   typedef unsigned char u_char;
#endif

typedef struct {
   char *sql_server;
   char *sql_port;
   char *sql_database;
   char *sql_user;
   char *sql_password;
   char *sql;
   char *query_tag;
   char *connection_name;
   long connection_timeout;
   int connection_keepalive;
   int log_level;
   int log_level_scope;
   ngx_log_t *log;
   char error_message[4000];
   char *params[VIADUCT_MAX_PARAMS];
} viaduct_request_t;

typedef struct {
   char *sql_server;
   char *sql_port;
   char *sql_database;
   char *sql_user;
   char *sql_password;
   char *connection_name;
   long connection_timeout;
   time_t tm_create;
   time_t tm_accessed;
   LOGINREC *login;
   DBPROCESS *dbproc;
   unsigned char in_use;
   unsigned int slot;
} viaduct_connection_t;

u_char *viaduct_db_run_query(viaduct_request_t *request);
int viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);
int
viaduct_db_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line);

void viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...);

viaduct_request_t *viaduct_alloc_request();
void viaduct_free_request(viaduct_request_t *request);


#endif /* _VIADUCT_H_INCLUDED_ */
