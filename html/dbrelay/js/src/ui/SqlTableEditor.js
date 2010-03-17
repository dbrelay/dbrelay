/**

  Config options (*required):
		tableName*  :  {string} table name to bind this editor to
		sqlDb*      :  {sqlDbAccess} sqlDb instance to use
*/

Ext.namespace('dbrui');

dbrui.SqlTableEditor = Ext.extend(Ext.Panel,{
  cls:'dbr-sqltableeditor',
	layout:'border',
	//iconCls:'icon-table',
	

	/** {sqlTable} sqlTable object, created by the editor */
  sqlTable: null,            
	//primary key columns
	pkeyColumns:[], 
	pkeyStyle:'color:#00761c;font-weight:bold;',   
	binStyle:'color:#bbbbbb;',   

	DELETE_INDEX: 'dbr-deletebox',  
	ADD_INDEX: 'dbr-newrow',   
	disableDelete: false,
	

	/** paging */
	pageSize: 50, 
	pageNumber:1,
	totalPages:1,    
	
	where:'',
	orderBy:'',
	hideFilterOptions:false,
	
	//EXPERIMENTAL - true to page on server side
	serverSidePaging:true,

	initComponent : function(){
	 var idpfx = Ext.id(); //ensure unique ids    
	 Ext.QuickTips.init();
	
	   
	 // this.title = this.title || 'TABLE: ' +this.tableName;  
 
		this.tbar =[  
		{   
			text: (this.hideFilterOptions ? 'Show' : 'Hide') + ' Adv Filter', 
			iconCls:'icon-app',
			enableToggle:true,  
			pressed:!this.hideFilterOptions,
			tooltip:'More options',
			handler: function(b,e){ 
				var hidden = this.optionsPanel.hidden;
				                
				b.setText(hidden ? 'Hide Adv Filter' : 'Show Adv Filter'); 
				b.setIconClass(hidden ? 'icon-app' : 'icon-app-split');
				this.optionsPanel.setVisible(hidden);    
				this.doLayout();
				
			},
			scope:this
		},
		'-',
			//Refresh
			{
        xtype:'button',
        text: ' Refresh',  
				tooltip:'Refresh columns & data from server',
        iconCls:'icon-refresh',
				handler:function(){          
					Ext.Msg.confirm('Confirm Refresh?','Refreshing will revert and outstanding edits you may have. Are you sure you want to refresh?',
					 function(btn, text){      
							if(btn == 'yes'){
								this.refresh();  
							}    
					},this);

				},
				scope:this     
      }, 
			'-',  
			//Update Rows
			{
        xtype:'button',
        text: 'Commit', 
				tooltip:'Commit all changes (adds, deletes, edits) to table in database',
        iconCls:'icon-disk',
				handler: function(){       
					Ext.Msg.confirm('Confirm Commit?','Are you sure you want to save changes to the server?',
					 function(btn, text){      
							if(btn == 'yes'){
								this.updateSelectedRows();  
							}    
					},this);
					
				},
				scope:this    
      },     
			'-',
			//Add Row
			{
			  text:'Row',              
				tooltip:'Add new row to table',
				iconCls:'icon-plus',
				handler:function(){
          var grid=this.grid, store= grid.getStore(), Row = store.recordType; 
          var newRec = new Row(Ext.apply({},this.addRowDefaults));               
					newRec.set(this.ADD_INDEX, true);
					
          grid.stopEditing();    
          store.insert(0, newRec);
          grid.startEditing(0, 1);   
					
				},
				scope:this
			}, 
			
			'-',  
			{
				text:'Export',
				iconCls:'icon-tableexport',
				menu:[
					{
						text:'Current page view to HTML', 
						iconCls:'icon-html', 
						handler:function(){this.exportHtml();},
						scope:this
					},
					{
						text:'Current page view to CSV',
						iconCls:'icon-excel',
						handler:function(){this.exportCSV();},
						scope:this
					}
				]
			},          
			{
				xtype:'tbfill',
			},
			'<b><span id="total'+idpfx+'"></span></b> total',
			'-',
			{
				xtype:'numberfield',
				id:'pagesize'+idpfx,
				width:30,
				value:this.pageSize,
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
				iconCls:'icon-first',
				tooltip:'Go to first page',
				handler:function(){ 
					this.showPage(1); 
				},
				scope:this
			}, 
			{ 
				iconCls:'icon-back',
				tooptip:'Go to previous page',
				handler:function(){
					var page = this.pageNumberField.getValue();
					this.showPage(page === 1 ? 1 : page-1); 
				},
				scope:this
			},
			'Page',  
			{
				xtype:'numberfield',
				id:'page'+idpfx,
				width:30,
				value:this.pageNumber,
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
			'of <span id="totalPages'+idpfx+'"></span>',
			{ 
				iconCls:'icon-next',
				tooltip:'Go to next page',
				handler:function(){
					var page = this.pageNumberField.getValue(); 
					this.showPage(page === this.totalPages ? page : page + 1); 
				},
				scope:this
			},
			{ 
				iconCls:'icon-last',     
				tooltip:'Go to last page',
				handler:function(){
					this.showPage(this.totalPages); 
				},
				scope:this
			}
			
		];      
		
		 
		//delete checkbox plugin for grid
		 this.deleteBox = new dbrui.DeleteBox({
			   header: 'Del',
			   id: 'check', 
				 dataIndex: this.DELETE_INDEX,
			   width: 25,
				 resizable:false
			});
			
		var gridConfig = {
				region:'center',
				xtype:'editorgrid', 
				border:false,
				id:'grid'+idpfx,
				clicksToEdit: 1,  
				stripeRows:true,
				columnLines:true,
				viewConfig:{
					//forceFit:true,
					autoFill:true
				}, 
				plugins : [this.deleteBox], 
				//blank for now, these will change based on db queries
				store:new Ext.data.Store(),
				cm: new Ext.grid.ColumnModel([this.deleteBox]) 
		};
		var gridConfig = Ext.apply(gridConfig, this.gridConfig || {});

		 this.items=[
			{
				region:'north',
				id:'options'+idpfx,
				height:100,
				split:true,
				hidden: this.hideFilterOptions,
				layout:'anchor',
				border:false,   
				unstyled:true,       
				listeners:{
					'expand':{
						fn:function(p){
							p.doLayout();
						}
					},
					'resize':{
						fn:function(p, aw, ah){
							this.whereField.setHeight(ah - 35);  
							this.orderByField.setHeight(ah-35);
						},
						scope:this
					}
				},
				items:[
					{
						layout:'column',
						border:false,  
						anchor:'100% 100%',
						unstyled:true,
						items:[ 
							{
								columnWidth:0.66,
								layout:'form',
								border:false,  
								unstyled:true, 
								labelAlign:'top',
								anchor:'100%', 
								items:[
									{
										fieldLabel:"WHERE (ex: color='red' )",
										xtype:'textarea',
										id:'where'+idpfx,
										anchor:'95%',
										height:80,   
										enableKeyEvents:true, 
										selectOnFocus:true,
										listeners:{
											'keyup':{
												fn:function(fld, e){
													if(e.ctrlKey && e.keyCode === e.ENTER){
														 this.refresh();
													}
												},
												scope:this
											}
										},
										value: this.where
									}
								]
							},
							{
								columnWidth:0.33,
								layout:'form',
								border:false,     
								unstyled:true,  
								labelAlign:'top',  
								items:[
									{
										fieldLabel:'ORDER BY (ex: first_name asc)',
										id:'orderby'+idpfx,
										xtype:'textarea',
										anchor:'95%',
										height:80,   
										enableKeyEvents:true, 
										selectOnFocus:true,
										listeners:{
											'keyup':{
												fn:function(fld, e){
													if(e.keyCode === e.ENTER){
														 this.refresh();
													}
												},
												scope:this
											}
										}, 
										value:this.orderBy
									}
								]
							} 
						]
					}
					
				]
			},
			gridConfig
		 ];
			
		dbrui.SqlTableEditor.superclass.initComponent.call(this);
	  
		this.on('render',function(p){                                                                                                                                           
	 		this.pageNumberField = Ext.getCmp('page'+idpfx);
			this.pageSizeField = Ext.getCmp('pagesize'+idpfx);     
			
			this.orderByField = Ext.getCmp('orderby'+idpfx);  
			this.whereField = Ext.getCmp('where'+idpfx);  
			
			//get columns & data 
			this.refresh();
		},this,{single:true});    
		
		
		 
	  //create sqlTable
	  this.sqlTable = sqlTable(this.tableName, this.sqlDb);  
	  
    this.grid = this.findById('grid'+idpfx);   
    this.optionsPanel = this.findById('options'+idpfx);
		
		//save postfix, to be accessed externally later if needed
		this.idpfx = idpfx;   
	 
	},  
	
	
	/**
	 Run SQL to add/delete/update all modified rows from table.  
	
	 1. Run delete
	 2. Run update
	*/
	updateSelectedRows: function(){
		var recs = this.grid.getStore().getModifiedRecords();  

		if(recs.length === 0){ 
			return;
		}
		
		var updateRows = [], addRows=[], deleteRows=[], updateWhereRows=[], pkeys=this.pkeyColumns;
		var removedRecs=[], addedRecs=[], updatedRecs=[];
		
		for(var i=0,len=recs.length; i<len; i++){ 
			var rec = recs[i];    
			
			//for each primary key column, create the WHERE clause 
			var where={};
			for(var p=0; p<pkeys.length; p++){
				var k=pkeys[p];
				//set to the original value if modified, or the current value if not modified
				where[k] = rec.modified[k] || rec.data[k];    
			}	
			
			 
			/* DELETE */
			if(!this.disableDelete && rec.data[this.DELETE_INDEX] === true){ 
				               
				if(rec.data[this.ADD_INDEX] === true){
					this.grid.getStore().remove(rec); 
					continue;
				}    
				else{
					//add row
					deleteRows.push(where);  
					removedRecs.push(rec);        
				}
			} 
			/* ADD */
			else if(rec.data[this.ADD_INDEX] === true){       
				var arow = rec.data;   
				//remove add index before creating sql
				if (arow[this.ADD_INDEX]){ delete  arow[this.ADD_INDEX];}   
				addRows.push(arow);
				addedRecs.push(rec);
			}
			/* UPDATE */
			else {       
				var mrow =rec.getChanges();
				     
				updateWhereRows.push(where);
				if (mrow[this.DELETE_INDEX]){ delete  mrow[this.DELETE_INDEX];}    
				updateRows.push(mrow); 
				updatedRecs.push(rec);  
			}
		}                      
	                                         
		var sqlTable = this.sqlTable, sqlDb = sqlTable.getQueryHelper(), sqlStatements = "";
		
	 //delete
		if(!this.disableDelete && deleteRows.length > 0){  
			var batch = sqlTable.setDeleteRowsBatch(deleteRows);
			sqlStatements += sqlDb.getBatch(batch)+ ';';       
			//don't need this batch anymore
			sqlDb.emptyBatch(batch);
	  }
	
		//add
		if(addRows.length > 0){
		  var batch = sqlTable.setAddRowsBatch(addRows);
			sqlStatements += sqlDb.getBatch(batch)+ ';';       
			//don't need this batch anymore
			sqlDb.emptyBatch(batch);
	  }
	
		// update
		if( updateRows.length > 0){ 
			var batch = sqlTable.setUpdateRowsBatch(updateRows, updateWhereRows);
			sqlStatements += sqlDb.getBatch(batch) + ';';       
			//don't need this batch anymore
			sqlDb.emptyBatch(batch);   
		}  
		
		if(sqlStatements !== ''){
			Ext.Msg.alert("Success","Table was successfully updated");
			//run it!  woohoo!
			sqlDb.commitTransaction( sqlStatements , function(sdb, resp){
				 //success cleanup
				for(var i=0;i<removedRecs.length;i++){
			   this.grid.getStore().remove(removedRecs[i]);
				}        
				for(var i=0;i<addedRecs.length;i++){
			  	addedRecs[i].commit();
				}  
				for(var i=0;i<updatedRecs.length;i++){
			  	updatedRecs[i].commit();
				}
			}, this);
		}    

	},  
	

  /**
		Jumps to a given page in the grid, and updates the grid data  
		@param {int} page : page to jump to
	*/
	showPage : function(page){  
		this.pageNumberField.suspendEvents();
		this.pageNumberField.setValue(page);
		this.pageNumberField.resumeEvents();
		       
		this.updatePageView();
	},
	
	
	/**
	Update grid items in view, based on current state of UI
	*/
	updatePageView : function(){
		var pageNumber = this.pageNumberField.getValue();    
		if(pageNumber > this.totalPages){  
			 this.pageNumberField.suspendEvents();
			 this.pageNumberField.setValue(this.totalPages);
			 this.pageNumberField.resumeEvents();
		}
		
		var pageSize = this.pageSizeField.getValue();        
		
		this.where = this.whereField.getValue();
		this.orderBy = this.orderByField.getValue();  
		 
		var start =  (pageNumber-1) * pageSize;
	  
		if(this.serverSidePaging){ 
			this.displayMask('Fetching Data...');      
		
			this.sqlTable.fetchPagingRows({
					pagingSize: pageSize,
					recordStart: this.pageSize*(pageNumber-1),
					where: this.where,
					orderBy: this.orderBy
				}, 
				//calback
				function(sqlt, resp, ocfg, ncfg){
        	this.hideMask();   
					if(!resp.data){
						return;
					}
					
					this.tableData = resp.data[0].rows;

				//load data into grid
				this.grid.getStore().loadData({'rows':this.tableData});  
				 
				   
			},
			//error
			function(sqld, err){
				Ext.Msg.alert("Error", "An error occured while trying to fetch the data.  " + err.log.error);
				this.hideMask();
			}
			,this);
			
			
			
		}
		else{
			this.grid.getStore().loadData({'rows':this.tableData.slice(start , start+pageSize )}); 
		} 
    

		this.pageNumber = pageNumber;
		this.pageSize = pageSize;	   
		
		
		this.totalPages = Math.floor((this.totalRows / pageSize) + 1); 
    Ext.get('totalPages'+this.idpfx).update(this.totalPages); 
		
	},
	
  displayMask : function(msg){  
		 this.body.mask(msg);    
	}, 
	hideMask : function(){
		this.body.unmask();
	},
	
	/**
		Refresh table data & columns from server
	*/
	refresh: function(){  
		this.displayMask('Querying columns...');
		
		if(!this.optionsPanel.hidden){
			this.where = this.whereField.getValue();
			this.orderBy = this.orderByField.getValue();  
		}
		//query for columns.  When results are ready, populate the column model for the grid
		this.sqlTable.queryColumns(function(sqlt, resp, cols){ 
			      
			  this.displayMask('Querying primary keys...');  
			
				//query primary keys
				this.sqlTable.queryPrimaryKeys(function(sqlt, resp2, keys){
					if(keys.length === 0){  
						Ext.Msg.alert('No Primary Keys Found for ' + this.tableNam,'No primary keys were found for this table.  As a result, you will not be able to commit any row deletions or edits');
						this.disableEditing();    
					}
					
					this._finishRefresh(keys, cols);               

				}, 
				//error
				function(sqlt, resp){
					Ext.Msg.alert("Error","An error occurred while trying to fetch the primary keys");
					this.hideMask();
				},
				this);  
			
			}, 
			//error
			function(sqlt, resp){
				Ext.Msg.alert("Error","An error occurred while trying to fetch the table columns");
				this.hideMask();
			},
			this);    
		
		

	},      
	
	/** Disable row deleting and editing (i.e. when table has no primary keys) */
	disableEditing : function(){  
		/*this.grid.on('beforeedit', function(e){
		 var rec = e.record;
			
		 if(rec.data[this.ADD_INDEX] !== true){    
				e.cancel = true; 
		 }   
	 	 
		}, this);     */                  
		this.disableDelete = true;   
		this.grid.getColumnModel().setHidden(0,true);
	},
	 
	//private
	_finishRefresh: function(pkeys, cols){  
		 
		var fm=Ext.form, cmData = [], storeFields = [];
		this.addRowDefaults = {};    
		
		
		//ghetto
		var pkeystr = '~' + pkeys.join('~') + '~';     
	  this.pkeyColumns = pkeys;
 	 
	
	  //first column is checkbox selection
		cmData[0] = this.deleteBox;
		storeFields[0] = {name:this.DELETE_INDEX};
		
		for(var i=0,len=cols.length; i<len; i++){
			var col = cols[i], name = col.name, rawtype = col.dataType;

			var iskey =pkeystr.indexOf('~'+name+'~') !== -1;
			
			//reduce type to the basics for editor purposes
			var cellEditor, simpleType;
			switch(rawtype){
				case 'binary':
				case 'varbinary':
				case 'image':
					simpleType='binary';
					cellEditor = null;
					break;
				case 'bigint':
				case 'int':
				case 'smallint':
				case 'tinyint':
				case 'bit':
					simpleType='int';
					cellEditor = pkeys.length === 0 ? null : new Ext.form.NumberField({
	            allowBlank: false,
					    allowDecimals:false
	        });
					break;
			  case 'numeric':
			  case 'decimal':
				case 'money':
				case 'smallmoney':
					simpleType='float';
					cellEditor = pkeys.length === 0 ? null : new Ext.form.NumberField({
	            allowBlank: false
	        });
					break;
				//unhandled types default to text fields
				default:
					simpleType = rawtype;
					cellEditor = pkeys.length === 0 ? null : new Ext.form.TextField({
	            allowBlank: false
	        });
			}
			//EXT column model definition 
			cmData[i+1] = {
				header: name + ' ' + (iskey ? '[KEY]' : '') + '['+ rawtype+']',
				sortable:true,
				id: name,   
				pkey: iskey,
				css: iskey ? this.pkeyStyle : ( simpleType === 'binary' ? this.binStyle : null), 
				dataIndex:name,
        editor: cellEditor
			};  
			
			
      
			//default value / col def for add row
			this.addRowDefaults[name] = '';
			
			
			//EXT store fields
			storeFields[i+1] = {
				name: name,
				type: 'string'
			};
		}
		
		 
    //create an empty
		var store = new Ext.data.JsonStore({
		    autoDestroy: true,
		    data: {
				   rows:[]
				},
		    root: 'rows',
		    fields: storeFields
		});
		
    //reconfigure the grid
		this.grid.reconfigure(store, new Ext.grid.ColumnModel(cmData)); 
		
		if(this.serverSidePaging){ 
			//query total table rows 
			this.sqlTable.queryTotalRows({
				pkeys: this.pkeyColumns.length > 0 ? this.pkeyColumns[0] : '*',
				where: this.where
			},     
			
			function(sqlt, resp, total){
					this.setTotalCount(total);
					this.updatePageView();
			},
			function(sqlt, resp){
				this.hideMask();
			},
			 this);
			
		}
		else{     
			this.displayMask('Querying Data...');   
			   
			//finally, load data, and update the page view  
			this.sqlTable.fetchRows({
					where: this.where,
					orderBy: this.orderBy
				},
				function(sqlt, resp){
				if(resp && resp.data){   
					 this.displayMask('Preparing Data for Display...'); 
				
					this.tableData = resp.data[0].rows; 
					this.setTotalCount(resp.data[0].count);
				   
					this.updatePageView();       
				}  
				this.hideMask(); 
			}, 
			this);
			       

		}

	 
		
	},
	
	setTotalCount : function(n){
		this.totalRows = n; 
		Ext.get('total'+this.idpfx).update(n);  
	},
	
	
	exportHtml : function(){
		var rows = this.grid.store.data.items, html='', cols=[];   
		
		html = '<table>';     
		
		var cm = this.grid.getColumnModel();   
		var numCols = cm.getColumnCount(); 
    
		html+= '<thead><tr>';
		for(var c=0; c<numCols; c++){
			if(!cm.isHidden(c)){    
				var cname = cm.getDataIndex(c);
				cols.push(cname);
				html += '<th>'+cname+'</th>';
			}
		}       
		html+= '</tr></thead><tbody>';  
		
		//entire data set
		for(var i=0, len=rows.length; i<len; i++){
			html+= '<tr>';          
			var row = rows[i];
			
			for(var c=0; c<cols.length; c++){   
				 html += '<td>'+ row.data[cols[c]] +'</td>';
			}
			
			html+='</tr>';
		}
		html += '</tbody></table>';
		
		var win = window.open('','',
		  'width=600,height=500'
		   +',menubar=0'
		   +',toolbar=1'
		   +',status=0'
		   +',scrollbars=1'
		   +',resizable=1');
		
		
		win.document.writeln('<html><head><style>');    
		win.document.writeln('table{width:100%;border-collapse:collapse;padding:0;margin:0;font-family:Arial, Helvetica, "sans serif"}');
		win.document.writeln('td,th{font-size:11px;text-align:left;border:1px solid black;}');
		win.document.writeln('</style></head><body>');     
		win.document.writeln(html); 
    win.document.writeln('</body></html>');   
		win.document.close();
		
	},
	
	exportCSV : function(){
		var rows = this.grid.store.data.items, csv='', cols=[], temp = [];   

		var cm = this.grid.getColumnModel();   
		var numCols = cm.getColumnCount();    
		
		function _csv(v){    
			v += "";
			v =  v.replace(/"/g, '"""');  
			return '"' + v + '"';	
		}
    
		//start at 1 to ignore the delete box
		for(var c=1; c<numCols; c++){        
			//only export the visible columns
			if(!cm.isHidden(c)){    
				var cname = cm.getDataIndex(c);
				cols.push(cname);  
				temp.push( _csv(cname) );
			}                          
		}                            
		csv += temp.join(',') + '\n';
		      

		//entire data set
		for(var i=0, len=rows.length; i<len; i++){
			temp = [];          
			var row = rows[i];
			
			for(var c=1; c<cols.length; c++){   
				temp.push( _csv(row.data[cols[c]]) ); 
			}
			
			csv += temp.join(',') + '\n'; 
		}

		
		var win = window.open('','',
		  'width=600,height=500'
		   +',menubar=0'
		   +',toolbar=1'
		   +',status=0'
		   +',scrollbars=1'
		   +',resizable=1');
		
		
   /*	win.document.writeln('<html><head><style>');    
		win.document.writeln('pre{padding:0;margin:0;font-family:Arial, Helvetica, "sans serif";font-size:11px;}');
		win.document.writeln('</style></head><body><pre>');       */
		win.document.writeln('<pre>' + csv + '</pre>'); 
	 /* win.document.writeln('</pre></body></html>');     */
		win.document.close();        
		
	//	Ext.Msg.alert('CSV Generated in Popup Window','Save popup window as .csv file');
	}

});
Ext.reg('va_sqltableeditor', dbrui.SqlTableEditor);           





dbrui.DeleteBox = function(config){
    Ext.apply(this, config);
    if(!this.id){
        this.id = Ext.id();
    }
    this.renderer = this.renderer.createDelegate(this);
};

dbrui.DeleteBox.prototype ={
    init : function(grid){
        this.grid = grid;
        this.grid.on('render', function(){ 
            var view = this.grid.getView(); 
            view.mainBody.on('mousedown', this.onMouseDown, this);
        }, this);
    },

    onMouseDown : function(e, t){     
        if(t.className && t.className.indexOf('x-grid3-cc-'+this.id) != -1){
            e.stopEvent();
            var index = this.grid.getView().findRowIndex(t); 
            var record = this.grid.store.getAt(index);   
            
						var tbl = Ext.get(t).findParentNode('.x-grid3-row-table',10,true);  

						tbl.addClass('dbr-deletetablerow');
            record.set(this.dataIndex, record.data[this.dataIndex] ? false : true);
        }
    },

    renderer : function(v, p, record){  
        p.css += ' x-grid3-check-col-td'; 
        return '<div class="x-grid3-check-col'+(v ?'-on':'')+' x-grid3-cc-'+this.id+'">&#160;</div>';
    }
};



