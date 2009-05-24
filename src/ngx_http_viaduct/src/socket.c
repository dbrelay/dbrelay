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

int
viaduct_socket_connect(char *sock_path)
{
   int s, len;
   struct sockaddr_un remote;
#if HAVE_SO_NOSIGPIPE
   int on = 1;
#endif

   if ((s = socket(AF_UNIX, SOCK_STREAM, 0)) == -1) {
       return -1;
   }

   if (DEBUG) printf("Trying to connect...\n");

   remote.sun_family = AF_UNIX;
   strcpy(remote.sun_path, sock_path);
   len = strlen(remote.sun_path) + sizeof(remote.sun_family) + 1;

   if (connect(s, (struct sockaddr *)&remote, len) == -1) {
      return -1;
   }
   if (DEBUG) printf("Connected.\n");

#if HAVE_SO_NOSIGPIPE
   setsockopt(s, SOL_SOCKET, SO_NOSIGPIPE, (void *)&on, sizeof(on));
#endif

   return s;
}
void
viaduct_socket_send_string(int s, char *str)
{
   send(s, str, strlen(str), NET_FLAGS);
}
char * 
viaduct_socket_recv_string(int s, char *in_buf, int *in_ptr, char *out_buf)
{
   int t;
   int i;
   int len;

   //fprintf(stderr, "\nptr %d\n", *in_ptr);
   if (*in_ptr==-1) {
      if ((t=recv(s, in_buf, VIADUCT_SOCKET_BUFSIZE - 1, NET_FLAGS))<=0) {
	if (t < 0) {
          if (DEBUG) perror("recv"); 
        } else {
          if (DEBUG) printf("Server closed connection\n");
        }
        return NULL;
      }
      in_buf[t] = '\0';
      *in_ptr=0;
   } else (*in_ptr)++;
   len = strlen(in_buf);
   //fprintf(stderr, "\nptr %d len %d\n", *in_ptr, len);
   for (i=*in_ptr;in_buf[i]!='\n' && i<len; i++);
   strncpy(out_buf, &in_buf[*in_ptr], i - *in_ptr); 
   out_buf[i - *in_ptr]='\0';
   //fprintf(stderr, "\nout_buf = %s\n", out_buf);
   if (i>=len-1) *in_ptr=-1;
   else *in_ptr=i; 
   if (DEBUG) printf("echo> %s\n", out_buf);
   if (*in_ptr>=VIADUCT_SOCKET_BUFSIZE) exit(1);

   //fprintf(stderr, "returning %s\n", out_buf);
   return out_buf; 
}
