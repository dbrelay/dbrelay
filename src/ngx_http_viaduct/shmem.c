#include <sys/types.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/sem.h>
#include "viaduct.h"

viaduct_connection_t *buf;

void viaduct_create_shmem()
{
   key_t key;
   int shmid;
   int semid;
   viaduct_connection_t *connections;
   union semun sem;
   
   key = ftok("/tmp/viaduct.mem", 1);
   shmid = shmget(key, VIADUCT_MAX_CONN * sizeof(viaduct_connection_t), IPC_CREAT | 0666);
   connections = (viaduct_connection_t *) shmat(shmid, NULL, 0);
   memset(connections, '\0', VIADUCT_MAX_CONN * sizeof(viaduct_connection_t));
   shmdt(connections);

   key = ftok("/tmp/viaduct.lock", 1);
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

   key = ftok("/tmp/viaduct.lock", 1);
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

   key = ftok("/tmp/viaduct.lock", 1);
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

   viaduct_lock_shmem();

   key = ftok("/tmp/viaduct.mem", 1);
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
