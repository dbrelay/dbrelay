
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"
#include "stringbuf.h"
#include "../include/viaduct_config.h"

#ifdef HAVE_FREETDS
extern viaduct_dbapi_t viaduct_mssql_api;
viaduct_dbapi_t *api = &viaduct_mssql_api;
#endif

#ifdef HAVE_MYSQL
extern viaduct_dbapi_t viaduct_mysql_api;
viaduct_dbapi_t *api = &viaduct_mysql_api;
#endif

#define IS_SET(x) (x && strlen(x)>0)
#define IS_EMPTY(x) (!x || strlen(x)==0)
#define TRUE 1
#define FALSE 0

static int viaduct_db_fill_data(json_t *json, viaduct_connection_t *conn);
static int viaduct_db_get_connection(viaduct_request_t *request);
static char *viaduct_resolve_params(viaduct_request_t *request, char *sql);
static int viaduct_find_placeholder(char *sql);
static int viaduct_check_request(viaduct_request_t *request);
u_char *viaduct_exec_query(viaduct_connection_t *conn, char *database, char *sql);
static void viaduct_write_json_log(json_t *json, viaduct_request_t *request, char *error_string);
void viaduct_write_json_colinfo(json_t *json, void *db, int colnum, int *maxcolname);
void viaduct_write_json_column(json_t *json, void *db, int colnum, int *maxcolname);
static void viaduct_db_zero_connection(viaduct_connection_t *conn, viaduct_request_t *request);

static void viaduct_db_populate_connection(viaduct_request_t *request, viaduct_connection_t *conn)
{
   memset(conn, '\0', sizeof(viaduct_connection_t));

   api->init();

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

   if (!request->connection_timeout) request->connection_timeout = 60;
   conn->connection_timeout = request->connection_timeout;

   //viaduct_log_debug(request, "prefix %s", VIADUCT_PREFIX);
   if (IS_SET(request->connection_name)) {
      if (IS_SET(request->sock_path)) {
         strcpy(conn->sock_path, request->sock_path);
      } else {
         tmpnam(conn->sock_path);
         conn->helper_pid = viaduct_conn_launch_connector(conn->sock_path);
      }
      viaduct_log_info(request, "socket name %s", conn->sock_path);
      conn->tm_create = time(NULL);
      conn->in_use++;
      conn->pid = getpid();

      return;
   }

   conn->db = api->connect(request);
      
   conn->tm_create = time(NULL);
   conn->in_use++;

   conn->pid = getpid();
}
static int viaduct_db_alloc_connection(viaduct_request_t *request)
{
   int i, slot = -1;

   viaduct_connection_t *connections;
   connections = viaduct_get_shmem();

   for (i=0; i<VIADUCT_MAX_CONN; i++) {
     if (connections[i].pid==0) {
	slot = i;
        break;
     }
   }

   /* we have exhausted the pool, log something sensible and return error */
   if (slot==-1) {
      viaduct_log_error(request, "No free connections available!");
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
   //if (conn->pid != getpid()) return FALSE;
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
   for (i=0; i<VIADUCT_MAX_CONN; i++) {
      conn = &connections[i];
      if (conn->pid!=0) {
         if (viaduct_db_match(conn, request)) {
            viaduct_log_info(request, "found connection match for request at slot %d", i);
            conn->in_use++;
            conn->tm_accessed = time(NULL);
            //api->assign_request(conn->db, request);
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
   if (!conn) {
      viaduct_log_warn(request, "attempt to close null connection ");
      return;
   }

   viaduct_log_info(request, "closing connection %d", conn->slot);

   if (conn->db) api->close(conn->db);
   viaduct_db_zero_connection(conn, request);
}
static void viaduct_db_zero_connection(viaduct_connection_t *conn, viaduct_request_t *request)
{
   conn->pid=0;
   conn->sql_server[0]='\0';
   conn->sql_user[0]='\0';
   conn->sql_database[0]='\0';
   conn->sql_port[0]='\0';
   conn->sql_password[0]='\0';
   conn->connection_name[0]='\0';
   conn->in_use = 0;
}
static void viaduct_db_close_connections(viaduct_request_t *request)
{
   viaduct_connection_t *conn;
   viaduct_connection_t *connections;
   int i;
   time_t now;

   now = time(NULL);
   connections = viaduct_get_shmem();
   for (i=0; i<VIADUCT_MAX_CONN; i++) {
      conn = &connections[i];
      if (conn->pid && !IS_SET(conn->connection_name) && kill(conn->pid, 0)) {
         viaduct_log_notice(request, "dead worker %u holding connection slot %d, cleaning up.", conn->pid, conn->slot);
         viaduct_db_zero_connection(conn, request);
      }
      if (!conn->pid || conn->in_use) continue;
      if (conn->tm_accessed + conn->connection_timeout < now) {
         viaduct_log_notice(request, "timing out conection %u", conn->slot);
         viaduct_db_close_connection(conn, request);
      }
   }
   viaduct_release_shmem(connections);
}
static void viaduct_db_free_connection(viaduct_connection_t *conn, viaduct_request_t *request)
{
   conn->in_use--;
   
   if (IS_EMPTY(conn->connection_name)) {
      api->assign_request(conn->db, NULL);
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

   viaduct_db_close_connections(request);

   return slot;
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

   json_add_key(json, "info");
   json_new_object(json);
   json_add_string(json, "build", VIADUCT_BUILD);
   sprintf(tmpstr, "0x%08x", viaduct_get_ipc_key());
   json_add_string(json, "ipckey", tmpstr);
   json_end_object(json);

   json_add_key(json, "connections");
   json_new_array(json);

   connections = viaduct_get_shmem();

   for (i=0; i<VIADUCT_MAX_CONN; i++) {
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
        json_add_string(json, "sql_port", conn->sql_port ? conn->sql_port : "");
        json_add_string(json, "sql_database", conn->sql_database ? conn->sql_database : "");
        json_add_string(json, "sql_user", conn->sql_user ? conn->sql_user : "");
        sprintf(tmpstr, "%ld", conn->connection_timeout);
        json_add_number(json, "connection_timeout", tmpstr);
        sprintf(tmpstr, "%u", conn->in_use);
        json_add_number(json, "in_use", tmpstr);
        json_add_string(json, "sock_path", conn->sock_path);
        sprintf(tmpstr, "%u", conn->helper_pid);
        json_add_number(json, "helper_pid", tmpstr);
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
   char error_string[500];
   json_t *json = json_new();
   u_char *ret;
   viaduct_connection_t *conn;
   viaduct_connection_t *connections;
   //DBPROCESS *dbproc = NULL;
   int s = 0;
   int slot = -1;
   char *newsql;
   int i = 0;
   char tmp[20];
   int have_error = 0;

   error_string[0]='\0';

   viaduct_log_info(request, "run_query called");

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

   if (!viaduct_check_request(request)) {
        viaduct_log_info(request, "check_request failed.");
        viaduct_write_json_log(json, request, "Not all required parameters submitted.");

        ret = (u_char *) json_to_string(json);
        json_free(json);
        return ret;
   }
   
   newsql = viaduct_resolve_params(request, request->sql);

   do {
      viaduct_log_debug(request, "calling get_connection");
      slot = viaduct_db_get_connection(request);
      viaduct_log_debug(request, "using slot %d", slot);
      if (slot==-1) {
         viaduct_log_warn(request, "Couldn't allocate new connection");
         viaduct_write_json_log(json, request, "Couldn't allocate new connection");

         ret = (u_char *) json_to_string(json);
         json_free(json);
         return ret;
      }

      connections = viaduct_get_shmem();
      conn = (viaduct_connection_t *) malloc(sizeof(viaduct_connection_t));
      memcpy(conn, &connections[slot], sizeof(viaduct_connection_t));
      viaduct_release_shmem(connections);

      if (IS_SET(request->connection_name)) {
         viaduct_log_info(request, "connecting to connection helper");
         viaduct_log_info(request, "socket address %s", conn->sock_path);
         s = viaduct_socket_connect(conn->sock_path);
         // if connect fails, remove connector from list
         if (s==-1) {
            unlink(conn->sock_path);
            free(conn);
            connections = viaduct_get_shmem();
            connections[slot].pid=0;
            viaduct_release_shmem(connections);
         }
      }
  } while (s==-1);

   viaduct_log_debug(request, "Allocated connection for query");

   if (IS_SET(request->connection_name)) 
   {
      viaduct_log_info(request, "sending request");
      ret = (u_char *) viaduct_conn_send_request(s, request, &have_error);
      viaduct_log_debug(request, "back");
      // internal error
      if (have_error==2) {
         viaduct_log_error(request, "Error occurred on socket %s (PID: %u)", conn->sock_path, conn->helper_pid);
      }
      if (have_error) {
         viaduct_log_debug(request, "have error");
         strcpy(error_string, (char *) ret);
      } else if (!IS_SET((char *)ret)) {
         viaduct_log_warn(request, "Connector returned no information");
         viaduct_log_info(request, "Query was: %s", newsql);
      } else {
         json_add_json(json, ", ");
         json_add_json(json, (char *) ret);
         free(ret);
      }
      viaduct_log_debug(request, "closing");
      viaduct_conn_close(s);
      viaduct_log_debug(request, "after close");
   } else {
      if (!api->connected(conn->db)) {
	//strcpy(error_string, "Failed to login");
        //if (login_msgno == 18452 && IS_EMPTY(request->sql_password)) {
        if (IS_EMPTY(request->sql_password)) {
	    strcpy(error_string, "Login failed and no password was set, please check.\n");
	    strcat(error_string, api->error(conn->db));
        } else if (!strlen(api->error(conn->db))) {
	    strcpy(error_string, "Connection failed.\n");
        } else {
	    strcpy(error_string, api->error(conn->db));
        }
      } else {
   	viaduct_log_debug(request, "Sending sql query");
        ret = viaduct_exec_query(conn, request->sql_database, newsql);
        if (ret==NULL) {
   	   viaduct_log_debug(request, "error");
           strcpy(error_string, request->error_message);
        } else {
           json_add_json(json, ", ");
           json_add_json(json, (char *) ret);
           free(ret);
        }
   	viaduct_log_debug(request, "Done filling JSON output");
      }
   } // !named connection
   free(conn);

   free(newsql);

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

u_char *
viaduct_exec_query(viaduct_connection_t *conn, char *database, char *sql)
{
  json_t *json = json_new();
  u_char *ret;
 
  api->change_db(conn->db, database);
  if (api->exec(conn->db, sql))
  {
     viaduct_db_fill_data(json, conn);
  } else {
     return NULL;
  }
  ret = (u_char *) json_to_string(json);
  json_free(json);

  return ret;
}
int viaduct_db_fill_data(json_t *json, viaduct_connection_t *conn)
{
   int numcols, colnum;
   char tmp[256];
   int maxcolname;

   json_add_key(json, "data");
   json_new_array(json);
   while (api->has_results(conn->db)) 
   {
        maxcolname = 0;
	json_new_object(json);
	json_add_key(json, "fields");
	json_new_array(json);

	numcols = api->numcols(conn->db);
	for (colnum=1; colnum<=numcols; colnum++) {
            viaduct_write_json_colinfo(json, conn->db, colnum, &maxcolname);
        }
	json_end_array(json);
	json_add_key(json, "rows");
	json_new_array(json);

        while (api->fetch_row(conn->db)) { 
           maxcolname = 0;
	   json_new_object(json);
	   for (colnum=1; colnum<=numcols; colnum++) {
              viaduct_write_json_column(json, conn->db, colnum, &maxcolname);
           }
           json_end_object(json);
        }
        json_end_array(json);
        if (api->rowcount(conn->db)==-1) {
           json_add_null(json, "count");
        } else {
           sprintf(tmp, "%d", api->rowcount(conn->db));
           json_add_number(json, "count", tmp);
        }
        json_end_object(json);
   }
   /* sprintf(error_string, "rc = %d", rc); */
   json_end_array(json);

   return 0;
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
static int
viaduct_check_request(viaduct_request_t *request)
{
   if (!request->sql) return 0;
   if (!IS_SET(request->sql_server)) return 0;
   if (!IS_SET(request->sql_user)) return 0;
   return 1;
} 
static void
viaduct_write_json_log(json_t *json, viaduct_request_t *request, char *error_string)
{
   	json_add_key(json, "log");
   	json_new_object(json);
   	if (request->sql) json_add_string(json, "sql", request->sql);
    	json_add_string(json, "error", error_string);
        json_end_object(json);
        json_end_object(json);
}
void viaduct_write_json_colinfo(json_t *json, void *db, int colnum, int *maxcolname)
{
   char tmp[256], *colname, tmpcolname[256];
   int l;

   json_new_object(json);
   colname = api->colname(db, colnum);
   if (!IS_SET(colname)) {
      sprintf(tmpcolname, "%d", ++(*maxcolname));
      json_add_string(json, "name", tmpcolname);
   } else {
      l = atoi(colname); 
      if (l>0 && l>*maxcolname) {
         *maxcolname=l;
      }
      json_add_string(json, "name", colname);
   }
   api->coltype(db, colnum, tmp);
   json_add_string(json, "sql_type", tmp);
   l = api->collen(db, colnum);
   if (l!=0) {
      sprintf(tmp, "%d", l);
      json_add_string(json, "length", tmp);
   }
   l = api->colprec(db, colnum);
   if (l!=0) {
      sprintf(tmp, "%d", l);
      json_add_string(json, "precision", tmp);
   }
   l = api->colscale(db, colnum);
   if (l!=0) {
      sprintf(tmp, "%d", l);
      json_add_string(json, "scale", tmp);
   }
   json_end_object(json);
}
void viaduct_write_json_column(json_t *json, void *db, int colnum, int *maxcolname)
{
   char tmp[256], *colname, tmpcolname[256];
   int l;

   colname = api->colname(db, colnum);
   if (!IS_SET(colname)) {
      sprintf(tmpcolname, "%d", ++(*maxcolname));
   } else {
      l = atoi(colname); 
      if (l>0 && l>*maxcolname) {
         *maxcolname=l;
      }
      strcpy(tmpcolname, colname);
   }
   if (api->colvalue(db, colnum, tmp)==NULL) 
      json_add_null(json, colname);
   else if (api->is_quoted(db, colnum)) 
      json_add_string(json, tmpcolname, tmp);
   else
      json_add_number(json, tmpcolname, tmp);
}
