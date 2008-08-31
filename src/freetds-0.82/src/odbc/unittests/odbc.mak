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
	"$(OUTDIR)\connect.exe" \
	"$(OUTDIR)\print.exe" \
	"$(OUTDIR)\date.exe" \
	"$(OUTDIR)\norowset.exe" \
	"$(OUTDIR)\funccall.exe" \
	"$(OUTDIR)\lang_error.exe" \
	"$(OUTDIR)\tables.exe" \
	"$(OUTDIR)\binary_test.exe" \
	"$(OUTDIR)\moreandcount.exe" \
	"$(OUTDIR)\earlybind.exe" \
	"$(OUTDIR)\putdata.exe" \
	"$(OUTDIR)\params.exe" \
	"$(OUTDIR)\raiserror.exe" \
	"$(OUTDIR)\getdata.exe" \
	"$(OUTDIR)\transaction.exe" \
	"$(OUTDIR)\type.exe" \
	"$(OUTDIR)\genparams.exe" \
	"$(OUTDIR)\preperror.exe" \
	"$(OUTDIR)\prepare_results.exe" \
	"$(OUTDIR)\testodbc.exe" \
	"$(OUTDIR)\data.exe" \
	"$(OUTDIR)\error.exe" \
	"$(OUTDIR)\rebindpar.exe" \
	"$(OUTDIR)\rpc.exe" \
	"$(OUTDIR)\convert_error.exe" \
	"$(OUTDIR)\typeinfo.exe" \
	"$(OUTDIR)\const_params.exe" \
	"$(OUTDIR)\insert_speed.exe" \
	"$(OUTDIR)\compute.exe" \
	"$(OUTDIR)\timeout.exe" \
	"$(OUTDIR)\array.exe" \
	"$(OUTDIR)\array_out.exe" \
	"$(OUTDIR)\cursor1.exe" \
	"$(OUTDIR)\scroll.exe" \
	"$(OUTDIR)\cursor2.exe" \
	"$(OUTDIR)\describecol.exe" \
	"$(OUTDIR)\copydesc.exe" \
	"$(OUTDIR)\prepclose.exe" \
	"$(OUTDIR)\warning.exe" \
	"$(OUTDIR)\paramcore.exe" \
	"$(OUTDIR)\timeout2.exe" \
	"$(OUTDIR)\timeout3.exe" \
	"$(OUTDIR)\connect2.exe" \
	"$(OUTDIR)\timeout4.exe" \
	"$(OUTDIR)\freeclose.exe" \
	"$(OUTDIR)\cursor3.exe" \
	"$(OUTDIR)\cursor4.exe" \
	"$(OUTDIR)\cursor5.exe" \
	"$(OUTDIR)\attributes.exe" \
	"$(OUTDIR)\hidden.exe" \
	"$(OUTDIR)\blob1.exe" \
	"$(OUTDIR)\rowset.exe"

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

"$(OUTDIR)\connect.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\connect.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\connect.obj" /pdb:"$(OUTDIR)\connect.pdb" /out:"$(OUTDIR)\connect.exe"

"$(OUTDIR)\print.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\print.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\print.obj" /pdb:"$(OUTDIR)\print.pdb" /out:"$(OUTDIR)\print.exe"

"$(OUTDIR)\date.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\date.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\date.obj" /pdb:"$(OUTDIR)\date.pdb" /out:"$(OUTDIR)\date.exe"

"$(OUTDIR)\norowset.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\norowset.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\norowset.obj" /pdb:"$(OUTDIR)\norowset.pdb" /out:"$(OUTDIR)\norowset.exe"

"$(OUTDIR)\funccall.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\funccall.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\funccall.obj" /pdb:"$(OUTDIR)\funccall.pdb" /out:"$(OUTDIR)\funccall.exe"

"$(OUTDIR)\lang_error.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\lang_error.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\lang_error.obj" /pdb:"$(OUTDIR)\lang_error.pdb" /out:"$(OUTDIR)\lang_error.exe"

"$(OUTDIR)\tables.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\tables.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\tables.obj" /pdb:"$(OUTDIR)\tables.pdb" /out:"$(OUTDIR)\tables.exe"

"$(OUTDIR)\binary_test.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\binary_test.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\binary_test.obj" /pdb:"$(OUTDIR)\binary_test.pdb" /out:"$(OUTDIR)\binary_test.exe"

"$(OUTDIR)\moreandcount.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\moreandcount.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\moreandcount.obj" /pdb:"$(OUTDIR)\moreandcount.pdb" /out:"$(OUTDIR)\moreandcount.exe"

"$(OUTDIR)\earlybind.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\earlybind.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\earlybind.obj" /pdb:"$(OUTDIR)\earlybind.pdb" /out:"$(OUTDIR)\earlybind.exe"

"$(OUTDIR)\putdata.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\putdata.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\putdata.obj" /pdb:"$(OUTDIR)\putdata.pdb" /out:"$(OUTDIR)\putdata.exe"

"$(OUTDIR)\params.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\params.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\params.obj" /pdb:"$(OUTDIR)\params.pdb" /out:"$(OUTDIR)\params.exe"

"$(OUTDIR)\raiserror.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\raiserror.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\raiserror.obj" /pdb:"$(OUTDIR)\raiserror.pdb" /out:"$(OUTDIR)\raiserror.exe"

"$(OUTDIR)\getdata.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\getdata.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\getdata.obj" /pdb:"$(OUTDIR)\getdata.pdb" /out:"$(OUTDIR)\getdata.exe"

"$(OUTDIR)\transaction.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\transaction.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\transaction.obj" /pdb:"$(OUTDIR)\transaction.pdb" /out:"$(OUTDIR)\transaction.exe"

"$(OUTDIR)\type.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\type.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\type.obj" /pdb:"$(OUTDIR)\type.pdb" /out:"$(OUTDIR)\type.exe"

"$(OUTDIR)\genparams.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\genparams.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\genparams.obj" /pdb:"$(OUTDIR)\genparams.pdb" /out:"$(OUTDIR)\genparams.exe"

"$(OUTDIR)\preperror.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\preperror.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\preperror.obj" /pdb:"$(OUTDIR)\preperror.pdb" /out:"$(OUTDIR)\preperror.exe"

"$(OUTDIR)\prepare_results.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\prepare_results.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\prepare_results.obj" /pdb:"$(OUTDIR)\prepare_results.pdb" /out:"$(OUTDIR)\prepare_results.exe"

"$(OUTDIR)\testodbc.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\testodbc.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\testodbc.obj" /pdb:"$(OUTDIR)\testodbc.pdb" /out:"$(OUTDIR)\testodbc.exe"

"$(OUTDIR)\data.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\data.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\data.obj" /pdb:"$(OUTDIR)\data.pdb" /out:"$(OUTDIR)\data.exe"

"$(OUTDIR)\error.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\error.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\error.obj" /pdb:"$(OUTDIR)\error.pdb" /out:"$(OUTDIR)\error.exe"

"$(OUTDIR)\rebindpar.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\rebindpar.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\rebindpar.obj" /pdb:"$(OUTDIR)\rebindpar.pdb" /out:"$(OUTDIR)\rebindpar.exe"

"$(OUTDIR)\rpc.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\rpc.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\rpc.obj" /pdb:"$(OUTDIR)\rpc.pdb" /out:"$(OUTDIR)\rpc.exe"

"$(OUTDIR)\convert_error.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\convert_error.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\convert_error.obj" /pdb:"$(OUTDIR)\convert_error.pdb" /out:"$(OUTDIR)\convert_error.exe"

"$(OUTDIR)\typeinfo.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\typeinfo.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\typeinfo.obj" /pdb:"$(OUTDIR)\typeinfo.pdb" /out:"$(OUTDIR)\typeinfo.exe"

"$(OUTDIR)\const_params.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\const_params.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\const_params.obj" /pdb:"$(OUTDIR)\const_params.pdb" /out:"$(OUTDIR)\const_params.exe"

"$(OUTDIR)\insert_speed.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\insert_speed.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\insert_speed.obj" /pdb:"$(OUTDIR)\insert_speed.pdb" /out:"$(OUTDIR)\insert_speed.exe"

"$(OUTDIR)\compute.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\compute.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\compute.obj" /pdb:"$(OUTDIR)\compute.pdb" /out:"$(OUTDIR)\compute.exe"

"$(OUTDIR)\timeout.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\timeout.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\timeout.obj" /pdb:"$(OUTDIR)\timeout.pdb" /out:"$(OUTDIR)\timeout.exe"

"$(OUTDIR)\array.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\array.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\array.obj" /pdb:"$(OUTDIR)\array.pdb" /out:"$(OUTDIR)\array.exe"

"$(OUTDIR)\array_out.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\array_out.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\array_out.obj" /pdb:"$(OUTDIR)\array_out.pdb" /out:"$(OUTDIR)\array_out.exe"

"$(OUTDIR)\cursor1.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\cursor1.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\cursor1.obj" /pdb:"$(OUTDIR)\cursor1.pdb" /out:"$(OUTDIR)\cursor1.exe"

"$(OUTDIR)\scroll.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\scroll.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\scroll.obj" /pdb:"$(OUTDIR)\scroll.pdb" /out:"$(OUTDIR)\scroll.exe"

"$(OUTDIR)\cursor2.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\cursor2.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\cursor2.obj" /pdb:"$(OUTDIR)\cursor2.pdb" /out:"$(OUTDIR)\cursor2.exe"

"$(OUTDIR)\describecol.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\describecol.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\describecol.obj" /pdb:"$(OUTDIR)\describecol.pdb" /out:"$(OUTDIR)\describecol.exe"

"$(OUTDIR)\copydesc.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\copydesc.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\copydesc.obj" /pdb:"$(OUTDIR)\copydesc.pdb" /out:"$(OUTDIR)\copydesc.exe"

"$(OUTDIR)\prepclose.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\prepclose.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\prepclose.obj" /pdb:"$(OUTDIR)\prepclose.pdb" /out:"$(OUTDIR)\prepclose.exe"

"$(OUTDIR)\warning.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\warning.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\warning.obj" /pdb:"$(OUTDIR)\warning.pdb" /out:"$(OUTDIR)\warning.exe"

"$(OUTDIR)\paramcore.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\paramcore.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\paramcore.obj" /pdb:"$(OUTDIR)\paramcore.pdb" /out:"$(OUTDIR)\paramcore.exe"

"$(OUTDIR)\timeout2.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\timeout2.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\timeout2.obj" /pdb:"$(OUTDIR)\timeout2.pdb" /out:"$(OUTDIR)\timeout2.exe"

"$(OUTDIR)\timeout3.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\timeout3.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\timeout3.obj" /pdb:"$(OUTDIR)\timeout3.pdb" /out:"$(OUTDIR)\timeout3.exe"

"$(OUTDIR)\connect2.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\connect2.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\connect2.obj" /pdb:"$(OUTDIR)\connect2.pdb" /out:"$(OUTDIR)\connect2.exe"

"$(OUTDIR)\timeout4.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\timeout4.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\timeout4.obj" /pdb:"$(OUTDIR)\timeout4.pdb" /out:"$(OUTDIR)\timeout4.exe"

"$(OUTDIR)\freeclose.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\freeclose.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\freeclose.obj" /pdb:"$(OUTDIR)\freeclose.pdb" /out:"$(OUTDIR)\freeclose.exe"

"$(OUTDIR)\cursor3.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\cursor3.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\cursor3.obj" /pdb:"$(OUTDIR)\cursor3.pdb" /out:"$(OUTDIR)\cursor3.exe"

"$(OUTDIR)\cursor4.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\cursor4.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\cursor4.obj" /pdb:"$(OUTDIR)\cursor4.pdb" /out:"$(OUTDIR)\cursor4.exe"

"$(OUTDIR)\cursor5.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\cursor5.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\cursor5.obj" /pdb:"$(OUTDIR)\cursor5.pdb" /out:"$(OUTDIR)\cursor5.exe"

"$(OUTDIR)\attributes.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\attributes.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\attributes.obj" /pdb:"$(OUTDIR)\attributes.pdb" /out:"$(OUTDIR)\attributes.exe"

"$(OUTDIR)\hidden.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\hidden.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\hidden.obj" /pdb:"$(OUTDIR)\hidden.pdb" /out:"$(OUTDIR)\hidden.exe"

"$(OUTDIR)\blob1.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\blob1.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\blob1.obj" /pdb:"$(OUTDIR)\blob1.pdb" /out:"$(OUTDIR)\blob1.exe"

"$(OUTDIR)\rowset.exe" : "$(OUTDIR)" "$(INTDIR)\common.obj" "$(INTDIR)\rowset.obj"
	$(LINK32) $(LINK32_FLAGS) "$(INTDIR)\common.obj" "$(INTDIR)\rowset.obj" /pdb:"$(OUTDIR)\rowset.pdb" /out:"$(OUTDIR)\rowset.exe"



CHECK :	
	"$(OUTDIR)\t0001.exe"
	"$(OUTDIR)\t0002.exe"
	"$(OUTDIR)\t0003.exe"
	"$(OUTDIR)\t0004.exe"
	"$(OUTDIR)\connect.exe"
	"$(OUTDIR)\print.exe"
	"$(OUTDIR)\date.exe"
	"$(OUTDIR)\norowset.exe"
	"$(OUTDIR)\funccall.exe"
	"$(OUTDIR)\lang_error.exe"
	"$(OUTDIR)\tables.exe"
	"$(OUTDIR)\binary_test.exe"
	"$(OUTDIR)\moreandcount.exe"
	"$(OUTDIR)\earlybind.exe"
	"$(OUTDIR)\putdata.exe"
	"$(OUTDIR)\params.exe"
	"$(OUTDIR)\raiserror.exe"
	"$(OUTDIR)\getdata.exe"
	"$(OUTDIR)\transaction.exe"
	"$(OUTDIR)\type.exe"
	"$(OUTDIR)\genparams.exe"
	"$(OUTDIR)\preperror.exe"
	"$(OUTDIR)\prepare_results.exe"
	"$(OUTDIR)\testodbc.exe"
	"$(OUTDIR)\data.exe"
	"$(OUTDIR)\error.exe"
	"$(OUTDIR)\rebindpar.exe"
	"$(OUTDIR)\rpc.exe"
	"$(OUTDIR)\convert_error.exe"
	"$(OUTDIR)\typeinfo.exe"
	"$(OUTDIR)\const_params.exe"
	"$(OUTDIR)\insert_speed.exe"
	"$(OUTDIR)\compute.exe"
	"$(OUTDIR)\timeout.exe"
	"$(OUTDIR)\array.exe"
	"$(OUTDIR)\array_out.exe"
	"$(OUTDIR)\cursor1.exe"
	"$(OUTDIR)\scroll.exe"
	"$(OUTDIR)\cursor2.exe"
	"$(OUTDIR)\describecol.exe"
	"$(OUTDIR)\copydesc.exe"
	"$(OUTDIR)\prepclose.exe"
	"$(OUTDIR)\warning.exe"
	"$(OUTDIR)\paramcore.exe"
	"$(OUTDIR)\timeout2.exe"
	"$(OUTDIR)\timeout3.exe"
	"$(OUTDIR)\connect2.exe"
	"$(OUTDIR)\timeout4.exe"
	"$(OUTDIR)\freeclose.exe"
	"$(OUTDIR)\cursor3.exe"
	"$(OUTDIR)\cursor4.exe"
	"$(OUTDIR)\cursor5.exe"
	"$(OUTDIR)\attributes.exe"
	"$(OUTDIR)\hidden.exe"
	"$(OUTDIR)\blob1.exe"
	"$(OUTDIR)\rowset.exe"
