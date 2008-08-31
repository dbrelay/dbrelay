#ifndef _STRINGBUF_H_INCLUDED_
#define _STRINGBUF_H_INCLUDED_

#include <stdlib.h>
#include <string.h>

typedef struct stringbuf_s {
   char *part;
   struct stringbuf_s *next;
} stringbuf_t;

char *sb_to_char(stringbuf_t *string);
int sb_len(stringbuf_t *string);
void sb_free(stringbuf_t *string);
stringbuf_t *sb_new(char *s);
stringbuf_t *sb_append(stringbuf_t *string, char *s);

#endif /* _STRINGBUF_H_INCLUDED_ */
