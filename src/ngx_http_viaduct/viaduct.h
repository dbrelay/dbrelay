/*
 * Copyright (C) Getco LLC
 */

#ifndef _VIADUCTDB_H_INCLUDED_
#define _VIADUCTDB_H_INCLUDED_

#include <stdlib.h>
#include <time.h>
#include <unistd.h>

#ifndef CMDLINE
#include <ngx_core.h>
#endif

#include <sybdb.h>
#include "stringbuf.h"
#include "json.h"

#define VIADUCT_MAX_CONN 1000
#define VIADUCT_MAX_PARAMS 100
#define VIADUCT_OBJ_SZ 31
#define VIADUCT_NAME_SZ 101

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
   int status;
   char sql_server[VIADUCT_NAME_SZ];
   char sql_port[6];
   char sql_database[VIADUCT_OBJ_SZ];
   char sql_user[VIADUCT_OBJ_SZ];
   char sql_password[VIADUCT_OBJ_SZ];
   char *sql;
   char query_tag[VIADUCT_NAME_SZ];
   char connection_name[VIADUCT_NAME_SZ];
   long connection_timeout;
   int http_keepalive;
   int log_level;
   int log_level_scope;
   ngx_log_t *log;
   char error_message[4000];
   char *params[VIADUCT_MAX_PARAMS];
} viaduct_request_t;

typedef struct {
   char sql_server[VIADUCT_NAME_SZ];
   char sql_port[6];
   char sql_database[VIADUCT_OBJ_SZ];
   char sql_user[VIADUCT_OBJ_SZ];
   char sql_password[VIADUCT_OBJ_SZ];
   char connection_name[VIADUCT_NAME_SZ];
   long connection_timeout;
   time_t tm_create;
   time_t tm_accessed;
   LOGINREC *login;
   DBPROCESS *dbproc;
   unsigned char in_use;
   unsigned int slot;
   pid_t pid;
} viaduct_connection_t;


u_char *viaduct_db_run_query(viaduct_request_t *request);
u_char *viaduct_db_status(viaduct_request_t *request);
int viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);
int
viaduct_db_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line);

void viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...);

viaduct_request_t *viaduct_alloc_request();
void viaduct_free_request(viaduct_request_t *request);

void viaduct_create_shmem();
viaduct_connection_t *viaduct_get_shmem();
void viaduct_release_shmem(viaduct_connection_t *connections);

#endif /* _VIADUCT_H_INCLUDED_ */
