/* viaadmin */
/* ConnectionWindow */

Ext.namespace('va');va.ConnectionWindow=Ext.extend(Ext.Window,{layout:'anchor',title:'Database Connection Information',width:330,height:300,modal:true,defaults:{border:false},initComponent:function(){var _idpfx=Ext.id();var defaultConn=this.defaultConnection||{};this.items=[{xtype:'panel',anchor:'100%',layout:'column',items:[{columnWidth:0.75,layout:'form',border:false,labelAlign:'top',items:{xtype:'textfield',anchor:'98%',fieldLabel:'Server',id:'sql_server'+_idpfx,allowBlank:false,selectOnFocus:true,value:defaultConn.sql_server||'172.16.115.128'}},{columnWidth:0.25,layout:'form',border:false,labelAlign:'top',items:{xtype:'textfield',anchor:'98%',fieldLabel:'Port',id:'sql_port'+_idpfx,value:defaultConn.sql_port||''}}]},{xtype:'panel',anchor:'100% 100%',layout:'column',items:[{columnWidth:1,layout:'form',border:false,items:[{xtype:'textfield',anchor:'98%',fieldLabel:'Database',id:'sql_database'+_idpfx,allowBlank:false,selectOnFocus:true,value:defaultConn.sql_database||'viaducttest'},{xtype:'textfield',anchor:'98%',fieldLabel:'User',id:'sql_user'+_idpfx,allowBlank:false,selectOnFocus:true,value:defaultConn.sql_user||'sa'},{xtype:'textfield',anchor:'98%',inputType:'password',fieldLabel:'Password',selectOnFocus:true,id:'sql_password'+_idpfx,value:defaultConn.sql_password||''},{xtype:'textfield',anchor:'98%',fieldLabel:'Connection Name',disabled:true,selectOnFocus:true,id:'connection_name'+_idpfx,value:defaultConn.connection_name||'va_'+new Date().getTime()},{xtype:'numberfield',anchor:'50%',selectOnFocus:true,fieldLabel:'Timeout',id:'connection_timeout'+_idpfx,value:defaultConn.connection_timeout||60}]}]}];this.buttons=[{text:'Test & Save',iconCls:'vaicon-tick',handler:this.onTestAndSave,scope:this},{text:'Cancel',iconCls:'vaicon-minus',handler:function(){this.hide()},scope:this}];va.ConnectionWindow.superclass.initComponent.call(this);this.fields={sql_server:this.findById('sql_server'+_idpfx),sql_database:this.findById('sql_database'+_idpfx),sql_port:this.findById('sql_port'+_idpfx),sql_user:this.findById('sql_user'+_idpfx),sql_password:this.findById('sql_password'+_idpfx),connection_name:this.findById('connection_name'+_idpfx),connection_timeout:this.findById('connection_timeout'+_idpfx)};this.addEvents({'connectionupdate':true});},onTestAndSave:function(){var fail=false;for(var f in this.fields){if(!this.fields[f].validate()){fail=true;}}
if(!fail){var values={sql_server:this.fields['sql_server'].getValue(),sql_port:this.fields['sql_port'].getValue(),sql_database:this.fields['sql_database'].getValue(),sql_user:this.fields['sql_user'].getValue(),sql_password:this.fields['sql_password'].getValue(),connection_name:this.fields['connection_name'].getValue(),connection_timeout:this.fields['connection_timeout'].getValue()};this.connection=values;var testDb=new sqlDbAccess(values);testDb.testConnection(function(sqld,success){if(success){this.fireEvent('connectionupdate',this,values);this.hide();}
else{alert('Couldn\'t connect to database.\nPlease make sure the above information is correct.');}},this);}}});/* CreateTableWindow */

va.CreateTableWindow=Ext.extend(Ext.Window,{layout:'form',title:'Create Table',width:400,height:300,modal:true,defaults:{border:false},initComponent:function(){var idpfx=Ext.id();this.items=[{fieldLabel:'Table Name',id:'name'+idpfx,xtype:'textfield',anchor:'98%',allowBlank:false},{fieldLabel:'Columns',id:'columns'+idpfx,xtype:'textarea',anchor:'98% 90%',allowBlank:false,selectOnFocus:true,value:"id INT PRIMARY KEY, name varchar(50), description varchar(100), days INT"}];this.buttons=[{text:'OK',iconCls:'vaicon-tick',id:'okbtn'+idpfx,handler:this.onOK,scope:this},{text:'Cancel',iconCls:'vaicon-minus',handler:function(){this.hide()},scope:this}];va.CreateTableWindow.superclass.initComponent.call(this);this.fields={table:this.findById('name'+idpfx),columns:this.findById('columns'+idpfx)};this.addEvents({'ok':true});},onOK:function(){var fail=false;for(var f in this.fields){if(!this.fields[f].validate()){fail=true;}}
if(!fail){this.fireEvent('ok',this,this.fields['table'].getValue(),this.fields['columns'].getValue());this.hide();}}});/* SqlTableEditor */

Ext.namespace('va');va.SqlTableEditor=Ext.extend(Ext.Panel,{cls:'va-sqltableeditor',layout:'border',iconCls:'vaicon-table',sqlTable:null,pkeyColumns:[],pkeyStyle:'color:#00761c;font-weight:bold;',DELETE_INDEX:'va-deletebox',ADD_INDEX:'va-newrow',pageSize:50,pageNumber:1,totalPages:1,where:'',orderBy:'',orderByType:'asc',serverSidePaging:true,initComponent:function(){var idpfx=Ext.id();Ext.QuickTips.init();this.title=this.title||'TABLE: '+this.tableName;this.tbar=[{xtype:'button',text:'Run/Refresh',tooltip:'Refresh columns & data from server',iconCls:'vaicon-refresh',handler:this.refresh,scope:this},'-',{xtype:'button',text:'Commit Changes',tooltip:'Commit all changes (adds, deletes, edits) to table in database',iconCls:'vaicon-disk',handler:this.updateSelectedRows,scope:this},'-',{text:'Add Row',tooltip:'Add new row to table',iconCls:'vaicon-plus',handler:function(){var grid=this.grid,store=grid.getStore(),Row=store.recordType;var newRec=new Row(Ext.apply({},this.addRowDefaults));newRec.set(this.ADD_INDEX,true);grid.stopEditing();store.insert(0,newRec);grid.startEditing(0,1);},scope:this},'-',{iconCls:'vaicon-find',enableToggle:true,pressed:true,text:'Filtering',tooltip:'More options',handler:function(b,e){this.optionsPanel.setVisible(this.optionsPanel.hidden);this.doLayout();},scope:this},'->','<b><span id="total'+idpfx+'"></span></b> total','-',{xtype:'numberfield',id:'pagesize'+idpfx,width:30,value:this.pageSize,enableKeyEvents:true,selectOnFocus:true,listeners:{'blur':{fn:this.updatePageView,scope:this},'keyup':{fn:function(b,e){if(e.keyCode===e.ENTER){this.updatePageView();}},scope:this}}},'/page','-',{iconCls:'vaicon-first',tooltip:'Go to first page',handler:function(){this.showPage(1);},scope:this},{iconCls:'vaicon-back',tooptip:'Go to previous page',handler:function(){var page=this.pageNumberField.getValue();this.showPage(page===1?1:page-1);},scope:this},'Page',{xtype:'numberfield',id:'page'+idpfx,width:30,value:this.pageNumber,enableKeyEvents:true,selectOnFocus:true,listeners:{'blur':{fn:this.updatePageView,scope:this},'keyup':{fn:function(b,e){if(e.keyCode===e.ENTER){this.updatePageView();}},scope:this}}},'of <span id="totalPages'+idpfx+'"></span>',{iconCls:'vaicon-next',tooltip:'Go to next page',handler:function(){var page=this.pageNumberField.getValue();this.showPage(page===this.totalPages?page:page+1);},scope:this},{iconCls:'vaicon-last',tooltip:'Go to last page',handler:function(){this.showPage(this.totalPages);},scope:this}];this.deleteBox=new va.DeleteBox({header:'Del',id:'check',dataIndex:this.DELETE_INDEX,width:25,resizable:false});this.items=[{region:'north',id:'options'+idpfx,height:100,split:true,layout:'anchor',border:false,unstyled:true,listeners:{'expand':{fn:function(p){p.doLayout();}},'resize':{fn:function(p,aw,ah){this.whereField.setHeight(ah-35);},scope:this}},items:[{layout:'column',border:false,anchor:'100% 100%',unstyled:true,items:[{columnWidth:0.66,layout:'form',border:false,unstyled:true,labelAlign:'top',anchor:'100%',items:[{fieldLabel:"WHERE (ex: color='red' )",xtype:'textarea',id:'where'+idpfx,anchor:'95%',height:80,enableKeyEvents:true,selectOnFocus:true,listeners:{'keyup':{fn:function(fld,e){if(e.shiftKey&&e.keyCode===e.ENTER){this.refresh();}},scope:this}},value:this.where}]},{columnWidth:0.33,layout:'form',border:false,unstyled:true,labelAlign:'top',items:[{fieldLabel:'ORDER BY COLUMNS',id:'orderby'+idpfx,xtype:'textfield',anchor:'98%',enableKeyEvents:true,selectOnFocus:true,listeners:{'keyup':{fn:function(fld,e){if(e.shiftKey&&e.keyCode===e.ENTER){this.refresh();}},scope:this}},value:this.orderBy},{fieldLabel:'ORDER BY TYPE  (asc, desc)',id:'orderbytype'+idpfx,xtype:'textfield',width:50,enableKeyEvents:true,selectOnFocus:true,listeners:{'keyup':{fn:function(fld,e){if(e.shiftKey&&e.keyCode===e.ENTER){this.refresh();}},scope:this}},value:this.orderByType}]}]}]},{region:'center',xtype:'editorgrid',border:false,id:'grid'+idpfx,clicksToEdit:1,viewConfig:{forceFit:true,autoFill:true},plugins:[this.deleteBox],store:new Ext.data.Store(),cm:new Ext.grid.ColumnModel([this.deleteBox])}];va.SqlTableEditor.superclass.initComponent.call(this);this.on('render',function(p){this.pageNumberField=Ext.getCmp('page'+idpfx);this.pageSizeField=Ext.getCmp('pagesize'+idpfx);this.orderByField=Ext.getCmp('orderby'+idpfx);this.whereField=Ext.getCmp('where'+idpfx);this.orderByTypeField=Ext.getCmp('orderbytype'+idpfx);this.refresh();},this,{single:true});this.sqlTable=sqlTable(this.tableName,this.sqlDb);this.grid=this.findById('grid'+idpfx);this.optionsPanel=this.findById('options'+idpfx);this.idpfx=idpfx;},updateSelectedRows:function(){var recs=this.grid.getStore().getModifiedRecords();if(recs.length===0){return;}
var updateRows=[],addRows=[],deleteRows=[],updateWhereRows=[],pkeys=this.pkeyColumns;var removedRecs=[],addedRecs=[],updatedRecs=[];for(var i=0,len=recs.length;i<len;i++){var rec=recs[i];var where={};for(var p=0;p<pkeys.length;p++){var k=pkeys[p];where[k]=rec.modified[k]||rec.data[k];}
if(rec.data[this.DELETE_INDEX]===true){if(rec.data[this.ADD_INDEX]===true){this.grid.getStore().remove(rec);continue;}
else{deleteRows.push(where);removedRecs.push(rec);}}
else if(rec.data[this.ADD_INDEX]===true){var arow=rec.data;if(arow[this.ADD_INDEX]){delete arow[this.ADD_INDEX];}
addRows.push(arow);addedRecs.push(rec);}
else{var mrow=rec.getChanges();updateWhereRows.push(where);if(mrow[this.DELETE_INDEX]){delete mrow[this.DELETE_INDEX];}
updateRows.push(mrow);updatedRecs.push(rec);}}
if(deleteRows.length>0){this.sqlTable.deleteRows(deleteRows,function(sqlt,resp){if(resp.data){for(var i=0;i<removedRecs.length;i++){this.grid.getStore().remove(removedRecs[i]);}}},this);}
if(addRows.length>0){this.sqlTable.addRows(addRows,function(sqlt,resp){if(resp.data){for(var i=0;i<addedRecs.length;i++){addedRecs[i].commit();}}},this);}
if(updateRows.length>0){this.sqlTable.updateRows(updateRows,updateWhereRows,function(sqlt,resp){if(resp.data){for(var i=0;i<updatedRecs.length;i++){updatedRecs[i].commit();}}},this);}},showPage:function(page){this.pageNumberField.suspendEvents();this.pageNumberField.setValue(page);this.pageNumberField.resumeEvents();this.updatePageView();},updatePageView:function(){var pageNumber=this.pageNumberField.getValue();if(pageNumber>this.totalPages){this.pageNumberField.suspendEvents();this.pageNumberField.setValue(this.totalPages);this.pageNumberField.resumeEvents();}
var pageSize=this.pageSizeField.getValue();this.where=this.whereField.getValue();this.orderBy=this.orderByField.getValue();this.orderByType=this.orderByTypeField.getValue();var start=(pageNumber-1)*pageSize;if(this.serverSidePaging){this.displayMask('Fetching Data...');this.sqlTable.fetchPagingRows({pagingSize:this.pageSize,recordStart:this.pageSize*(pageNumber-1),where:this.where,orderBy:this.orderBy,orderByType:this.orderByType},function(sqlt,resp,ocfg,ncfg){this.tableData=resp.data[0].rows;this.grid.getStore().loadData({'rows':this.tableData});this.hideMask();},this);}
else{this.grid.getStore().loadData({'rows':this.tableData.slice(start,start+pageSize)});}
this.pageNumber=pageNumber;this.pageSize=pageSize;this.totalPages=Math.floor((this.totalRows/pageSize)+1);Ext.get('totalPages'+this.idpfx).update(this.totalPages);},displayMask:function(msg){this.body.mask(msg);},hideMask:function(){this.body.unmask();},refresh:function(){this.displayMask('Querying columns...');if(!this.optionsPanel.hidden){this.where=this.whereField.getValue();this.orderBy=this.orderByField.getValue();this.orderByType=this.orderByTypeField.getValue();}
this.sqlTable.queryColumns(function(sqlt,resp,cols){this.displayMask('Querying primary keys...');this.sqlTable.queryPrimaryKeys(function(sqlt,resp2,keys){this._finishRefresh(keys,cols);},this);},this);},_finishRefresh:function(pkeys,cols){var fm=Ext.form,cmData=[],storeFields=[];this.addRowDefaults={};var pkeystr='~'+pkeys.join('~')+'~';this.pkeyColumns=pkeys;cmData[0]=this.deleteBox;storeFields[0]={name:this.DELETE_INDEX};for(var i=0,len=cols.length;i<len;i++){var col=cols[i],name=col.name;var iskey=pkeystr.indexOf('~'+name+'~')!==-1;cmData[i+1]={header:name+(iskey?' [KEY]':''),sortable:true,id:name,pkey:iskey,css:iskey?this.pkeyStyle:null,dataIndex:name,editor:new Ext.form.TextField({allowBlank:false})};this.addRowDefaults[name]='';storeFields[i+1]={name:name,type:'string'};}
var store=new Ext.data.JsonStore({autoDestroy:true,data:{rows:[]},root:'rows',fields:storeFields});this.grid.reconfigure(store,new Ext.grid.ColumnModel(cmData));if(this.serverSidePaging){this.sqlTable.queryTotalRows({pkeys:this.pkeyColumns.join(','),where:this.where},function(sqlt,resp,total){if(resp.data){this.setTotalCount(total);this.updatePageView();}},this);}
else{this.displayMask('Querying Data...');this.sqlTable.fetchRows({where:this.where,orderBy:this.orderBy,orderByType:this.orderByType},function(sqlt,resp){if(resp&&resp.data){this.displayMask('Preparing Data for Display...');this.tableData=resp.data[0].rows;this.setTotalCount(resp.data[0].count);this.updatePageView();}
this.hideMask();},this);}},setTotalCount:function(n){this.totalRows=n;Ext.get('total'+this.idpfx).update(n);}});Ext.reg('va_sqltableeditor',va.SqlTableEditor);va.DeleteBox=function(config){Ext.apply(this,config);if(!this.id){this.id=Ext.id();}
this.renderer=this.renderer.createDelegate(this);};va.DeleteBox.prototype={init:function(grid){this.grid=grid;this.grid.on('render',function(){var view=this.grid.getView();view.mainBody.on('mousedown',this.onMouseDown,this);},this);},onMouseDown:function(e,t){if(t.className&&t.className.indexOf('x-grid3-cc-'+this.id)!=-1){e.stopEvent();var index=this.grid.getView().findRowIndex(t);var record=this.grid.store.getAt(index);var tbl=Ext.get(t).findParentNode('.x-grid3-row-table',10,true);tbl.addClass('va-deletetablerow');record.set(this.dataIndex,record.data[this.dataIndex]?false:true);}},renderer:function(v,p,record){p.css+=' x-grid3-check-col-td';return'<div class="x-grid3-check-col'+(v?'-on':'')+' x-grid3-cc-'+this.id+'">&#160;</div>';}};/* SqlResultPanel */

Ext.namespace('va');va.SqlResultPanel=Ext.extend(Ext.Panel,{cls:'va-sqlresultpanel',iconCls:'vaicon-sql',layout:'border',closable:true,initComponent:function(){var idpfx=Ext.id();this.cm=new Ext.grid.ColumnModel([]);this.store=new Ext.data.Store();this.items=[{region:'north',height:80,split:true,collapsible:true,layout:'form',unstyled:true,labelWidth:80,items:[{fieldLabel:'SQL',xtype:'textarea',id:'sqlcode'+idpfx,anchor:'98%',allowBlank:false,enableKeyEvents:true,selectOnFocus:true,value:this.defaultSql||'',listeners:{'keyup':{fn:function(fld,e){if(e.shiftKey&&e.keyCode===e.ENTER){this.execSql();}},scope:this}}},{xtype:'textfield',fieldLabel:'Direct Url',id:'url'+idpfx,anchor:'98%',readOnly:true,selectOnFocus:true}],tbar:[{text:'Run (Shift + Enter)',iconCls:'vaicon-tick',tooltip:'Execute SQL [Shift + Enter]',handler:this.execSql,scope:this},'->',{iconCls:'vaicon-minus',text:'Clear',handler:function(){this.fldSqlCode.setValue('');this.fldUrl.setValue('');this.showMsgPanel('Enter query to execute.');},scope:this}],listeners:{'resize':{fn:function(p,aw,ah){this.fldSqlCode.setHeight(ah-60);},scope:this},'expand':{fn:function(p){p.doLayout();}}}},{region:'center',id:'resultsRegion'+idpfx,border:false,layout:'card',activeItem:0,items:{id:'msg'+idpfx,unstyled:true}}];va.SqlResultPanel.superclass.initComponent.call(this);this.fldSqlCode=this.findById('sqlcode'+idpfx);this.msgPanel=this.findById('msg'+idpfx);this.fldUrl=this.findById('url'+idpfx);this.idpfx=idpfx;},execSql:function(){if(!this.fldSqlCode.validate()){return;}
this.sqlDb.executeSql(this.fldSqlCode.getValue(),function(sqld,resp){if(resp.log.error){this.showMsgPanel('<p style="color:red">Error:</p><pre style="color:red">'+resp.log.error+'</pre>');}
else{var data=resp.data[0];if(data.fields.length===0){this.showMsgPanel('<p style="color:green">Success: '+data.count+' rows affected.</p>');}
else{this.showResultsGrid(data);}
var conn=this.sqlDb.connection;conn.sql=this.fldSqlCode.getValue();conn.query_tag=null;var sqlUrl=window.location.protocol+'//'+window.location.host+window.location.pathname+'?'
+Ext.urlEncode(conn)+'&'+window.location.hash;this.fldUrl.setValue(sqlUrl);}},this);},showMsgPanel:function(msg){Ext.getCmp('resultsRegion'+this.idpfx).getLayout().setActiveItem(this.msgPanel);this.msgPanel.body.update(msg);},showResultsGrid:function(data){var cols=data.fields,rows=data.rows;var cmData=[],storeFields=[];for(var i=0,len=cols.length;i<len;i++){var col=cols[i],name=col.name;cmData[i]={header:name,sortable:true,id:name,dataIndex:name};storeFields[i]={name:name,type:'string'};}
var store=new Ext.data.JsonStore({autoDestroy:true,data:{rows:rows},root:'rows',fields:storeFields});var cm=new Ext.grid.ColumnModel(cmData);if(!this.grid){this.grid=new Ext.grid.GridPanel({viewConfig:{forceFit:true,autoFill:true},tbar:['<span id="total'+this.idpfx+'"></span> total','-',{xtype:'numberfield',id:'pagesize'+this.idpfx,width:30,enableKeyEvents:true,selectOnFocus:true,listeners:{'blur':{fn:this.updatePageView,scope:this},'keyup':{fn:function(b,e){if(e.keyCode===e.ENTER){this.updatePageView();}},scope:this}}},'/page','-',{iconCls:'vaicon-first',handler:function(){this.showPage(1);},scope:this},{iconCls:'vaicon-back',handler:function(){var page=this.pageNumberField.getValue();this.showPage(page===1?1:page-1);},scope:this},'Page',{xtype:'numberfield',id:'page'+this.idpfx,width:30,enableKeyEvents:true,selectOnFocus:true,listeners:{'blur':{fn:this.updatePageView,scope:this},'keyup':{fn:function(b,e){if(e.keyCode===e.ENTER){this.updatePageView();}},scope:this}}},'of <span id="totalPages'+this.idpfx+'"></span>',{iconCls:'vaicon-next',handler:function(){var page=this.pageNumberField.getValue();this.showPage(page===this.totalPages?page:page+1);},scope:this},{iconCls:'vaicon-last',handler:function(){this.showPage(this.totalPages);},scope:this}],pageSize:50,pageNumber:1,totalPages:1,cm:cm,store:store});var results=Ext.getCmp('resultsRegion'+this.idpfx);results.add(this.grid);results.getLayout().setActiveItem(this.grid);this.doLayout();this.pageNumberField=Ext.getCmp('page'+this.idpfx);this.pageSizeField=Ext.getCmp('pagesize'+this.idpfx);this.pageNumberField.setValue(this.grid.pageNumber);this.pageSizeField.setValue(this.grid.pageSize);}
else{this.grid.reconfigure(store,cm);}
this.tableData=rows;this.totalRows=data.count;Ext.get('total'+this.idpfx).update(this.totalRows);this.updatePageView();},showPage:function(page){this.pageNumberField.suspendEvents();this.pageNumberField.setValue(page);this.pageNumberField.resumeEvents();this.updatePageView();},updatePageView:function(){var pageNumber=this.pageNumberField.getValue();if(pageNumber>this.totalPages){this.pageNumberField.suspendEvents();this.pageNumberField.setValue(this.totalPages);this.pageNumberField.resumeEvents();}
var pageSize=this.pageSizeField.getValue();var start=(pageNumber-1)*pageSize;this.grid.getStore().loadData({'rows':this.tableData.slice(start,start+pageSize)});this.pageNumber=pageNumber;this.pageSize=pageSize;this.totalPages=Math.floor((this.totalRows/this.pageSize)+1);Ext.get('totalPages'+this.idpfx).update(this.totalPages);}});Ext.reg('va_sqlresultpanel',va.SqlResultPanel);/* App */

Ext.namespace('va');va.App=function(){var _viewport;var _numSqls=0;var _tablesMenuOpen=new Ext.menu.Menu();var _tablesMenuDrop=new Ext.menu.Menu();return{sqlDb:null,tables:{},connectionWindow:null,sqlWindow:null,init:function(){var _vaApp=this;_viewport=new Ext.Viewport({layout:'border',items:[{region:'west',width:55,unstyled:true,layout:'column',border:false,cls:'va-dbactions',items:[{columnWidth:1,border:false,layout:'anchor',unstyled:true,defaults:{width:45,iconAlign:'top',scale:'small',arrowAlign:'bottom'},items:[{xtype:'button',text:'Tables',iconCls:'vaicon-tables',menu:[{text:'Edit Table',iconCls:'vaicon-opentable',menu:_tablesMenuOpen},{text:'Drop Table',iconCls:'vaicon-minus',menu:_tablesMenuDrop},'-',{text:'Add Table',iconCls:'vaicon-plus',handler:function(){this.showCreateTableWindow(true);},scope:this}]},{xtype:'button',text:'SQL',iconCls:'vaicon-sql',handler:this.addSqlPanel,scope:this},{xtype:'button',text:'Conn',iconCls:'vaicon-gear',handler:function(){this.showConnectionWindow(true);},scope:this},{xtype:'button',text:'Log',iconCls:'vaicon-log',handler:this.openSqlLog,scope:this},{xtype:'button',text:'More',iconCls:'vaicon-info',menu:[{text:'Home Page',iconCls:'vaicon-home',handler:function(){window.open('/index.htm');}},{text:'Status',iconCls:'vaicon-monitor',handler:function(){window.open('/status.htm');}},'-','<b>Documentation</b>',{text:'Specifications',handler:function(){window.open('/doc/viaduct_specification.html');}},{text:'Architecture',iconCls:'vaicon-pdf',handler:function(){window.open('/doc/viaduct_architecture.pdf');}},'-','<b>Examples</b>',{text:'Python Access',handler:function(){window.open('/eg/Python_access.html');}},{text:'Inline Table Editor',handler:function(){window.open('/eg/inlinetable_example.htm');}}]}]}]},{region:'center',border:false,layout:'fit',items:{xtype:'tabpanel',id:'maintabs',deferredRender:false,layoutOnTabChange:true,plain:true,border:false}}]});var url=window.location.href;var qparams=Ext.urlDecode(url.substring(url.indexOf('?')+1));this.restoredConnection=qparams;this.showConnectionWindow(true);},showCreateTableWindow:function(show){if(!show&&!this.createTableWindow){return;}
if(!this.createTableWindow){this.createTableWindow=new va.CreateTableWindow({listeners:{'ok':{fn:function(w,table,columns){this.sqlDb.createTable(table,columns,function(sqld,resp){this.refreshTablesMenu();},this);},scope:this}}});}
this.createTableWindow.setVisible(show);},showConnectionWindow:function(show){if(!show&&!this.connectionWindow){return;}
if(!this.connectionWindow){this.connectionWindow=new va.ConnectionWindow({defaultConnection:this.restoredConnection||{},listeners:{'connectionupdate':{fn:function(w,conncfg){if(!this.sqlDb){this.sqlDb=sqlDbAccess(conncfg);this.addSqlPanel(this.restoredConnection.sql);}
else{this.sqlDb.connection=Ext.apply(this.sqlDb.connection,conncfg);}
this.refreshTablesMenu();},scope:this}}});}
this.connectionWindow.setVisible(show);},addSqlPanel:function(defaultSql){var p=Ext.getCmp('maintabs').add(new va.SqlResultPanel({sqlDb:this.sqlDb,border:false,title:'Run SQL '+(++_numSqls),closable:true,defaultSql:defaultSql}));_viewport.doLayout();Ext.getCmp('maintabs').activate(p);},showTableEditor:function(table){var editor=this.tables[table];if(!editor){editor=new va.SqlTableEditor({tableName:table,sqlDb:this.sqlDb,border:false,title:table,closable:true,serverSidePaging:true,pageSize:100,listeners:{'close':{fn:function(w){this.tables[table]=null;},scope:this}}});Ext.getCmp('maintabs').add(editor);_viewport.doLayout();this.tables[table]=editor;}
Ext.getCmp('maintabs').activate(editor);},refreshTablesMenu:function(){this.sqlDb.getTables(function(sqld,res,tableNames){_tablesMenuOpen.removeAll();_tablesMenuDrop.removeAll();function openTableHandler(item,e){this.showTableEditor(item.text);}
function dropTableHandler(item,e){var n=item.text;if(confirm('Are you sure you want to drop table '+n)){this.sqlDb.dropTable(n,function(resp){if(resp.data){if(this.tables[n]){this.tables[n].ownerCt.remove(this.tables[n]);this.tables[n]=null;}
this.refreshTablesMenu();}},this);}}
for(var i=0,len=tableNames.length;i<len;i++){var name=tableNames[i];_tablesMenuOpen.addMenuItem({text:name,iconCls:'vaicon-table',handler:openTableHandler,scope:this});_tablesMenuDrop.addMenuItem({text:name,iconCls:'vaicon-table',handler:dropTableHandler,scope:this});}
_tablesMenuOpen.doLayout();_tablesMenuDrop.doLayout();},this);},openSqlLog:function(){if(!this.sqlLogWindow){this.sqlLogWindow=new Ext.Window({title:'SQL History',closable:true,closeAction:'hide',width:450,height:400,autoScroll:true,html:'',listeners:{'show':{fn:function(w){w.body.update(this.sqlDb.getLog().join('<hr/>'));},scope:this}},buttons:[{text:'Refresh',iconCls:'vaicon-refresh',handler:function(){this.sqlLogWindow.body.update(this.sqlDb.getLog().join('<hr/>'));},scope:this},{text:'Clear Log',iconCls:'vaicon-minus',handler:function(){this.sqlDb.clearLog();this.sqlLogWindow.body.update('');},scope:this}]});}
this.sqlLogWindow.show();}};}();Ext.onReady(va.App.init,va.App,true);