/**Connection window, where user edits connection information
*/ 
Ext.namespace('dbrui');
dbrui.ConnectionWindow = Ext.extend(Ext.Window,{
	layout:'anchor',
	title:'Database Connection Information',
	width:400,
	height:350,
	modal:true,
	defaults:{border:false}, 
	
 	initComponent : function(){
	  var _idpfx = Ext.id(); //ensure unique ids 
		var defaultConn = this.defaultConnection || {};
	
		this.items = [
			{
				xtype:'panel',
				anchor:'100%',
				layout:'column',
				items:[
					{
						columnWidth:0.75,
						layout:'form',
						border:false,
						labelAlign:'top',
						items:{
							xtype:'textfield',
							anchor:'98%',
							fieldLabel:'Server',
							id: 'sql_server' + _idpfx,
							allowBlank:false,   
							selectOnFocus:true,   
							enableKeyEvents:true,  
							value: defaultConn.sql_server || '',
						//value: '172.16.115.135',
							listeners:{
								'keyup':{
									fn:function(fld, e){
										if(e.keyCode === e.ENTER){
											 this.onTestAndSave();
										}
									},
									scope:this
								},
								//fetch db list on change
								'change':{
									fn:function(fld, nv){
										if(nv !== ''){
											this.refreshDatabaseList();
										}
									},
									scope:this
								}
							}   
						  
						}
					},
					{
						columnWidth:0.25,
						layout:'form',
						border:false,
						labelAlign:'top', 
						items:{
							xtype:'textfield',
							anchor:'98%',
							fieldLabel:'Port',
							id:'sql_port'+ _idpfx,
							value: defaultConn.sql_port || '',
							enableKeyEvents:true,
							listeners:{
								'keyup':{
									fn:function(fld, e){
										if(e.keyCode === e.ENTER){
											 this.onTestAndSave();
										}
									},
									scope:this  
								}
							}
						}
					}
				]
				
			},
      
			{
				xtype:'panel',
				anchor:'100% 100%',
				layout:'column',
				items:[
					{
						columnWidth:1,
						layout:'form',
						border:false,
						items:[
							{
								xtype:'textfield',
								anchor:'98%',
								fieldLabel:'User',
								id:'sql_user'+ _idpfx,
								allowBlank:false, 
								selectOnFocus:true,  
								value:defaultConn.sql_user ||'',    
								enableKeyEvents:true,
								listeners:{
									'keyup':{
										fn:function(fld, e){
											if( e.keyCode === e.ENTER){
												 this.onTestAndSave();
											}
										},
										scope:this
									},
									//fetch db list on change
									'change':{
										fn:function(fld, nv){
											if(nv !== ''){
												this.refreshDatabaseList();
											}
										},
										scope:this
									}
								}
							},
							
							{
								xtype:'textfield',
								anchor:'98%',
								inputType:'password',
								fieldLabel:'Password', 
								selectOnFocus:true,  
								id:'sql_password'+ _idpfx,
								value: defaultConn.sql_password || '', 
								enableKeyEvents:true,
								listeners:{
									'keyup':{
										fn:function(fld, e){
											if(e.keyCode === e.ENTER){
												 this.onTestAndSave();
											}
										},
										scope:this
									 }
								}
							},
							{
								xtype:'combo',
								anchor:'98%',
								fieldLabel:'Database',
								id:'sql_database'+ _idpfx,
								allowBlank:true,
								selectOnFocus:true, 
								typeAhead: true,
						    triggerAction: 'all',
						    lazyRender:true,
						    mode: 'local',
						    store: new Ext.data.ArrayStore({
						        fields: ['name']
						    }),
						    valueField: 'name',
								displayField:'name',
								
								value:defaultConn.sql_database ||'',
								enableKeyEvents:true,
								listeners:{
									'keyup':{
										fn:function(fld, e){
											if(e.keyCode === e.ENTER){
												 this.onTestAndSave();
											}
										},
										scope:this  
									 }
								}
							},
							
							{
								xtype:'textfield',
								anchor:'98%',
								fieldLabel:'Connection Name',      
								selectOnFocus:true,  
								id:'connection_name'+ _idpfx, 
								//generate unique connection name for this session (ie. va_534588228924) 
								value:defaultConn.connection_name || 'va_' + new Date().getTime(),
								enableKeyEvents:true,
								listeners:{
									'keyup':{
										fn:function(fld, e){
											if(e.keyCode === e.ENTER){
												 this.onTestAndSave();
											}
										},
										scope:this
									 }
								} 
							}, 
							{
								xtype:'numberfield',
								anchor:'50%',         
								selectOnFocus:true,
								fieldLabel:'Timeout',
								id:'connection_timeout'+ _idpfx, 
								value:defaultConn.connection_timeout || 60,
								enableKeyEvents:true,
								listeners:{
									'keyup':{
										fn:function(fld, e){
											if(e.keyCode === e.ENTER){
												 this.onTestAndSave();
											}
										},
										scope:this
									 }
								}
							},
							{
								xtype:'checkbox',         
								fieldLabel:'Pretty Print JSON',
								id:'flags_pp'+ _idpfx
							}
							
						]
					}
				]
			}
			
		];
		
		this.buttons = [
			{
				text:'Test & Save',
				iconCls:'icon-tick',
				handler: this.onTestAndSave,
				scope:this
			},
			{
				text:'Cancel',
				iconCls:'icon-minus',
				handler:function(){this.hide()},
				scope:this
			}

		];
		
		dbrui.ConnectionWindow.superclass.initComponent.call(this);
		                            
		this.fields = {    
			sql_server : this.findById('sql_server'+ _idpfx),
			sql_database : this.findById('sql_database'+ _idpfx),  
			sql_port : this.findById('sql_port'+ _idpfx),
			
			sql_user : this.findById('sql_user'+ _idpfx),
			sql_password : this.findById('sql_password'+ _idpfx),
			connection_name : this.findById('connection_name'+ _idpfx),
			connection_timeout : this.findById('connection_timeout'+ _idpfx),
			
			flags_pp : this.findById('flags_pp'+ _idpfx)
		};
		
		//on show, populate the database list
		this.on('show', this.refreshDatabaseList, this);
		
		this.addEvents({    
			/** Fired when test & save is clicked, fields are validated, AND testing is success */
			'connectionupdate' : true
		});
		
		
	},
	
	/** SQL Server 2005 specific */
	refreshDatabaseList : function(){
		var sql_server = this.fields['sql_server'].getValue();
		var sql_user = this.fields['sql_user'].getValue();
		
		if(sql_server === '' || sql_user === ''){return;}
		
		var testDb = new sqlDbAccess({sql_server:sql_server,sql_user:sql_user});
		
		testDb.getDatabases(
			//success
			function(dba, dbs){
				var data = [];
				for(var i=0,len=dbs.length; i<len; i++){
					data[i] =[dbs[i]];
				}
				this.fields.sql_database.getStore().loadData(data);
			},
			null,
		this);
	
	},
	
	/* private handler for test & save button */
	onTestAndSave : function(){
	  var fail = false;
	
		for(var f in this.fields){
			if(!this.fields[f].validate()){
				fail = true;
			}
		}
		 
		if(!fail){
			var values = {
				sql_server : this.fields['sql_server'].getValue(), 
				sql_port : this.fields['sql_port'].getValue(), 
				sql_database : this.fields['sql_database'].getValue(),
				sql_user : this.fields['sql_user'].getValue(),
				sql_password : this.fields['sql_password'].getValue(),  
				connection_name : this.fields['connection_name'].getValue(),
				connection_timeout : this.fields['connection_timeout'].getValue(),
				
				flags_pp : this.fields['flags_pp'].getValue()
			};
      
			//save to caches
      this.connection = values;
             
	    //TODO: test connection
			var testDb = new sqlDbAccess(values); 
	    testDb.testConnection(function(dba, success){  

			   if(success){    
						if(this.fireEvent('connectionupdate', this, values)){  
							this.hide();
				 		}
				 }
				else{
					Ext.Msg.alert('Something Went Wrong','Couldn\'t connect to database.\nPlease make sure the connection information entered is correct.');
				}
			},this); 
	
	
			
			   
		}  
	}  

});