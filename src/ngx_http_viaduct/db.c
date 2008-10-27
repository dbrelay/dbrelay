
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"

static int viaduct_db_fill_data(json_t *json, DBPROCESS *dbproc);
static viaduct_connection_t *viaduct_db_get_connection(viaduct_request_t *request);

static char *db_error;

#define MAX_CONNECTIONS 10

static viaduct_connection_t *connections[100];

static viaduct_connection_t *viaduct_db_create_connection(viaduct_request_t *request)
{
   viaduct_connection_t *conn = malloc(sizeof(viaduct_connection_t));
   memset(conn, sizeof(viaduct_connection_t), '\0');

   dberrhandle(viaduct_db_err_handler);

   /* copy parameters necessary to do connection hash match */
   if (request->sql_server && strlen(request->sql_server)) 
      conn->sql_server = strdup(request->sql_server);
   if (request->sql_port && strlen(request->sql_port)) 
      conn->sql_port = strdup(request->sql_port);
   if (request->sql_user && strlen(request->sql_user)) 
      conn->sql_user = strdup(request->sql_user);
   if (request->sql_password && strlen(request->sql_password)) 
      conn->sql_password = strdup(request->sql_password);
   if (request->sql_database && strlen(request->sql_database)) 
      conn->sql_database = strdup(request->sql_database);
   if (request->connection_name && strlen(request->connection_name)) 
      conn->connection_name = strdup(request->connection_name);

   conn->connection_timeout = request->connection_timeout ? request->connection_timeout : 60;

   conn->login = dblogin();
   if (request->sql_password!=NULL && strlen(request->sql_password)>0) 
    DBSETLPWD(conn->login, request->sql_password); 
   else
        DBSETLPWD(conn->login, NULL);
   DBSETLUSER(conn->login, request->sql_user);
   DBSETLAPP(conn->login, "viaduct");
   DBSETLHOST(conn->login, request->sql_server);
 
   conn->dbproc = dbopen(conn->login, request->sql_server);
      
   conn->tm_create = time(NULL);
   conn->in_use = TRUE;


   return conn;
}
static viaduct_connection_t *viaduct_db_alloc_connection(viaduct_request_t *request)
{
   int i;

   for (i=0; i<MAX_CONNECTIONS; i++) {
     if (connections[i]==NULL) {
        connections[i] = viaduct_db_create_connection(request);
   	viaduct_log_debug(request, "allocating slot %d to request", i);
        connections[i]->slot = i;
	return connections[i];
     }
   }
   /* we have exhausted the pool, log something sensible and return null */
   viaduct_log_debug(request, "No free connections available!");
   return NULL;
}
static unsigned int match(char *s1, char *s2)
{
   if (s1==NULL && (s2==NULL || strlen(s2)==0)) return TRUE;
   if (s2==NULL && (s1==NULL || strlen(s1)==0)) return TRUE;
   if (s1==NULL || s2==NULL) return FALSE;
   if (!strcmp(s1, s2)) return TRUE;
   return FALSE;
}
static unsigned int viaduct_db_match(viaduct_connection_t *conn, viaduct_request_t *request)
{
   viaduct_log_debug(request, "comparing %s and %s", conn->connection_name, request->connection_name);
   if (match(conn->sql_server, request->sql_server) &&
       match(conn->sql_port, request->sql_port) &&
       match(conn->sql_database, request->sql_database) &&
       match(conn->sql_user, request->sql_user) &&
       match(conn->sql_password, request->sql_password) &&
       match(conn->connection_name, request->connection_name))
         return TRUE;
   else return FALSE;
}
static viaduct_connection_t *viaduct_db_find_connection(viaduct_request_t *request)
{
   viaduct_connection_t *conn;
   int i;

   for (i=0; i<MAX_CONNECTIONS; i++) {
      conn = connections[i];
      if (conn!=NULL && conn->in_use==FALSE) {
         if (viaduct_db_match(conn, request)) {
            viaduct_log_debug(request, "found connection match for request at slot %d", i);
            conn->tm_accessed = time(NULL);
            conn->in_use = TRUE;
            return conn;
         }
      }
   }
   return conn;
}
static void viaduct_db_close_connection(viaduct_connection_t *conn, viaduct_request_t *request)
{
   unsigned int slot;

   viaduct_log_debug(request, "closing connection %ud", conn->slot);

   if (conn->dbproc) dbclose(conn->dbproc);
   if (conn->sql_server) free(conn->sql_server);
   if (conn->sql_user) free(conn->sql_user);
   if (conn->sql_database) free(conn->sql_database);
   //if (conn->sql_port) free(conn->sql_port);
   if (conn->sql_password) free(conn->sql_password);
   if (conn->connection_name) free(conn->connection_name);
   slot = conn->slot;

   free(conn);

   connections[slot]=NULL;
}
static void viaduct_db_close_connections(viaduct_request_t *request)
{
   viaduct_connection_t *conn;
   int i;
   time_t now;

   now = time(NULL);
   for (i=0; i<MAX_CONNECTIONS; i++) {
      conn = connections[i];
      if (conn->tm_accessed + conn->connection_timeout < now) {
         viaduct_log_debug(request, "timing out conection %ud", conn->slot);
         viaduct_db_close_connection(conn, request);
      }
   }
}
static void viaduct_db_free_connection(viaduct_connection_t *conn, viaduct_request_t *request)
{
   conn->in_use = FALSE;
   if (conn->connection_name==NULL || strlen(conn->connection_name)==0)
      viaduct_db_close_connection(conn, request);
}
static viaduct_connection_t *viaduct_db_get_connection(viaduct_request_t *request)
{
   viaduct_connection_t *conn;

   /* if there is no connection name, allocate a new connection */
   if (request->connection_name==NULL) {
      viaduct_log_debug(request, "empty connection name, allocating new");
      return  viaduct_db_alloc_connection(request);
   }

   /* look for an matching idle connection */
   if ((conn = viaduct_db_find_connection(request))==NULL) {
      /* else we need to allocate a new connection */
      conn = viaduct_db_alloc_connection(request);
   }

   return conn;
}

static int viaduct_db_is_quoted(int coltype)
{
   if (coltype == SYBVARCHAR ||
       coltype == SYBCHAR ||
       coltype == SYBDATETIMN ||
       coltype == SYBDATETIME ||
       coltype == SYBDATETIME4) 
          return 1;
   else return 0;
}
static char *viaduct_db_get_sqltype_string(char *dest, int coltype, int collen)
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
static unsigned char viaduct_db_has_length(int coltype)
{
	if (coltype==SYBVARCHAR || coltype==SYBCHAR)
		return 1;
	else
		return 0;
}
static unsigned char viaduct_db_has_prec(int coltype)
{
	if (coltype==SYBDECIMAL || coltype==SYBNUMERIC)
		return 1;
	else
		return 0;
}
u_char *viaduct_db_run_query(viaduct_request_t *request)
{
   /* FIX ME */
   RETCODE rc;
   char error_string[500];
   json_t *json = json_new();
   u_char *ret;
   viaduct_connection_t *conn;

   error_string[0]='\0';

   json_new_object(json);

   json_add_key(json, "request");
   json_new_object(json);
   json_add_string(json, "query_tag", request->query_tag);
   json_add_string(json, "sql_server", request->sql_server);
   json_add_string(json, "sql_user", request->sql_user);

   if (request->sql_port!=NULL && strlen(request->sql_port)>0) 
      json_add_string(json, "sql_port", request->sql_port);

   json_add_string(json, "sql_database", request->sql_database);

/*
 * do not return password back to client
   if (request->sql_password!=NULL && strlen(request->sql_password)>0) 
      json_add_string(json, "sql_password", request->sql_password);
*/

   json_end_object(json);
   
   conn = viaduct_db_get_connection(request);
   viaduct_log_debug(request, "Allocated connection for query");
   if (conn->dbproc==NULL) {
	strcpy(error_string, "Failed to login");
   } else {
   	rc = dbuse(conn->dbproc, request->sql_database);
   	rc = dbcmd(conn->dbproc, request->sql);
   	viaduct_log_debug(request, "Sending sql query");
   	rc = dbsqlexec(conn->dbproc);
   	if (rc==SUCCEED) {
   	   viaduct_log_debug(request, "Filling JSON output");
	   viaduct_db_fill_data(json, conn->dbproc);
	} else {
	   strcpy(error_string, db_error);
	}
   	viaduct_log_debug(request, "Done filling JSON output");
   }
   json_add_key(json, "log");
   json_new_object(json);
   json_add_string(json, "sql", request->sql);
   if (strlen(error_string)) {
      json_add_string(json, "error", error_string);
   }
   json_end_object(json);

   json_end_object(json);

   ret = (u_char *) json_to_string(json);
   json_free(json);
   viaduct_log_debug(request, "Query completed, freeing connection.");
   viaduct_db_free_connection(conn, request);
   return ret;
}
static int viaduct_db_fill_data(json_t *json, DBPROCESS *dbproc)
{
   int numcols, colnum;
   RETCODE rc;
   char tmp[100];
   char colval[256][31];
   int colnull[256];
   DBTYPEINFO *typeinfo;

   json_add_key(json, "data");
   json_new_array(json);
   while ((rc = dbresults(dbproc)) != NO_MORE_RESULTS) 
   {
	json_new_object(json);
	json_add_key(json, "fields");
	json_new_array(json);

	numcols = dbnumcols(dbproc);
	for (colnum=1; colnum<=numcols; colnum++) {
	    json_new_object(json);
	    json_add_string(json, "name", dbcolname(dbproc, colnum));
            viaduct_db_get_sqltype_string(tmp, dbcoltype(dbproc, colnum), dbcollen(dbproc, colnum));
	    json_add_string(json, "sql_type", tmp);
            //if (viaduct_db_has_length(dbcoltype(dbproc, colnum))) {
            sprintf(tmp, "%d", dbcollen(dbproc, colnum));
	    json_add_string(json, "length", tmp);
            //}
            if (viaduct_db_has_prec(dbcoltype(dbproc, colnum))) {
               typeinfo = dbcoltypeinfo(dbproc, colnum);
               sprintf(tmp, "%d", typeinfo->precision);
	       json_add_string(json, "precision", tmp);
               sprintf(tmp, "%d", typeinfo->scale);
	       json_add_string(json, "scale", tmp);
            }
	    json_end_object(json);
        }
	json_end_array(json);
	json_add_key(json, "rows");
	json_new_array(json);

	for (colnum=1; colnum<=numcols; colnum++) {
        	dbbind(dbproc, colnum, NTBSTRINGBIND, 0, (BYTE *) &colval[colnum-1]);
        	dbnullbind(dbproc, colnum, (DBINT *) &colnull[colnum-1]);
	}
        while (dbnextrow(dbproc)!=NO_MORE_ROWS) { 
	   json_new_object(json);
	   for (colnum=1; colnum<=numcols; colnum++) {
	      if (colnull[colnum-1]==-1) 
              	json_add_null(json, dbcolname(dbproc, colnum));
	      else if (viaduct_db_is_quoted(dbcoltype(dbproc, colnum))) 
              	json_add_string(json, dbcolname(dbproc, colnum), colval[colnum-1]);
              else
              	json_add_number(json, dbcolname(dbproc, colnum), colval[colnum-1]);
           }
           json_end_object(json);
        }
        json_end_array(json);
        sprintf(tmp, "%u", dbcount(dbproc));
        json_add_number(json, "count", tmp);
        json_end_object(json);
   }
   /* sprintf(error_string, "rc = %d", rc); */
   json_end_array(json);

   return 0;
}

int
viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr)
{
	db_error = strdup(dberrstr);

	return INT_CANCEL;
}

viaduct_request_t *
viaduct_alloc_request()
{
   viaduct_request_t *request;

   request = (viaduct_request_t *) malloc(sizeof(viaduct_request_t));
   memset(request, 0, sizeof(viaduct_request_t));

   return request;
}
void
viaduct_free_request(viaduct_request_t *request)
{
   if (request->sql_server) free(request->sql_server);
   if (request->sql_port) free(request->sql_port);
   if (request->sql_database) free(request->sql_database);
   if (request->sql_user) free(request->sql_user);
   if (request->sql_password) free(request->sql_password);
   if (request->sql) free(request->sql);
   if (request->query_tag) free(request->query_tag);
   if (request->connection_name) free(request->connection_name);

   free(request);
}
