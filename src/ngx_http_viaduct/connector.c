#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include "viaduct.h"

#define SOCK_PATH "/tmp/viaduct/connector"
#define DEBUG 0
#define GDB 0

#define OK 1
#define QUIT 2
#define ERR 3
#define DIE 4
#define RUN 5

int db_msg_handler(DBPROCESS * dbproc, DBINT msgno, int msgstate, int severity, char *msgtext, char *srvname, char *procname, int line);
int db_err_handler(DBPROCESS * dbproc, int severity, int dberr, int oserr, char *dberrstr, char *oserrstr);

char sql_server[VIADUCT_NAME_SZ];
char sql_port[6];
char sql_database[VIADUCT_OBJ_SZ];
char sql_user[VIADUCT_OBJ_SZ];
char sql_password[VIADUCT_OBJ_SZ];
char connection_name[VIADUCT_NAME_SZ];
char app_name[VIADUCT_NAME_SZ];
long connection_timeout;
char timeout_str[10];
LOGINREC *login;
DBPROCESS *dbproc;
int receive_sql;
stringbuf_t *sb_sql;
char *sql;

int
main(int argc, char **argv)
{
   unsigned int s, s2;
   struct sockaddr_un local, remote;
   char buf[100];
   char line[4096];
   int len, pos = 0;
   int done = 0, ret;
   char *results;
   char *sock_path;
   int on = 1;

   if (DEBUG) printf("in %s\n", argv[1]);
   if (argc>1) {
      sock_path = argv[1];
   } else {
      sock_path = SOCK_PATH;
   }

   dbinit();
   dberrhandle(db_err_handler);
   dbmsghandle(db_msg_handler);

   s = socket(AF_UNIX, SOCK_STREAM, 0);

   local.sun_family = AF_UNIX;  
   strcpy(local.sun_path, sock_path);
   //strcpy(local.sun_path, SOCK_PATH);
   unlink(local.sun_path);
   len = strlen(local.sun_path) + sizeof(local.sun_family) + 1;
   ret = bind(s, (struct sockaddr *)&local, len);

   listen(s, 5);

   // fork and die so parent knows we are ready
   if (!GDB && fork()) exit(0);

   len = sizeof(struct sockaddr_un);
   for (;;) {
      s2 = accept(s, &remote, &len);
      done = 0;

      setsockopt(s2, SOL_SOCKET, SO_NOSIGPIPE, (void *)&on, sizeof(on));

      while (!done && (len = recv(s2, &buf, 100, 0), len > 0)) {
        //send(s2, &buf, len, 0);
        if (get_line(buf, len, line, &pos)) {
	   if (DEBUG) printf("line = %s\n", line);
           ret = process_line(line);
           
           if (ret == QUIT) {
              send(s2, ":BYE\n", 5, 0);
              close(s2);
              done = 1;
           } else if (ret == RUN) {
              if (dbproc==NULL) {
                 login = dblogin();
                 if (sql_password && strlen(sql_password))
                    DBSETLPWD(login, sql_password);
                 DBSETLUSER(login, sql_user);
                 if (app_name) DBSETLAPP(login, app_name);
                 else DBSETLAPP(login, "viaduct");
                 dbproc = dbopen(login, sql_server);
              }
              results = viaduct_exec_query(dbproc, sql_database, sql);
              send(s2, ":RESULTS BEGIN\n", 15, 0);
              send(s2, results, strlen(results), 0);
              send(s2, "\n", 1, 0);
              send(s2, ":RESULTS END\n", 13, 0);
              send(s2, ":OK\n", 4, 0);
              free(results);
           } else if (ret == DIE) {
              send(s2, ":BYE\n", 5, 0);
              close(s2);
              exit(0);
           } else if (ret == OK) {
              send(s2, ":OK\n", 4, 0);
           } else {
              send(s2, ":ERR\n", 5, 0);
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

   for (i=0; i<buflen; i++) {
      if (buf[i]=='\n') {
        line[*pos]='\0';
        *pos=0;
        return 1;
      } else {
         line[(*pos)++]=buf[i];
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
      if (DEBUG) printf("sql mode\n");
      if (!line || strlen(line)<8 || strncmp(line, ":SQL END", 8)) {
        if (DEBUG) printf("appending\n");
      	sb_append(sb_sql, line);
        return OK;
      }
   } 

   if (len<1 || line[0]!=':') return ERR;

   if (check_command(line, "QUIT", NULL)) return QUIT;
   else if (check_command(line, "RUN", NULL)) return RUN;
   else if (check_command(line, "DIE", NULL)) return DIE;
   else if (check_command(line, "SET NAME", connection_name)) return OK;
   else if (check_command(line, "SET PORT", sql_port)) return OK;
   else if (check_command(line, "SET SERVER", sql_server)) return OK;
   else if (check_command(line, "SET DATABASE", sql_database)) return OK;
   else if (check_command(line, "SET USER", sql_user)) return OK;
   else if (check_command(line, "SET PASSWORD", sql_password)) return OK;
   else if (check_command(line, "SET APPNAME", app_name)) return OK;
   else if (check_command(line, "SET TIMEOUT", timeout_str)) {
      connection_timeout = atol(timeout_str);
      return OK;
   }
   else if (check_command(line, "SQL", arg)) {
      if (!strcmp(arg, "BEGIN")) {
         if (DEBUG) printf("sql mode on\n");
         receive_sql = 1;
         if (sql) free(sql);
         sql = NULL;
         sb_sql = sb_new(NULL);
      } else if (!strcmp(arg, "END")) {
         if (DEBUG) printf("sql mode off\n");
         receive_sql = 0;
         sql = sb_to_char(sb_sql);
         sb_free(sb_sql);
      } else return ERR;
      return OK;
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
         //printf("dest = !%s!\n", dest);
      }
      return 1;
   } else {
      return 0;
   }
}

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
