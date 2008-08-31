#include "stringbuf.h"
#include <stdio.h>

char *sb_to_char(stringbuf_t *string)
{
   char *outstr = (char *) malloc(sb_len(string) + 1);
   outstr[0] = '\0';

   do {
      if (string->part) strcat(outstr, string->part);
      string = string->next;
   } while (string);

   return outstr;
}

int sb_len(stringbuf_t *string)
{
   int len = 0;

   do {
      if (string->part) len += strlen(string->part);
      string = string->next;
   } while (string);

   return len;
}

void sb_free(stringbuf_t *string)
{
   stringbuf_t *prev;

   do {
      prev = string;
      string = string->next;
      if (prev->part) free(prev->part);
      free(prev);
   } while (string->next);
}

stringbuf_t *sb_new(char *s)
{
   stringbuf_t *string = (stringbuf_t *) malloc(sizeof(stringbuf_t));
   memset(string, 0, sizeof(stringbuf_t));
   if (s) string->part = strdup(s); 

   return string;
}

stringbuf_t *sb_append(stringbuf_t *string, char *s)
{
   while (string->next) {
	string = string->next;
   }

   stringbuf_t *new_string = malloc(sizeof(stringbuf_t));
   memset(new_string, 0, sizeof(stringbuf_t));
   if (s) new_string->part = strdup(s); 
   string->next = new_string;

   return new_string;
}

/*
main() {
   stringbuf_t *sb = sb_new("first\n");
   sb_append(sb, "second\n");
   sb_append(sb, "third\n");
   sb_append(sb, "fourth\n");
   sb_append(sb, "fifth\n");
   sb_append(sb, "sixth\n");
   printf("%s", sb_to_char(sb));
}
*/
