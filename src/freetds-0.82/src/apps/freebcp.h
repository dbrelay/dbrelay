static char rcsid_freebcp_h[] = "$Id: freebcp.h,v 1.12 2006/10/06 21:28:20 jklowden Exp $";
static void *no_unused_freebcp_h_warn[] = { rcsid_freebcp_h, no_unused_freebcp_h_warn };

enum states
{
	GET_NEXTARG,
	GET_MAXERRORS,
	GET_FORMATFILE,
	GET_ERRORFILE,
	GET_FIRSTROW,
	GET_LASTROW,
	GET_BATCHSIZE,
	GET_FIELDTERM,
	GET_ROWTERM,
	GET_USER,
	GET_PASS,
	GET_INTERFACESFILE,
	GET_SERVER,
	GET_DISPLAYCHARSET,
	GET_DATAFILECHARSET,
	GET_LANGUAGE,
	GET_PACKETSIZE,
	GET_CLIENTCHARSET,
	GET_TEXTSIZE,
	GET_SYBASEDIR,
	GET_FROMLABEL,
	GET_TOLABEL,
	GET_HINT
};

typedef struct pd
{
	char *dbobject;
	char dbdirection[10];
	DBINT direction;
	char hostfilename[FILENAME_MAX + 1];
	char formatfile[FILENAME_MAX + 1];
	char *errorfile;
	char interfacesfile[FILENAME_MAX + 1];
	int firstrow;
	int lastrow;
	int batchsize;
	int maxerrors;
	int textsize;
	char *fieldterm;
	int fieldtermlen;
	char *rowterm;
	int rowtermlen;
	char *user;
	char *pass;
	char *server;
	char *hint;
	char *options;
	int packetsize;
	int mflag;
	int fflag;
	int eflag;
	int Fflag;
	int Lflag;
	int bflag;
	int nflag;
	int cflag;
	int tflag;
	int rflag;
	int Uflag;
	int Iflag;
	int Sflag;
	int Pflag;
	int Tflag;
	int Aflag;
	int Eflag;
}
BCPPARAMDATA;
