#ifndef _JSON_H_INCLUDED_
#define _JSON_H_INCLUDED_

#include <stdio.h>
#include "stringbuf.h"

#define ARRAY 0
#define OBJECT 1

typedef struct json_node_s {
   int node_type;
   int num_items;
   struct json_node_s *next;
} json_node_t;

typedef struct json_s {
   stringbuf_t *sb;
   int tab_level;
   json_node_t *stack;
   int pending;
} json_t;


void json_push(json_t *json, int node_type);
json_t *json_new();
void json_free(json_t *json);
char *json_to_string(json_t *json);
void json_new_object(json_t *json);
void json_end_object(json_t *json);
void json_new_array(json_t *json);
void json_end_array(json_t *json);
void json_add_value(json_t *json, char *value);
void json_add_key(json_t *json, char *key);
void json_add_number(json_t *json, char *key, char *value);
void json_add_string(json_t *json, char *key, char *value);
void json_push(json_t *json, int node_type);

#endif /* _JSON_H_INCLUDED_ */
