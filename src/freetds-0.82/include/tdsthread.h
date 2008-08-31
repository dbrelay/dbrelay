/* FreeTDS - Library of routines accessing Sybase and Microsoft databases
 *
 * Copyright (C) 2005 Liam Widdowson
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

#ifndef TDSTHREAD_H
#define TDSTHREAD_H 1

/* $Id: tdsthread.h,v 1.3 2005/07/06 12:35:37 freddy77 Exp $ */

#if defined(_THREAD_SAFE) && defined(TDS_HAVE_PTHREAD_MUTEX)

#include <pthread.h>

#define TDS_MUTEX_DECLARE(name) pthread_mutex_t name = PTHREAD_MUTEX_INITIALIZER
#define TDS_MUTEX_LOCK(a) pthread_mutex_lock(a)
#define TDS_MUTEX_UNLOCK(a) pthread_mutex_unlock(a)
#define TDS_MUTEX_T pthread_mutex_t
#define TDS_MUTEX_DECLARE_RECURSIVE(name) pthread_mutex_t name = PTHREAD_RECURSIVE_MUTEX_INITIALIZER_NP;
#define TDS_MUTEX_INIT_RECURSIVE(mutex) do { \
		pthread_mutexattr_t _attr; \
		pthread_mutexattr_init(&_attr); \
		pthread_mutexattr_settype(&_attr, PTHREAD_MUTEX_RECURSIVE); \
		pthread_mutex_init(mutex, &_attr); \
		pthread_mutexattr_destroy(&_attr); \
	} while(0)
#else

#define TDS_MUTEX_DECLARE(name) int name
#define TDS_MUTEX_LOCK(a)
#define TDS_MUTEX_UNLOCK(a)
#define TDS_MUTEX_T int
#define TDS_MUTEX_DECLARE_RECURSIVE(name) int name
#define TDS_MUTEX_INIT_RECURSIVE(mutex)
#endif

#endif
