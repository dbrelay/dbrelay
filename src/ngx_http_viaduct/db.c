
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"
#include "stringbuf.h"

#define IS_SET(x) (x && strlen(x)>0)
#define IS_EMPTY(x) (!x || strlen(x)==0)

static int viaduct_db_fill_data(json_t *json, DBPROCESS *dbproc);
static int viaduct_db_get_connection(viaduct_request_t *request);
static char *viaduct_resolve_params(viaduct_request_t *request, char *sql);
static int viaduct_find_placeholder(char *sql);

#define MAX_CONNECTIONS 20

/* I'm not particularly happy with this, in order to return a detailed message 
 * from the msg handler, we have to use a static buffer because there is no
 * dbproc to dbsetuserdata() on.  This will go away when we change out the 
 * dblib API.
 */
static char login_error[500];
static int login_msgno;

static void viaduct_db_populate_connection(viaduct_request_t *request, viaduct_connection_t *conn)
{
   char tmpbuf[30];
   int len; 
   memset(conn, '\0', sizeof(viaduct_connection_t));

   dberrhandle(viaduct_db_err_handler);
   dbmsghandle(viaduct_db_msg_handler);

   /* copy parameters necessary to do connection hash match */
   if (IS_SET(request->sql_server)) 
      strcpy(conn->sql_server, request->sql_server);
   if (IS_SET(request->sql_port)) 
      strcpy(conn->sql_port, request->sql_port);
   if (IS_SET(request->sql_user))
      strcpy(conn->sql_user, request->sql_user);
   if (IS_SET(request->sql_password))
      strcpy(conn->sql_password, request->sql_password);
   if (IS_SET(request->sql_database))
      strcpy(conn->sql_database, request->sql_database);
   if (IS_SET(request->connection_name))
      strcpy(conn->connection_name, request->connection_name);

   conn->connection_timeout = request->connection_timeout ? request->connection_timeout : 60;

   conn->login = dblogin();
   if (IS_SET(request->sql_password)) 
    DBSETLPWD(conn->login, request->sql_password); 
   else
        DBSETLPWD(conn->login, NULL);
   DBSETLUSER(conn->login, request->sql_user);
   if (IS_SET(request->connection_name)) {
      memset(tmpbuf, '\0', sizeof(tmpbuf));
      strcpy(tmpbuf, "viaduct (");
      len = strlen("viaduct (");
      strncat(tmpbuf, request->connection_name, sizeof(tmpbuf) - len - 3);
      strcat(tmpbuf, ")");
      DBSETLAPP(conn->login, tmpbuf);
   } else {
      DBSETLAPP(conn->login, "viaduct");
   }
   //DBSETLHOST(conn->login, request->sql_server);
 
   conn->dbproc = dbopen(conn->login, request->sql_server);
      
   conn->tm_create = time(NULL);
   conn->in_use = TRUE;
   dbsetuserdata(conn->dbproc, (BYTE *)request);

   conn->pid = getpid();
}
static int viaduct_db_alloc_connection(viaduct_request_t *request)
{
   int i, slot = -1;

   viaduct_connection_t *connections;
   connections = viaduct_get_shmem();

   for (i=0; i<MAX_CONNECTIONS; i++) {
     if (connections[i].pid==0) {
	slot = i;
        break;
     }
   }

   /* we have exhausted the pool, log something sensible and return null */
   if (slot==-1) {
      viaduct_log_debug(request, "No free connections available!");
      viaduct_release_shmem(connections);
      return -1;
   }

   viaduct_db_populate_connection(request, &connections[slot]);
   viaduct_log_debug(request, "allocating slot %d to request", slot);
   connections[slot].slot = slot;
   viaduct_release_shmem(connections);
   return slot;
}
static unsigned int match(char *s1, char *s2)
{
   if (IS_EMPTY(s1) && IS_EMPTY(s2)) return TRUE;
   if (s1==NULL || s2==NULL) return FALSE;
   if (!strcmp(s1, s2)) return TRUE;
   return FALSE;
}
static unsigned int viaduct_db_match(viaduct_connection_t *conn, viaduct_request_t *request)
{
   viaduct_log_debug(request, "comparing %s and %s", conn->connection_name, request->connection_name);
   if (conn->pid != getpid()) return FALSE;
   if (match(conn->sql_server, request->sql_server) &&
       match(conn->sql_port, request->sql_port) &&
       match(conn->sql_database, request->sql_database) &&
       match(conn->sql_user, request->sql_user) &&
       match(conn->sql_password, request->sql_password) &&
       match(conn->connection_name, request->connection_name))
         return TRUE;
   else return FALSE;
}
static unsigned int viaduct_db_find_connection(viaduct_request_t *request)
{
   viaduct_connection_t *conn;
   int i;

   viaduct_log_debug(request, "find_connection called");
   viaduct_connection_t *connections;
   connections = viaduct_get_shmem();
   for (i=0; i<MAX_CONNECTIONS; i++) {
      conn = &connections[i];
      if (conn->pid!=0 && conn->in_use==FALSE) {
         if (viaduct_db_match(conn, request)) {
            viaduct_log_debug(request, "found connection match for request at slot %d", i);
            conn->tm_accessed = time(NULL);
            conn->in_use = TRUE;
            dbsetuserdata(conn->dbproc, (BYTE *) request);
            viaduct_release_shmem(connections);		
            return i;
         }
      }
   }
   viaduct_release_shmem(connections);		
   return -1;
}
static void viaduct_db_close_connection(viaduct_connection_t *conn, viaduct_request_t *request)
{
   unsigned int slot;

   if (!conn) {
      viaduct_log_debug(request, "attempt to close null connection ");
      return;
   }

   viaduct_log_debug(request, "closing connection %d", conn->slot);

   if (conn->dbproc) dbclose(conn->dbproc);
   conn->sql_server[0]='\0';
   conn->sql_user[0]='\0';
   conn->sql_database[0]='\0';
   conn->sql_port[0]='\0';
   conn->sql_password[0]='\0';
   conn->connection_name[0]='\0';
   conn->in_use = 0;
   slot = conn->slot;

   //free(conn);
   //connections[slot]=NULL;
   //memset(conn, '\0', sizeof(viaduct_connection_t));
}
static void viaduct_db_close_connections(viaduct_request_t *request)
{
   viaduct_connection_t *conn;
   viaduct_connection_t *connections;
   int i;
   time_t now;

   now = time(NULL);
   connections = viaduct_get_shmem();
   for (i=0; i<MAX_CONNECTIONS; i++) {
      conn = &connections[i];
      if (!conn->pid || conn->in_use) continue;
      if (conn->tm_accessed + conn->connection_timeout < now) {
         viaduct_log_debug(request, "timing out conection %ud", conn->slot);
         viaduct_db_close_connection(conn, request);
      }
   }
   viaduct_release_shmem(connections);
}
static void viaduct_db_free_connection(viaduct_connection_t *conn, viaduct_request_t *request)
{
   conn->in_use = FALSE;
   
   if (IS_EMPTY(conn->connection_name)) {
      dbsetuserdata(conn->dbproc,NULL);
      viaduct_db_close_connection(conn, request);
   }
}
static int viaduct_db_get_connection(viaduct_request_t *request)
{
   //viaduct_connection_t *conn;
   int slot = -1;

   /* if there is no connection name, allocate a new connection */
   if (IS_EMPTY(request->connection_name)) {
      viaduct_log_debug(request, "empty connection name, allocating new");
      slot = viaduct_db_alloc_connection(request);

   /* look for an matching idle connection */
   } else if ((slot = viaduct_db_find_connection(request))==-1) {
      /* else we need to allocate a new connection */
      slot = viaduct_db_alloc_connection(request);
      viaduct_log_debug(request, "no match allocating slot %d", slot);
   }

   //viaduct_db_close_connections(request);

   return slot;
}

static int viaduct_db_is_quoted(int coltype)
{
   if (coltype == SYBVARCHAR ||
       coltype == SYBCHAR ||
       coltype == SYBTEXT ||
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
u_char *viaduct_db_status(viaduct_request_t *request)
{
   viaduct_connection_t *connections;
   viaduct_connection_t *conn;
   json_t *json = json_new();
   int i;
   char tmpstr[100];
   u_char *json_output;
   struct tm *ts;


   json_new_object(json);
   json_add_key(json, "status");
   json_new_object(json);
   json_add_key(json, "connections");
   json_new_array(json);

   connections = viaduct_get_shmem();

   for (i=0; i<MAX_CONNECTIONS; i++) {
     conn = &connections[i];
     if (connections[i].pid!=0) {
        json_new_object(json);
        sprintf(tmpstr, "%u", conn->slot);
        json_add_number(json, "slot", tmpstr);
        sprintf(tmpstr, "%u", conn->pid);
        json_add_number(json, "pid", tmpstr);
        json_add_string(json, "name", conn->connection_name ? conn->connection_name : "");
        ts = localtime(&conn->tm_create);
        strftime(tmpstr, sizeof(tmpstr), "%Y-%m-%d %H:%M:%S", ts);
        json_add_string(json, "tm_created", tmpstr);
        ts = localtime(&conn->tm_accessed);
        strftime(tmpstr, sizeof(tmpstr), "%Y-%m-%d %H:%M:%S", ts);
        json_add_string(json, "tm_accessed", tmpstr);
        json_add_string(json, "sql_server", conn->sql_server ? conn->sql_server : "");
        json_add_string(json, "sql_server", conn->sql_server ? conn->sql_server : "");
        json_add_string(json, "sql_port", conn->sql_port ? conn->sql_port : "");
        json_add_string(json, "sql_database", conn->sql_database ? conn->sql_database : "");
        json_add_string(json, "sql_user", conn->sql_user ? conn->sql_user : "");
        sprintf(tmpstr, "%ld", conn->connection_timeout);
        json_add_number(json, "connection_timeout", tmpstr);
        sprintf(tmpstr, "%u", conn->in_use);
        json_add_number(json, "in_use", tmpstr);
        json_end_object(json);
     }
   }

   viaduct_release_shmem(connections);

   json_end_array(json);
   json_end_object(json);
   json_end_object(json);

   json_output = (u_char *) json_to_string(json);
   json_free(json);

   return json_output;
}
u_char *viaduct_db_run_query(viaduct_request_t *request)
{
   /* FIX ME */
   RETCODE rc;
   char error_string[500];
   json_t *json = json_new();
   u_char *ret;
   viaduct_connection_t *conn;
   viaduct_connection_t *connections;
   DBPROCESS *dbproc = NULL;
   int slot = -1;
   char *newsql;
   int i = 0;
   char tmp[20];

   error_string[0]='\0';

   viaduct_log_debug(request, "run_query called");

   json_new_object(json);

   json_add_key(json, "request");
   json_new_object(json);

   if (IS_SET(request->query_tag)) 
      json_add_string(json, "query_tag", request->query_tag);
   json_add_string(json, "sql_server", request->sql_server);
   json_add_string(json, "sql_user", request->sql_user);

   if (IS_SET(request->sql_port)) 
      json_add_string(json, "sql_port", request->sql_port);

   json_add_string(json, "sql_database", request->sql_database);

/*
 * do not return password back to client
   if (IS_SET(request->sql_password)) 
      json_add_string(json, "sql_password", request->sql_password);
*/

   json_end_object(json);
   
   viaduct_log_debug(request, "calling get_connection");
   slot = viaduct_db_get_connection(request);

   connections = viaduct_get_shmem();
   dbproc = connections[slot].dbproc;
   viaduct_release_shmem(connections);

   viaduct_log_debug(request, "Allocated connection for query");
   if (dbproc==NULL) {
	//strcpy(error_string, "Failed to login");
        if (login_msgno == 18452 && IS_EMPTY(request->sql_password)) {
	    strcpy(error_string, "Login failed and no password was set, please check.\n");
	    strcat(error_string, login_error);
        } else {
	    strcpy(error_string, login_error);
        }
   } else {
   	rc = dbuse(dbproc, request->sql_database);
   	newsql = viaduct_resolve_params(request, request->sql);
   	rc = dbcmd(dbproc, newsql);
        free(newsql);
   	viaduct_log_debug(request, "Sending sql query");
   	rc = dbsqlexec(dbproc);
   	if (rc==SUCCEED) {
   	   viaduct_log_debug(request, "Filling JSON output");
	   viaduct_db_fill_data(json, dbproc);
	} else {
	   strcpy(error_string, request->error_message);
	}
   	viaduct_log_debug(request, "Done filling JSON output");
   }
   json_add_key(json, "log");
   json_new_object(json);
   json_add_string(json, "sql", request->sql);
   if (strlen(error_string)) {
      json_add_string(json, "error", error_string);
   }
   i = 0;
   while (request->params[i]) {
      sprintf(tmp, "param%d", i);
      json_add_string(json, tmp, request->params[i]);
      i++;
   }
   json_end_object(json);

   json_end_object(json);

   ret = (u_char *) json_to_string(json);
   json_free(json);
   viaduct_log_debug(request, "Query completed, freeing connection.");

   connections = viaduct_get_shmem();
   /* set time accessed at end of processing so that long queries do not
    * become eligible for being timed out immediately.  
    */
   conn = &connections[slot];
   conn->tm_accessed = time(NULL);
   viaduct_db_free_connection(conn, request);
   viaduct_release_shmem(connections);

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
            if (viaduct_db_has_length(dbcoltype(dbproc, colnum))) {
            	sprintf(tmp, "%d", dbcollen(dbproc, colnum));
	    	json_add_string(json, "length", tmp);
            }
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
        if (dbcount(dbproc)==-1) {
           json_add_null(json, "count");
        } else {
           sprintf(tmp, "%d", dbcount(dbproc));
           json_add_number(json, "count", tmp);
        }
        json_end_object(json);
   }
   /* sprintf(error_string, "rc = %d", rc); */
   json_end_array(json);

   return 0;
}

int
viaduct_db_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line)
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
viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr)
{
   //db_error = strdup(dberrstr);
   if (dbproc!=NULL) {
      //viaduct_request_t *request = (viaduct_request_t *) dbgetuserdata(dbproc);
      //strcat(request->error_message, dberrstr);
   }

   return INT_CANCEL;
}

viaduct_request_t *
viaduct_alloc_request()
{
   viaduct_request_t *request;

   request = (viaduct_request_t *) malloc(sizeof(viaduct_request_t));
   memset(request, '\0', sizeof(viaduct_request_t));
   request->http_keepalive = 1;

   return request;
}
void
viaduct_free_request(viaduct_request_t *request)
{
   if (request->sql) free(request->sql);

   free(request);
}
static int
is_quoted_param(char *param)
{
   int ret;
   char *tmp = strdup(param);
   char *s = strstr(tmp, ":");
   *s = '\0';
   if (!strcasecmp(tmp, "char") ||
       !strcasecmp(tmp, "varchar") ||
       !strcasecmp(tmp, "datetime") ||
       !strcasecmp(tmp, "smalldatetime"))
      ret = TRUE;
   else ret = FALSE;
   free(tmp);
   return ret;
}
static char *
viaduct_resolve_params(viaduct_request_t *request, char *sql)
{
   int i = 0;
   int pos = 0, prevpos = 0;
   stringbuf_t *sb = sb_new(NULL);
   char *ret;
   char *tmpsql = strdup(sql);

   while (request->params[i]) {
      prevpos = pos;
      pos += viaduct_find_placeholder(&tmpsql[pos]);
      if (pos==-1) ; // fix
      else {
         tmpsql[pos]='\0';
         sb_append(sb, &tmpsql[prevpos]);
         if (is_quoted_param(request->params[i])) sb_append(sb, "'");
         sb_append(sb, strstr(request->params[i], ":") + 1);
         if (is_quoted_param(request->params[i])) sb_append(sb, "'");
         pos++;
      }
      i++;
   } 
   sb_append(sb, &tmpsql[pos]);
   ret = sb_to_char(sb);
   free(tmpsql);
   sb_free(sb);
   viaduct_log_debug(request, "new sql %s", ret);
   return ret;
}
static int
viaduct_find_placeholder(char *sql)
{
   int quoted = 0;
   int i = 0;
   int found = 0;
   int len = strlen(sql);

   do {
     if (sql[i]=='\'') quoted = quoted ? 0 : 1;
     if (!quoted && sql[i]=='?') found = 1;
     i++;
   } while (!found && i<len);
   if (!found) return -1;
   else return i-1;
}
