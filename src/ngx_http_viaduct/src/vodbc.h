/*
 *  * Copyright (C) Getco LLC
 *   */

#ifndef _VIADUCTDMYSQL_H_INCLUDED_
#define _VIADUCTMYSQL_H_INCLUDED_

#include "sql.h"
#include "sqlext.h"
#include "viaduct.h"

#define TRUE 1
#define FALSE 0

typedef struct odbc_db_s {
   SQLHENV env;
   SQLHDBC dbc;
   SQLHSTMT stmt;
   char tmpbuf[256];
} odbc_db_t;

void viaduct_odbc_init();
void *viaduct_odbc_connect(viaduct_request_t *request);
void viaduct_odbc_close(void *db);
void viaduct_odbc_assign_request(void *db, viaduct_request_t *request);
int viaduct_odbc_is_quoted(void *db, int colnum);;
int viaduct_odbc_connected(void *db);
int viaduct_odbc_change_db(void *db, char *database);
int viaduct_odbc_exec(void *db, char *sql);
int viaduct_odbc_rowcount(void *db);
int viaduct_odbc_has_results(void *db);
int viaduct_odbc_numcols(void *db);
char *viaduct_odbc_colname(void *db, int colnum);
void viaduct_odbc_coltype(void *db, int colnum, char *dest);
int viaduct_odbc_collen(void *db, int colnum);
int viaduct_odbc_colprec(void *db, int colnum);
int viaduct_odbc_colscale(void *db, int colnum);
int viaduct_odbc_fetch_row(void *db);
char *viaduct_odbc_colvalue(void *db, int colnum, char *dest);
char *viaduct_odbc_error(void *db);

#endif
