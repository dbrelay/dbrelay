#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/time.h>
#include <sys/signal.h>
#include <stdarg.h>
#include "viaduct.h"
#include "../include/viaduct_config.h"

#if HAVE_FREETDS
#include "mssql.h"
#endif
#if HAVE_MYSQL
#include "vmysql.h"
#endif

#define SOCK_PATH "/tmp/viaduct/connector"
#define DEBUG 1
#define PERSISTENT_CONN 1
#define GDB 0

#define OK 1
#define QUIT 2
#define ERR 3
#define DIE 4
#define RUN 5
#define CONT 6

void log_open();
void log_close();
void log_msg(char *fmt, ...);

char app_name[VIADUCT_NAME_SZ];
char timeout_str[10];
int receive_sql;
stringbuf_t *sb_sql;
char logfilename[256];

viaduct_request_t request;

static FILE *logfile;

/* signal callback for timeout */
void timeout(int i)
{
   log_msg("Timeout reached. Exiting.\n");
   exit(0);
}

/* setup the timer for the specified timeout value */
int set_timer(int secs)
{
  struct itimerval it;
  
  it.it_interval.tv_sec = 0;
  it.it_interval.tv_usec = 0;
  it.it_value.tv_sec = secs; 
  it.it_value.tv_usec = 0;
  setitimer(ITIMER_REAL, &it,0);
  signal(SIGALRM,timeout); 
}

int
main(int argc, char **argv)
{
   unsigned int s, s2;
   char line[VIADUCT_SOCKET_BUFSIZE];
   char in_buf[VIADUCT_SOCKET_BUFSIZE];
   int in_ptr = -1;
   int len, pos = 0;
   int done = 0, ret, t = 0;
   char *results;
   char *sock_path;
   viaduct_connection_t conn;
   unsigned char connected = 0;
   pid_t pid;

   if (argc>1) {
      sock_path = argv[1];
   } else {
      sock_path = SOCK_PATH;
   }

#if HAVE_FREETDS
   viaduct_mssql_init();
#endif
#if HAVE_MYSQL
   viaduct_mysql_init();
#endif

   s = viaduct_socket_create(sock_path);

   // fork and die so parent knows we are ready
   if (!GDB && (pid=fork())) {
      fprintf(stdout, ":PID %lu\n", pid);
      exit(0);
   }
   // allow control to return to the (grand)parent process
   fclose(stdout);

   log_open();
   log_msg("Using socket path %s\n", sock_path);

   for (;;) {
      done = 0;
      // wait for connection
      s2 = viaduct_socket_accept(s);

      in_ptr = -1;
      // get a newline terminated string from the client
      while (!done && (t=viaduct_socket_recv_string(s2, in_buf, &in_ptr, line))>0) {
	   log_msg("line = %s\n", line);
           ret = process_line(line);
           
           if (ret == QUIT) {
              log_msg("disconnect.\n"); 
              viaduct_socket_send_string(s2, ":BYE\n");
              close(s2);
              done = 1;
           } else if (ret == RUN) {
              request.error_message[0]='\0';
              log_msg("running\n"); 
#if PERSISTENT_CONN
              if (!connected) {
#endif
#if HAVE_FREETDS
                  conn.db = viaduct_mssql_connect(&request);
#endif
#if HAVE_MYSQL
                  conn.db = viaduct_mysql_connect(&request);
#endif
                  connected = 1;
#if PERSISTENT_CONN
              }
#endif
              log_msg("%s\n", request.sql);
              results = (char *) viaduct_exec_query(&conn, (char *) &request.sql_database, request.sql, request.flags);
              log_msg("addr = %lu\n", results);
              if (results == NULL) {
	         log_msg("results are null\n"); 
                 viaduct_socket_send_string(s2, ":ERROR BEGIN\n");
                 viaduct_socket_send_string(s2, request.error_message);
                 viaduct_socket_send_string(s2, "\n");
                 viaduct_socket_send_string(s2, ":ERROR END\n");
              } else {
                 log_msg("sending results\n"); 
                 viaduct_socket_send_string(s2, ":RESULTS BEGIN\n");
                 log_msg("%s\n", results);
                 log_msg("len = %d\n", strlen(results));
                 viaduct_socket_send_string(s2, results);
                 viaduct_socket_send_string(s2, "\n");
                 viaduct_socket_send_string(s2, ":RESULTS END\n");
              }
              viaduct_socket_send_string(s2, ":OK\n");
              log_msg("done\n"); 
#if !PERSISTENT_CONN
#if HAVE_FREETDS
              viaduct_mssql_close(conn.db);
#endif
#if HAVE_MYSQL
              viaduct_mysql_close(conn.db);
#endif
#endif
              free(results);
		      if (request.connection_timeout) set_timer(request.connection_timeout);
           } else if (ret == DIE) {
              log_msg("exiting.\n"); 
              log_close();
              viaduct_socket_send_string(s2, ":BYE\n");
              close(s2);
              exit(0);
           } else if (ret == OK) {
              viaduct_socket_send_string(s2, ":OK\n");
              if (request.connection_timeout) set_timer(request.connection_timeout);
           } else if (ret == CONT) {
              log_msg("(cont)\n"); 
           } else {
              log_msg("ret = %d.\n", ret); 
              viaduct_socket_send_string(s2, ":ERR\n");
           }
        } // recv
        if (t<=0) log_msg("client connection broken\n");
        receive_sql = 0;
#if HAVE_FREETDS
        if (DBDEAD(conn.db)) {
           connected = 0;
        }
#endif
   } // for
   return 0;
}
int 
process_line(char *line)
{
   char arg[100];
   int len = strlen(line);
   char flag_str[10];

   if (receive_sql) {
      log_msg("sql mode\n");
      log_msg("line: %s\n", line);
      if (!line || strlen(line)<8 || strncmp(line, ":SQL END", 8)) {
      	sb_append(sb_sql, line);
      	sb_append(sb_sql, "\n");
        return CONT;
      }
   } 

   if (len<1 || line[0]!=':') {
      log_msg("bad protocol command returning ERR\n");
      log_msg(line);
      return ERR;
   }

   if (check_command(line, "QUIT", NULL)) return QUIT;
   else if (check_command(line, "RUN", NULL)) return RUN;
   else if (check_command(line, "DIE", NULL)) return DIE;
   else if (check_command(line, "SET NAME", &request.connection_name)) {
      log_msg("connection name %s\n");
      return OK;
   }
   else if (check_command(line, "SET PORT", &request.sql_port)) return OK;
   else if (check_command(line, "SET SERVER", &request.sql_server)) return OK;
   else if (check_command(line, "SET DATABASE", &request.sql_database)) return OK;
   else if (check_command(line, "SET USER", &request.sql_user)) return OK;
   else if (check_command(line, "SET PASSWORD", &request.sql_password)) return OK;
   else if (check_command(line, "SET APPNAME", &request.connection_name)) return OK;
   else if (check_command(line, "SET TIMEOUT", timeout_str)) {
      request.connection_timeout = atol(timeout_str);
      return OK;
   }
   else if (check_command(line, "SET FLAGS", flag_str)) {
      request.flags = (unsigned long) atol(flag_str);
      return OK;
   }
   else if (check_command(line, "SQL", arg)) {
      if (!strcmp(arg, "BEGIN")) {
         log_msg("sql mode on\n");
         receive_sql = 1;
         if (request.sql) free(request.sql);
         request.sql = NULL;
         sb_sql = sb_new(NULL);
      } else if (!strcmp(arg, "END")) {
         log_msg("sql mode off\n");
         receive_sql = 0;
         request.sql = sb_to_char(sb_sql);
         //log_msg("sql");
         //log_msg(request.sql);
         sb_free(sb_sql);
      } else return ERR;
      if (receive_sql) return CONT;
      else return OK;
   }
   else if (check_command(line, "RUN", NULL)) {
      return RUN;
   }

   return ERR;
}
int
check_command(char *line, char *command, char *dest)
{
   int cmdlen = strlen(command);

   if (strlen(line)>=cmdlen+1 && !strncmp(&line[1], command, cmdlen)) {
      if (dest && strlen(line)>cmdlen+1) {
         strcpy(dest, &line[cmdlen+2]);
      }
      return 1;
   } else {
      return 0;
   }
}

void log_open()
{
#if DEBUG
   char logdir[256];

   sprintf(logdir, "%s/logs", VIADUCT_PREFIX);
   sprintf(logfilename, "%s/connector%ld.log", logdir, getpid());
   logfile = fopen(logfilename, "w");

#endif
}

void
log_msg(char *fmt, ...)
{
#if DEBUG
   va_list  args;
   time_t t;
   struct tm *tm;
   char today[256];

   time(&t);
   tm = localtime(&t);

   strftime(today, sizeof(today), "%Y-%m-%d %H:%M:%S", tm);
   fprintf(logfile, "%s: ", today);

   va_start(args, fmt);
   vfprintf(logfile, fmt, args);
   va_end(args);

   fflush(logfile);
#endif
}
void log_close(FILE *log)
{
#if DEBUG
   fclose(logfile);
#endif
}

