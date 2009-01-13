
/*
 * Copyright (C) Getco LLC
 */

#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>
#include <ngx_http_upstream.h>
#include "viaduct.h"

typedef struct {
    ngx_http_upstream_conf_t   upstream;
} ngx_http_viaduct_loc_conf_t;

void parse_post_query_string(ngx_chain_t *bufs, viaduct_request_t *request);
void parse_get_query_string(u_char *data, viaduct_request_t *request);
static char *ngx_http_viaduct_set(ngx_conf_t *cf, ngx_command_t *cmd, void *conf);
static ngx_int_t ngx_http_viaduct_create_request(ngx_http_request_t *r);
static void *ngx_http_viaduct_create_loc_conf(ngx_conf_t *cf);
static ngx_int_t ngx_http_viaduct_send_response(ngx_http_request_t *r);

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

static void
ngx_http_viaduct_request_body_handler(ngx_http_request_t *r)
{
    size_t                    root;
    ngx_str_t                 path;
    ngx_log_t                 *log;
    ngx_int_t                 rc;

    log = r->connection->log;

    ngx_http_map_uri_to_path(r, &path, &root, 0);
#if 0
    /* is GET method? */
    if (r->args.len>0) {
    	ngx_log_error(NGX_LOG_ALERT, log, 0, "args len: %d", r->args.len);
    }
    /* is POST method? */
    if (r->request_body->buf && r->request_body->buf->pos!=NULL) {
       ngx_log_error(NGX_LOG_ALERT, log, 0,
            "buf: \"%s\"", r->request_body->buf->pos);
    } 
#endif
    ngx_log_error(NGX_LOG_ALERT, log, 0,
        "buf: \"%s\"", r->request_body->bufs->buf->pos);
    rc = ngx_http_viaduct_send_response(r);
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
    ngx_http_core_loc_conf_t  *clcf;

    log = r->connection->log;
    ngx_log_error(NGX_LOG_ALERT, log, 0, "viaduct_handler called");

    if (!(r->method & (NGX_HTTP_GET|NGX_HTTP_HEAD|NGX_HTTP_POST))) {
        ngx_log_error(NGX_LOG_ALERT, log, 0, "unsupported method, returning not allowed");
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

    ngx_log_error(NGX_LOG_ALERT, log, 0, "here1");
    clcf = ngx_http_get_module_loc_conf(r, ngx_http_core_module);

    ngx_log_error(NGX_LOG_ALERT, log, 0, "here2");
    rc = ngx_http_read_client_request_body(r, ngx_http_viaduct_request_body_handler);

    if (rc >= NGX_HTTP_SPECIAL_RESPONSE) {
        ngx_log_error(NGX_LOG_ALERT, log, 0, "failed to read client request body");
        return rc;
    }

    return NGX_DONE;
    //return ngx_http_viaduct_send_response(r);
}

static ngx_int_t
ngx_http_viaduct_send_response(ngx_http_request_t *r)
{
    ngx_int_t                  rc;
    ngx_log_t                 *log;
    ngx_buf_t                 *b;
    ngx_chain_t                out;
    u_char *json_output;
    viaduct_request_t *request;

    log = r->connection->log;

    request = viaduct_alloc_request();
    request->log = log;
    request->log_level = 0;

    ngx_log_error(NGX_LOG_ALERT, log, 0, "parsing query_string");
    /* is GET method? */
    if (r->args.len>0) {
	parse_get_query_string(r->args.data, request);
    }
    /* is POST method? */
    if (r->request_body->buf && r->request_body->buf->pos!=NULL) {
	parse_post_query_string(r->request_body->bufs, request);
    } 
    /* FIX ME - need to check to see if we have everything and error if not */

    if (!request->http_keepalive) {
       r->keepalive = 0;
    }

    ngx_log_error(NGX_LOG_ALERT, log, 0, "sql_server: \"%s\"", request->sql_server);
    ngx_log_error(NGX_LOG_ALERT, log, 0, "sql: \"%s\"", request->sql);
    
    log->action = "sending response to client";

    /* we need to allocate all before the header would be sent */
    b = ngx_pcalloc(r->pool, sizeof(ngx_buf_t));
    if (b == NULL) {
    	//ngx_http_finalize_request(r, NGX_HTTP_INTERNAL_SERVER_ERROR);
	return NGX_HTTP_INTERNAL_SERVER_ERROR;
    }

    out.buf = b;
    out.next = NULL;

    if (request->status) json_output = (u_char *) viaduct_db_status(request);
    else json_output = (u_char *) viaduct_db_run_query(request);
    viaduct_free_request(request);

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
        rc = ngx_http_send_header(r);
    }

    rc = ngx_http_send_header(r);
    rc = ngx_http_output_filter(r, &out);
    ngx_http_finalize_request(r, rc);
    return rc;
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
static void 
copy_value(char *dest, char *src, int sz)
{
   if (strlen(src) < sz) strcpy(dest, src);
   else {
      strncpy(dest, src, sz - 1);
      dest[sz-1]='\0';
   }
}
static void 
write_value(viaduct_request_t *request, char *key, char *value)
{
   u_char *dst, *src;
   unsigned int i;
   unsigned char noprint=0;
   char *log_levels[] = { "debug", "informational", "notice", "warning", "error", "critical" };
   char *log_level_scopes[] = { "server", "connection", "query" };

   dst = (u_char *) value; src = (u_char *) value;
   ngx_unescape_uri(&dst, &src, strlen(value), 0);
   *dst = '\0';

   /* simple unescape of '+' for now, replace with ngx_unescape_uri */
   for (i=0;i<strlen(value);i++) {
      if (value[i]=='+') value[i]=' ';
   }

   if (!strcmp(key, "status")) {
      request->status = 1;
   } else if (!strcmp(key, "sql_database")) {
      copy_value(request->sql_database, value, VIADUCT_OBJ_SZ);
   } else if (!strcmp(key, "sql_server")) {
      copy_value(request->sql_server, value, VIADUCT_NAME_SZ);
   } else if (!strcmp(key, "sql_user")) {
      copy_value(request->sql_user, value, VIADUCT_OBJ_SZ);
   } else if (!strcmp(key, "sql")) {
      request->sql = strdup(value);
   } else if (!strcmp(key, "query_tag")) {
      copy_value(request->query_tag, value, VIADUCT_NAME_SZ);
   } else if (!strcmp(key, "sql_password")) {
      copy_value(request->sql_password, value, VIADUCT_OBJ_SZ);
      noprint = 1;
   } else if (!strcmp(key, "connection_name")) {
      copy_value(request->connection_name, value, VIADUCT_NAME_SZ);
   } else if (!strcmp(key, "connection_timeout")) {
      request->connection_timeout = atol(value);
   } else if (!strcmp(key, "http_keepalive")) {
      request->http_keepalive = atoi(value);
   } else if (!strcmp(key, "log_level")) {
      for (i=0; i<sizeof(log_levels)/sizeof(char *); i++)
         if (!strcmp(value,log_levels[i])) request->log_level = i;
   } else if (!strcmp(key, "log_level_scope")) {
      for (i=0; i<sizeof(log_level_scopes)/sizeof(char *); i++)
         if (!strcmp(value,log_level_scopes[i])) request->log_level_scope = i;
   } else if (!strncmp(key, "param", 5)) {
      i = atoi(&key[5]);
      if (i>VIADUCT_MAX_PARAMS) {
         viaduct_log_debug(request, "param%d exceeds VIADUCT_MAX_PARAMS", i);
      } else if (i>0) {
         request->params[i-1] = strdup(value);
      }
   }
   
   if (!noprint) {
      viaduct_log_debug(request, "key %s", key);
      viaduct_log_debug(request, "value %s", value);
   }
}
void parse_post_query_string(ngx_chain_t *bufs, viaduct_request_t *request)
{
   char key[100];
   char *value;
   char *s, *k = key, *v;
   int target = 0;
   ngx_buf_t *buf;
   ngx_chain_t *chain;
   unsigned long bufsz = 0;

   ngx_log_error_core(NGX_LOG_ALERT, request->log, 0, "parsing post data");
   viaduct_log_debug(request, "parsing post data");

   for (chain = bufs; chain!=NULL; chain = chain->next) 
   {
      buf = chain->buf;
      bufsz += (buf->last - buf->pos) + 1;
   }
   value = (char *) malloc(bufsz);
   v = value;
   ngx_log_error_core(NGX_LOG_ALERT, request->log, 0, "post data %l bytes", bufsz);

   for (chain = bufs; chain!=NULL; chain = chain->next) 
   {
      buf = chain->buf;
      for (s= (char *)buf->pos; s !=  (char *)buf->last; s++)
      { 
	      if (*s=='&') {
		  *k='\0';
		  *v='\0';
		  write_value(request, key, value);
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
   }
   *k='\0';
   while (v>=value && (*v=='\n' || *v=='\r')) *v--='\0';
   *v='\0';
   write_value(request, key, value);
   free(value);
}
void parse_get_query_string(u_char *data, viaduct_request_t *request)
{
   char key[100];
   char value[4000];
   char *s, *k = key, *v = value;
   int target = 0;

   for (s=(char *)data; *s; s++)
   { 
      if (*s=='&') {
         *k='\0';
	 *v='\0';
	 write_value(request, key, value);
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
   write_value(request, key, value);
}
