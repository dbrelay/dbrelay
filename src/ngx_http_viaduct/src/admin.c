
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"
#include "stringbuf.h"

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
