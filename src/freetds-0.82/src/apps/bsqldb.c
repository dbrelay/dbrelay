/* FreeTDS - Library of routines accessing Sybase and Microsoft databases
 * Copyright (C) 2004, 2005  James K. Lowden
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

#include <stdio.h>
#include <assert.h>
#include <ctype.h>

#if HAVE_ERRNO_H
#include <errno.h>
#endif

#if HAVE_UNISTD_H
#include <unistd.h>
#endif

#if HAVE_STDLIB_H
#include <stdlib.h>
#endif

#if HAVE_STRING_H
#include <string.h>
#endif

#include <sqlfront.h>
#include <sybdb.h>
#include "replacements.h"

static char software_version[] = "$Id: bsqldb.c,v 1.32 2007/12/06 19:00:24 freddy77 Exp $";
static void *no_unused_var_warn[] = { software_version, no_unused_var_warn };

int err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);
int msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, 
		char *srvname, char *procname, int line);

static int next_query(DBPROCESS *dbproc);
static void print_results(DBPROCESS *dbproc);
static int get_printable_size(int type, int size);
static void usage(const char invoked_as[]);

struct METADATA { char *name, *format_string; const char *source; int type, size, width; };
static int set_format_string(struct METADATA * meta, const char separator[]);

typedef struct _options 
{ 
	int 	fverbose, 
		fquiet;
	FILE 	*headers, 
		*verbose;
	char 	*servername, 
		*database, 
		*appname, 
		 hostname[128];
	const char *colsep;
	char	*input_filename, 
		*output_filename, 
		*error_filename; 
} OPTIONS;

LOGINREC* get_login(int argc, char *argv[], OPTIONS *poptions);

/* global variables */
OPTIONS options;
static const char default_colsep[] = "  ";
/* end global variables */


/**
 * The purpose of this program is threefold:
 *
 * 1.  To provide a generalized SQL processor suitable for testing db-lib.
 * 2.  To offer a robust batch-oriented SQL processor suitable for use in a production environment.  
 * 3.  To serve as a model example of how to use db-lib functions.  
 *
 * These purposes may be somewhat at odds with one another.  For instance, the tutorial aspect calls for
 * explanatory comments that wouldn't appear in production code.  Nevertheless, I hope the  experienced
 * reader will forgive the verbosity and still find the program useful.  
 *
 * \todo The error/message handlers are not robust enough.  They should anticipate certain conditions 
 * and cause the application to retry the operation.  
 */
int
main(int argc, char *argv[])
{
	LOGINREC *login;
	DBPROCESS *dbproc;
	RETCODE erc;

	/* Initialize db-lib */
	erc = dbinit();	
	if (erc == FAIL) {
		fprintf(stderr, "%s:%d: dbinit() failed\n", options.appname, __LINE__);
		exit(1);
	}
	

	memset(&options, 0, sizeof(options));
	options.headers = stderr;
	login = get_login(argc, argv, &options); /* get command-line parameters and call dblogin() */
	assert(login != NULL);

	/* Install our error and message handlers */
	dberrhandle(err_handler);
	dbmsghandle(msg_handler);

	/* 
	 * Override stdin, stdout, and stderr, as required 
	 */
	if (options.input_filename) {
		if (freopen(options.input_filename, "r", stdin) == NULL) {
			fprintf(stderr, "%s: unable to open %s: %s\n", options.appname, options.input_filename, strerror(errno));
			exit(1);
		}
	}

	if (options.output_filename) {
		if (freopen(options.output_filename, "w", stdout) == NULL) {
			fprintf(stderr, "%s: unable to open %s: %s\n", options.appname, options.output_filename, strerror(errno));
			exit(1);
		}
	}
	
	if (options.error_filename) {
		if (freopen(options.error_filename, "w", stderr) == NULL) {
			fprintf(stderr, "%s: unable to open %s: %s\n", options.appname, options.error_filename, strerror(errno));
			exit(1);
		}
	}

	if (options.fverbose) {
		options.verbose = stderr;
	} else {
		static const char null_device[] = "/dev/null";
		options.verbose = fopen(null_device, "w");
		if (options.verbose == NULL) {
			fprintf(stderr, "%s:%d unable to open %s for verbose operation: %s\n", 
					options.appname, __LINE__, null_device, strerror(errno));
			exit(1);
		}
	}

	fprintf(options.verbose, "%s:%d: Verbose operation enabled\n", options.appname, __LINE__);
	
	/* 
	 * Connect to the server 
	 */
	dbproc = dbopen(login, options.servername);
	assert(dbproc != NULL);
	
	/* Switch to the specified database, if any */
	if (options.database)
		dbuse(dbproc, options.database);

	/* 
	 * Read the queries and write the results
	 */
	while (next_query(dbproc) != -1 ) {
	
		/* Send the query to the server (we could use dbsqlexec(), instead) */
		erc = dbsqlsend(dbproc);
		if (erc == FAIL) {
			fprintf(stderr, "%s:%d: dbsqlsend() failed\n", options.appname, __LINE__);
			exit(1);
		}
		fprintf(options.verbose, "%s:%d: dbsqlsend(): OK\n", options.appname, __LINE__);
		
		/* Wait for it to execute */
		erc = dbsqlok(dbproc);
		if (erc == FAIL) {
			fprintf(stderr, "%s:%d: dbsqlok() failed\n", options.appname, __LINE__);
			exit(1);
		}
		fprintf(options.verbose, "%s:%d: dbsqlok(): OK\n", options.appname, __LINE__);

		/* Write the output */
		print_results(dbproc);
	}

	return 0;
}

static int
next_query(DBPROCESS *dbproc)
{
	char query_line[4096];
	RETCODE erc;
	
	if (feof(stdin))
		return -1;
			
	fprintf(options.verbose, "%s:%d: Query:\n", options.appname, __LINE__);
	
	/*
	 * Normally, a call to dbcmd() clears the buffer the first time it's 
	 * invoked after a call to dbsqlexec() or dbsqlsend().  If fgets(3) 
	 * returns 0 below, however, we'd indicate "success" without calling
	 * dbcmd().  This would leave the prior query in the buffer, which 
	 * our caller would re-send.  To avoid such nonsense, we invoke
	 * dbfreebuf() as a precaution.
	 */
	 
	dbfreebuf(dbproc); 
	
	while (fgets(query_line, sizeof(query_line), stdin)) {
		/* 'go' or 'GO' separates command batches */
		const char *p = query_line;
		if (strncasecmp(p, "go", 2) == 0) {
			for (p+=2; isspace((unsigned char) *p); p++) {
				if (*p == '\n')
					return 1;
			}
		}

		fprintf(options.verbose, "\t%s", query_line);
		
		/* Add the query line to the command to be sent to the server */
		erc = dbcmd(dbproc, query_line);
		if (erc == FAIL) {
			fprintf(stderr, "%s:%d: dbcmd() failed\n", options.appname, __LINE__);
			return -1;
		}
	}
	
	if (feof(stdin))
		return dbstrlen(dbproc) > 0? 0 : -1;
			
	if (ferror(stdin)) {
		fprintf(stderr, "%s:%d: next_query() failed\n", options.appname, __LINE__);
		perror(NULL);
		return -1;
	}
	
	return 1;
}

static void
print_results(DBPROCESS *dbproc) 
{
	static const char empty_string[] = "";
	static const char dashes[] = "----------------------------------------------------------------" /* each line is 64 */
				     "----------------------------------------------------------------"
				     "----------------------------------------------------------------"
				     "----------------------------------------------------------------";
	
	struct METADATA *metadata = NULL, return_status;
	
	struct DATA { char *buffer; int status; } *data = NULL;
	
	struct METACOMP { int numalts; struct METADATA *meta; struct DATA *data; } **metacompute = NULL;
	
	RETCODE erc;
	int row_code;
	int i, c, ret;
	int iresultset;
	int ncomputeids = 0, ncols = 0;

	/* 
	 * If using default column separator, we want columns to line up vertically, 
	 * 	so we use blank padding (STRINGBIND).  
	 * For any other separator, we use no padding.
	 */
	const int bindtype = (0 == strcmp(options.colsep, default_colsep))? STRINGBIND : NTBSTRINGBIND;
	
	/* 
	 * Set up each result set with dbresults()
	 * This is more commonly implemented as a while() loop, but we're counting the result sets. 
	 */
	fprintf(options.verbose, "%s:%d: calling dbresults: OK\n", options.appname, __LINE__);
	for (iresultset=1; (erc = dbresults(dbproc)) != NO_MORE_RESULTS; iresultset++) {
		if (erc == FAIL) {
			fprintf(stderr, "%s:%d: dbresults(), result set %d failed\n", options.appname, __LINE__, iresultset);
			return;
		}
		
		fprintf(options.verbose, "Result set %d\n", iresultset);
		/* Free prior allocations, if any. */
		fprintf(options.verbose, "Freeing prior allocations\n");
		for (c=0; c < ncols; c++) {
			free(metadata[c].format_string);
			free(data[c].buffer);
		}
		free(metadata);
		metadata = NULL;
		free(data);
		data = NULL;
		ncols = 0;
		
		for (i=0; i < ncomputeids; i++) {
			for (c=0; c < metacompute[i]->numalts; c++) {
				free(metacompute[i]->meta[c].name);
				free(metacompute[i]->meta[c].format_string);
			}
			free(metacompute[i]->meta);
			free(metacompute[i]->data);
			free(metacompute[i]);
		}
		free(metacompute);
		metacompute = NULL;
		ncomputeids = 0;
		
		/* 
		 * Allocate memory for metadata and bound columns 
		 */
		fprintf(options.verbose, "Allocating buffers\n");
		ncols = dbnumcols(dbproc);	

		metadata = (struct METADATA*) calloc(ncols, sizeof(struct METADATA));
		assert(metadata);

		data = (struct DATA*) calloc(ncols, sizeof(struct DATA));
		assert(data);
		
		/* metadata is more complicated only because there may be several compute ids for each result set */
		fprintf(options.verbose, "Allocating compute buffers\n");
		ncomputeids = dbnumcompute(dbproc);
		if (ncomputeids > 0) {
			metacompute = (struct METACOMP**) calloc(ncomputeids, sizeof(struct METACOMP*));
			assert(metacompute);
		}
		
		for (i=0; i < ncomputeids; i++) {
			metacompute[i] = (struct METACOMP*) calloc(ncomputeids, sizeof(struct METACOMP));
			assert(metacompute[i]);
			metacompute[i]->numalts = dbnumalts(dbproc, 1+i);
			fprintf(options.verbose, "%d columns found in computeid %d\n", metacompute[i]->numalts, 1+i);
			if (metacompute[i]->numalts > 0) {
				fprintf(options.verbose, "allocating column %d\n", 1+i);
				metacompute[i]->meta = (struct METADATA*) calloc(metacompute[i]->numalts, sizeof(struct METADATA));
				assert(metacompute[i]->meta);
				metacompute[i]->data = (struct     DATA*) calloc(metacompute[i]->numalts, sizeof(struct     DATA));
				assert(metacompute[i]->data);
			}
		}

		/* 
		 * For each column, get its name, type, and size. 
		 * Allocate a buffer to hold the data, and bind the buffer to the column.
		 * "bind" here means to give db-lib the address of the buffer we want filled as each row is fetched.
		 * TODO: Implement dbcoltypeinfo() for numeric/decimal datatypes.  
		 */

		fprintf(options.verbose, "Metadata\n");
		fprintf(options.verbose, "%-6s  %-30s  %-30s  %-15s  %-6s  %-6s  \n", "col", "name", "source", "type", "size", "varies");
		fprintf(options.verbose, "%.6s  %.30s  %.30s  %.15s  %.6s  %.6s  \n", dashes, dashes, dashes, dashes, dashes, dashes);
		for (c=0; c < ncols; c++) {
			/* Get and print the metadata.  Optional: get only what you need. */
			char *name = dbcolname(dbproc, c+1);
			metadata[c].name = strdup(name ? (const char *) name : empty_string);

			name = dbcolsource(dbproc, c+1);
			metadata[c].source = (name)? name : empty_string;

			metadata[c].type = dbcoltype(dbproc, c+1);
			metadata[c].size = dbcollen(dbproc, c+1);
			assert(metadata[c].size != -1); /* -1 means indicates an out-of-range request*/

			fprintf(options.verbose, "%6d  %30s  %30s  %15s  %6d  %6d  \n", 
				c+1, metadata[c].name, metadata[c].source, dbprtype(metadata[c].type), 
				metadata[c].size,  dbvarylen(dbproc, c+1));

			/* 
			 * Build the column header format string, based on the column width. 
			 * This is just one solution to the question, "How wide should my columns be when I print them out?"
			 */
			metadata[c].width = get_printable_size(metadata[c].type, metadata[c].size);
			if (metadata[c].width < strlen(metadata[c].name))
				metadata[c].width = strlen(metadata[c].name);
				
			ret = set_format_string(&metadata[c], (c+1 < ncols)? options.colsep : "\n");
			if (ret <= 0) {
				fprintf(stderr, "%s:%d: asprintf(), column %d failed\n", options.appname, __LINE__, c+1);
				return;
			}

			/* 
			 * Bind the column to our variable.
			 * We bind everything to strings, because we want db-lib to convert everything to strings for us.
			 * If you're performing calculations on the data in your application, you'd bind the numeric data
			 * to C integers and floats, etc. instead. 
			 * 
			 * It is not necessary to bind to every column returned by the query.  
			 * Data in unbound columns are simply never copied to the user's buffers and are thus 
			 * inaccesible to the application.  
			 */

			data[c].buffer = calloc(1, metadata[c].width);
			assert(data[c].buffer);

			erc = dbbind(dbproc, c+1, bindtype, 0, (BYTE *) data[c].buffer);
			if (erc == FAIL) {
				fprintf(stderr, "%s:%d: dbbind(), column %d failed\n", options.appname, __LINE__, c+1);
				return;
			}

			erc = dbnullbind(dbproc, c+1, &data[c].status);
			if (erc == FAIL) {
				fprintf(stderr, "%s:%d: dbnullbind(), column %d failed\n", options.appname, __LINE__, c+1);
				return;
			}
		}
		
		/* 
		 * Get metadata and bind the columns for any compute rows.
		 */
		for (i=0; i < ncomputeids; i++) {
			fprintf(options.verbose, "For computeid %d:\n", 1+i);
			for (c=0; c < metacompute[i]->numalts; c++) {
				/* read metadata */
				struct METADATA *meta = &metacompute[i]->meta[c];
				int nby, iby;
				BYTE *bylist;
				char *colname, *bynames;
				int altcolid = dbaltcolid(dbproc, i+1, c+1);
				
				metacompute[i]->meta[c].type = dbalttype(dbproc, i+1, c+1);
				metacompute[i]->meta[c].size = dbaltlen(dbproc, i+1, c+1);

				/* 
				 * Jump through hoops to determine a useful name for the computed column 
				 * If the query says "compute count(c) by a,b", we get a "by list" indicating a & b.  
				 */
				bylist = dbbylist(dbproc, c+1, &nby);

				bynames = strdup("by (");
				for (iby=0; iby < nby; iby++) {
					char *s = NULL; 
					int ret = asprintf(&s, "%s%s%s", bynames, dbcolname(dbproc, bylist[iby]), 
										(iby+1 < nby)? ", " : ")");
					if (ret < 0) {
						fprintf(options.verbose, "Insufficient room to create name for column %d:\n", 1+c);
						break;
					}
					free(bynames);
					bynames = s;
				}
				
				if( altcolid == -1 ) {
					colname = "*";
				} else {
					assert(0 < altcolid && altcolid <= dbnumcols(dbproc));
					colname = metadata[--altcolid].name;
				}

				asprintf(&metacompute[i]->meta[c].name, "%s(%s)", dbprtype(dbaltop(dbproc, i+1, c+1)), colname);
				assert(metacompute[i]->meta[c].name);
					
				metacompute[i]->meta[c].width = get_printable_size(metacompute[i]->meta[c].type, 
										   metacompute[i]->meta[c].size);
				if (metacompute[i]->meta[c].width < strlen(metacompute[i]->meta[c].name))
					metacompute[i]->meta[c].width = strlen(metacompute[i]->meta[c].name);

				ret = set_format_string(meta, (c+1 < metacompute[i]->numalts)? options.colsep : "\n");
				if (ret <= 0) {
					free(bynames);
					fprintf(stderr, "%s:%d: asprintf(), column %d failed\n", options.appname, __LINE__, c+1);
					return;
				}
				
				fprintf(options.verbose, "\tcolumn %d is %s, type %s, size %d %s\n", 
					c+1, metacompute[i]->meta[c].name, dbprtype(metacompute[i]->meta[c].type),
					metacompute[i]->meta[c].size, (nby > 0)? bynames : "");
				free(bynames);
	
				/* allocate buffer */
				assert(metacompute[i]->data);
				metacompute[i]->data[c].buffer = calloc(1, metacompute[i]->meta[c].width);
				assert(metacompute[i]->data[c].buffer);
				
				/* bind */
				erc = dbaltbind(dbproc, i+1, c+1, bindtype, -1, (BYTE*) metacompute[i]->data[c].buffer);
				if (erc == FAIL) {
					fprintf(stderr, "%s:%d: dbaltbind(), column %d failed\n", options.appname, __LINE__, c+1);
					return;
				}
			}
		}
		
		fprintf(options.verbose, "\n");
		fprintf(options.verbose, "Data\n");

		if (!options.fquiet) {
			/* Print the column headers to stderr to keep them separate from the data.  */
			for (c=0; c < ncols; c++) {
				fprintf(options.headers, metadata[c].format_string, metadata[c].name);
			}

			/* Underline the column headers.  */
			for (c=0; c < ncols; c++) {
				fprintf(options.headers, metadata[c].format_string, dashes);
			}
		}
		/* 
		 * Print the data to stdout.  
		 */
		while ((row_code = dbnextrow(dbproc)) != NO_MORE_ROWS) {
			switch (row_code) {
			case REG_ROW:
				for (c=0; c < ncols; c++) {
					switch (data[c].status) { /* handle nulls */
					case -1: /* is null */
						/* TODO: FreeTDS 0.62 does not support dbsetnull() */
						fprintf(stdout, metadata[c].format_string, "NULL");
						break;
					case 0:
					/* case >1 is datlen when buffer is too small */
					default:
						fprintf(stdout, metadata[c].format_string, data[c].buffer);
						break;
					}
				}
				break;
				
			case BUF_FULL:
				assert(row_code != BUF_FULL);
				break;
				
			case FAIL:
				fprintf(stderr, "bsqldb: fatal error: dbnextrow returned FAIL\n");
				assert(row_code != FAIL);
				exit(EXIT_FAILURE);
				break;
				
			default: /* computeid */
				fprintf(options.verbose, "Data for computeid %d\n", row_code);
				for (c=0; c < metacompute[row_code-1]->numalts; c++) {
					char fmt[256] = "%-";
					struct METADATA *meta = &metacompute[row_code-1]->meta[c];
					
					/* left justify the names */
					strcat(fmt, &meta->format_string[1]);
					fprintf(options.headers, fmt, meta->name);
				}

				/* Underline the column headers.  */
				for (c=0; c < metacompute[row_code-1]->numalts; c++) {
					fprintf(options.headers, metacompute[row_code-1]->meta[c].format_string, dashes);
				}
					
				for (c=0; c < metacompute[row_code-1]->numalts; c++) {
					struct METADATA *meta = &metacompute[row_code-1]->meta[c];
					struct     DATA *data = &metacompute[row_code-1]->data[c];
					
					switch (data->status) { /* handle nulls */
					case -1: /* is null */
						/* TODO: FreeTDS 0.62 does not support dbsetnull() */
						fprintf(stdout, meta->format_string, "NULL");
						break;
					case 0:
					/* case >1 is datlen when buffer is too small */
					default:
						fprintf(stdout, meta->format_string, data->buffer);
						break;
					}
				}
			}


		}

		/* Check return status */
		if (!options.fquiet) {
			fprintf(options.verbose, "Retrieving return status... ");
			if (dbhasretstat(dbproc) == TRUE) {
				fprintf(stderr, "Procedure returned %d\n", dbretstatus(dbproc));
			} else {
				fprintf(options.verbose, "none\n");
			}
		}
		
		/* 
		 * Get row count, if available.   
		 */
		if (!options.fquiet) {
			if (DBCOUNT(dbproc) > -1)
				fprintf(stderr, "%d rows affected\n", DBCOUNT(dbproc));
			else 
				fprintf(stderr, "@@rowcount not available\n");
		}			

		/* 
		 * Check return parameter values 
		 */
		fprintf(options.verbose, "Retrieving output parameters... ");
		if (dbnumrets(dbproc) > 0) {
			for (i = 1; i <= dbnumrets(dbproc); i++) {
				char parameter_string[1024];
				
				return_status.name = dbretname(dbproc, i);
				fprintf(stderr, "ret name %d is %s\n", i, return_status.name);
				
				return_status.type = dbrettype(dbproc, i);
				fprintf(options.verbose, "\n\tret type %d is %d", i, return_status.type);
				
				return_status.size = dbretlen(dbproc, i);
				fprintf(options.verbose, "\n\tret len %d is %d\n", i, return_status.size);
				
				dbconvert(dbproc, return_status.type, dbretdata(dbproc, i), return_status.size, 
					  SYBVARCHAR, (BYTE *) parameter_string, -1);
				fprintf(stderr, "ret data %d is %s\n", i, parameter_string);
			}
		} else {
			fprintf(options.verbose, "none\n");
		}
	} /* wend dbresults */
	fprintf(options.verbose, "%s:%d: dbresults() returned NO_MORE_RESULTS (%d):\n", options.appname, __LINE__, erc);
}

static int
get_printable_size(int type, int size)	/* adapted from src/dblib/dblib.c */
{
	switch (type) {
	case SYBINTN:
		switch (size) {
		case 1:
			return 3;
		case 2:
			return 6;
		case 4:
			return 11;
		case 8:
			return 21;
		}
	case SYBINT1:
		return 3;
	case SYBINT2:
		return 6;
	case SYBINT4:
		return 11;
	case SYBINT8:
		return 21;
	case SYBVARCHAR:
	case SYBCHAR:
		return size;
	case SYBFLT8:
		return 11;	/* FIX ME -- we do not track precision */
	case SYBREAL:
		return 11;	/* FIX ME -- we do not track precision */
	case SYBMONEY:
		return 12;	/* FIX ME */
	case SYBMONEY4:
		return 12;	/* FIX ME */
	case SYBDATETIME:
		return 26;	/* FIX ME */
	case SYBDATETIME4:
		return 26;	/* FIX ME */
#if 0	/* seems not to be exported to sybdb.h */
	case SYBBITN:
#endif
	case SYBBIT:
		return 1;
		/* FIX ME -- not all types present */
	default:
		return 0;
	}

}

/** 
 * Build the column header format string, based on the column width. 
 * This is just one solution to the question, "How wide should my columns be when I print them out?"
 */
#define is_character_data(x)   (x==SYBTEXT || x==SYBCHAR || x==SYBVARCHAR)
static int
set_format_string(struct METADATA * meta, const char separator[])
{
	int width, ret;
	const char *size_and_width;
	assert(meta);

	if(0 == strcmp(options.colsep, default_colsep)) { 
		/* right justify numbers, left justify strings */
		size_and_width = is_character_data(meta->type)? "%%-%d.%ds%s" : "%%%d.%ds%s";
		
		width = get_printable_size(meta->type, meta->size);
		if (width < strlen(meta->name))
			width = strlen(meta->name);

		ret = asprintf(&meta->format_string, size_and_width, width, width, separator);
	} else {
		/* For anything except the default two-space separator, don't justify the strings. */
		ret = asprintf(&meta->format_string, "%%s%s", separator);
	}
		       
	return ret;
}

static void
usage(const char invoked_as[])
{
	fprintf(stderr, "usage:  %s \n"
			"        [-U username] [-P password]\n"
			"        [-S servername] [-D database]\n"
			"        [-i input filename] [-o output filename] [-e error filename]\n"
			, invoked_as);
}

static void unescape(char arg[])
{
	char *p = arg;
	char escaped = '1'; /* any digit will do for an initial value */
	while ((p = strchr(p, '\\')) != NULL) {
	
		switch (p[1]) {
		case '0':
			/* FIXME we use strlen() of field/row terminators, which obviously won't work here */
			fprintf(stderr, "bsqldb, line %d: NULL terminators ('\\0') not yet supported.\n", __LINE__);
			escaped = '\0';
			break;
		case 't':
			escaped = '\t';
			break;
		case 'r':
			escaped = '\r';
			break;
		case 'n':
			escaped = '\n';
			break;
		case '\\':
			escaped = '\\';
			break;
		default:
			break;
		}
			
		/* Overwrite the backslash with the intended character, and shift everything down one */
		if (!isdigit((unsigned char) escaped)) {
			*p++ = escaped;
			memmove(p, p+1, 1 + strlen(p+1));
			escaped = '1';
		}
	}
}

LOGINREC *
get_login(int argc, char *argv[], OPTIONS *options)
{
	LOGINREC *login;
	int ch;

	extern char *optarg;

	assert(options && argv);
	
	options->appname = tds_basename(argv[0]);
	options->colsep = default_colsep; /* may be overridden by -t */
	
	login = dblogin();
	
	if (!login) {
		fprintf(stderr, "%s: unable to allocate login structure\n", options->appname);
		exit(1);
	}
	
	DBSETLAPP(login, options->appname);
	
	if (-1 == gethostname(options->hostname, sizeof(options->hostname))) {
		perror("unable to get hostname");
	} else {
		DBSETLHOST(login, options->hostname);
	}

	while ((ch = getopt(argc, argv, "U:P:S:dD:i:o:e:t:hqv")) != -1) {
		switch (ch) {
		case 'U':
			DBSETLUSER(login, optarg);
			break;
		case 'P':
			DBSETLPWD(login, optarg);
			break;
		case 'S':
			options->servername = strdup(optarg);
			break;
		case 'd':
		case 'D':
			options->database = strdup(optarg);
			break;
		case 'i':
			options->input_filename = strdup(optarg);
			break;
		case 'o':
			options->output_filename = strdup(optarg);
			break;
		case 'e':
			options->error_filename = strdup(optarg);
			break;
		case 't':
			unescape(optarg);
			options->colsep = strdup(optarg);
			break;
		case 'h':
			options->headers = stdout;
			break;
		case 'q':
			options->fquiet = 1;
			break;
		case 'v':
			options->fverbose = 1;
			break;
		case '?':
		default:
			usage(options->appname);
			exit(1);
		}
	}
	
	if (!options->servername) {
		usage(options->appname);
		exit(1);
	}
	
	return login;
}

int
err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr)
{
	if (dberr) {
		fprintf(stderr, "%s: Msg %d, Level %d\n", options.appname, dberr, severity);
		fprintf(stderr, "%s\n\n", dberrstr);
	}

	else {
		fprintf(stderr, "%s: DB-LIBRARY error:\n\t", options.appname);
		fprintf(stderr, "%s\n", dberrstr);
	}

	return INT_CANCEL;
}

int
msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line)
{
	enum {changed_database = 5701, changed_language = 5703 };
	
	if (msgno == changed_database || msgno == changed_language) 
		return 0;

	if (msgno > 0) {
		fprintf(stderr, "Msg %ld, Level %d, State %d\n", (long) msgno, severity, msgstate);

		if (strlen(srvname) > 0)
			fprintf(stderr, "Server '%s', ", srvname);
		if (strlen(procname) > 0)
			fprintf(stderr, "Procedure '%s', ", procname);
		if (line > 0)
			fprintf(stderr, "Line %d", line);

		fprintf(stderr, "\n\t");
	}
	fprintf(stderr, "%s\n", msgtext);
	
	if (severity > 10) {
		fprintf(stderr, "%s: error: severity %d >�10, exiting\n", options.appname, severity);
		exit(severity);
	}

	return 0;
}

