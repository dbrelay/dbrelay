// DB Relay is an HTTP module built on the NGiNX webserver platform which
// communicates with a variety of database servers and returns JSON formatted
// data.
// 
// Copyright (C) 2008-2010 Getco LLC
// 
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version. In addition, redistributions in source code and in binary
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
	/** true to auto connect */
	autoConnect: false,
	
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
									//fetch db list on change
									'focus':{
										fn:function(fld){
											this.refreshDatabaseList();
											
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
			},
			{
				text:'Documentation',
				iconCls:'icon-help', 
				handler:function(){window.open('docs/index.html');}    
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
		
		if(this.autoConnect){
			this.on('render', function(){
				this.onTestAndSave();
			}, this, {single:true});
		}
		
		this.addEvents({    
			/** Fired when test & save is clicked, fields are validated, AND testing is success */
			'connectionupdate' : true
		});
		
		
	},
	
	/** SQL Server 2005 specific */
	refreshDatabaseList : function(){
		var sql_server = this.fields['sql_server'].getValue();
		var sql_user = this.fields['sql_user'].getValue();
		var sql_password = this.fields['sql_password'].getValue();
		
		if(sql_server === '' || sql_user === ''){return;}
		
		var testDb = new sqlDbAccess({sql_server:sql_server,sql_user:sql_user,sql_password:sql_password});
		
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
