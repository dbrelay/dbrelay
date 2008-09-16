
/*
 * Copyright (C) Getco LLC
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>
#include <ngx_http_upstream.h>
#include <sybdb.h>
#include "stringbuf.h"
#include "json.h"


typedef struct {
    ngx_http_upstream_conf_t   upstream;
} ngx_http_viaduct_loc_conf_t;

typedef struct {
   char sql_server[100];
   char sql_port[100];
   char sql_database[100];
   char sql_user[100];
   char sql_password[100];
   char sql[4000];
   char query_tag[100];
} server_info_t;

void parse_query_string(u_char *query_string, server_info_t *server_info);
u_char *run_query(server_info_t *server_info);
static char *ngx_http_viaduct_set(ngx_conf_t *cf, ngx_command_t *cmd, void *conf);
static ngx_int_t ngx_http_viaduct_create_request(ngx_http_request_t *r);
static void *ngx_http_viaduct_create_loc_conf(ngx_conf_t *cf);
static int fill_data(json_t *json, DBPROCESS *dbproc);
int viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);

static char *db_error;

static ngx_command_t  ngx_http_viaduct_commands[] = {

    { ngx_string("viaduct"),
      NGX_HTTP_LOC_CONF|NGX_CONF_NOARGS,
      ngx_http_viaduct_set,
      0,
      0,
      NULL },

      ngx_null_command
};


static ngx_http_module_t  ngx_http_viaduct_module_ctx = {
    NULL,                          /* preconfiguration */
    NULL,                          /* postconfiguration */

    NULL,                          /* create main configuration */
    NULL,                          /* init main configuration */

    NULL,                          /* create server configuration */
    NULL,                          /* merge server configuration */

    ngx_http_viaduct_create_loc_conf, /* create location configuration */
    NULL                           /* merge location configuration */
};


ngx_module_t  ngx_http_viaduct_module = {
    NGX_MODULE_V1,
    &ngx_http_viaduct_module_ctx, /* module context */
    ngx_http_viaduct_commands,   /* module directives */
    NGX_HTTP_MODULE,               /* module type */
    NULL,                          /* init master */
    NULL,                          /* init module */
    NULL,                          /* init process */
    NULL,                          /* init thread */
    NULL,                          /* exit thread */
    NULL,                          /* exit process */
    NULL,                          /* exit master */
    NGX_MODULE_V1_PADDING
};

/*
 * We don't do anything here currently, it's not clear to me if we need to.
 */
static void
ngx_http_viaduct_request_body_handler(ngx_http_request_t *r)
{
    size_t                    root;
    ngx_str_t                 path;
    ngx_log_t                 *log;

    ngx_http_map_uri_to_path(r, &path, &root, 0);
    log = r->connection->log;

    /* is GET method? */
    if (r->args.len>0) {
    	ngx_log_error(NGX_LOG_ALERT, log, 0, "args len: %d", r->args.len);
    }
    /* is POST method? */
    if (r->request_body->buf && r->request_body->buf->pos!=NULL) {
       ngx_log_error(NGX_LOG_ALERT, log, 0,
            "buf: \"%s\"", r->request_body->buf->pos);
    } 
}

/*
 * Copied from Emillers guide, for upstream module, not yet functional
 */
static ngx_int_t
ngx_http_viaduct_create_request(ngx_http_request_t *r)
{
    /* make a buffer and chain */
    ngx_buf_t *b;
    ngx_chain_t *cl;

    b = ngx_create_temp_buf(r->pool, sizeof("a") - 1);
    if (b == NULL)
        return NGX_ERROR;

    cl = ngx_alloc_chain_link(r->pool);
    if (cl == NULL)
        return NGX_ERROR;

    /* hook the buffer to the chain */
    cl->buf = b;
    /* chain to the upstream */
    r->upstream->request_bufs = cl;

    /* now write to the buffer */
    b->pos = (u_char *)"a";
    b->last = b->pos + sizeof("a") - 1;

    return NGX_OK;
}

/*
 * Copied from Emillers guide, for upstream module, not yet functional
 */
static ngx_int_t
ngx_http_viaduct_process_header(ngx_http_request_t *r)
{
    ngx_http_upstream_t       *u;
    u = r->upstream;

    /* read the first character */
    switch(u->buffer.pos[0]) {
        case '?':
            r->header_only=1; /* suppress this buffer from the client */
            u->headers_in.status_n = 404;
            break;
        case ' ':
            u->buffer.pos++; /* move the buffer to point to the next character */
            u->headers_in.status_n = 200;
            break;
    }

    return NGX_OK;
}
/*
 * Copied from Emillers guide, for upstream module, not yet functional
 */
static void
ngx_http_viaduct_finalize_request(ngx_http_request_t *r, ngx_int_t rc)
{
    ngx_log_debug0(NGX_LOG_DEBUG_HTTP, r->connection->log, 0,
                   "finalize viaduct request");

    return;
}

/*
 * Copied from Emillers guide, for upstream module, not yet functional
 */
static ngx_int_t
ngx_http_viaduct2_handler(ngx_http_request_t *r)
{
    ngx_int_t                   rc;
    ngx_http_upstream_t        *u;
    ngx_http_viaduct_loc_conf_t  *vlcf;

    vlcf = ngx_http_get_module_loc_conf(r, ngx_http_core_module);

    /* set up our upstream struct */
    u = ngx_pcalloc(r->pool, sizeof(ngx_http_upstream_t));
    if (u == NULL) {
        return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    u->peer.log = r->connection->log;
    u->peer.log_error = NGX_ERROR_ERR;

    u->output.tag = (ngx_buf_tag_t) &ngx_http_viaduct_module;

    u->conf = &vlcf->upstream;

    /* attach the callback functions */
    u->create_request = ngx_http_viaduct_create_request;
    u->reinit_request = NULL; //ngx_http_viaduct_reinit_request;
    u->process_header = NULL; //ngx_http_viaduct_process_status_line;
    u->abort_request = NULL; //ngx_http_viaduct_abort_request;
    u->finalize_request = ngx_http_viaduct_finalize_request;

    r->upstream = u;

    rc = ngx_http_read_client_request_body(r, ngx_http_viaduct_request_body_handler);

    if (rc >= NGX_HTTP_SPECIAL_RESPONSE) {
        return rc;
    }

    return NGX_DONE;
}

/*
 * Non-upstream version of handler.  
 * 
 * This method blocks while querying the database.
 */
static ngx_int_t
ngx_http_viaduct_handler(ngx_http_request_t *r)
{
    ngx_int_t                  rc;
    ngx_log_t                 *log;
    ngx_buf_t                 *b;
    ngx_chain_t                out;
    /* ngx_http_viaduct_loc_conf_t  *clcf; */
    ngx_http_core_loc_conf_t  *clcf;
    u_char *json_output;
    /* FIX ME - static allocation */
    server_info_t server_info;

    if (!(r->method & (NGX_HTTP_GET|NGX_HTTP_HEAD|NGX_HTTP_POST))) {
        return NGX_HTTP_NOT_ALLOWED;
    }

    if (r->uri.data[r->uri.len - 1] == '/') {
        return NGX_DECLINED;
    }

    /* TODO: Win32 */
    if (r->zero_in_uri) {
        return NGX_DECLINED;
    }

    r->root_tested = 1;

    log = r->connection->log;
    clcf = ngx_http_get_module_loc_conf(r, ngx_http_core_module);

    rc = ngx_http_read_client_request_body(r, ngx_http_viaduct_request_body_handler);
    if (rc != NGX_OK) {
        return rc;
    }

    /* is GET method? */
    if (r->args.len>0) {
	parse_query_string(r->args.data, &server_info);
    }
    /* is POST method? */
    if (r->request_body->buf && r->request_body->buf->pos!=NULL) {
	parse_query_string(r->request_body->buf->pos, &server_info);
    } 
    /* FIX ME - need to check to see if we have everything and error if not */

    ngx_log_error(NGX_LOG_ALERT, log, 0, "sql_server: \"%s\"", server_info.sql_server);
    ngx_log_error(NGX_LOG_ALERT, log, 0, "sql: \"%s\"", server_info.sql);
    
    log->action = "sending response to client";

    /* we need to allocate all before the header would be sent */
    b = ngx_pcalloc(r->pool, sizeof(ngx_buf_t));
    if (b == NULL) {
        return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    out.buf = b;
    out.next = NULL;

    json_output = (u_char *) run_query(&server_info);
    b->pos = json_output;
    b->last = json_output + ngx_strlen(json_output);
    b->memory = 1;
    b->last_buf = 1;

    r->headers_out.content_type.len = sizeof("text/plain") - 1;
    /* FUTURE: change to application/json */
    r->headers_out.content_type.data = (u_char *) "text/plain";
    r->headers_out.status = NGX_HTTP_OK;
    r->headers_out.content_length_n = ngx_strlen(json_output);
    r->headers_out.last_modified_time = 23349600;
    r->allow_ranges = 1;

    if (r != r->main && ngx_strlen(json_output) == 0) {
        return ngx_http_send_header(r);
    }

    rc = ngx_http_send_header(r);

    return ngx_http_output_filter(r, &out);
}

static int is_quoted(int coltype)
{
   if (coltype == SYBVARCHAR ||
       coltype == SYBCHAR ||
       coltype == SYBDATETIMN ||
       coltype == SYBDATETIME ||
       coltype == SYBDATETIME4) 
          return 1;
   else return 0;
}
static char *get_sqltype_string(char *dest, int coltype, int collen)
{
	switch (coltype) {
		case SYBVARCHAR : 
			sprintf(dest, "varchar(%d)", collen);
			break;
		case SYBCHAR : 
			sprintf(dest, "char(%d)", collen);
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
		case SYBDATETIME4 : 
		case SYBDATETIME : 
		case SYBDATETIMN : 
			if (collen==4)
				sprintf(dest, "smalldatetime");
			else if (collen==8)
				sprintf(dest, "datetime");
		default : 
			sprintf(dest, "unknown type %d", coltype);
			break;
	}
	return dest;
}
u_char *run_query(server_info_t *server_info)
{
   LOGINREC *login;
   DBPROCESS *dbproc;
   /* FIX ME */
   RETCODE rc;
   char error_string[500];
   json_t *json = json_new();
   u_char *ret;

   error_string[0]='\0';

   json_new_object(json);

   json_add_key(json, "request");
   json_new_object(json);
   json_add_string(json, "query_tag", server_info->query_tag);
   json_add_string(json, "sql_server", server_info->sql_server);
   json_add_string(json, "sql_user", server_info->sql_user);

   if (server_info->sql_port!=NULL && strlen(server_info->sql_port)>0) 
      json_add_string(json, "sql_port", server_info->sql_port);

   json_add_string(json, "sql_database", server_info->sql_database);

/*
   if (server_info->sql_password!=NULL && strlen(server_info->sql_password)>0) 
      json_add_string(json, "sql_password", server_info->sql_password);
*/

   json_end_object(json);
   
   dberrhandle(viaduct_db_err_handler);

   login = dblogin();
   if (server_info->sql_password!=NULL && strlen(server_info->sql_password)>0) 
   	DBSETLPWD(login, server_info->sql_password); 
   DBSETLUSER(login, server_info->sql_user);
   DBSETLAPP(login, "viaduct");
   DBSETLHOST(login, server_info->sql_server);

   dbproc = dbopen(login, server_info->sql_server);
   if (dbproc==NULL) {
	strcpy(error_string, "Failed to login");
   } else {
   	rc = dbuse(dbproc, server_info->sql_database);
   	rc = dbcmd(dbproc, server_info->sql);
   	rc = dbsqlexec(dbproc);
   	if (rc==SUCCEED) {
	   fill_data(json, dbproc);
	} else {
	   strcpy(error_string, db_error);
	}
   }
   json_add_key(json, "log");
   json_new_object(json);
   json_add_string(json, "sql", server_info->sql);
   if (strlen(error_string)) {
      json_add_string(json, "error", error_string);
   }
   json_end_object(json);

   json_end_object(json);

   ret = (u_char *) json_to_string(json);
   json_free(json);
   return ret;
}
static int fill_data(json_t *json, DBPROCESS *dbproc)
{
   int numcols, colnum;
   RETCODE rc;
   char tmp[100];
   char colval[256][31];

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
            get_sqltype_string(tmp, dbcoltype(dbproc, colnum), dbcollen(dbproc, colnum));
	    json_add_string(json, "sql_type", tmp);
	    json_end_object(json);
        }
	json_end_array(json);
	json_add_key(json, "rows");
	json_new_array(json);

	for (colnum=1; colnum<=numcols; colnum++) {
        	dbbind(dbproc, colnum, NTBSTRINGBIND, 0, (BYTE *) &colval[colnum-1]);
	}
        while (dbnextrow(dbproc)!=NO_MORE_ROWS) { 
	   json_new_object(json);
	   for (colnum=1; colnum<=numcols; colnum++) {
	      if (is_quoted(dbcoltype(dbproc, colnum))) 
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

static char *
ngx_http_viaduct_set(ngx_conf_t *cf, ngx_command_t *cmd, void *conf)
{
    ngx_http_core_loc_conf_t  *clcf;

    clcf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_core_module);
    clcf->handler = ngx_http_viaduct_handler;

    return NGX_CONF_OK;
}

static void *
ngx_http_viaduct_create_loc_conf(ngx_conf_t *cf)
{
    ngx_http_viaduct_loc_conf_t  *conf;

    dbinit();

    conf = ngx_pcalloc(cf->pool, sizeof(ngx_http_viaduct_loc_conf_t));
    if (conf == NULL) {
        return NGX_CONF_ERROR;
    }
    return conf;
}
void write_value(server_info_t *server_info, char *key, char *value)
{
   u_char *dst, *src;
   unsigned int i;

   dst = (u_char *) value; src = (u_char *) value;
   ngx_unescape_uri(&dst, &src, strlen(value), 0);
   *dst = '\0';

   /* simple unescape of '+' for now, replace with ngx_unescape_uri */
   for (i=0;i<strlen(value);i++) {
      if (value[i]=='+') value[i]=' ';
   }

   if (!strcmp(key, "sql_database")) {
      strcpy(server_info->sql_database, value);
   } else if (!strcmp(key, "sql_server")) {
      strcpy(server_info->sql_server, value);
   } else if (!strcmp(key, "sql_user")) {
      strcpy(server_info->sql_user, value);
   } else if (!strcmp(key, "sql")) {
      strcpy(server_info->sql, value);
   } else if (!strcmp(key, "query_tag")) {
      strcpy(server_info->query_tag, value);
   } else if (!strcmp(key, "sql_password")) {
      strcpy(server_info->sql_password, value);
   }
}
void parse_query_string(u_char *query_string, server_info_t *server_info)
{
	   char key[100];
	   char value[1000];
	   char *s, *k = key, *v = value;
	   int target = 0;

	   memset(server_info, 0, sizeof(server_info_t));
	   for (s=(char *)query_string; *s; s++)
	   { 
	      if (*s=='&') {
		  *k='\0';
		  *v='\0';
		  write_value(server_info, key, value);
		  target=0;
		  k=key;
	      } else if (*s=='=') {
		  target=1;
		  v=value;
	      } else if (target==0) {
		  *k++=*s;
	      } else {
		  *v++=*s;
	      }
	   }
	   *k='\0';
	   while (v>=value && (*v=='\n' || *v=='\r')) *v--='\0';
	   *v='\0';
	   write_value(server_info, key, value);

	}

	int
	viaduct_db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr)
	{
		db_error = strdup(dberrstr);

		return INT_CANCEL;
	}

