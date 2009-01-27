#include "viaduct.h"
#include "stdio.h"

#define DATABASE "getco"
#define SERVER "192.168.16.128"
#define USERNAME "sa"
#define PASSWORD ""
#define SQL "SELECT * FROM viaduct2"

int main(int argc, char **argv)
{
    u_char *json_output;
    viaduct_request_t *request;
    viaduct_connection_t *connections;
    int mode = 0;
    pid_t pid;

    if (argc>1 && !strcmp(argv[1], "status")) mode = 1;

    if ((connections=viaduct_get_shmem())==NULL) {
       viaduct_create_shmem();
    } else {
       viaduct_release_shmem(connections);
    }

    request = viaduct_alloc_request();
    request->log_level = 0;
    strcpy(request->sql_database, DATABASE);
    strcpy(request->sql_server, SERVER);
    strcpy(request->sql_user, USERNAME);
    request->sql = strdup(SQL);
    strcpy(request->query_tag, "example");
    strcpy(request->sql_password, PASSWORD);
    strcpy(request->connection_name, "test1");
    request->connection_timeout = 600;
    if (mode) json_output = (u_char *) viaduct_db_status(request);
    else { 
       json_output = (u_char *) viaduct_db_run_query(request);
    }
    printf("%s\n", json_output);
    viaduct_free_request(request);
}
