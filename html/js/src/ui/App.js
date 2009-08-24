Ext.namespace('dbrui');  

dbrui.App = function(){
   var _viewport;       //private var for viewport object
   var _numSqls = 0;	//count of current SQL panels open 

	//dynamic tables menus
  var _tablesMenuOpen =  new Ext.menu.Menu();    
  var _tablesMenuDrop =  new Ext.menu.Menu();
		
	var _appName = "Viaduct";
		
	return {
		/** {sqlDbAccess} sql db object that is bound to this UI */
		sqlDb: null,
		/** {Object: string=>sqlTableEditor } keyed by table name, stores sqlTableEditor instances for each table opened by user */
		tables: {},
		  
	 	/** {ConnectionWindow} SQL code window instance */ 
		connectionWindow: null,
		
		/** {SqlWindow} SQL code window instance */
		sqlWindow: null,
		
		/**
		Entry point function for admin app.  Called on DOM load.
		*/
		init: function(){ 
			var _vaApp = this;
			
				     
			/* viewport consists of DB actions on left side, and table editor in the center */
			_viewport = new Ext.Viewport({
				layout:'border',
				
				items:[

			/* Db level action strip */
					{
						region:'west',
						width:55,         
						unstyled:true,
						layout:'column',   
						border:false,
						cls:'dbr-dbactions',  
						
						items:[
							{ 
								columnWidth:1,
								border:false,
								layout:'anchor',
								unstyled:true, 
								defaults:{
									width:45,
									iconAlign:'top',
									scale:'small',
									arrowAlign:'bottom' 
								},
								
								items:[ 
									//Table ops
									{
										xtype:'button',
										text:'Tables',
										iconCls:'icon-tables',  
										menu: [   
				
											//open
											{
												text:'Edit Table',
												iconCls:'icon-opentable',
												menu: _tablesMenuOpen
											},
											//Drop Table
											{
												text:'Drop Table',
												iconCls:'icon-minus',   
												menu: _tablesMenuDrop
											},
											'-',
											//Add Table
											{
												text:'Add Table',
												iconCls:'icon-plus',
												handler:function(){
													this.showCreateTableWindow(true);
												},
												scope:this
											}
										]
									},        
									//Run SQL
									{
										xtype:'button',
										text:'SQL',
										iconCls:'icon-sql',
										handler:function(){
											this.addSqlPanel();
										},
										scope:this 
									},       
									//Edit Connection
									{
										xtype:'button',
										text:'Conn',
										iconCls:'icon-gear',
										handler:function(){
											this.showConnectionWindow(true);
										},
										scope:this 
									}, 
									{
										xtype:'button',
										text:'Log',
										iconCls:'icon-log',
										handler:this.openSqlLog,
										scope:this 
									},
									{
										xtype:'button',
										text:'More',
										iconCls:'icon-info',
										menu:[   
										{
											text:'Documentation Home',
											iconCls:'icon-doc', 
											handler:function(){window.open('/doc/index.html');}    
										}, 
										{
												text:'Status Window',
												iconCls:'icon-monitor',
												handler:function(){
													this.showStatusWindow(true);
												},
												scope:this
										}, 
										'-',
										{
												text:'Viaduct Status',
												iconCls:'icon-monitor',
												handler:function(){window.open('/status.html');}
										},  
											{
												text:'Old UI',
												iconCls:'icon-home', 
												handler:function(){window.open('/oldindex.html');}
											}
											
										]
									}   
								]
							}
						]
					},
			 /* Center region to contain table editors */ 	
					{
						region:'center',
						border:false, 
						layout:'fit',
						
						items:{
							xtype:'tabpanel',
							id:'maintabs',  
							enableTabScroll:true,
							deferredRender:false,
							layoutOnTabChange:true,
							plain:true,
							border:false
						}
						
					}
					
				]
			});
			
			
			//If direct URL was used, auto-set the params and open the SQL tab accordingly 
			var url = window.location.href;	       
			var qparams = Ext.urlDecode(url.substring( url.indexOf('?')+1));
     
			this.restoredConnection = qparams;             
			
			//remove loading mask
			var loading = Ext.get('dbr-loading');
			var mask = Ext.get('dbr-loading-mask');
			mask.setOpacity(.8);
			mask.shift({
				xy:loading.getXY(),
				width:loading.getWidth(),
				height:loading.getHeight(), 
				remove:true,
				duration:1,
				opacity:.3,
				easing:'bounceOut',
				callback : function(){
					loading.fadeOut({duration:.1,remove:true});       
					
					
				}
			});
			
			

			this.showConnectionWindow(true);  
			
		/*	if(qparams && qparams.sql_server && qparams.sql_database){      
				console.dir(qparams); 
				 //create sqlDb object
				 // this.sqlDb = sqlDbAccess(qparams);      
                          
					
          //open a SQL panel by default
				 // this.addSqlPanel(qparams.sql);    
				 // this.refreshTablesMenu();  
			}
			else{
      	//display connection window 
		 			//TODO: optionally read connection data from external file, and bypass this window...    
					this.showConnectionWindow(true);
			 }  */
			
		},  
		
		
		/* Create the new table window (if needed), and show/hide it
			@param {bool} show : true to show, false to hide	
		*/ 
		showCreateTableWindow : function(show){
			if(!show && !this.createTableWindow){return;}
			
  		if(!this.createTableWindow){
				this.createTableWindow = new dbrui.CreateTableWindow({
					listeners:{
						'ok':{
							fn: function(w, table, columns){    
                this.sqlDb.createTable(table,columns, function(sqld, resp){
								 	this.refreshTablesMenu();         
								  
								//open this table for editing
								this.showTableEditor(table);
								},this);
													
							},
							scope:this
						}
					}
				});
			}
	    
			this.createTableWindow.setVisible(show);
		}, 
		
		showStatusWindow : function(show){
			if(!show && !this.statusWindow){return;}
			
  		if(!this.statusWindow){
				this.statusWindow = new dbrui.StatusWindow();
			}
	    
			this.statusWindow.setVisible(show);
		},
		
     /* Create the connection window (if needed), and show/hide it
			@param {bool} show : true to show, false to hide	
		*/
     showConnectionWindow : function(show){
			if(!show && !this.connectionWindow){return;}
			
  		if(!this.connectionWindow){
				this.connectionWindow = new dbrui.ConnectionWindow({
					defaultConnection : this.restoredConnection || {},
					listeners:{
						'connectionupdate':{
							fn: function(w, conncfg){    

								//first time
								if(!this.sqlDb){  
									//create sqlDb object
									this.sqlDb = sqlDbAccess(conncfg); 
									//add echosql by default
								 // this.sqlDb.setFlag('echosql', true);
									//pretty print option      
									this.sqlDb.setFlag('pp', conncfg.flags_pp ); 
									delete conncfg.flags_pp;   
									
                  //open a SQL panel by default
									this.addSqlPanel(this.restoredConnection.sql);
					       }

					       //update information
								 else {      
										//see if info has changed
										var changed = false, oldconn = this.sqlDb.connection;
									  
										if(conncfg.sql_server !== oldconn.sql_server ||
											 conncfg.sql_database !== oldconn.sql_database || 
											conncfg.sql_user !== oldconn.sql_user){
											 
											changed = true;
										}
										
									 
										if(!changed){
											return true;
										}
										else {  
											         
											Ext.Msg.confirm('Confirm connection info change', 'Changing the connection information will close any openend table editor tabs.  Do you want to continue?',
											 function(btn, text){      
													if(btn == 'yes'){
														this.sqlDb.connection = Ext.apply(oldconn, conncfg);      
														//add echosql by default
													//	this.sqlDb.setFlag('echosql', true);
														//pretty print option      
														this.sqlDb.setFlag('pp', conncfg.flags_pp );      
														delete conncfg.flags_pp;
														                       
														//remove existing table editors 
														var tables = this.tables;
														for( var n in tables ){
															this.tables[n].ownerCt.remove(this.tables[n]);  
															this.tables[n] = null;
														}
														_viewport.doLayout();  
													} 
													else{  
														return false;
													}               
													
											},this);

										}
 	
								 }
                   
								//update window title with db name
								 document.title = _appName + " [" + (conncfg.sql_database || 'default database') + '@' +conncfg.sql_server + ']';   
								 this.refreshTablesMenu();
								 return true; 						
							},
							scope:this
						}
					}
				});
			}
	    
			this.connectionWindow.setVisible(show);
		},
		 
		 /** Adds a new SqlResultPanel tab to the main tabs 
		*/
     addSqlPanel : function(defaultSql){

			var p = Ext.getCmp('maintabs').add(new dbrui.SqlResultPanel({
				sqlDb: this.sqlDb,
				border: false,
				title: 'Run SQL ' + (++_numSqls),
				closable:true,
				defaultSql : defaultSql || ''
			}));
			_viewport.doLayout();  
				
			Ext.getCmp('maintabs').activate(p); 
		},
		                                         
		/** Opens a table for editing, and displays it in the center region                                             
			@param {string} table : name of the table to open
		*/
		showTableEditor : function(table){    
			var editor = this.tables[table];
			 
			if(!editor){
				editor = new dbrui.SqlTableEditor({
					tableName: table,
					sqlDb: this.sqlDb,
					border: false,
					title: table,
					closable:true, 
					serverSidePaging:true,
					pageSize:100,
					listeners:{
						'close':{
							fn:function(w){
								 this.tables[table] = null;
							},
							scope:this
						}
					}
				});
			
				        
				Ext.getCmp('maintabs').add(editor);
				_viewport.doLayout();  
				
				//add to cache
				this.tables[table] = editor;
      }
			
			
			Ext.getCmp('maintabs').activate(editor);   

		},  
		
		_freeEditTableHandler : function(fld,e){
			
			if(e.keyCode === e.ENTER){          
				var table = fld.getValue();    
				var tableRX = new RegExp(table, "i");
				
				var clickies = _tablesMenuOpen.find( 'isClicky', true); 
				
			 	for(var i=0, len=clickies.length;i<len;i++){
					var item = clickies[i];
					item.show();
					
					if( !tableRX.test(item.text) ){
						item.hide(); 
					}
					
				}
				
				_tablesMenuOpen.doLayout();     
			} 
  
		}, 
		
		_freeDropTableHandler : function(fld,e){
			
			if(e.keyCode === e.ENTER){         
				var table = fld.getValue(); 
				var tableRX = new RegExp(table, "i");
				
				var clickies = _tablesMenuDrop.find( 'isClicky', true); 
				
				for(var i=0, len=clickies.length;i<len;i++){
					var item = clickies[i];
					item.show();
					
					if( !tableRX.test(item.text) ){
						item.hide(); 
					}
					
				}
				
				_tablesMenuDrop.doLayout();
				
			}     
		},
		
		/** refresh tables lists from server for the open & drop table menus
		*/
		refreshTablesMenu : function(){ 
			//retrieve tables from server
			this.sqlDb.getTables(function(sqld, res, tableNames){

				_tablesMenuOpen.removeAll();      
				_tablesMenuDrop.removeAll(); 
				
				_tablesMenuOpen.add('Table Name + Enter'); 
				_tablesMenuOpen.addMenuItem({
					xtype:'textfield',
					width:140,
					enableKeyEvents:true, 
					selectOnFocus:true,
					listeners:{
						'keyup':{
							fn: this._freeEditTableHandler,
							scope:this  
						}
					}
				});   
        _tablesMenuOpen.addSeparator(); 
				_tablesMenuOpen.add('<b>Select to Edit</b>');  
				
				
				_tablesMenuDrop.add('Table Name + Enter'); 
				_tablesMenuDrop.addMenuItem({
					xtype:'textfield',
					width:140,
					enableKeyEvents:true, 
					selectOnFocus:true,
					listeners:{
						'keyup':{
							fn: this._freeDropTableHandler,
							scope:this  
						}
					}
				});   
        _tablesMenuDrop.addSeparator(); 
				_tablesMenuDrop.add('<b>Select to Drop</b>');
				
				
 
				function openTableHandler(item, e){ 
					this.showTableEditor(item.text);
				}
				
				function dropTableHandler(item, e){ 
					var n =item.text;
					
					Ext.Msg.confirm('Confirm Commit?','Are you sure you want to drop table '+ n,
					 function(btn, text){      
							if(btn == 'yes'){
								this.sqlDb.dropTable(n, function(resp){
									if(resp.data){             
										if(this.tables[n]){
											this.tables[n].ownerCt.remove(this.tables[n]);  
											this.tables[n] = null;
										}
										this.refreshTablesMenu();
									}
								}, this);  
							}    
					},this);
					

				}
				
				 for(var i=0,len=tableNames.length; i<len; i++){
					 var name = tableNames[i];
					
				 	 _tablesMenuOpen.addMenuItem(	{
						text:name, 
						iconCls:'icon-table',
						handler:openTableHandler,  
						isClicky:true,
						scope:this
				 	 });    
					
						_tablesMenuDrop.addMenuItem(	{
							text:name, 
							iconCls:'icon-table',
							handler:dropTableHandler,  
							isClicky:true, 
							scope:this
					 	}); 
				 }                      
				
				_tablesMenuOpen.doLayout();   
				_tablesMenuDrop.doLayout();
			
				this.tableNames = tableNames;
			}, this);
			
			
		},
		
		openSqlLog: function(){
			if(!this.sqlLogWindow){
				this.sqlLogWindow = new Ext.Window({
					title:'SQL History',
					closable:true,
					closeAction:'hide',
					width:450,
					height:400,  
					autoScroll:true,
					html:'',
					listeners:{
						'show':{
							fn:function(w){ 
								w.body.update(this.sqlDb.getLog().join('<hr/>'));
							},
							scope:this
						}
					},
					buttons:[
						
						{
							text:'Refresh',
							iconCls:'icon-refresh',
							handler:function(){
								this.sqlLogWindow.body.update(this.sqlDb.getLog().join('<hr/>'));  
							},
							scope:this
						},
						{
							text:'Clear Log',
							iconCls:'icon-minus',
							handler:function(){
								this.sqlDb.clearLog();   
								this.sqlLogWindow.body.update('');   
							},
							scope:this
						}
					]
				});
			}  
			
			
			this.sqlLogWindow.show();  
		} 
	};
	

	
}();         


Ext.onReady(dbrui.App.init, dbrui.App, true);                           