/**
  Panel that allows user to enter SQL and display results as read-only

  Config options (*required):
		sql  :  {string} SQL code
		sqlDb*   :  {sqlDbAccess} sqlDb instance to use
*/

Ext.namespace('va');

va.SqlResultPanel = Ext.extend(Ext.Panel,{
  cls:'va-sqlresultpanel',
	iconCls:'vaicon-sql',
  layout:'border',  
	closable:true, 
	grids:[],

	initComponent : function(){
	 var idpfx = Ext.id(); //ensure unique ids   
	
		//blank for now, these will change based on db queries
		this.cm = new Ext.grid.ColumnModel([]);
		this.store = new Ext.data.Store();
		
		this.items = [
			{
				region:'north',
				height:80,
				split:true,
				collapsible:true,
				layout:'form',
				unstyled:true,  
				labelWidth:80,
				items:[
					{
						fieldLabel:'SQL',
						xtype:'textarea',
						id: 'sqlcode' + idpfx, 
						anchor:'98%',
						allowBlank:false,
						enableKeyEvents:true, 
						selectOnFocus:true, 
						value: this.defaultSql || '',
						listeners:{
							'keyup':{
								fn:function(fld, e){
									if(e.ctrlKey && e.keyCode === e.ENTER){
										 this.execSql();
									}
								},
								scope:this
							}
						}
					},
					{
						xtype:'displayfield',
						fieldLabel:'',
						id:'url'+idpfx
					}
				], 
				tbar:[ 
					 {
						text:'Run (CTRL + Enter)',
						iconCls:'vaicon-tick',            
						tooltip:'Execute SQL [Shift + Enter]',
						handler: this.execSql,
						scope:this
					},
					'->',
					{
						iconCls:'vaicon-minus', 
						text:'Clear',
						handler:function(){
							this.fldSqlCode.setValue('');
							this.fldUrl.setValue('');  
							this.showMsgPanel('Enter query to execute.');
						},
						scope:this
					}    
				],
				listeners:{
					'resize':{
						fn: function(p,aw,ah){ 
							 this.fldSqlCode.setHeight(ah - 60);
						},
						scope:this
					},
					'expand':{
						fn:function(p){
							p.doLayout();
						}
					}
				} 
			},
			//grid will be added to center after query is run
			{
				region:'center',
				id:'resultsRegion'+idpfx,
				border:false,
			 // unstyled:true,
				layout:'card',
				activeItem:0,
				items:{
					id:'msg'+idpfx,
					unstyled:true
				},
				tbar:[
					{
						text:''
					}
				]
				
			}
		];
		

		va.SqlResultPanel.superclass.initComponent.call(this);
	   
		this.fldSqlCode = this.findById('sqlcode'+ idpfx); 
		this.msgPanel = this.findById('msg'+idpfx);  
		this.fldUrl = this.findById('url'+idpfx); 
		
		this.centerRegion = Ext.getCmp('resultsRegion'+idpfx);
               
		//save postfix, to be accessed externally later if needed
		this.idpfx = idpfx;
	}, 



	/** Runs the SQL code and displays results in the grid
	*/
	execSql : function(){
		if(!this.fldSqlCode.validate()){return;}
		
		this.centerRegion.body.mask();
		
	  this.sqlDb.executeSql(this.fldSqlCode.getValue(), function(sqld, resp){        

			//show results
			if(resp.log.error){
				this.showMsgPanel('<p style="color:red">Error:</p><pre style="color:red">'+resp.log.error+'</pre>');      
				this.centerRegion.body.unmask();  
			}
			else{
				 var data = resp.data[0];
				
				 if(data.fields.length === 0){
					 this.showMsgPanel('<p style="color:green">Success: ' + data.count + ' rows affected.</p>');     
					this.centerRegion.body.unmask();    
				}
				else{
					this.showResultGrids(resp.data);
				}
				
				//update URL field
				var conn = Ext.apply({},this.sqlDb.connection);
				conn.sql =  this.fldSqlCode.getValue(); 
				conn.query_tag = null;        
				//don't pass password     
				conn.sql_password = null;

				var sqlUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?'
		        + Ext.urlEncode(conn) + '&' + window.location.hash;   

				this.setUrlLink(sqlUrl);
			}
			
			},this);
	},
              
  setUrlLink : function(url){    
		this.fldUrl.setValue('<a href="'+url+'" target="_blank">Direct link to this SQL query (right-click & copy)</a>'); 
	},
	
 	showMsgPanel : function(msg){
		this.centerRegion.getLayout().setActiveItem(this.msgPanel);  
		this.msgPanel.body.update(msg);
	},
	
	/** 
	Displays SQL results in a grid    
	@param {Array} dataSets : response.data array from server
	*/
  showResultGrids : function(dataSets){      
	
		var tb = this.centerRegion.getTopToolbar(), numResults = dataSets.length, count=0; 
		tb.removeAll();             

    for (var i=0; i<numResults; i++){   
			var data = dataSets[i];           
			
			if(!data.count && data.count !== 0){continue;}
			
			var name ='Result Set ' + (count+1);
			
			//grid
		  if(!this.grids[count]){
			//create the grid if it doesn't exist yet 

				this.grids[count] = new va.SqlSelectGrid({
					resultName:'Viewing ' + name, 
					dataSet:data,
					listeners:{
						'render':{
							fn:function(g){    
								this.doLayout();
								 
								g.refresh(g.dataSet); 
								delete g.dataSet;     
							},
							scope:this
						}
					}
				 }); 
			 	//add to layout
				this.centerRegion.add(this.grids[count]); 
				 
			}
			
			//use existing grid
			else{    
				var grid = this.grids[count];
				grid.refresh(data);
				grid.setResultName(name);      
			}
		
		
		  //add grid button to result toolbar
			tb.add({ 
				text: name,    
				gridIndex : count, 
				id:'showgrid-' + count + this.idpfx,
				iconCls:'vaicon-sql',    
				enableToggle:true,
				enableDepress:false, 
				toggleGroup:'grids' + this.idpfx,
				toggleHandler:function(b, st){        
					if(st){     
					 this.centerRegion.getLayout().setActiveItem(this.grids[b.gridIndex]);   
					 this.centerRegion.doLayout(); 
				  } 
				},
				scope:this
			});
			tb.addText('&nbsp;&nbsp;');
			count++;     
		} 
		
	 	tb.el.removeClass('x-toolbar');
		this.doLayout();
		tb.findById('showgrid-0' + this.idpfx).toggle(true);    
		tb.addText('&nbsp;&nbsp;'+ count +' result set'+(count > 1 ? 's' : '')+' returned.');             
		this.centerRegion.body.unmask();    
	}
		
	

}); 

Ext.reg('va_sqlresultpanel', va.SqlResultPanel);         


