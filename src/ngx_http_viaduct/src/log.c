
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"
#include <stdarg.h>

void viaduct_log(unsigned int log_level, viaduct_request_t *request, const char *fmt, va_list args);

#ifdef CMDLINE
#define NGX_MAX_ERROR_STR 4096
#endif

void
viaduct_log(unsigned int log_level, viaduct_request_t *request, const char *fmt, va_list args)
{
   u_char buf[NGX_MAX_ERROR_STR];
   u_char *p;

   /* ngx_vsnprintf() does not appear to null terminate the buffer it writes
    * into and provides no length, therefore we must do this
    */
   memset(buf, 0, NGX_MAX_ERROR_STR);

#ifndef CMDLINE
   p = ngx_vsnprintf(buf, NGX_MAX_ERROR_STR, fmt, args);
   ngx_log_error(log_level, request->log, 0, "%s\n", (char *)buf);
#else
   p = vsnprintf((char *)buf, NGX_MAX_ERROR_STR, fmt, args);
   fprintf(stderr, "%s\n", (char *)buf);
#endif
}
void
viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;

   if (request->log_level > VIADUCT_LOG_LVL_DEBUG) return;

   va_start(args, fmt);
   viaduct_log(VIADUCT_LOG_LVL_DEBUG, request, fmt, args);
   va_end(args);
}
void
viaduct_log_info(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;

   if (request->log_level > VIADUCT_LOG_LVL_INFO) return;

   va_start(args, fmt);
   viaduct_log(VIADUCT_LOG_LVL_INFO, request, fmt, args);
   va_end(args);
}
void
viaduct_log_notice(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;

   if (request->log_level > VIADUCT_LOG_LVL_NOTICE) return;

   va_start(args, fmt);
   viaduct_log(VIADUCT_LOG_LVL_NOTICE, request, fmt, args);
   va_end(args);
}
void
viaduct_log_warn(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;

   if (request->log_level > VIADUCT_LOG_LVL_WARN) return;

   va_start(args, fmt);
   viaduct_log(VIADUCT_LOG_LVL_WARN, request, fmt, args);
   va_end(args);
}
void
viaduct_log_error(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;

   if (request->log_level > VIADUCT_LOG_LVL_ERROR) return;

   va_start(args, fmt);
   viaduct_log(VIADUCT_LOG_LVL_ERROR, request, fmt, args);
   va_end(args);
}
