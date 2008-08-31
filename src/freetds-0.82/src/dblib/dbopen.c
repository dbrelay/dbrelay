/* FreeTDS - Library of routines accessing Sybase and Microsoft databases
 * Copyright (C) 1998-1999  Brian Bruns
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Library General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Library General Public License for more details.
 *
 * You should have received a copy of the GNU Library General Public
 * License along with this library; if not, write to the
 * Free Software Foundation, Inc., 59 Temple Place - Suite 330,
 * Boston, MA 02111-1307, USA.
 */

#if HAVE_CONFIG_H
#include <config.h>
#endif

#include "tds.h"
#include "sybdb.h"

#ifdef DMALLOC
#include <dmalloc.h>
#endif

#ifdef dbopen
#undef dbopen
#endif

TDS_RCSID(var, "$Id: dbopen.c,v 1.11 2007/09/20 15:32:54 freddy77 Exp $");

DBPROCESS *
dbopen(LOGINREC * login, const char *server)
{
	/* default it's platform specific */
#if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(DOS32X)
	return tdsdbopen(login, server, 1);
#else
	return tdsdbopen(login, server, 0);
#endif
}
