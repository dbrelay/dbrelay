Ext.namespace('va');  

va.App = function(){
   var _viewport;       //private var for viewport object
   var _numSqls = 0;	//count of current SQL panels open 

	//dynamic tables menus
  var _tablesMenuOpen =  new Ext.menu.Menu();    
  var _tablesMenuDrop =  new Ext.menu.Menu();
		
	
		
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
						cls:'va-dbactions',  
						
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
										iconCls:'vaicon-tables',  
										menu: [ 
											//open
											{
												text:'Edit Table',
												iconCls:'vaicon-opentable',
												menu: _tablesMenuOpen
											},
											//Drop Table
											{
												text:'Drop Table',
												iconCls:'vaicon-minus',   
												menu: _tablesMenuDrop
											},
											'-',
											//Add Table
											{
												text:'Add Table',
												iconCls:'vaicon-plus',
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
										iconCls:'vaicon-sql',
										handler:this.addSqlPanel,
										scope:this 
									},       
									//Edit Connection
									{
										xtype:'button',
										text:'Conn',
										iconCls:'vaicon-gear',
										handler:function(){
											this.showConnectionWindow(true);
										},
										scope:this 
									}, 
									{
										xtype:'button',
										text:'Log',
										iconCls:'vaicon-log',
										handler:this.openSqlLog,
										scope:this 
									},
									{
										xtype:'button',
										text:'More',
										iconCls:'vaicon-info',
										menu:[   
										{
											text:'Documentation Home',
											iconCls:'vaicon-doc', 
											handler:function(){window.open('/doc/index.htm');}    
										},  
										'-',
										{
												text:'Viaduct Status',
												iconCls:'vaicon-monitor',
												handler:function(){window.open('/status.htm');}
										},  
											{
												text:'Old UI',
												iconCls:'vaicon-home', 
												handler:function(){window.open('/oldindex.htm');}
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
				this.createTableWindow = new va.CreateTableWindow({
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
		
     /* Create the connection window (if needed), and show/hide it
			@param {bool} show : true to show, false to hide	
		*/
     showConnectionWindow : function(show){
			if(!show && !this.connectionWindow){return;}
			
  		if(!this.connectionWindow){
				this.connectionWindow = new va.ConnectionWindow({
					defaultConnection : this.restoredConnection || {},
					listeners:{
						'connectionupdate':{
							fn: function(w, conncfg){    

								//first time
								if(!this.sqlDb){  
									//create sqlDb object
									this.sqlDb = sqlDbAccess(conncfg); 
                  //open a SQL panel by default
									this.addSqlPanel(this.restoredConnection.sql);
					       }

					       //update information
								 else {
								 		this.sqlDb.connection = Ext.apply(this.sqlDb.connection, conncfg);
								 }

								 this.refreshTablesMenu(); 						
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

			var p = Ext.getCmp('maintabs').add(new va.SqlResultPanel({
				sqlDb: this.sqlDb,
				border: false,
				title: 'Run SQL ' + (++_numSqls),
				closable:true,
				defaultSql : defaultSql
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
				editor = new va.SqlTableEditor({
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
		
		/** refresh tables lists from server for the open & drop table menus
		*/
		refreshTablesMenu : function(){ 
			//retrieve tables from server
			this.sqlDb.getTables(function(sqld, res, tableNames){

				_tablesMenuOpen.removeAll();      
				_tablesMenuDrop.removeAll();      
         
				function openTableHandler(item, e){ 
					this.showTableEditor(item.text);
				}
				
				function dropTableHandler(item, e){ 
					var n =item.text;
					
					if(confirm('Are you sure you want to drop table '+ n)){
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
				}
				
				 for(var i=0,len=tableNames.length; i<len; i++){
					 var name = tableNames[i];
					
				 	 _tablesMenuOpen.addMenuItem(	{
						text:name, 
						iconCls:'vaicon-table',
						handler:openTableHandler,
						scope:this
				 	 });    
					
						_tablesMenuDrop.addMenuItem(	{
							text:name, 
							iconCls:'vaicon-table',
							handler:dropTableHandler,
							scope:this
					 	}); 
				 }                      
				
				_tablesMenuOpen.doLayout();   
				_tablesMenuDrop.doLayout();
				
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
							iconCls:'vaicon-refresh',
							handler:function(){
								this.sqlLogWindow.body.update(this.sqlDb.getLog().join('<hr/>'));  
							},
							scope:this
						},
						{
							text:'Clear Log',
							iconCls:'vaicon-minus',
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


Ext.onReady(va.App.init, va.App, true);                           