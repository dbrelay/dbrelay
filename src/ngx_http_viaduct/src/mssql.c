
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"
#include "stringbuf.h"
#include "mssql.h"

#define IS_SET(x) (x && strlen(x)>0)

viaduct_dbapi_t viaduct_mssql_api = 
{
   &viaduct_mssql_init,
   &viaduct_mssql_connect,
   &viaduct_mssql_close,
   &viaduct_mssql_assign_request,
   &viaduct_mssql_is_quoted,
   &viaduct_mssql_connected,
   &viaduct_mssql_change_db,
   &viaduct_mssql_exec,
   &viaduct_mssql_rowcount,
   &viaduct_mssql_has_results,
   &viaduct_mssql_numcols,
   &viaduct_mssql_colname,
   &viaduct_mssql_coltype,
   &viaduct_mssql_collen,
   &viaduct_mssql_colprec,
   &viaduct_mssql_colscale,
   &viaduct_mssql_fetch_row,
   &viaduct_mssql_colvalue,
   &viaduct_mssql_error
};

int viaduct_mssql_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line);
int viaduct_mssql_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);


/* I'm not particularly happy with this, in order to return a detailed message 
 * from the msg handler, we have to use a static buffer because there is no
 * dbproc to dbsetuserdata() on.  This will go away when we change out the 
 * dblib API.
 */
static char login_error[500];
static int login_msgno;

void viaduct_mssql_init()
{
   dberrhandle(viaduct_mssql_err_handler);
   dbmsghandle(viaduct_mssql_msg_handler);
}
void *viaduct_mssql_connect(viaduct_request_t *request)
{
   char tmpbuf[30];
   int len; 
   mssql_db_t *mssql = (mssql_db_t *) malloc(sizeof(mssql_db_t));

   dberrhandle(viaduct_mssql_err_handler);
   dbmsghandle(viaduct_mssql_msg_handler);

   mssql->login = dblogin();
   if (IS_SET(request->sql_password)) 
    DBSETLPWD(mssql->login, request->sql_password); 
   else
    DBSETLPWD(mssql->login, NULL);
   DBSETLUSER(mssql->login, request->sql_user);
   if (IS_SET(request->connection_name)) {
      memset(tmpbuf, '\0', sizeof(tmpbuf));
      strcpy(tmpbuf, "viaduct (");
      len = strlen("viaduct (");
      strncat(tmpbuf, request->connection_name, sizeof(tmpbuf) - len - 3);
      strcat(tmpbuf, ")");
      DBSETLAPP(mssql->login, tmpbuf);
   } else {
      DBSETLAPP(mssql->login, "viaduct");
   }
 
   mssql->dbproc = dbopen(mssql->login, request->sql_server);
   dbsetuserdata(mssql->dbproc, (BYTE *)request);

   //conn->db = (void *) mssql;
   //conn->login = mssql->login;
   //conn->dbproc = mssql->dbproc;

   return (void *) mssql;
}
void viaduct_mssql_close(void *db)
{
   mssql_db_t *mssql = (mssql_db_t *) db;

   if (mssql->dbproc) dbclose(mssql->dbproc);
}
void viaduct_mssql_assign_request(void *db, viaduct_request_t *request)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   dbsetuserdata(mssql->dbproc, (BYTE *) request);
}
int viaduct_mssql_is_quoted(void *db, int colnum)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   int coltype = dbcoltype(mssql->dbproc, colnum);

   if (coltype == SYBVARCHAR ||
       coltype == SYBCHAR ||
       coltype == SYBTEXT ||
       coltype == SYBDATETIMN ||
       coltype == SYBDATETIME ||
       coltype == SYBDATETIME4) 
          return 1;
   else return 0;
}
static char *viaduct_mssql_get_sqltype_string(char *dest, int coltype, int collen)
{
	switch (coltype) {
		case SYBVARCHAR : 
			sprintf(dest, "varchar");
			break;
		case SYBCHAR : 
			sprintf(dest, "char");
			break;
		case SYBINT4 : 
		case SYBINT2 : 
		case SYBINT1 : 
		case SYBINTN : 
			if (collen==1)
				sprintf(dest, "tinyint");
			else if (collen==2)
				sprintf(dest, "smallint");
			else if (collen==4)
				sprintf(dest, "int");
			break;
		case SYBFLT8 : 
		case SYBREAL : 
		case SYBFLTN : 
			if (collen==4) 
			    sprintf(dest, "real");
			else if (collen==8) 
			    sprintf(dest, "float");
			break;
		case SYBMONEY : 
			    sprintf(dest, "money");
			break;
		case SYBMONEY4 : 
			    sprintf(dest, "smallmoney");
			break;
		case SYBIMAGE : 
			    sprintf(dest, "image");
			break;
		case SYBTEXT : 
			    sprintf(dest, "text");
			break;
		case SYBBIT : 
			    sprintf(dest, "bit");
			break;
		case SYBDATETIME4 : 
		case SYBDATETIME : 
		case SYBDATETIMN : 
			if (collen==4)
				sprintf(dest, "smalldatetime");
			else if (collen==8)
				sprintf(dest, "datetime");
			break;
		case SYBNUMERIC : 
			sprintf(dest, "numeric");
			break;
		case SYBDECIMAL : 
			sprintf(dest, "decimal");
			break;
		default : 
			sprintf(dest, "unknown type %d", coltype);
			break;
	}
	return dest;
}
static unsigned char viaduct_mssql_has_length(int coltype)
{
	if (coltype==SYBVARCHAR || coltype==SYBCHAR)
		return 1;
	else
		return 0;
}
static unsigned char viaduct_mssql_has_prec(int coltype)
{
	if (coltype==SYBDECIMAL || coltype==SYBNUMERIC)
		return 1;
	else
		return 0;
}
int viaduct_mssql_connected(void *db)
{
   mssql_db_t *mssql = (mssql_db_t *) db;

   if (!mssql || mssql->dbproc==NULL) return FALSE;
   return TRUE;
}
int viaduct_mssql_change_db(void *db, char *database)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   RETCODE rc;

   rc = dbuse(mssql->dbproc, database);
   if (rc!=SUCCEED) 
      return FALSE;
   return TRUE;
}
int viaduct_mssql_exec(void *db, char *sql)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   RETCODE rc;

   rc = dbcmd(mssql->dbproc, sql);
   rc = dbsqlexec(mssql->dbproc);

   if (rc!=SUCCEED) 
      return FALSE;

   return TRUE;
}
int viaduct_mssql_rowcount(void *db)
{
   mssql_db_t *mssql = (mssql_db_t *) db;

   return dbcount(mssql->dbproc);
}
int viaduct_mssql_has_results(void *db)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   int colnum;
   int numcols;
   RETCODE rc;

   if ((rc = dbresults(mssql->dbproc)) == NO_MORE_RESULTS) return FALSE;

   numcols = dbnumcols(mssql->dbproc);
   for (colnum=1; colnum<=numcols; colnum++) {
      dbbind(mssql->dbproc, colnum, NTBSTRINGBIND, 0, (BYTE *) &(mssql->colval[colnum-1]));
      dbnullbind(mssql->dbproc, colnum, (DBINT *) &(mssql->colnull[colnum-1]));
   }
   return TRUE;
}
int viaduct_mssql_numcols(void *db)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   return dbnumcols(mssql->dbproc);
}
char *viaduct_mssql_colname(void *db, int colnum)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   return dbcolname(mssql->dbproc, colnum);
}
void viaduct_mssql_coltype(void *db, int colnum, char *dest)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   viaduct_mssql_get_sqltype_string(dest, dbcoltype(mssql->dbproc, colnum), dbcollen(mssql->dbproc, colnum));
}
int viaduct_mssql_collen(void *db, int colnum)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   return dbcollen(mssql->dbproc, colnum);
}
int viaduct_mssql_colprec(void *db, int colnum)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   DBTYPEINFO *typeinfo;

   if (viaduct_mssql_has_prec(dbcoltype(mssql->dbproc, colnum))) {
       typeinfo = dbcoltypeinfo(mssql->dbproc, colnum);
       return typeinfo->precision;
    }
    return 0;
}
int viaduct_mssql_colscale(void *db, int colnum)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   DBTYPEINFO *typeinfo;

   if (viaduct_mssql_has_prec(dbcoltype(mssql->dbproc, colnum))) {
       typeinfo = dbcoltypeinfo(mssql->dbproc, colnum);
       return typeinfo->scale;
   }
   return 0; 
}
int viaduct_mssql_fetch_row(void *db)
{
   mssql_db_t *mssql = (mssql_db_t *) db;
   if (dbnextrow(mssql->dbproc)!=NO_MORE_ROWS) return TRUE; 
   return FALSE;
}
char *viaduct_mssql_colvalue(void *db, int colnum, char *dest)
{
   mssql_db_t *mssql = (mssql_db_t *) db;

   if (mssql->colnull[colnum-1]==-1) return NULL;

   strcpy(dest, mssql->colval[colnum-1]);
   return dest;
}

int
viaduct_mssql_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line)
{
   if (dbproc!=NULL) {
      if (msgno==5701 || msgno==5703 || msgno==5704) return 0;

      viaduct_request_t *request = (viaduct_request_t *) dbgetuserdata(dbproc);
      if (request!=NULL) {
         if (IS_SET(msgtext)) 
            strcat(request->error_message, "\n");
         strcat(request->error_message, msgtext);
      } else {
         login_msgno = msgno;
         strcpy(login_error, msgtext);
      }
   }

   return 0;
}
int
viaduct_mssql_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr)
{
   //db_error = strdup(dberrstr);
   if (dbproc!=NULL) {
      //viaduct_request_t *request = (viaduct_request_t *) dbgetuserdata(dbproc);
      //strcat(request->error_message, dberrstr);
   }

   return INT_CANCEL;
}
char *viaduct_mssql_error(void *db)
{
    return login_error;
}
