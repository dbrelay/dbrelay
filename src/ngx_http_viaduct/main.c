#include "viaduct.h"

int main(int argc, char **argv)
{
    u_char *json_output;
    viaduct_request_t *request;

    request = viaduct_alloc_request();
    request->log_level = 0;
    request->sql_database = "database";
    request->sql_server = "server";
    request->sql_user = "sa";
    request->sql = "select * from table1";
    request->query_tag = "example";
    request->sql_password = NULL;
    request->connection_name = NULL;
    request->connection_timeout = 0;
    json_output = (u_char *) viaduct_db_run_query(request);
    viaduct_free_request(request);

}
