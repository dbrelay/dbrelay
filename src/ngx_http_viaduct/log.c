
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"

void
viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;
   u_char buf[NGX_MAX_ERROR_STR];
   u_char *p;

   if (request->log_level > VIADUCT_LOG_LVL_DEBUG) return;

   /* ngx_vsnprintf() does not appeart to null terminate the buffer it writes
    * into and provides no length, therefore we must do this
    */
   memset(buf, 0, NGX_MAX_ERROR_STR);

   va_start(args, fmt);
   p = ngx_vsnprintf(buf, NGX_MAX_ERROR_STR, fmt, args);
   va_end(args);
   ngx_log_error_core(NGX_LOG_DEBUG, request->log, 0, (char *)buf);

}
