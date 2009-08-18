/*
 * Copyright (C) 2009 Getco LLC
 */

#include "viaduct.h"
#include "stringbuf.h"
#include <sys/signal.h>

#define SUCCESS 0
#define FAIL 1
#define NOTFOUND 2

u_char *viaduct_json_error(char *error_string);
int viaduct_admin_kill(viaduct_request_t *request, char *sock_path);

char *viaduct_admin_result_text(int ret)
{
   switch (ret) {
      case SUCCESS: return "succeeded";
      case FAIL: return "failed";
      case NOTFOUND: return "not found";
      default: return "unknown result";
   }
}
u_char *viaduct_db_cmd(viaduct_request_t *request)
{
   json_t *json = json_new();
   int ret = 0;
   u_char *json_output;

   if (!strcmp(request->cmd, "kill")) {
      if (request->params[0]==NULL) {
         return (u_char *) viaduct_json_error("No parameter specified");
      }
      ret = viaduct_admin_kill(request, request->params[0]);
   } else {
      return (u_char *) viaduct_json_error("Unknown admin command");
   }

   json_new_object(json);

   json_add_key(json, "cmd");
   json_new_object(json);
   json_add_string(json, "status", viaduct_admin_result_text(ret));
   json_end_object(json);

   json_end_object(json);
   json_output = (u_char *) json_to_string(json);
   json_free(json);

   return json_output;

}

int viaduct_admin_kill(viaduct_request_t *request, char *sock_path)
{
   pid_t pid = -1;
   int slot = -1;
   viaduct_connection_t *connections;
   viaduct_connection_t *conn;
   int i;

   int s = viaduct_socket_connect(sock_path);
   if (s==-1) return FAIL;

   viaduct_conn_kill(s);

   connections = viaduct_get_shmem();

   for (i=0; i<VIADUCT_MAX_CONN; i++) {
     conn = &connections[i];
     if (conn->pid!=0) {
        if (!strcmp(conn->sock_path, sock_path))
	{
	   pid = conn->helper_pid;
           slot = i;
	}
     }
   }

   viaduct_release_shmem(connections);

   if (pid==-1) return NOTFOUND;

   if (kill(pid, 0)) kill(pid, SIGTERM);

   if (slot!=-1) {
      connections = viaduct_get_shmem();
      conn = &connections[slot];
      viaduct_db_close_connection(conn, request);
      viaduct_release_shmem(connections);
   }
   return SUCCESS;
}
u_char *viaduct_json_error(char *error_string)
{
   u_char *json_output;
   json_t *json = json_new();

   json_new_object(json);

   json_add_key(json, "log");
   json_new_object(json);
   json_add_string(json, "error", error_string);
   
   json_end_object(json); //log

   json_end_object(json);

   json_output = (u_char *) json_to_string(json);
   json_free(json);

   return json_output;
}
