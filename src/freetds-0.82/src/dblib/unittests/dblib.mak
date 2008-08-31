!IF "$(OS)" == "Windows_NT"
NULL=
!ELSE
NULL=nul
!ENDIF

OUTDIR=.\Release
INTDIR=.\Release

ALL :  \
	"$(OUTDIR)\t0001.exe" \
	"$(OUTDIR)\t0002.exe" \
	"$(OUTDIR)\t0003.exe" \
	"$(OUTDIR)\t0004.exe" \
	"$(OUTDIR)\t0005.exe" \
	"$(OUTDIR)\t0006.exe" \
	"$(OUTDIR)\t0007.exe" \
	"$(OUTDIR)\t0008.exe" \
	"$(OUTDIR)\t0009.exe" \
	"$(OUTDIR)\t0011.exe" \
	"$(OUTDIR)\t0012.exe" \
	"$(OUTDIR)\t0013.exe" \
	"$(OUTDIR)\t0014.exe" \
	"$(OUTDIR)\t0015.exe" \
	"$(OUTDIR)\t0016.exe" \
	"$(OUTDIR)\t0017.exe" \
	"$(OUTDIR)\t0018.exe" \
	"$(OUTDIR)\t0019.exe" \
	"$(OUTDIR)\t0020.exe" \
	"$(OUTDIR)\t0021.exe" \
	"$(OUTDIR)\t0022.exe" \
	"$(OUTDIR)\t0023.exe" \
	"$(OUTDIR)\rpc.exe" \
	"$(OUTDIR)\dbmorecmds.exe" \
	"$(OUTDIR)\bcp.exe" \
	"$(OUTDIR)\thread.exe" \
	"$(OUTDIR)\text_buffer.exe" \
	"$(OUTDIR)\done_handling.exe" \
	"$(OUTDIR)\timeout.exe" \
	"$(OUTDIR)\hang.exe" \
	"$(OUTDIR)\null.exe" \
	"$(OUTDIR)\null2.exe" \
	"$(OUTDIR)\setnull.exe"

CLEAN :
	-@erase "$(INTDIR)*.obj"
	-@erase "$(OUTDIR)*.exe"

"$(OUTDIR)" :
	if not exist "$(OUTDIR)/$(NULL)" mkdir "$(OUTDIR)"

CPP=cl.exe
CPP_PROJ=/nologo /MD /W3 /O2 /Ob2 /I "./" /D WIN32 /D NDEBUG /D _CONSOLE /D _MBCS /D FREETDS_SRCDIR=\"..\" /D DBNTWIN32 /Fo"$(INTDIR)\\" /Fd"$(INTDIR)\\" /FD /c 

.c{$(INTDIR)}.obj::
	$(CPP) $(CPP_PROJ) $<

LINK32=link.exe
LINK32_FLAGS=kernel32.lib user32.lib gdi32.lib advapi32.lib ws2_32.lib odbc32.lib ntwdblib.lib /nologo /subsystem:console /incremental:no /machine:I386

"$(OUTDIR)\t0001.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0001.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0001.obj" /pdb:"$(OUTDIR)\t0001.pdb" /out:"$(OUTDIR)\t0001.exe"

"$(OUTDIR)\t0002.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0002.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0002.obj" /pdb:"$(OUTDIR)\t0002.pdb" /out:"$(OUTDIR)\t0002.exe"

"$(OUTDIR)\t0003.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0003.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0003.obj" /pdb:"$(OUTDIR)\t0003.pdb" /out:"$(OUTDIR)\t0003.exe"

"$(OUTDIR)\t0004.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0004.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0004.obj" /pdb:"$(OUTDIR)\t0004.pdb" /out:"$(OUTDIR)\t0004.exe"

"$(OUTDIR)\t0005.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0005.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0005.obj" /pdb:"$(OUTDIR)\t0005.pdb" /out:"$(OUTDIR)\t0005.exe"

"$(OUTDIR)\t0006.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0006.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0006.obj" /pdb:"$(OUTDIR)\t0006.pdb" /out:"$(OUTDIR)\t0006.exe"

"$(OUTDIR)\t0007.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0007.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0007.obj" /pdb:"$(OUTDIR)\t0007.pdb" /out:"$(OUTDIR)\t0007.exe"

"$(OUTDIR)\t0008.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0008.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0008.obj" /pdb:"$(OUTDIR)\t0008.pdb" /out:"$(OUTDIR)\t0008.exe"

"$(OUTDIR)\t0009.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0009.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0009.obj" /pdb:"$(OUTDIR)\t0009.pdb" /out:"$(OUTDIR)\t0009.exe"

"$(OUTDIR)\t0011.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0011.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0011.obj" /pdb:"$(OUTDIR)\t0011.pdb" /out:"$(OUTDIR)\t0011.exe"

"$(OUTDIR)\t0012.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0012.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0012.obj" /pdb:"$(OUTDIR)\t0012.pdb" /out:"$(OUTDIR)\t0012.exe"

"$(OUTDIR)\t0013.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0013.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0013.obj" /pdb:"$(OUTDIR)\t0013.pdb" /out:"$(OUTDIR)\t0013.exe"

"$(OUTDIR)\t0014.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0014.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0014.obj" /pdb:"$(OUTDIR)\t0014.pdb" /out:"$(OUTDIR)\t0014.exe"

"$(OUTDIR)\t0015.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0015.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0015.obj" /pdb:"$(OUTDIR)\t0015.pdb" /out:"$(OUTDIR)\t0015.exe"

"$(OUTDIR)\t0016.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0016.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0016.obj" /pdb:"$(OUTDIR)\t0016.pdb" /out:"$(OUTDIR)\t0016.exe"

"$(OUTDIR)\t0017.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0017.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0017.obj" /pdb:"$(OUTDIR)\t0017.pdb" /out:"$(OUTDIR)\t0017.exe"

"$(OUTDIR)\t0018.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0018.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0018.obj" /pdb:"$(OUTDIR)\t0018.pdb" /out:"$(OUTDIR)\t0018.exe"

"$(OUTDIR)\t0019.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0019.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0019.obj" /pdb:"$(OUTDIR)\t0019.pdb" /out:"$(OUTDIR)\t0019.exe"

"$(OUTDIR)\t0020.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0020.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0020.obj" /pdb:"$(OUTDIR)\t0020.pdb" /out:"$(OUTDIR)\t0020.exe"

"$(OUTDIR)\t0021.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0021.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0021.obj" /pdb:"$(OUTDIR)\t0021.pdb" /out:"$(OUTDIR)\t0021.exe"

"$(OUTDIR)\t0022.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0022.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0022.obj" /pdb:"$(OUTDIR)\t0022.pdb" /out:"$(OUTDIR)\t0022.exe"

"$(OUTDIR)\t0023.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\t0023.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\t0023.obj" /pdb:"$(OUTDIR)\t0023.pdb" /out:"$(OUTDIR)\t0023.exe"

"$(OUTDIR)\rpc.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\rpc.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\rpc.obj" /pdb:"$(OUTDIR)\rpc.pdb" /out:"$(OUTDIR)\rpc.exe"

"$(OUTDIR)\dbmorecmds.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\dbmorecmds.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\dbmorecmds.obj" /pdb:"$(OUTDIR)\dbmorecmds.pdb" /out:"$(OUTDIR)\dbmorecmds.exe"

"$(OUTDIR)\bcp.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\bcp.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\bcp.obj" /pdb:"$(OUTDIR)\bcp.pdb" /out:"$(OUTDIR)\bcp.exe"

"$(OUTDIR)\thread.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\thread.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\thread.obj" /pdb:"$(OUTDIR)\thread.pdb" /out:"$(OUTDIR)\thread.exe"

"$(OUTDIR)\text_buffer.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\text_buffer.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\text_buffer.obj" /pdb:"$(OUTDIR)\text_buffer.pdb" /out:"$(OUTDIR)\text_buffer.exe"

"$(OUTDIR)\done_handling.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\done_handling.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\done_handling.obj" /pdb:"$(OUTDIR)\done_handling.pdb" /out:"$(OUTDIR)\done_handling.exe"

"$(OUTDIR)\timeout.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\timeout.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\timeout.obj" /pdb:"$(OUTDIR)\timeout.pdb" /out:"$(OUTDIR)\timeout.exe"

"$(OUTDIR)\hang.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\hang.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\hang.obj" /pdb:"$(OUTDIR)\hang.pdb" /out:"$(OUTDIR)\hang.exe"

"$(OUTDIR)\null.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\null.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\null.obj" /pdb:"$(OUTDIR)\null.pdb" /out:"$(OUTDIR)\null.exe"

"$(OUTDIR)\null2.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\null2.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\null2.obj" /pdb:"$(OUTDIR)\null2.pdb" /out:"$(OUTDIR)\null2.exe"

"$(OUTDIR)\setnull.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\setnull.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\setnull.obj" /pdb:"$(OUTDIR)\setnull.pdb" /out:"$(OUTDIR)\setnull.exe"



CHECK :	
	"$(OUTDIR)\t0001.exe"
	"$(OUTDIR)\t0002.exe"
	"$(OUTDIR)\t0003.exe"
	"$(OUTDIR)\t0004.exe"
	"$(OUTDIR)\t0005.exe"
	"$(OUTDIR)\t0006.exe"
	"$(OUTDIR)\t0007.exe"
	"$(OUTDIR)\t0008.exe"
	"$(OUTDIR)\t0009.exe"
	"$(OUTDIR)\t0011.exe"
	"$(OUTDIR)\t0012.exe"
	"$(OUTDIR)\t0013.exe"
	"$(OUTDIR)\t0014.exe"
	"$(OUTDIR)\t0015.exe"
	"$(OUTDIR)\t0016.exe"
	"$(OUTDIR)\t0017.exe"
	"$(OUTDIR)\t0018.exe"
	"$(OUTDIR)\t0019.exe"
	"$(OUTDIR)\t0020.exe"
	"$(OUTDIR)\t0021.exe"
	"$(OUTDIR)\t0022.exe"
	"$(OUTDIR)\t0023.exe"
	"$(OUTDIR)\rpc.exe"
	"$(OUTDIR)\dbmorecmds.exe"
	"$(OUTDIR)\bcp.exe"
	"$(OUTDIR)\thread.exe"
	"$(OUTDIR)\text_buffer.exe"
	"$(OUTDIR)\done_handling.exe"
	"$(OUTDIR)\timeout.exe"
	"$(OUTDIR)\hang.exe"
	"$(OUTDIR)\null.exe"
	"$(OUTDIR)\null2.exe"
	"$(OUTDIR)\setnull.exe"
