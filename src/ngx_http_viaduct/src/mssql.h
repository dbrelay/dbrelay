/*
 * Copyright (C) Getco LLC
 */

#ifndef _VIADUCTDMSSQL_H_INCLUDED_
#define _VIADUCTMSSQL_H_INCLUDED_

#include "viaduct.h"
#include <sybdb.h>

typedef struct mssql_db_s {
    LOGINREC *login;
    DBPROCESS *dbproc;
    char colval[256][256];
    int colnull[256];
} mssql_db_t;

void viaduct_mssql_init();
void *viaduct_mssql_connect(viaduct_request_t *request);
void viaduct_mssql_close(void *db);
void viaduct_mssql_assign_request(void *db, viaduct_request_t *request);
int viaduct_mssql_is_quoted(void *db, int colnum);;
int viaduct_mssql_connected(void *db);
int viaduct_mssql_change_db(void *db, char *database);
int viaduct_mssql_exec(void *db, char *sql);
int viaduct_mssql_rowcount(void *db);
int viaduct_mssql_has_results(void *db);
int viaduct_mssql_numcols(void *db);
char *viaduct_mssql_colname(void *db, int colnum);
void viaduct_mssql_coltype(void *db, int colnum, char *dest);
int viaduct_mssql_collen(void *db, int colnum);
int viaduct_mssql_colprec(void *db, int colnum);
int viaduct_mssql_colscale(void *db, int colnum);
int viaduct_mssql_fetch_row(void *db);
char *viaduct_mssql_colvalue(void *db, int colnum, char *dest);
char *viaduct_mssql_error(void *db);
char *viaduct_mssql_catalogsql(int dbcmd, char **params);

#endif
