
/*
 * Copyright (C) Getco LLC
 */

#include "stringbuf.h"
#include "vodbc.h"

#define IS_SET(x) (x && strlen(x)>0)

viaduct_dbapi_t viaduct_odbc_api = 
{
   &viaduct_odbc_init,
   &viaduct_odbc_connect,
   &viaduct_odbc_close,
   &viaduct_odbc_assign_request,
   &viaduct_odbc_is_quoted,
   &viaduct_odbc_connected,
   &viaduct_odbc_change_db,
   &viaduct_odbc_exec,
   &viaduct_odbc_rowcount,
   &viaduct_odbc_has_results,
   &viaduct_odbc_numcols,
   &viaduct_odbc_colname,
   &viaduct_odbc_coltype,
   &viaduct_odbc_collen,
   &viaduct_odbc_colprec,
   &viaduct_odbc_colscale,
   &viaduct_odbc_fetch_row,
   &viaduct_odbc_colvalue,
   &viaduct_odbc_error
};

void viaduct_odbc_init()
{
}
void *viaduct_odbc_connect(viaduct_request_t *request)
{
   odbc_db_t *odbc = (odbc_db_t *)malloc(sizeof(odbc_db_t));
   SQLRETURN ret;

   SQLAllocHandle(SQL_HANDLE_ENV, SQL_NULL_HANDLE, &odbc->env);
   SQLAllocHandle(SQL_HANDLE_DBC, env, &odbc->dbc);

   ret = SQLDriverConnect(odbc->dbc, NULL, request->server, SQL_NTS, NULL, 0, SQL_DRIVER_COMPLETE);

   if (SQL_SUCCEEDED(ret)) {
      if (odbc->dbc) SQLFreeHandle(SQL_HANDLE_ENV, odbc->env);
      if (odbc->env) SQLFreeHandle(SQL_HANDLE_ENV, odbc->env);
      return NULL;
   }

   return ((void *) odbc);
}
void viaduct_odbc_close(void *db)
{
   odbc_db_t *odbc = (odbc_db_t *) db;

   if (odbc->stmt) SQLFreeHandle(SQL_HANDLE_DBC, odbc->stmt);
   if (odbc->dbc) {
      SQLDisconnect(odbc->dbc);
      SQLFreeHandle(SQL_HANDLE_DBC, odbc->dbc);
   }
   if (odbc->env) SQLFreeHandle(SQL_HANDLE_ENV, odbc->env);
   odbc->stmt=NULL;
   odbc->dbc=NULL;
   odbc->env=NULL;
}
void viaduct_odbc_assign_request(void *db, viaduct_request_t *request)
{
}
int viaduct_odbc_is_quoted(void *db, int colnum)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLSMALLINT *coltype;
   
   SQLDescribeCol(odbc->stmt, colnum, NULL, NULL, NULL, &coltype, NULL, NULL, NULL); 

   switch (coltype) {
      case SQL_CHAR:
      case SQL_VARCHAR:
      case SQL_LONGVARCHAR:
      case SQL_WCHAR:
      case SQL_WVARCHAR:
      case SQL_WLONGVARCHAR:
      case SQL_DATE:
      case SQL_TIME:
      case SQL_TIMESTAMP:
         return 1;
         break;
      case SQL_DECIMAL:
      case SQL_NUMERIC:
      case SQL_SMALLINT:
      case SQL_INTEGER:
      case SQL_REAL:
      case SQL_FLOAT:
      case SQL_DOUBLE:
      case SQL_BIT:
      case SQL_TINYINT:
      case SQL_BIGINT:
      case SQL_BINARY:
      case SQL_VARBINARY:
      case SQL_LONGVARBINARY:
      default:
         return 0;
         break;
}
static char *viaduct_odbc_get_sqltype_string(char *dest, int coltype, int collen)
{
   switch (coltype) {
      case SQL_CHAR:
         sprintf(dest, "char");
         break;
      case SQL_VARCHAR:
      case SQL_LONGVARCHAR:
         sprintf(dest, "varchar");
         break;
      case SQL_WCHAR:
         sprintf(dest, "wchar");
         break;
      case SQL_WVARCHAR:
      case SQL_WLONGVARCHAR:
         sprintf(dest, "wvarchar");
         break;
      case SQL_DATE:
         sprintf(dest, "date");
         break;
      case SQL_TIME:
         sprintf(dest, "time");
         break;
      case SQL_TIMESTAMP:
         sprintf(dest, "timestamp");
         break;
      case SQL_DECIMAL:
         sprintf(dest, "decimal");
         break;
      case SQL_NUMERIC:
         sprintf(dest, "numeric");
         break;
      case SQL_SMALLINT:
         sprintf(dest, "smallint");
         break;
      case SQL_INTEGER:
         sprintf(dest, "integer");
         break;
      case SQL_REAL:
         sprintf(dest, "real");
         break;
      case SQL_FLOAT:
         sprintf(dest, "float");
         break;
      case SQL_DOUBLE:
         sprintf(dest, "double");
         break;
      case SQL_BIT:
         sprintf(dest, "bit");
         break;
      case SQL_TINYINT:
         sprintf(dest, "tinyint");
         break;
      case SQL_BIGINT:
         sprintf(dest, "bigint");
         break;
      case SQL_BINARY:
         sprintf(dest, "binary");
         break;
      case SQL_VARBINARY:
      case SQL_LONGVARBINARY:
         sprintf(dest, "varbinary");
         break;
      default:
         sprintf(dest, "unknown");
         break;
   }
   return dest;
}
static unsigned char viaduct_odbc_has_length(int coltype)
{
   switch (coltype) {
      case SQL_CHAR:
      case SQL_VARCHAR:
      case SQL_LONGVARCHAR:
      case SQL_WCHAR:
      case SQL_WVARCHAR:
      case SQL_WLONGVARCHAR:
         return 1;
    }
    return 0;
}
static unsigned char viaduct_odbc_has_prec(int coltype)
{
	if (coltype==SQL_DECIMAL || SQL_NUMERIC)
		return 1;
	else
		return 0;
}
int viaduct_odbc_connected(void *db)
{
   odbc_db_t *odbc = (odbc_db_t *) db;

   if (!odbc || odbc->dbc==NULL) return FALSE;
   return TRUE;
}
int viaduct_odbc_change_db(void *db, char *database)
{
   return TRUE;
}
int viaduct_odbc_exec(void *db, char *sql)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLRETURN ret;

   SQLAllocHandle(SQL_HANDLE_STMT, dbc, &odbc->stmt);

   ret = SQLExecDirect(odbc->stmt, sql, SQL_NTS);
   if (SQL_SUCEEDED(ret)) return TRUE;
   return FALSE;
}
int viaduct_odbc_rowcount(void *db)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLRETURN ret;
   SQLLEN rowcount;

   ret = SQLRowCount(odbc->stmt, &rowcount);
   
   return rowcount;
}
int viaduct_odbc_has_results(void *db)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLRETURN ret;
   SQLSMALLINT numcols;

   ret = SQLNumResultCols(odbc->stmt, &numcols);
   if (numcols==0) return FALSE;
   return TRUE;
}
int viaduct_odbc_numcols(void *db)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLRETURN ret;
   SQLSMALLINT numcols;

   ret = SQLNumResultCols(odbc->stmt, &numcols);
   return numcols;
}
char *viaduct_odbc_colname(void *db, int colnum)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLSMALLINT namelen;

   SQLDescribeCol(odbc->stmt, colnum, odbc->tmpbuf, 256, &namelen, NULL, NULL, NULL, NULL); 
   tmpbuf[namelen]='\0';

   return odbc->tmpbuf;
}
void viaduct_odbc_coltype(void *db, int colnum, char *dest)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLSMALLINT coltype;
   SQLULEN collen;
   
   SQLDescribeCol(odbc->stmt, colnum, NULL, NULL, NULL, &coltype, &collen, NULL, NULL); 
   viaduct_odbc_get_sqltype_string(dest, coltype, collen);
}
int viaduct_odbc_collen(void *db, int colnum)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLULEN collen;

   SQLDescribeCol(odbc->stmt, colnum, NULL, NULL, NULL, NULL, &collen, NULL, NULL); 

   return collen;
}
int viaduct_odbc_colprec(void *db, int colnum)
{
   return viaduct_odbc_collen(db, colnum)
}
int viaduct_odbc_colscale(void *db, int colnum)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLSMALLINT digits;

   SQLDescribeCol(odbc->stmt, colnum, NULL, NULL, NULL, NULL, NULL, &digits, NULL); 
   return digits;
}
int viaduct_odbc_fetch_row(void *db)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLRETURN ret;

   ret = SQLFetch(odbc->stmt);
   if (SQL_SUCCEEDED(ret)) return TRUE;
   return FALSE;
}
char *viaduct_odbc_colvalue(void *db, int colnum, char *dest)
{
   odbc_db_t *odbc = (odbc_db_t *) db;
   SQLLEN null;

   SQLGetData(odbc->stmt, colnum, SQL_C_CHAR, dest, 256, &null);
   if (null==SQL_NULL_DATA) return NULL;

   return dest;
}

char *viaduct_odbc_error(void *db)
{
    return NULL;
}
