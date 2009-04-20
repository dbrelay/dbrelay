#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include "viaduct.h"
#include "../include/viaduct_config.h"

#define DEBUG 0
#define BUFSIZE 4096

char *viaduct_conn_recv_string(int s, char *in_buf, int *in_ptr, char *out_buf);
void viaduct_conn_send_string(int s, char *str);
char *viaduct_conn_send_request(int s, viaduct_request_t *request);
void viaduct_conn_set_option(int s, char *option, char *value);
int viaduct_connect_to_helper(char *sock_path);

void
viaduct_conn_kill(int s)
{
   char out_buf[BUFSIZE];
   char in_buf[BUFSIZE];
   int in_ptr = -1;

   viaduct_conn_send_string(s, ":DIE\n");
   viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf);
   close(s);
}
void
viaduct_conn_close(int s)
{
   char out_buf[BUFSIZE];
   char in_buf[BUFSIZE];
   int in_ptr = -1;

   viaduct_conn_send_string(s, ":QUIT\n");
   viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf);
   close(s);
}
char *
viaduct_conn_send_request(int s, viaduct_request_t *request)
{
   stringbuf_t *sb_rslt;
   char *json_output;
   int results = 0;
   char out_buf[BUFSIZE];
   char in_buf[BUFSIZE];
   int in_ptr = -1;
   char tmp[20];

   viaduct_conn_set_option(s, "SERVER", request->sql_server);
   viaduct_conn_set_option(s, "DATABASE", request->sql_database);
   viaduct_conn_set_option(s, "USER", request->sql_user);
   //viaduct_conn_set_option(s, "PASSWORD", request->sql_password);
   sprintf(tmp, "%ld\n", request->connection_timeout);
   viaduct_log_info(request, "timeout %s", tmp);
   viaduct_conn_set_option(s, "TIMEOUT", tmp);

   viaduct_conn_send_string(s, ":SQL BEGIN\n");
   viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf);
   viaduct_conn_send_string(s, request->sql);
   viaduct_conn_send_string(s, "\n");
   viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf);
   viaduct_conn_send_string(s, ":SQL END\n");
   viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf);

   viaduct_conn_send_string(s, ":RUN\n");
   sb_rslt = sb_new(NULL);
   viaduct_log_debug(request, "receiving results");
   while (viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf) && 
      strcmp(out_buf, ":BYE") &&
      strcmp(out_buf, ":OK") &&
      strcmp(out_buf, ":ERR")) { 
      //viaduct_log_debug(request, "in %s", in_buf);
      //viaduct_log_debug(request, "out %s", out_buf);
      if (!strcmp(out_buf, ":RESULTS END")) results = 0;
      //printf("%s\n", out_buf);
      if (results) {
         sb_append(sb_rslt, out_buf);
         //sb_append(sb_rslt, "\n");
      }
      if (!strcmp(out_buf, ":RESULTS BEGIN")) results = 1;
   }
   viaduct_log_debug(request, "finished receiving results");
   json_output = sb_to_char(sb_rslt);
   sb_free(sb_rslt);
   return json_output;
}

void
viaduct_conn_set_option(int s, char *option, char *value)
{
   char out_buf[BUFSIZE];
   char in_buf[BUFSIZE];
   int in_ptr = -1;
   char set_string[100];

   sprintf(set_string, ":SET %s %s\n", option, value);
   viaduct_conn_send_string(s, set_string);
   viaduct_conn_recv_string(s, in_buf, &in_ptr, out_buf);
}

int
viaduct_connect_to_helper(char *sock_path)
{
   int s, len;
   struct sockaddr_un remote;
#if HAVE_SO_NOSIGPIPE
   int on = 1;
#endif

   if ((s = socket(AF_UNIX, SOCK_STREAM, 0)) == -1) {
       perror("socket");
       return -1;
   }

   if (DEBUG) printf("Trying to connect...\n");

   remote.sun_family = AF_UNIX;
   strcpy(remote.sun_path, sock_path);
   len = strlen(remote.sun_path) + sizeof(remote.sun_family) + 1;

   if (connect(s, (struct sockaddr *)&remote, len) == -1) {
      perror("connect");
      return -1;
   }
   if (DEBUG) printf("Connected.\n");

#if HAVE_SO_NOSIGPIPE
   setsockopt(s, SOL_SOCKET, SO_NOSIGPIPE, (void *)&on, sizeof(on));
#endif

   return s;
}
pid_t viaduct_conn_launch_connector(char *sock_path)
{
   //char *argv[] = {"viaduct-connector", sock_path, NULL};
   pid_t child = 0;
   char connector_path[256]; 
   char line[256]; 
   FILE *connector;

   //if ((child = fork())==0) {
     strcpy(connector_path, VIADUCT_PREFIX);
     strcat(connector_path, "/sbin/connector");
     strcat(connector_path, " ");
     strcat(connector_path, sock_path);
     //execv(connector_path, argv);
     printf("cmd = %s\n", connector_path);
     connector = popen(connector_path, "r");
     //printf("popen\n");
   //} else {
     /* wait for connector to be ready, signaled by dead parent */
     //waitpid(child, NULL, 0);
   //}
     while (fgets(line, 256, connector)!=NULL) {
        if (strlen(line)>4 && !strncmp(line, ":PID", 4)) {
           child = atol(&line[5]);
	}
     }
     pclose(connector);

     return child;
}
void
viaduct_conn_send_string(int s, char *str)
{
   if (send(s, str, strlen(str), NET_FLAGS) == -1) {
	perror("send");
	//exit(1);
   }
}
char * 
viaduct_conn_recv_string(int s, char *in_buf, int *in_ptr, char *out_buf)
{
   int t;
   int i;
   int len;

   //printf("\nptr %d\n", *in_ptr);
   if (*in_ptr==-1) {
      if ((t=recv(s, in_buf, BUFSIZE - 1, NET_FLAGS))<=0) {
	if (t < 0) perror("recv");
        else if (DEBUG) printf("Server closed connection\n");
	//exit(1);
        return NULL;
      }
      in_buf[t] = '\0';
      *in_ptr=0;
   } else (*in_ptr)++;
   len = strlen(in_buf);
   //printf("\nptr %d len %d i %d\n", *in_ptr, len, i);
   for (i=*in_ptr;in_buf[i]!='\n' && i<len; i++);
   strncpy(out_buf, &in_buf[*in_ptr], i - *in_ptr); 
   out_buf[i - *in_ptr]='\0';
   //printf("\nout_buf = %s\n", out_buf);
   if (i>=len-1) *in_ptr=-1;
   else *in_ptr=i; 
   if (DEBUG) printf("echo> %s\n", out_buf);
   if (*in_ptr>=BUFSIZE) exit(1);

   //printf("returning %s\n", out_buf);
   return out_buf; 
}
