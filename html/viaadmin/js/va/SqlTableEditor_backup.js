/**

  Config options (*required):
		tableName*  :  {string} table name to bind this editor to
		sqlDb*      :  {sqlDbAccess} sqlDb instance to use
*/

Ext.namespace('va');

va.SqlTableEditor = Ext.extend(Ext.grid.EditorGridPanel,{
  cls:'va-sqltableeditor',
	clicksToEdit: 1,
	iconCls:'vaicon-table',
	viewConfig:{
		forceFit:true,
		autoFill:true
	},

	/** {sqlTable} sqlTable object, created by the editor */
  sqlTable: null,            
	//primary key columns
	pkeyColumns:[], 
	pkeyStyle:'color:#00761c;font-weight:bold;',    
	
	DELETE_INDEX: 'va-deletebox',  
	ADD_INDEX: 'va-newrow',
	

	/** paging */
	pageSize: 50, 
	pageNumber:1,
	totalPages:1,    
	
	selectWhere:'',
	orderBy:'',
	orderByType:'asc',
	
	//EXPERIMENTAL - true to page on server side
	serverSidePaging:true,

	initComponent : function(){
	 var idpfx = Ext.id(); //ensure unique ids   
	  
		//this.sm = new Ext.grid.CheckboxSelectionModel();
		 this.deleteBox = new va.DeleteBox({
			   header: 'Del',
			   id: 'check', 
				 dataIndex: this.DELETE_INDEX,
			   width: 25,
				 resizable:false
			});
			
		//blank for now, these will change based on db queries
		this.cm = new Ext.grid.ColumnModel([this.deleteBox]);
		this.store = new Ext.data.Store();
		    
	  this.title = this.title || 'TABLE: ' +this.tableName;  
  
		
	  this.plugins = [this.deleteBox];
		
		this.tbar =[  
			//Refresh
			{
        xtype:'button',
        text: 'Refresh',
        iconCls:'vaicon-refresh',
				handler:this.refresh,
				scope:this     
      },
			'-',  
			'<b>Rows:</b>',
			//Update Rows
			{
        xtype:'button',
        text: 'Commit', 
				toolitp:'Commit all changes (adds, deletes, edits) to table in database',
        iconCls:'vaicon-disk',
				handler: this.updateSelectedRows,
				scope:this    
      },
			//Add Row
			{
			  text:'Add',
				iconCls:'vaicon-plus',
				handler:function(){
					// access the Record constructor through the grid's store
          var Row = this.store.recordType; 
          var newRec = new Row(Ext.apply({},this.addRowDefaults));               
					newRec.set(this.ADD_INDEX, true);
					
          this.stopEditing();    
					//insert as first row
          this.store.insert(0, newRec);
          this.startEditing(0, 1);   
					
				},
				scope:this
			},   
			'-', 
      '<span id="total'+idpfx+'"></span> rows total',               
			'->',
			'Show',
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
			'Rows',
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
					this.showPage(this.totalPages); 
				},
				scope:this
			}
			
		];
		
		
		va.SqlTableEditor.superclass.initComponent.call(this);
	  
		this.on('render',function(p){                                                                                                                                           
	 		this.pageNumberField = Ext.getCmp('page'+idpfx);
			this.pageSizeField = Ext.getCmp('pagesize'+idpfx);     
			
			//get columns & data 
			this.refresh();
		},this,{single:true});    
		
		
		 
	  //create sqlTable
	  this.sqlTable = sqlTable(this.tableName, this.sqlDb);  
	  
 
		
		//save postfix, to be accessed externally later if needed
		this.idpfx = idpfx;   
	 
	},  
	
	
	/**
	 Run SQL to add/delete/update all modified rows from table.  
	
	 1. Run delete
	 2. Run update
	*/
	updateSelectedRows: function(){
		var recs = this.store.getModifiedRecords();  

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
			if(rec.data[this.DELETE_INDEX] === true){ 
				               
				if(rec.data[this.ADD_INDEX] === true){
					this.store.remove(rec); 
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
	
	 //delete first.  run update on callback
		if(deleteRows.length > 0){
			this.sqlTable.deleteRows(deleteRows, function(sqlt, resp){
			  if(resp.data){
				 	//delete from UI, don't refresh
					for(var i=0;i<removedRecs.length;i++){
				   this.store.remove(removedRecs[i]);
					} 
					
				}
					
					
			},this);
	  }
	
		//next run add
		if(addRows.length > 0){
		  this.sqlTable.addRows(addRows, function(sqlt, resp){     
				if(resp.data){
					for(var i=0;i<addedRecs.length;i++){
				  	addedRecs[i].commit();
					}    
				}    
			}, this);
	  }
	
		//run update last
		if(updateRows.length > 0){ 
			 this.sqlTable.updateRows(updateRows, updateWhereRows, function(sqlt, resp){
				  if(resp.data){    
						for(var i=0;i<updatedRecs.length;i++){
					  	updatedRecs[i].commit();
						}     
						

					}

				},this);      
				
				
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
		
		 
		var start =  (pageNumber-1) * pageSize;
	  
		if(this.serverSidePaging){ 
			this.displayMask('Fetching Data...');      


			this.sqlTable.fetchPagingRows({
					pagingSize: this.pageSize,
					recordStart: this.pageSize*(pageNumber-1)
				}, 
				//calback
				function(sqlt, resp, ocfg, ncfg){

				this.tableData = resp.data[0].rows;

				//load data into grid
				this.store.loadData({'rows':this.tableData});  
				 
				this.hideMask();     
			},this);
			
			
			
		}
		else{
			this.store.loadData({'rows':this.tableData.slice(start , start+pageSize )}); 
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
		
		
		//query for columns.  When results are ready, populate the column model for the grid
		this.sqlTable.queryColumns(function(sqlt, resp, cols){ 
			      
			  this.displayMask('Querying primary keys...');  
			
				//query primary keys
				this.sqlTable.queryPrimaryKeys(function(sqlt, resp2, keys){
					
					this._finishRefresh(keys, cols);               
					
				}, this);  
			
			}, this);    
		
		

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
			var col = cols[i], name = col.name;
			var iskey =pkeystr.indexOf('~'+name+'~') !== -1;
			
			//EXT column model definition 
			cmData[i+1] = {
				header: name + (iskey ? ' [KEY]' : ''),
				sortable:true,
				id: name,   
				pkey: iskey,
				css: iskey ? this.pkeyStyle : null, 
				dataIndex:name,
        editor: new Ext.form.TextField({
            allowBlank: false
        }) 
			};  
      
			//default value / col def for add row
			this.addRowDefaults[name] = '';
			
			
			//EXT store fields
			storeFields[i+1] = {
				name: name,
				type: 'string'
			}
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
		this.reconfigure(store, new Ext.grid.ColumnModel(cmData)); 
		
		if(this.serverSidePaging){ 
			//query total table rows 
			this.sqlTable.queryTotalRows({
				pkeys: this.pkeyColumns.join(',')
			},     
			
			function(sqlt, resp, total){
				if(resp.data){  
					this.setTotalCount(total);
					this.updatePageView();
				}
				
			}, this);
			
		}
		else{     
			this.displayMask('Querying Data...');   
			   
			//finally, load data, and update the page view
		  this.sqlTable.fetchAll(function(sqlt, resp){
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
	}

});
Ext.reg('va_sqltableeditor', va.SqlTableEditor);           





va.DeleteBox = function(config){
    Ext.apply(this, config);
    if(!this.id){
        this.id = Ext.id();
    }
    this.renderer = this.renderer.createDelegate(this);
};

va.DeleteBox.prototype ={
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
						console.dir(tbl);
						tbl.addClass('va-deletetablerow');
            record.set(this.dataIndex, record.data[this.dataIndex] ? false : true);
        }
    },

    renderer : function(v, p, record){  
        p.css += ' x-grid3-check-col-td'; 
        return '<div class="x-grid3-check-col'+(v ?'-on':'')+' x-grid3-cc-'+this.id+'">&#160;</div>';
    }
};

