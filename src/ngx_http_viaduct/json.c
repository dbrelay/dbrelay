#include <stdio.h>
#include "json.h"

json_t *json_new()
{
   json_t *json = (json_t *) malloc(sizeof(json_t));
   memset(json, 0, sizeof(json_t));
   json->sb = sb_new(NULL);

   return json;
}
void json_free(json_t *json)
{
   json_node_t *node = json->stack;
   json_node_t *prev;

   while (node) {
	prev = node;
	node = node->next;
	free(prev);
   }
   sb_free(json->sb);
   free(json);
}
char *json_to_string(json_t *json)
{
   return sb_to_char(json->sb);
}
static void json_tab(json_t *json)
{
   int i;

   for(i=0; i<json->tab_level; i++) 
   {
      sb_append(json->sb, "   ");
   }
}
void json_new_object(json_t *json)
{ 
   if (!json->pending) {
      if (json->stack && json->stack->num_items) 
          sb_append(json->sb, ",\n");
      json_tab(json);
   }
   sb_append(json->sb, "{\n");
   json->tab_level++;

   if (json->stack) json->stack->num_items++;
   json_push(json, OBJECT);
   json->pending = 0;
}
void json_end_object(json_t *json)
{
   json_node_t *node;

   json->tab_level--;
   sb_append(json->sb, "\n");
   json_tab(json);

   sb_append(json->sb, "}");
   node = json->stack;
   if (node) {
   	json->stack = node->next;
   	free(node);
   }
}

void json_new_array(json_t *json)
{
   if (!json->pending) {
      if (json->stack && json->stack->num_items) 
          sb_append(json->sb, ",\n");
      json_tab(json);
   }
   sb_append(json->sb, "[\n");
   json->tab_level++;

   if (json->stack) json->stack->num_items++;
   json_push(json, ARRAY);
   json->pending = 0;
}
void json_end_array(json_t *json)
{
   json_node_t *node;

   json->tab_level--;
   sb_append(json->sb, "\n");
   json_tab(json);

   sb_append(json->sb, "]");
   node = json->stack;
   if (node) {
   	json->stack = node->next;
   	free(node);
   }
}

void json_add_value(json_t *json, char *value)
{
   if (json->stack && json->stack->num_items) {
      if (!json->pending) sb_append(json->sb, ",");
   }
   sb_append(json->sb, value);
   if (json->stack) json->stack->num_items++;
}
void json_add_key(json_t *json, char *key)
{
   json_node_t *node = json->stack;
   if (node) {
      if (node->num_items) {
         if (!json->pending) sb_append(json->sb, ", ");
      } else {
         json_tab(json);
      }
      node->num_items++;
   }
   sb_append(json->sb, key);
   sb_append(json->sb, " : ");
   json->pending = 1;
}
void json_add_number(json_t *json, char *key, char *value)
{
   json_add_key(json, key);
   sb_append(json->sb, value);
   json->pending = 0;
}
void json_add_string(json_t *json, char *key, char *value)
{
   json_add_key(json, key);
   sb_append(json->sb, "\"");
   sb_append(json->sb, value);
   sb_append(json->sb, "\"");
   json->pending = 0;
}

void json_push(json_t *json, int node_type)
{
   json_node_t *node = (json_node_t *) malloc(sizeof(json_node_t));
   memset(node, 0, sizeof(json_node_t));
   node->node_type = node_type;
   node->next = json->stack;
   json->stack = node;
}

/*
main()
{
   char *buf;
   json_t *json = json_new();

   json_new_array(json);
   json_new_array(json);
   json_new_object(json);
   json_add_string(json, "id", "1");
   json_add_string(json, "name", "name 1");
   json_end_object(json);
   json_new_object(json);
   json_add_string(json, "id", "2");
   json_add_string(json, "name", "name 2");
   json_end_object(json);
   json_end_array(json);
   json_new_array(json);
   json_add_string(json, "company", "XYZ");
   json_add_number(json, "port", "80");
   json_end_array(json);
   json_new_object(json);
   json_add_key(json, "request");
   json_new_object(json);
   json_add_string(json, "company", "ABC");
   json_add_string(json, "category", "SMALLCAP");
   json_end_object(json);
   json_add_number(json, "count", "3");
   json_end_object(json);
   json_end_array(json);

   buf = json_to_string(json);
   printf("%s\n", buf);
   json_free(json);
}
*/
