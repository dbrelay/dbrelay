#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/sem.h>
#include "viaduct.h"
#include "../include/viaduct_config.h"

#define MAX_PATH_SZ 256

#if !HAVE_SEMUN
union semun {
   int              val;    /* Value for SETVAL */
   struct semid_ds *buf;    /* Buffer for IPC_STAT, IPC_SET */
   unsigned short  *array;  /* Array for GETALL, SETALL */
   struct seminfo  *__buf;  /* Buffer for IPC_INFO
                               (Linux specific) */
};
#endif

viaduct_connection_t *buf;

static char *get_path(char *path, char *fname)
{
   strcpy(path, VIADUCT_PREFIX);
   strcat(path, "/");
   strcat(path, fname);

   return path;
}
void viaduct_create_shmem()
{
   key_t key;
   int shmid;
   int semid;
   viaduct_connection_t *connections;
   union semun sem;
   char path[MAX_PATH_SZ];
   
   key = ftok(get_path(path, "viaduct.mem"), 1);
   shmid = shmget(key, VIADUCT_MAX_CONN * sizeof(viaduct_connection_t), IPC_CREAT | 0666);
   connections = (viaduct_connection_t *) shmat(shmid, NULL, 0);
   memset(connections, '\0', VIADUCT_MAX_CONN * sizeof(viaduct_connection_t));
   shmdt(connections);

   key = ftok(get_path(path, "viaduct.lock"), 1);
   semid = semget(key, 1, IPC_CREAT | 0666);
   if (semid==-1) perror("semget");
   sem.val = 1;
   if (semctl(semid, 0, SETVAL, sem)==-1)
      perror("semctl");
}
viaduct_connection_t *viaduct_lock_shmem()
{
   key_t key;
   int semid;
   struct sembuf sb = {0, -1, SEM_UNDO};
   char path[MAX_PATH_SZ];

   key = ftok(get_path(path, "viaduct.lock"), 1);
   semid = semget(key, 1, 0);
   if (semid==-1) perror("semget");

   sb.sem_op = -1;
   if (semop(semid, &sb, 1)==1)
      perror("semop");

   return NULL;
}
void viaduct_unlock_shmem()
{
   key_t key;
   int semid;
   struct sembuf sb = {0, -1, SEM_UNDO};
   char path[MAX_PATH_SZ];

   key = ftok(get_path(path, "viaduct.lock"), 1);
   semid = semget(key, 1, 0);

   if (semid==-1) perror("semget");
   sb.sem_op = 1;
   if (semop(semid, &sb, 1)==-1)
      perror("semop");
}
viaduct_connection_t *viaduct_get_shmem()
{
   key_t key;
   int shmid;
   viaduct_connection_t *connections;
   char path[MAX_PATH_SZ];

   viaduct_lock_shmem();

   key = ftok(get_path(path, "viaduct.mem"), 1);
   shmid = shmget(key, VIADUCT_MAX_CONN * sizeof(viaduct_connection_t), 0666);
   if (shmid==-1) return NULL;

   connections = (viaduct_connection_t *) shmat(shmid, NULL, 0);

   return connections;
}
void viaduct_release_shmem(viaduct_connection_t *connections)
{
   shmdt(connections);

   viaduct_unlock_shmem();
}
void viaduct_destroy_shmem()
{
   key_t key;
   int shmid;
   int semid;
   char path[MAX_PATH_SZ];
   
   key = ftok(get_path(path, "viaduct.lock"), 1);
   shmid = shmget(key, VIADUCT_MAX_CONN * sizeof(viaduct_connection_t), IPC_CREAT | 0666);
   shmctl(shmid, IPC_RMID, NULL);

   key = ftok(get_path(path, "viaduct.mem"), 1);
   semid = semget(key, 1, IPC_CREAT | 0666);
   semctl(semid, 0, IPC_RMID);
}
