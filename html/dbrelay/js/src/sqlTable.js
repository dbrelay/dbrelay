
/**  
@class DbRelay.TableHelper

An API to perform SQL queries on a single table. Usage:

<pre>
/* Create a new {@link DbRelay.QueryHelper} instance for our database connection information *\/ 
var qh = new DbRelay.QueryHelper({   

	//Hostname on which the SQL server is running. 
	sql_server : '99.99.99.99.99', 

	//Optional port number, on which the SQL server is listening. 1433 is the default.
	sql_port : '',  
	//Optional name of the primary database for the connection. User's default database is used, if not specified.
	sql_database : 'mydatabase', 

	//Username string recognised by the SQL server.   
	sql_user : 'myuser',                

	//password for the sql_user.   
	sql_password : 'mypass',              

	//Optional name to persist this connection under.   
	connection_name : 'example2',  

	/*Optional number of seconds from the response to the last query before the connection will be considered idle 
	and marked for destroying. The default is 60. The silently enforced maximum connection lifespan is 28800 (8 hours). *\/   
	connection_timeout : 60,
	
	
	/*Optional parameter for xss scripting.  Leave out for same-domain scripts  *\/   
	dbrelay_host : 'http://dbrelay_host'
});	

//Create an sqlTable for the table 'people', using the above QueryHelper   
var myTable = new DbRelay.TableHelper('people', qh);
</pre>
*/

/**
@constructor
@param {string} table table name
@param {Object/DbRelay.QueryHelper} queryHelper Either the connection parameters for the db OR an instance of a DbRelay.QueryHelper
*/
DbRelay.TableHelper = function(table, queryHelper){
	this.queryHelper = queryHelper.connection ? queryHelper : new DbRelay.QueryHelper(queryHelper);
	this.table = table;
	return this;
}


DbRelay.TableHelper.prototype = {
	/**
		Queries for a list of columns in this table
		
		@param {function} success function that will be called if the query succeeds. Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
					 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			     <li><b>columns</b> : Object<div class="sub-desc">sanitized columns data array (name, required, dataType)</div></li>
			 </ul>
		 @param {function} error function that will be called if the query fails. 	Called with the following parameters:<ul class="mdetail-params">
				     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
				 </ul>
		 @param {Object} scope Optional scope for the callbacks.  Defaults to window/global
		
	*/
	queryColumns : function(callback, error, scope){
		this.queryHelper.adminQuery({cmd:'columns', param1: this.table}, function(resp){  
			  if(!resp || !resp.data){return;}

				var data = resp.data[0], count = data.count, rows = data.rows, columns = [], columnsByName = {};

				//sanitize column data
				for(var i=0,len=rows.length; i<len; i++){
					var col = rows[i];

				  columns[i] = {
						name: col.COLUMN_NAME,
						required: col.IS_NULLABLE === 'NO',
						//Data type values: http://www.mssqlcity.com/Articles/General/choose_data_type.htm
						dataType: col.DATA_TYPE,
						valueQuote: col.NUMERIC_SCALE === null ? "'" : "",
						isIdentity: col.IS_IDENTITY === 1,
						noDefault:  col.HAS_DEFAULT === 0
					};

					columnsByName[ col.COLUMN_NAME ] = columns[i];

				}              

				//cache the column data
				this.tableColumns = columns;   
				this.tableColumnsByName = columnsByName;
				
				//callback
				if(callback){
					callback.call(scope || window, this, resp, columns);     
				}
		 },
		//error
		function(resp){
			if(error){
				error.call(scope || window, this, resp);
			}
		}
		,this);
	},    
	
	/**
		Fetches all columns for all rows, no conditions or filters.
		
		@param {function} callback function that will be called if the query finishes. Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
					 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			 </ul>
				
		@param {Object} scope scope of callback function (defaults to global scope)
		 	
	*/
	fetchAll: function(callback, scope){
		 this.fetchRows(null,callback, scope);
	},
	

	/**
		Fetches all columns for all rows, no conditions or filters.
		@param {Object} cfg parameters: 
		<ul class="mdetail-params">
		     <li><b>columns</b> : String<div class="sub-desc">columns to return, defaults to * . Ex:  col1,col2 </div></li>
				<li><b>where</b> : String<div class="sub-desc">WHERE clause</div></li>
				<li><b>orderBy</b> : String<div class="sub-desc">server-side ORDER BY column</div></li>
		 </ul>

		@param {function} callback function that will be called if the query finishes. Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
					 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			 </ul>
				
		@param {Object} scope scope of callback function (defaults to global scope)
		 	
	*/
	fetchRows: function(cfg, callback, scope){
		cfg = cfg || {};
		
		this.queryHelper.run('fetch_rows',{
				table:this.table,
				columns: cfg.columns || '*',
				where: cfg.where ? ('WHERE ' + cfg.where) : '',
				orderBy: cfg.orderBy ? 'ORDER BY ' + cfg.orderBy : ''
			},
			function(qh, results){
				//final callback
				if(callback){
					callback.call(scope || window, this, results);
				}
			},
			null,
			this
		);  
	
	},
	
	
	/**
		Fetches paged rows from the table
		@param {Object} cfg config object with the following (* required):
		<ul class="mdetail-params">
		     <li><b>columns</b> : String<div class="sub-desc">columns to return, defaults to * . Ex:  col1,col2 </div></li>
		     <li><b>recordStart</b> : String<div class="sub-desc">starting 0-based index if paging (defaults to 0)</div></li>
		     <li><b>pagingSize</b> : String<div class="sub-desc">paging size (defaults to 20) </div></li>
				<li><b>where</b> : String<div class="sub-desc">WHERE clause</div></li>
				<li><b>orderBy</b> : String<div class="sub-desc">server-side ORDER BY column (defaults to the first column) </div></li>
		 </ul>

		@param {function} success function that will be called if the query succeeds. Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
					 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
					 <li><b>cfg</b> : Object<div class="sub-desc">original config params</div></li>
			 </ul>
		
		@param {function} error function that will be called if the query fails. Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
					 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
					 <li><b>cfg</b> : Object<div class="sub-desc">original config params</div></li>
			 </ul>
		@param {Object} scope optional scope of callback functions   

	*/
	fetchPagingRows: function(cfg, callback, error, scope){   
		//apply defaults to cfg parameter
		cfg = this.applyProperties(cfg || {}, {
			columns:'*',
			recordStart:0,
			pagingSize:20,
			where: ''
		});
                          

    //Query columns first to get order by if they haven't been queried yet
		if(!cfg.orderBy){
			if(!this.tableColumns){
				this.queryColumns(function(sqlt, resp, columns){
					//re-run fetchRows now that the columns have been successfully querued
					if(resp && resp.data){
						cfg.orderBy = columns[0].name + ' asc';
						this.fetchPagingRows(cfg, callback, error, scope);
					}
				}, 
				function(sqlt, err){
					if(error){
						error.call(scope || window, this, err);
					}
				},
				this);
				return;
			}
			else{
				cfg.orderBy = this.tableColumns[0].name + ' asc';  
			} 
		}   

    //PAGING QUERY
		if(typeof(cfg.recordStart)!=='number' || typeof(cfg.pagingSize)!=='number'){
			alert('recordStart and pagingSize should be numeric');
			return{};
		}

		//run sqlDbAccess verb to fetch paged rows
		
	  this.queryHelper.run('fetch_paged_rows',{ 
				columns: cfg.columns,
				where: cfg.where ? 'WHERE ' + cfg.where : '',
				orderBy : cfg.orderBy,
				table: this.table,        
				minRow: cfg.recordStart + '',
				maxRow : cfg.recordStart + cfg.pagingSize
			},  
		
			//sqlDbAccess callback 
			function(qh, results){
				//final callback
				if(callback){
					callback.call(scope || window, this, results, cfg);
				}   
			
			 
			},
			//error callback 
			function(qh, results){
				//final callback
				if(error){
					error.call(scope || window, this, results, cfg);
				}   
			
			 
			},
			//sqlDbAccess callback scope 
			this      
		);    

	},
	 
	/** adds new rows to table
		@param {Object} rows column_key/values to add   
		@param {function} callback function that will be called if the query finishes. Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
					 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			 </ul>
		@param {Object} scope : scope of callback function (defaults to global scope)
		
	*/
  addRows : function(rows, callback, scope) {    
		var batch = this.setAddRowsBatch(rows);    
		if(!batch){return;}

		//run batch 
		this.queryHelper.commitBatchTransaction( batch , function(qh, resp){
				//empty batch when done
			 qh.emptyBatch(batch);                
			 	if(callback){
				   callback.call(scope || window, this, resp);  
				 }
		}, this);
	},   
	
	//private
	setAddRowsBatch : function(rows) {    
		if(rows.length === 0){return false;}
		var batch = 'add' + new Date().getTime();  
		 
		for(var i=0,len=rows.length; i<len; i++){
			var row = rows[i], values=[], columns=[]; 
			
			for(var k in row){
			  if (row.hasOwnProperty(k)) {
			    if (! this.tableColumnsByName[k].isIdentity) {
			      // The following condition skips a field, if it has empty value, but the is a default.
			      // It makes it impossible to set a character field to an empty string in a new row.
			      // As a workaround, edit the field in an update afterwards.
			      if (row[k] || this.tableColumnsByName[k].noDefault) {
              var quote = this.tableColumnsByName[k].valueQuote;
              // The following condition deals with empty numeric (supposingly) fields and sets then to NULL if the value is empty.
              if (quote || row[k]) {
                values.push( quote + (row[k]+'').replace(/'/g, "''") + quote );
              } else {
                values.push( "NULL" );
              };
              columns.push(k);
			      };
			    };
			  };
			}
			
      //add to batch 
    	 this.queryHelper.addToBatch('row_add',{
				 table:this.table,
				 columns : '(' + columns.join(',') + ')', 
				 values : '(' + values.join(',') +')'
			}, batch );
    }

		return batch;
	},
	
	/**   SQL'ify a string value
	
	@param {string} s string to make safe
	@return {string} string with all single quotes replaced with '' AND also wrapped in single quotes (ex. 'Chicago''s'
	*/
	safeSqlString : function(s, f){
	  var col = this.tableColumnsByName[f];
		var quote = col ? "'" : col.valueQuote;
		return quote + (s+'').replace(/'/g, "''") + quote;
	},      
	  
	/** Deletes row(s) from the table
	@param {Array of Objects} rows array of rows to drop, each row represented by an object with key/value pairs for the WHERE clause   (i.e. [{id='2'},{key2='3'}].
					 Each clause will be AND'd together.   

	@param {function} callback function that will be called if the query finishes. Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>

	@param {Object} scope scope of callback function (defaults to global scope)
	*/
	deleteRows : function(rows, callback, scope){
    var batch = this.setDeleteRowsBatch(rows);    
		if(!batch){return;}     
		
		//run batch 
		this.queryHelper.commitBatchTransaction( batch , function(qh, resp){
				//empty batch when done
			 qh.emptyBatch(batch);                
			 	if(callback){
				   callback.call(scope || window, this, resp);  
				 }
		}, this);     
	},   
	
	//private
	setDeleteRowsBatch : function(rows){
		if(rows.length === 0){return false;}
		
		var batch = 'delete' + new Date().getTime();  
		 
		for(var i=0,len=rows.length; i<len; i++){
			var row = rows[i], wheres=[]; 
			
			for(var k in row){ 
				wheres.push(k + "=" + this.safeSqlString(row[k], k) )
			}
			
      //add to batch 
    	 this.queryHelper.addToBatch('delete_row',{
				 table:this.table,
				 where : '(' + wheres.join(' AND ') +')'
			}, batch );
    }
    
		return batch;   
	},
	
	/** 
	Batch update table rows.  This function assumes each row to be updated have the same where column(s), and that all WHERE clauses are AND'd together.
	
	@param {Array} set array of objects of columnName:setValue pairs  ex. [{name='Fred'},{name='Ted'}] or array of strings, where string is sql where clause['name LIKE \'%co%\''].  Array can contain mixed objects & strings.
	@param {Array} wheres array of objects to use in the where clause. Should be same length as set param  ex: [{id='2'},{key2='3'}] 
	
	@param {function} callback function that will be called if the query finishes. Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>
			
	@param {Object} scope scope of callback function (defaults to global scope)
	*/
 	updateRows : function(set, wheres, callback, scope){
		var batch = this.setUpdateRowsBatch(set, wheres);    
		if(!batch){return;}
		
		this.queryHelper.commitBatchTransaction( batch , function(qh, resp){
				//empty batch when done
			 qh.emptyBatch(batch);                 
			 	if(callback){
				   callback.call(scope || window, this, resp);  
				 }
		}, this);       
		
  },  
  
	//private - Created solely for commit transaction.
	setUpdateRowsBatch : function(set, wheres){       
		if(set.length === 0){return false;}  

		var batch = 'update' + new Date().getTime();

		for(var i=0,len=set.length; i<len; i++){
			var values = set[i], valueparam =[], where=''; 
			
			//SETVALUES
			for(var col in values){
			   if (! this.tableColumnsByName[col].isIdentity) {
			     if (this.tableColumnsByName[col].valueQuote === "'" || values[col]) {
			       valueparam.push(col + "=" + this.safeSqlString(values[col], col));
			     } else {
			       valueparam.push(col + "=NULL");
			     };
  			};
			}  
			
			 //WHERE 
			var wherecols = wheres[i]; 
       if(typeof(wherecols) === 'string'){
					where = wherecols;
				}
				else{ 
					var whereparam=[];
					for(var k in wherecols){ 
						whereparam.push(k + "=" + this.safeSqlString(wherecols[k], k) );
					}
					where = whereparam.join(' AND '); 
				} 
			
      //use the batch functionality to compile the queries
    	 this.queryHelper.addToBatch('update_row', {
				 table:this.table,
				 setvalues : valueparam.join(','),
				 where : where
			}, batch ); 
			
			
    } 

		return batch;  
	},
	


 /** 
	Queries for this table's primary keys
	
	@param {function} success callback function that will be called if the query succeeds. Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
				 <li><b>keys</b> : Array<div class="sub-desc">Array of primary key column names</div></li>
		 </ul>

	@param {function} error optional callback function if the query fails. Function will be called with the following params: 
	<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>
			
	@param {Object} scope : scope of callback function (defaults to global scope)
 */ 

	queryPrimaryKeys : function(callback, error, scope){
		this.queryHelper.adminQuery({cmd:'pkey', param1: this.table}, function(resp){  
			  var rows = resp.data[0].rows, keys=[];

				 for(var i=0; i<rows.length; i++){
					 keys[i] = rows[i].COLUMN_NAME;
				 }            

				//store it for later maybe
				 this.pkeyColumns = keys;
			
			 	if (callback) {
      		callback.call(scope || window, this, resp, keys);
      	}
		 }, 
		//error
		function(resp){
			if(error){
				error.call(scope || window, this, resp);
			}
		},
		this);
	},
	

	/** 
	Queries for the total number of records in the table that meet an optional condition
	@param cfg : configuration for this query.  Options are:
			@cfg {string} pkeys : 
			@cfg {String/Object} where : 
			          
	@param {Object} cfg Configuration options for this query.  Options are:
	<ul class="mdetail-params">
		     <li><b>pkeys</b> : {String}<div class="sub-desc">optional.  For large tables, it is recommended that the table's primary key(s) be passed in as a comma delimited string</div></li>
				 <li><b>where</b> : Object<div class="sub-desc">optional. String of column/value pairs or Object of column/value pairs to use in the where clause i.e. {color='red',size='large'}</div></li>
		 </ul>
							
	@param {function} success callback function that will be called if the query succeeds. Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
				 <li><b>keys</b> : Integer<div class="sub-desc">Total count of rows</div></li>
		 </ul>
				
	@param {function} error optional callback function if the query fails. Function will be called with the following params: 
	<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.TableHelper}<div class="sub-desc">the DbRelay.TableHelper object</div></li>
				 <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>

	@param {Object} scope scope of callback function (defaults to global scope)       
	*/
  queryTotalRows : function(cfg, callback, error, scope){ 
    cfg = cfg || {};
		var where = cfg.where || {}, whereparam=[];
		
		if( typeof(where) === 'string'){
			whereparam = 'WHERE ' + where;
		}
		else{ 
			for(var w in where){  
				whereparam.push(k + "=" + this.safeSqlString( where[w], w));
			}
			whereparam = whereparam.length === 0 ? '' : 'WHERE ' + whereparam.join('AND')
		} 
		
    this.queryHelper.run('get_count',{
				table:this.table,
				columns: cfg.pkeys || '*',
				where : whereparam
			},     
			//success callback
			function(qh, resp){  
				var total = resp.data[0].rows[0][1];
			      
				if(callback){ 
				    callback.call(scope || window, this, resp, total);  
				 }

		},
		function(qh, resp){
			if(error){ 
			    error.call(scope || window, this, resp);  
			 }
		},
		this);
		  
	}, 
	
	/** Get the {@link DbRelay.QueryHelper} for this TableHelper.
	@return {DbRelay.QueryHelper} The query helper object that belongs to this TableHelper.
	*/
	getQueryHelper : function(){
		return this.queryHelper;
	},

	                          
	/** util - copies all properties of one object to another, one level deep with optional overwrite
	@param {Object} dest destination object that contains properties to be modified
	@param {Object} src source object that contains properties to be copied       
	@param {bool} overwrite true to overwrite dest properties if they already exist. 
	*/
	applyProperties : function(dest, src, overwrite){
		dest = dest || {};
		for (var p in src){
			if(overwrite || !dest[p]){
				dest[p] = src[p];
			}
		}
		return dest;
	}
};


/** @ignore
 - legacy
*/
sqlTable = function(table, queryHelper){
	return new DbRelay.TableHelper(table, queryHelper);
}