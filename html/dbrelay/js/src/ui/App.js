// DB Relay is an HTTP module built on the NGiNX webserver platform which
// communicates with a variety of database servers and returns JSON formatted
// data.
// 
// Copyright (C) 2008-2010 Getco LLC
// 
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version. In addition, redistributions in source code and in binary
// form must include the above copyright notices, and each of the following
// disclaimers.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT OWNERS AND CONTRIBUTORS “AS IS”
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL ANY COPYRIGHT OWNERS OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

Ext.namespace('dbrui','dbrplugins.meta');

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
		dbrelayapp:[],
		sqlgrid:[]
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
			Ext.chart.Chart.CHART_URL = window.DBRELAYUI_EXTCHART_URL || 'js/ext-3.2.1/resources/charts.swf?nocache=' + Math.floor(Math.random()*10000);
			

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
								var pluginFor = dbrplugins.meta[name].pluginFor;
								if(_plugins[pluginFor]){
									_plugins[pluginFor].push( name );
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
		
		getPluginsFor : function(type){
			var names = _plugins[type], plugins = [];

			for(var i=0; i< names.length; i++){
				plugins.push( new dbrplugins[names[i]] );
			}
			
			return plugins;
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
										text:'Docs',
										iconCls:'icon-help', 
										handler:function(){window.open('docs/index.html');}    
									},
									{
										xtype:'button',
										text:'More',
										menu:[
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
										}
											
										]
									},
									{
									    xtype: 'button',
									    iconCls:'icon-dbrelay',
									    scale: 'large',
									    handler: function(){window.open('http://dbrelay.com/');}
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
			this.restoredConnection = window.DBRELAYUI_PARAMS ? window.DBRELAYUI_PARAMS : Ext.urlDecode(window.location.href.substring( window.location.href.indexOf('?')+1));             
			
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
			
			
			//check browser
			if(!Ext.isIE8 && !Ext.isGecko3 && !Ext.isSafari4 && !Ext.isChrome){
				Ext.Msg.alert('WARNING','You are not using a supported browser.\nThis interface supports FF3+, IE8+, Chrome, and Safari 4+.  Using any other browsers may result in problems.',
					function(){
							this.showConnectionWindow(true);  
					}, this);
			}
			else{
				this.showConnectionWindow(true);  
			}

			
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
					autoConnect : this.restoredConnection.run && this.restoredConnection.run == 1 ? true : false,
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
									var autoRun =  this.restoredConnection.run && this.restoredConnection.run == 1 ? true : false;
								
									this.addSqlPanel(this.restoredConnection.sql, autoRun);  
									
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
     addSqlPanel : function(defaultSql, autoRun){

			var p = Ext.getCmp('maintabs').add(new dbrui.SqlResultPanel({
				sqlDb: this.sqlDb,
				border: false,
				iconCls:'icon-sql',
				title: 'SQL Query ' + (++_numSqls),
				closable:true,
				defaultSql : defaultSql || '',
				plugins:this.getPluginsFor('sqlpanel'),
				gridplugins:this.getPluginsFor('sqlgrid'),
				autoRun : autoRun || false
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
					iconCls:'icon-table',
					sqlDb: this.sqlDb,
					border: false,
					title: table,
					closable:true, 
					serverSidePaging:true,
					pageSize:100,
					plugins:this.getPluginsFor('tableeditor'),
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

							 var label = '<span '+
							    (cells >= _NUMCELLS_THRESHOLD ? 'class="dbr-largetable"' : '')
							    + '>' + name +
							    (isNaN(cells) ? '' : ' ('+ cells + ')')
							    + '</span>';
							 

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