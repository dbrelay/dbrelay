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
						xtype:'textfield',
						fieldLabel:'Direct Url',
						id:'url'+idpfx,
						anchor:'98%',
						readOnly:true,
						selectOnFocus:true
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
				}
				
			}
		];
		

		va.SqlResultPanel.superclass.initComponent.call(this);
	   
		this.fldSqlCode = this.findById('sqlcode'+ idpfx); 
		this.msgPanel = this.findById('msg'+idpfx);  
		this.fldUrl = this.findById('url'+idpfx); 
		
		                
		//save postfix, to be accessed externally later if needed
		this.idpfx = idpfx;
	}, 



	/** Runs the SQL code and displays results in the grid
	*/
	execSql : function(){
		if(!this.fldSqlCode.validate()){return;}
		
	  this.sqlDb.executeSql(this.fldSqlCode.getValue(), function(sqld, resp){        

			//show results
			if(resp.log.error){
				this.showMsgPanel('<p style="color:red">Error:</p><pre style="color:red">'+resp.log.error+'</pre>');   
			}
			else{
				 var data = resp.data[0];
				
				 if(data.fields.length === 0){
					 this.showMsgPanel('<p style="color:green">Success: ' + data.count + ' rows affected.</p>');
				}
				else{       
					//grid
					this.showResultsGrid(data);
				}
				
				//update URL field
				var conn = this.sqlDb.connection;
				conn.sql =  this.fldSqlCode.getValue(); 
				conn.query_tag = null; 

				var sqlUrl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?'
		        + Ext.urlEncode(conn) + '&' + window.location.hash;   

				this.fldUrl.setValue(sqlUrl);
			}
			
			},this);
	},
              

 	showMsgPanel : function(msg){
		Ext.getCmp('resultsRegion'+this.idpfx).getLayout().setActiveItem(this.msgPanel);  
		this.msgPanel.body.update(msg);
	},
	
	/** 
	Displays SQL results in a grid    
	@param {Object} data : response.data object from server
	*/
  showResultsGrid : function(data){
    var cols = data.fields, rows = data.rows;

		var cmData = [], storeFields = [];

		for(var i=0,len=cols.length; i<len; i++){
			var col = cols[i], name = col.name;

			//EXT column model definition 
			cmData[i] = {
				header: name,
				sortable:true,
				id: name, 
				dataIndex:name
			};

			//EXT store fields
			storeFields[i] = {
				name: name,
				type: 'string'
			};
		}


    //create a new store
		var store = new Ext.data.JsonStore({
		    autoDestroy: true,
		    data: {
				   rows: rows
				},
		    root: 'rows',
		    fields: storeFields
		});
		
		//create a new column model 
		var cm = new Ext.grid.ColumnModel(cmData);
		
		
		//create the grid if it doesn't exist yet
		if(!this.grid){
			this.grid = new Ext.grid.GridPanel({
				viewConfig:{
					forceFit:true,
					autoFill:true
				},
				tbar:[
					'<span id="total'+this.idpfx+'"></span> total',               
					'-',
					{
						xtype:'numberfield',
						id:'pagesize'+this.idpfx,
						width:30,
						enableKeyEvents:true,
						selectOnFocus:true,
						listeners:{ 
							'blur':{
								fn:this.updatePageView,
								scope:this
							},
							'keyup':{
								fn:function(b,e){
									if(e.keyCode === e.ENTER){
										this.updatePageView();
									}
								},
								scope:this
							}
						}
					}, 
					'/page',
					'-',
					{ 
						iconCls:'vaicon-first',
						handler:function(){ 
							this.showPage(1); 
						},
						scope:this
					}, 
					{ 
						iconCls:'vaicon-back',
						handler:function(){
							var page = this.pageNumberField.getValue();
							this.showPage(page === 1 ? 1 : page-1); 
						},
						scope:this
					},
					'Page',  
					{
						xtype:'numberfield',
						id:'page'+this.idpfx,
						width:30,   
						enableKeyEvents:true,
						selectOnFocus:true,
						listeners:{ 
							'blur':{
								fn:this.updatePageView,
								scope:this
							},
							'keyup':{
								fn:function(b,e){
									if(e.keyCode === e.ENTER){
										this.updatePageView();
									}
								},
								scope:this
							}
						}
					},
					'of <span id="totalPages'+this.idpfx+'"></span>',
					{ 
						iconCls:'vaicon-next',
						handler:function(){ 
							var page = this.pageNumberField.getValue(); 
							this.showPage(page === this.totalPages ? page : page + 1);
						},
						scope:this
					},
					{ 
						iconCls:'vaicon-last',
						handler:function(){
							this.showPage( this.totalPages); 
						},
						scope:this
					}
				],
				/** client side paging */
				pageSize: 50,   
				pageNumber:1,
       	totalPages:1,

				cm : cm,
				store : store
			});
			
			//add to layout
			var results = Ext.getCmp('resultsRegion'+this.idpfx);
			
			results.add(this.grid);  
			results.getLayout().setActiveItem(this.grid);
			this.doLayout();
			
		 	this.pageNumberField = Ext.getCmp('page'+this.idpfx);
			this.pageSizeField = Ext.getCmp('pagesize'+this.idpfx); 
			this.pageNumberField.setValue(this.grid.pageNumber);    
			this.pageSizeField.setValue(this.grid.pageSize);    

			
		}
		
		else{
			      
			//reconfigure the grid with the new query results
			this.grid.reconfigure(store, cm);   
		} 
		
		this.tableData = rows;
		this.totalRows = data.count;  
		Ext.get('total'+this.idpfx).update(this.totalRows);  

		this.updatePageView();
		
		    
	
	},
	
	showPage : function(page){  
		this.pageNumberField.suspendEvents();
		this.pageNumberField.setValue(page);
		this.pageNumberField.resumeEvents();
		       
		this.updatePageView();
	},
	
	/**
	Update grid items in view (client-side), based on current state of UI
	*/
	updatePageView : function(){
		var pageNumber = this.pageNumberField.getValue();  
		if(pageNumber > this.totalPages){  
			 this.pageNumberField.suspendEvents();
			 this.pageNumberField.setValue(this.totalPages);
			 this.pageNumberField.resumeEvents();
		}
		var pageSize = this.pageSizeField.getValue(); 
		
		 
		var start =  (pageNumber-1) * pageSize;
	  
		this.grid.getStore().loadData({'rows':this.tableData.slice(start , start+pageSize )});  
                             
		

		this.pageNumber = pageNumber;
		this.pageSize = pageSize;	   
		 
		this.totalPages = Math.floor((this.totalRows / this.pageSize) + 1);
    Ext.get('totalPages'+this.idpfx).update(this.totalPages);
		
	}

});
Ext.reg('va_sqlresultpanel', va.SqlResultPanel);