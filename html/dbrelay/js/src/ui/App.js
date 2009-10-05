Ext.namespace('dbrui','dbrplugins');




dbrui.App = function(){
   var _viewport;       //private var for viewport object
   var _numSqls = 0;	//count of current SQL panels open 
	 var _NUMCELLS_THRESHOLD = 20000; //threshold for indicating that a table is very big

	//dynamic tables menus
  var _tablesMenuOpen =  new Ext.menu.Menu();    
  var _tablesMenuDrop =  new Ext.menu.Menu();
		
	var _appName = "DBRelay";
	
	//global lsit of plugins, keyed by object type
	var _plugins = {
		tableeditor:[],
		sqlpanel:[],
		dbrelayapp:[]
	};
		
	//javascript file loader
	var loadPlugins = function(files, success, error, scope){

		var loadSuccess = function(response, options) {
        var head = document.getElementsByTagName("head")[0];
				var url = options.url;
				if(url.indexOf('.js') === url.length - 3){
        	var js = document.createElement('script');
         	js.setAttribute("type", "text/javascript");
         	js.text = response.responseText;
         	if (!document.all) {
             js.innerHTML = response.responseText;
         	}
         	head.appendChild(js);
				}
				else if(url.indexOf('.css') === url.length - 4){
					Ext.util.CSS.createStyleSheet( response.responseText );
				}
				
        if(success){
           success.defer(50, scope || window,[ response, options]);
        }
    };


		for(var i=0,len=files.length; i<len; i++){
  	  Ext.Ajax.request({
	        url: files[i],
	        method: 'GET',
	        success: loadSuccess,
	        failure: function(response, options){
						if(error){
							error.call( scope || window);
						}
					},
	        disableCaching : false
	    });
		}
	}
	
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
			
			var loadedFiles = 0, me = this;
			
			//IE SUCKS
			//this.loadApp();
			
			
			//dynamically load plugin files from plugins directory
			$.get( "plugins/", function (data) {            
		    	var files = [], css = [], names = {};

					$(data).find('a').each( function(){
			      // ex: "GetcoBookmark/"
					  var name = $(this).attr('href'), baseUrl = 'plugins/' + name;
						
						if(name != '../' && name.indexOf('/') === name.length - 1){
							files.push( baseUrl + 'plugin.js' );
							css.push(baseUrl + 'plugin.css');
							names[baseUrl + 'plugin.js'] = name.substring(0, name.length - 1);
						}
			    });

					//load'em
					var totalFiles = files.length;
					
					if(totalFiles > 0){
						//CSS - don't care when it finishes loading
						loadPlugins(css);
						
						//javascript - needs to be loaded before rest of app
						loadPlugins( files , 
							//success
							function(response, options){

								loadedFiles++;
								//try to read
								var name = names[options.url];
								
								//load plugin array
								var plugin = new dbrplugins[name];
								switch(plugin.pluginFor){
									case 'tableeditor':
									case 'sqlpanel':
									case 'app':
										_plugins[plugin.pluginFor].push( plugin );
								}
								

								//everything loaded up!
							//	console.log(options.url);
								if(loadedFiles === totalFiles){
									this.loadApp();
								}
							},
							//error
							function(response, options) {
								totalFiles--;
			          Ext.Msg.alert("Error","Unable to load plugin script: " + options.url);
								if(loadedFiles === totalFiles){
									this.loadApp();
								}
			        },
					    me
						);
					}
					else{
						me.loadApp();
					}
					
		  });

		},
		
		
		loadApp: function(){ 
			var _vaApp = this;
			
				     
			/* viewport consists of DB actions on left side, and table editor in the center */
			_viewport = new Ext.Viewport({
				layout:'border',
				plugins:_plugins.app,
				
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
											text:'DBRelay Documentation',
											iconCls:'icon-doc', 
											handler:function(){window.open('docs/index.html');}    
										}, 
										{
											text:'Other Documentation',
											iconCls:'icon-doc', 
											handler:function(){window.open('/docs/index.html');}    
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
								  this.sqlDb.setFlag('echosql', true);
									//pretty print option      
									this.sqlDb.setFlag('pp', conncfg.flags_pp ); 
									delete conncfg.flags_pp;   
									
                  //open a SQL panel by default
									this.addSqlPanel(this.restoredConnection.sql);  
									
									//update window title with db name
									 document.title =   (conncfg.sql_database || 'default database') + '@' +conncfg.sql_server + '|' + _appName;   
									 this.refreshTablesMenu();
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
											this.sqlDb.connection = Ext.apply(oldconn, conncfg);      
											//add echosql by default
											this.sqlDb.setFlag('echosql', true);
											//pretty print option     
											this.sqlDb.setFlag('pp', conncfg.flags_pp );        
											delete conncfg.flags_pp;    
											return true;   
				
										}
										else {  
											         
											Ext.Msg.confirm('Confirm connection info change', 'Changing the connection information will close any open tabs.  Do you want to continue?',
											 function(btn, text){      
													if(btn == 'yes'){
														this.sqlDb.connection = Ext.apply(oldconn, conncfg);      
														//add echosql by default
														this.sqlDb.setFlag('echosql', true);
														//pretty print option   
														this.sqlDb.setFlag('pp', conncfg.flags_pp );      
														delete conncfg.flags_pp;

														Ext.getCmp('maintabs').removeAll();
														this.tables = []; 
													 /* var tables = this.tables;
														for( var n in tables ){
															try{
																var table = this.tables[n];
																table.ownerCt.remove(table);  
																delete this.tables[n]
															}
															catch(e){}
															}      */       
															
														 //update window title with db name
														 document.title = (conncfg.sql_database || 'default database') + '@' +conncfg.sql_server + '|' + _appName;     
														 this.refreshTablesMenu();
															
															
														_viewport.doLayout();  
													} 
													else{  
														return false;
													}               
													
											},this);

										}
 	
								 }
                   
								
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
				defaultSql : defaultSql || '',
				plugins:_plugins.sqlpanel
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
					plugins:_plugins.tableeditor,
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
			//retrieve number of rows from all tables first
			this.sqlDb.getAllCellCounts(
				//success
				function(sqld, resp, cellcounts){  
           // console.dir(cellcounts);

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
						_tablesMenuOpen.add('<b>Select to Edit (#cells)</b>');  


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
						_tablesMenuDrop.add('<b>Select to Drop (#cells)</b>');


            //should these really be in here???  
						function openTableHandler(item, e){  
							if(item.largeTable){
								Ext.Msg.confirm('Are you sure?', 'This table has a very large amount of data.  Opening this table for editing may be costly to the database server.  Do you want to continue?',
								 function(btn, text){      
										if(btn == 'yes'){
											this.showTableEditor(item.tableName); 
										} 
										else{  
											return false;
										}               
										
								},this);
								 
							}else{  
								this.showTableEditor(item.tableName);   
							}
						}

						function dropTableHandler(item, e){ 
							var n =item.tableName;

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
              
						 //add table menu items 
						 var tableNames = [];
						 for(var name in cellcounts){   
							 var cells = cellcounts[name];

							 var label = '<span '+(cells >= _NUMCELLS_THRESHOLD ? 'class="dbr-largetable"' : '')+'>' + name + ' ('+ cells + ')</span>';
							 

						 	 _tablesMenuOpen.addMenuItem(	{
								text:label, 
								tableName:name,
								largeTable: cells >= _NUMCELLS_THRESHOLD,
								iconCls:'icon-table',
								handler:openTableHandler,  
								isClicky:true,
								scope:this
						 	 });    

							 _tablesMenuDrop.addMenuItem(	{
								 text:label,          
								 tableName:name,
								 iconCls:'icon-table',
								 handler:dropTableHandler,  
								 isClicky:true, 
								 scope:this
							 });              
							
							 //save for later
							 tableNames.push(name);
						 }                      

						_tablesMenuOpen.doLayout();   
						_tablesMenuDrop.doLayout();

						this.tableNames = tableNames;

				//end success fn	
				}, 
				//error
				function(sqld, resp){    
					Ext.Msg.alert('Something went wrong', (resp.log.error || 'Unknown error occured when retrieving row counts'));
				},
		 this); 
			

			
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