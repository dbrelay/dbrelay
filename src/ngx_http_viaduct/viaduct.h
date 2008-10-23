/*
 * Copyright (C) Getco LLC
 */

#ifndef _VIADUCTDB_H_INCLUDED_
#define _VIADUCTDB_H_INCLUDED_

#include <ngx_core.h>
#include <sybdb.h>
#include "stringbuf.h"
#include "json.h"

#define VIADUCT_LOG_SCOPE_SERVER 1
#define VIADUCT_LOG_SCOPE_CONN 2
#define VIADUCT_LOG_SCOPE_QUERY 3

#define VIADUCT_LOG_LVL_DEBUG   1
#define VIADUCT_LOG_LVL_INFO    2
#define VIADUCT_LOG_LVL_NOTICE  3
#define VIADUCT_LOG_LVL_WARN    4
#define VIADUCT_LOG_LVL_ERROR   5
#define VIADUCT_LOG_LVL_CRIT    6

typedef struct {
   char sql_server[100];
   char sql_port[100];
   char sql_database[100];
   char sql_user[100];
   char sql_password[100];
   char sql[4000];
   char query_tag[100];
   char connection_name[100];
   long connection_timeout;
   int log_level;
   int log_level_scope;
   ngx_log_t *log;
} viaduct_request_t;

typedef struct {
   time_t tm_create;
   time_t tm_accessed;
   LOGINREC *login;
   DBPROCESS *dbproc;
   unsigned char in_use;
} viaduct_connection_t;

u_char *viaduct_db_run_query(viaduct_request_t *request);
int viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);
void viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...);


#endif /* _VIADUCT_H_INCLUDED_ */
