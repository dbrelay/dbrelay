/*
 * vasprintf(3)
 * 20020809 entropy@tappedin.com
 * public domain.  no warranty.  use at your own risk.  have a nice day.
 */

#if HAVE_CONFIG_H
#include <config.h>
#endif /* HAVE_CONFIG_H */

#include <stdarg.h>
#include <stdio.h>

#if HAVE_STDLIB_H
#include <stdlib.h>
#endif /* HAVE_STDLIB_H */

#if HAVE_STRING_H
#include <string.h>
#endif /* HAVE_STRING_H */

#if HAVE_UNISTD_H
#include <unistd.h>
#endif /* HAVE_UNISTD_H */

#if HAVE_PATHS_H
#include <paths.h>
#endif /* HAVE_PATHS_H */

#include "tds_sysdep_private.h"
#include "replacements.h"

TDS_RCSID(var, "$Id: vasprintf.c,v 1.18 2007/12/27 13:45:23 freddy77 Exp $");

#if defined(HAVE__VSNPRINTF) && !defined(HAVE_VSNPRINTF)
#undef HAVE_VSNPRINTF
#undef vsnprintf
#define HAVE_VSNPRINTF 1
#define vsnprintf _vsnprintf
#endif

#ifndef _PATH_DEVNULL
#define _PATH_DEVNULL "/dev/null"
#endif

#define CHUNKSIZE 512
int
vasprintf(char **ret, const char *fmt, va_list ap)
{
#if HAVE_VSNPRINTF
	int chunks;
	size_t buflen;
	char *buf;
	int len;

	chunks = ((strlen(fmt) + 1) / CHUNKSIZE) + 1;
	buflen = chunks * CHUNKSIZE;
	for (;;) {
		if ((buf = malloc(buflen)) == NULL) {
			*ret = NULL;
			return -1;
		}
		len = vsnprintf(buf, buflen, fmt, ap);
		if (len >= 0 && (size_t) len < (buflen - 1)) {
			break;
		}
		free(buf);
		buflen = (++chunks) * CHUNKSIZE;
		/* 
		 * len >= 0 are required for vsnprintf implementation that 
		 * return -1 of buffer insufficient
		 */
		if (len >= 0 && (size_t) len >= buflen) {
			buflen = len + 1;
		}
	}
	*ret = buf;
	return len;
#else /* HAVE_VSNPRINTF */
#ifdef _REENTRANT
	FILE *fp;
#else /* !_REENTRANT */
	static FILE *fp = NULL;
#endif /* !_REENTRANT */
	int len;
	char *buf;

	*ret = NULL;

#ifdef _REENTRANT

# ifdef WIN32
#  error Win32 do not have /dev/null, should use vsnprintf version
# endif

	if ((fp = fopen(_PATH_DEVNULL, "w")) == NULL)
		return -1;
#else /* !_REENTRANT */
	if ((fp == NULL) && ((fp = fopen(_PATH_DEVNULL, "w")) == NULL))
		return -1;
#endif /* !_REENTRANT */

	len = vfprintf(fp, fmt, ap);

#ifdef _REENTRANT
	if (fclose(fp) != 0)
		return -1;
#endif /* _REENTRANT */

	if (len < 0)
		return len;
	if ((buf = malloc(len + 1)) == NULL)
		return -1;
	if (vsprintf(buf, fmt, ap) != len)
		return -1;
	*ret = buf;
	return len;
#endif /* HAVE_VSNPRINTF */
}
