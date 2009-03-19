/*
 *  * Copyright (C) Getco LLC
 *   */

#ifndef _VIADUCTDMYSQL_H_INCLUDED_
#define _VIADUCTMYSQL_H_INCLUDED_

#include "mysql.h"
#include "viaduct.h"

#define TRUE 1
#define FALSE 0

typedef struct mysql_db_s {
   MYSQL *mysql;
   MYSQL_RES *result;
   MYSQL_ROW row;
   MYSQL_FIELD *field;
} mysql_db_t;

void viaduct_mysql_init();
void *viaduct_mysql_connect(viaduct_request_t *request);
void viaduct_mysql_close(void *db);
void viaduct_mysql_assign_request(void *db, viaduct_request_t *request);
int viaduct_mysql_is_quoted(void *db, int colnum);;
int viaduct_mysql_connected(void *db);
int viaduct_mysql_change_db(void *db, char *database);
int viaduct_mysql_exec(void *db, char *sql);
int viaduct_mysql_rowcount(void *db);
int viaduct_mysql_has_results(void *db);
int viaduct_mysql_numcols(void *db);
char *viaduct_mysql_colname(void *db, int colnum);
void viaduct_mysql_coltype(void *db, int colnum, char *dest);
int viaduct_mysql_collen(void *db, int colnum);
int viaduct_mysql_colprec(void *db, int colnum);
int viaduct_mysql_colscale(void *db, int colnum);
int viaduct_mysql_fetch_row(void *db);
char *viaduct_mysql_colvalue(void *db, int colnum, char *dest);
char *viaduct_mysql_error(void *db);

#endif
