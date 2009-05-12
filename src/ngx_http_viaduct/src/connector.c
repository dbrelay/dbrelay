#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/time.h>
#include <sys/signal.h>
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
void log_msg(char *msg);

char app_name[VIADUCT_NAME_SZ];
char timeout_str[10];
int receive_sql;
stringbuf_t *sb_sql;
char logfilename[256];

viaduct_request_t request;

static FILE *logfile;

void timeout(int i)
{
   log_msg("Timeout reached. Exiting.\n");
   exit(0);
}

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
   struct sockaddr_un local, remote;
   char buf[100];
   char tmp[100];
   char line[4096];
   int len, pos = 0;
   int done = 0, ret;
   char *results;
   char *sock_path;
#if HAVE_SO_NOSIGPIPE
   int on = 1;
#endif
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

   s = socket(AF_UNIX, SOCK_STREAM, 0);

   local.sun_family = AF_UNIX;  
   strcpy(local.sun_path, sock_path);
   //strcpy(local.sun_path, SOCK_PATH);
   unlink(local.sun_path);
   len = strlen(local.sun_path) + sizeof(local.sun_family) + 1;
   ret = bind(s, (struct sockaddr *)&local, len);

   listen(s, 30);

   // fork and die so parent knows we are ready
   if (!GDB && (pid=fork())) {
      fprintf(stdout, ":PID %lu\n", pid);
      exit(0);
   }
   // allow control to return to the (grand)parent process
   fclose(stdout);
   //kill(getppid(), SIGURG);

   log_open();
   log_msg("Using socket path\n");
   log_msg(sock_path);
   log_msg("\n");

   len = sizeof(struct sockaddr_un);
   for (;;) {
      s2 = accept(s, &remote, &len);
      done = 0;

#if HAVE_SO_NOSIGPIPE
      setsockopt(s2, SOL_SOCKET, SO_NOSIGPIPE, (void *)&on, sizeof(on));
#endif

      while (!done && (len = recv(s2, &buf, 100, NET_FLAGS), len > 0)) {
        pos = 0;
        //send(s2, &buf, len, 0);
        while (get_line(buf, len, line, &pos)) {
	   if (DEBUG) printf("line = %s\n", line);
           ret = process_line(line);
           
           if (ret == QUIT) {
              log_msg("disconnect.\n"); 
              send(s2, ":BYE\n", 5, NET_FLAGS);
              close(s2);
              done = 1;
           } else if (ret == RUN) {
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
              log_msg(request.sql);
              results = (char *) viaduct_exec_query(&conn, &request.sql_database, request.sql);
              sprintf(tmp, "addr = %lu\n", results);
              log_msg(tmp);
              if (results == NULL) log_msg("results are null\n"); 

              log_msg("sending results\n"); 
              send(s2, ":RESULTS BEGIN\n", 15, NET_FLAGS);
              log_msg(results);
              sprintf(tmp, "len = %d\n", strlen(results));
              log_msg(tmp);
              send(s2, results, strlen(results), NET_FLAGS);
              send(s2, "\n", 1, NET_FLAGS);
              send(s2, ":RESULTS END\n", 13, NET_FLAGS);
              send(s2, ":OK\n", 4, NET_FLAGS);
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
              send(s2, ":BYE\n", 5, NET_FLAGS);
              close(s2);
              exit(0);
           } else if (ret == OK) {
              send(s2, ":OK\n", 4, NET_FLAGS);
              if (request.connection_timeout) set_timer(request.connection_timeout);
           } else if (ret == CONT) {
              log_msg("(cont)\n"); 
           } else {
              sprintf(tmp, "ret = %d.\n", ret); 
              log_msg(tmp); 
              send(s2, ":ERR\n", 5, NET_FLAGS);
           }
        }
      }
   }
   return 0;
}
int
get_line(char *buf, int buflen, char *line, int *pos)
{
   int i;
   int d = 0;

   for (i=*pos; i<buflen; i++) {
      if (buf[i]=='\n') {
        line[d]='\0';
        (*pos)++;
        return 1;
      } else {
         line[d++]=buf[i];
         (*pos)++;
      }      
   }
   return 0;
}
int 
process_line(char *line)
{
   char arg[100];
   int len = strlen(line);


   if (receive_sql) {
      log_msg("sql mode\n");
      log_msg("line: ");
      log_msg(line);
      log_msg("\n");
      if (!line || strlen(line)<8 || strncmp(line, ":SQL END", 8)) {
      	sb_append(sb_sql, line);
      	sb_append(sb_sql, "\n");
        return CONT;
      }
   } 

   if (len<1 || line[0]!=':') return ERR;

   if (check_command(line, "QUIT", NULL)) return QUIT;
   else if (check_command(line, "RUN", NULL)) return RUN;
   else if (check_command(line, "DIE", NULL)) return DIE;
   else if (check_command(line, "SET NAME", &request.connection_name)) {
      log_msg("connection name");
      log_msg(request.connection_name);
      return OK;
   }
   else if (check_command(line, "SET PORT", &request.sql_port)) return OK;
   else if (check_command(line, "SET SERVER", &request.sql_server)) return OK;
   else if (check_command(line, "SET DATABASE", &request.sql_database)) return OK;
   else if (check_command(line, "SET USER", &request.sql_user)) return OK;
   else if (check_command(line, "SET PASSWORD", &request.sql_password)) return OK;
   else if (check_command(line, "SET APPNAME", app_name)) return OK;
   else if (check_command(line, "SET TIMEOUT", timeout_str)) {
      request.connection_timeout = atol(timeout_str);
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

#if HAVE_FREETDS
int
db_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line)
{
   if (dbproc!=NULL) {
      if (msgno==5701 || msgno==5703 || msgno==5704) return 0;

      printf("msg %s\n", msgtext);
   }

   return 0;
}
int
db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr)
{
   //db_error = strdup(dberrstr);
   if (dbproc!=NULL) {
      //viaduct_request_t *request = (viaduct_request_t *) dbgetuserdata(dbproc);
      //strcat(request->error_message, dberrstr);
   }
   printf("msg %s\n", dberrstr);

   return INT_CANCEL;
}
#endif
void log_open()
{
#if DEBUG
   char logdir[256];

   sprintf(logdir, "%s/logs", VIADUCT_PREFIX);
   sprintf(logfilename, "%s/connector%ld.log", logdir, getpid());
   logfile = fopen(logfilename, "w");

#endif
}
void log_msg(char *msg)
{
#if DEBUG
   time_t t;
   struct tm *tm;
   char today[256];

   time(&t);
   tm = localtime(&t);

   strftime(today, sizeof(today), "%Y-%m-%d %H:%M:%S", tm);
   fprintf(logfile, "%s: %s", today, msg);
   fflush(logfile);
#endif
}
void log_close(FILE *log)
{
#if DEBUG
   fclose(logfile);
#endif
}

