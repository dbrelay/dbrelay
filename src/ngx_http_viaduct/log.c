
/*
 * Copyright (C) Getco LLC
 */

#include "viaduct.h"

void
viaduct_log_debug(viaduct_request_t *request, const char *fmt, ...)
{
   va_list  args;

   if (request->log_level > VIADUCT_LOG_LVL_DEBUG) return;

   va_start(args, fmt);
   ngx_log_error_core(NGX_LOG_DEBUG, request->log, 0, fmt);
   va_end(args);
}
