/*
 * Copyright (C) Getco LLC
 */

#ifndef _VIADUCTDB_H_INCLUDED_
#define _VIADUCTDB_H_INCLUDED_

#include <stdlib.h>
#include <time.h>
#include <unistd.h>
#include <sys/ipc.h>
#include "../include/config.h"

#ifndef CMDLINE
#include <ngx_core.h>
#include <ngx_config.h>
#endif

#include "stringbuf.h"
#include "json.h"

#define VIADUCT_MAX_CONN 1000
#define VIADUCT_MAX_PARAMS 100
#define VIADUCT_OBJ_SZ 31
#define VIADUCT_NAME_SZ 101
#define VIADUCT_SOCKET_BUFSIZE 4096

#define VIADUCT_LOG_SCOPE_SERVER 1
#define VIADUCT_LOG_SCOPE_CONN 2
#define VIADUCT_LOG_SCOPE_QUERY 3

#ifndef CMDLINE
#define VIADUCT_LOG_LVL_DEBUG   NGX_LOG_DEBUG
#define VIADUCT_LOG_LVL_INFO    NGX_LOG_INFO
#define VIADUCT_LOG_LVL_NOTICE  NGX_LOG_NOTICE
#define VIADUCT_LOG_LVL_WARN    NGX_LOG_WARN
#define VIADUCT_LOG_LVL_ERROR   NGX_LOG_ERR
#define VIADUCT_LOG_LVL_CRIT    NGX_LOG_CRIT
#else
#define VIADUCT_LOG_LVL_DEBUG   1
#define VIADUCT_LOG_LVL_INFO    2
#define VIADUCT_LOG_LVL_NOTICE  3
#define VIADUCT_LOG_LVL_WARN    4
#define VIADUCT_LOG_LVL_ERROR   5
#define VIADUCT_LOG_LVL_CRIT    6
#endif

#ifdef CMDLINE
   typedef struct ngx_log_s {} ngx_log_t;
   typedef unsigned char u_char;
#endif

#if HAVE_MSG_NOSIGNAL
#define NET_FLAGS MSG_NOSIGNAL
#else
#define NET_FLAGS 0
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
   char sql_dbtype[VIADUCT_OBJ_SZ];
   char remote_addr[VIADUCT_OBJ_SZ];
   char sock_path[256];  /* explicitly specify socket path */
   unsigned char noecho;
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
   unsigned char in_use;
   unsigned int slot;
   pid_t pid;
   pid_t helper_pid;
   char sock_path[VIADUCT_NAME_SZ];
   void *db;
} viaduct_connection_t;

typedef void (*viaduct_db_init)(void);
typedef void *(*viaduct_db_connect)(viaduct_request_t *request);
typedef void (*viaduct_db_close)(void *db);
typedef void (*viaduct_db_assign_request)(void *db, viaduct_request_t *request);
typedef int (*viaduct_db_is_quoted)(void *db, int colnum);;
typedef int (*viaduct_db_connected)(void *db);
typedef int (*viaduct_db_change_db)(void *db, char *database);
typedef int (*viaduct_db_exec)(void *db, char *sql);
typedef int (*viaduct_db_rowcount)(void *db);
typedef int (*viaduct_db_has_results)(void *db);
typedef int (*viaduct_db_numcols)(void *db);
typedef char *(*viaduct_db_colname)(void *db, int colnum);
typedef void (*viaduct_db_coltype)(void *db, int colnum, char *dest);
typedef int (*viaduct_db_collen)(void *db, int colnum);
typedef int (*viaduct_db_colprec)(void *db, int colnum);
typedef int (*viaduct_db_colscale)(void *db, int colnum);
typedef int (*viaduct_db_fetch_row)(void *db);
typedef char *(*viaduct_db_colvalue)(void *db, int colnum, char *dest);
typedef char *(*viaduct_db_error)(void *db);

typedef struct {
   viaduct_db_init init;
   viaduct_db_connect connect;
   viaduct_db_close close;
   viaduct_db_assign_request assign_request;
   viaduct_db_is_quoted is_quoted;
   viaduct_db_connected connected;
   viaduct_db_change_db change_db;
   viaduct_db_exec exec;
   viaduct_db_rowcount rowcount;
   viaduct_db_has_results has_results;
   viaduct_db_numcols numcols;
   viaduct_db_colname colname;
   viaduct_db_coltype coltype;
   viaduct_db_collen collen;
   viaduct_db_colprec colprec;
   viaduct_db_colscale colscale;
   viaduct_db_fetch_row fetch_row;
   viaduct_db_colvalue colvalue;
   viaduct_db_error error;
} viaduct_dbapi_t;

u_char *viaduct_db_run_query(viaduct_request_t *request);
u_char *viaduct_db_status(viaduct_request_t *request);

void viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...);
void viaduct_log_info(viaduct_request_t *request, const char *fmt, ...);
void viaduct_log_notice(viaduct_request_t *request, const char *fmt, ...);
void viaduct_log_warn(viaduct_request_t *request, const char *fmt, ...);
void viaduct_log_error(viaduct_request_t *request, const char *fmt, ...);

viaduct_request_t *viaduct_alloc_request();
void viaduct_free_request(viaduct_request_t *request);

/* shmem.c */
void viaduct_create_shmem();
viaduct_connection_t *viaduct_get_shmem();
void viaduct_release_shmem(viaduct_connection_t *connections);
void viaduct_destroy_shmem();
key_t viaduct_get_ipc_key();

/* connection.c */
char *viaduct_conn_send_request(int s, viaduct_request_t *request, int *error);
void viaduct_conn_set_option(int s, char *option, char *value);
pid_t viaduct_conn_launch_connector(char *sock_path);
u_char *viaduct_exec_query(viaduct_connection_t *conn, char *database, char *sql); 
void viaduct_conn_kill(int s);
void viaduct_conn_close(int s);

/* socket.c */
int viaduct_socket_connect(char *sock_path);
int viaduct_socket_recv_string(int s, char *in_buf, int *in_ptr, char *out_buf);
void viaduct_socket_send_string(int s, char *str);

#endif /* _VIADUCT_H_INCLUDED_ */
