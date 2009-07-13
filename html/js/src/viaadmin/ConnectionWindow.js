/**
  Connection window, where user edits connection information

*/
va.ConnectionWindow = Ext.extend(Ext.Window,{
	layout:'anchor',
	title:'Database Connection Information',
	width:330,
	height:300,
	modal:true,
	defaults:{border:false}, 
  
 	initComponent : function(){
	  var _idpfx = Ext.id(); //ensure unique ids
	
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
							value:'172.16.115.128'
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
							id:'sql_port'+ _idpfx
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
								fieldLabel:'Database',
								id:'sql_database'+ _idpfx,
								allowBlank:false,
								selectOnFocus:true,
								value:'viaducttest'
							},
							{
								xtype:'textfield',
								anchor:'98%',
								fieldLabel:'User',
								id:'sql_user'+ _idpfx,
								allowBlank:false, 
								selectOnFocus:true,  
								value:'sa'
							},
							{
								xtype:'textfield',
								anchor:'98%',
								inputType:'password',
								fieldLabel:'Password', 
								selectOnFocus:true,  
								id:'sql_password'+ _idpfx
							},
							{
								xtype:'textfield',
								anchor:'98%',
								fieldLabel:'Connection Name',
								disabled:true,       
								selectOnFocus:true,  
								id:'connection_name'+ _idpfx, 
								//generate unique connection name for this session (ie. va_534588228924) 
								value:'va_' + new Date().getTime() 
							}, 
							{
								xtype:'numberfield',
								anchor:'50%',         
								selectOnFocus:true,
								fieldLabel:'Timeout',
								id:'connection_timeout'+ _idpfx, 
								value:60
							}
							
						]
					}
				]
			}
			
		];
		
		this.buttons = [
			{
				text:'Test & Save',
				iconCls:'vaicon-tick',
				handler: this.onTestAndSave,
				scope:this
			},
			{
				text:'Cancel',
				iconCls:'vaicon-minus',
				handler:function(){this.hide()},
				scope:this
			}

		];
		
		va.ConnectionWindow.superclass.initComponent.call(this);
		                            
		this.fields = {    
			sql_server : this.findById('sql_server'+ _idpfx),
			sql_database : this.findById('sql_database'+ _idpfx),  
			sql_port : this.findById('sql_port'+ _idpfx),
			
			sql_user : this.findById('sql_user'+ _idpfx),
			sql_password : this.findById('sql_password'+ _idpfx),
			connection_name : this.findById('connection_name'+ _idpfx),
			connection_timeout : this.findById('connection_timeout'+ _idpfx)
		};
		
		this.addEvents({    
			/** Fired when test & save is clicked, fields are validated, AND testing is success */
			'connectionupdate' : true
		});
		
		
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
				connection_timeout : this.fields['connection_timeout'].getValue()
			};
       
                   
	    //TODO: test connection
			var testDb = new sqlDbAccess(values); 
	    testDb.testConnection(function(sqld, success){
			   if(success){
						this.fireEvent('connectionupdate', this, values);  
						this.hide();
				 }
				else{
					alert('Couldn\'t connect to database.\nPlease make sure the above information is correct.');
				}
			},this); 
	
	
			
			   
		}  
	}  

});