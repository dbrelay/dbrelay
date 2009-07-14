
/**  
sqlTable - Abstraction of sqlDbAccess for an sql table

*/
sqlTable = function(){

	/**  sqlTable constructor - creates a new sqlTable
		@param {String} table : name of table in db  
		 @param {sqlDbAccess} sqlDb : sqlDb object, or sqlObject connection config.
	*/
	return function(table, sqlDb){

		var _sqlTable = function() { 
			//create/set the db access object
			this.sqlDb = sqlDb.connection ? sqlDb : new sqlDbAccess(sqlDb);
			
    };

		
		_sqlTable.prototype = { 
			
			/**
				Queries columns in this table
				@param {function} optional callback function that Will be called with the following args:
						@arg {sqlTable} this
						@arg {Object} raw json response from server      
						@arg {Array} sanitized columns data array (name, required, dataType)      
						
				@param {Ojbect} scope of callback (defaults to global)
			*/
			queryColumns: function(callback, scope){                      

				this.sqlDb.run('get_columns', {table : table}, function(resp){
					if(!resp || !resp.data){return;}
				 
					var data = resp.data[0], count = data.count, rows = data.rows, columns = [];

					//sanitize column data
					for(var i=0,len=rows.length; i<len; i++){
						var col = rows[i];

					  columns[i] = {
							name: col.COLUMN_NAME,
							required: col.IS_NULLABLE === 'NO' ? false : true, 
							
							//Data type values: http://www.mssqlcity.com/Articles/General/choose_data_type.htm
							dataType: col.DATA_TYPE
						};

					}              
					
					//cache the column data
					this.tableColumns = columns;   
					
					//callback
					if(callback){
						callback.call(scope || window, this, resp, columns);     
					}

				},
				
				this);                    
				
			},     
			
			/**
				Fetches all columns for all rows.  Wrapper for fetchRows 
				@param {function} callback : optional callback function. Function will be called with the following params:  
						@cbparam : {sqlTable} this sqlTable
						@cbparam : {Object} raw JSON response from server
						
				@param {Object} scope : scope of callback function (defaults to global scope)
				 	
			*/
			fetchAll: function(callback, scope){
				 this.fetchRows(null,callback, scope);
			},
			
			/**
				Fetches columns from all rows from the table based on where conditions and server-side ordering
				@param {Object} cfg : 
						@cfg {String} columns : columns to return, defaults to * . Ex:  col1,col2 
						@cfg {String} where: WHERE clause  
						@cfg {String} orderBy: server-side ORDER BY column
						@cfg {String} orderByType: optional order by type
				
				@param {function} callback : optional callback function. Function will be called with the following params:  
						@cbparam : {sqlTable} this sqlTable
						@cbparam : {Object} raw JSON response from server
						
				@param {Object} scope : scope of callback function (defaults to global scope)
				 	
			*/
			fetchRows: function(cfg, callback, scope){
				cfg = cfg || {};
				
				this.sqlDb.run('fetch_rows',{
						table:table,
						columns: cfg.columns || '*',
						where: cfg.where ? ('WHERE ' + cfg.where) : '',
						orderBy: cfg.orderBy ? 'ORDER BY ' + cfg.orderBy : '',
						orderByType: cfg.orderBy ? (cfg.orderByType || 'asc') : ''
					},
					function(results){
						//final callback
						if(callback){
							callback.call(scope || window, this, results);
						}
					},
					this
				);  
			
			},
			
			
			/**
				EXPERIMENTAL: Fetches paged rows from the table
				@param {Object} cfg : config object with the following (* required):
					@cfg {String} columns : columns to return, defaults to * . Ex:  col1,col2 
					@cfg {int} recordStart : starting 0-based index if paging (defaults to 0)
					@cfg {int} pagingSize: paging size (defaults to 20)
					@cfg {String} where: WHERE clause  
					@cfg {String} orderBy: server-side ORDER BY column (defaults to the first column) 
					@cfg {String} orderByType: asc or desc
				
				@param {function} callback : optional callback function.  Function will be called with the following params:
						@cbparam : {sqlTable} this sqlTable
						@cbparam : {Object} raw JSON response from server
						@cbparam : {Object} original cfg param
						@cbparam : {Object} a config object that is pre-configured to be used to fetch the next set of paged rows.    
						
				@param {Object} scope : scope of callback function   

			*/
			fetchPagingRows: function(cfg, callback, scope){   
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
								cfg.orderBy = columns[0].name;
								this.fetchRows(cfg, callback, scope);
							}
						}, this);
						return;
					}
					else{
						cfg.orderBy = this.tableColumns[0].name;  
					} 
				}   

        //PAGING QUERY
				if(typeof(cfg.recordStart)!=='number' || typeof(cfg.pagingSize)!=='number'){
					alert('recordStart and pagingSize should be numeric');
					return{};
				}
			  //opposite of order type 
				var orderByTypeOpp = cfg.orderByType.toLowerCase() === 'asc' ? 'desc' : 'asc';
				 
				//run sqlDbAccess verb to fetch paged rows
			  this.sqlDb.run('fetch_paged_rows',{ 
						columns: cfg.columns,
						recordStart: cfg.recordStart,
						pagingSize: cfg.pagingSize,
						where: cfg.where ? 'WHERE ' + cfg.where : '',
						orderBy : cfg.orderBy,
						orderByType: cfg.orderByType,
						orderByTypeOpp: orderByTypeOpp,
						table: table,
						absMax : cfg.recordStart + cfg.pagingSize
					},  
				
					//sqlDbAccess callback 
					function(results){

						//final callback
						if(callback){
							callback.call(scope || window, this, results, cfg, {
								total: 0,   //total rows in query ( 0 for now)
								columns: cfg.columns,
								recordStart: cfg.recordStart + cfg.pagingSize,   
								pagingSize: cfg.pagingSize,
								where: cfg.where, 
								orderByType: cfg.orderByType, 
								orderBy: cfg.orderBy  
							});
						}   
					
					 
					},
					//sqlDbAccess callback scope 
					this      
				);    
    
			},
			 
			/** adds new rows to table
				@param {Object} values : column_key/values to add   
				
				@param {function} callback : optional callback function. Function will be called with the following params:  
						@cbparam : {sqlTable} this sqlTable
						@cbparam : {Object} raw JSON response from server

				@param {Object} scope : scope of callback function (defaults to global scope)
				
			*/
      addRows : function(rows, callback, scope) {    
				if(rows.length === 0){return;}
				var batch = 'add' + new Date().getTime();  
				 
				for(var i=0,len=rows.length; i<len; i++){
					var row = rows[i], values=[], columns=[]; 
					
					for(var k in row){ 
						values.push("'" + row[k].replace(/'/g, "\'") + "'");
						columns.push(k);
					}
					
          //add to batch 
        	 sqlDb.so.row_add({
						 table:table,
						 columns : '(' + columns.join(',') + ')', 
						 values : '(' + values.join(',') +')'
					}, batch );
        }

				//run batch 
				try{
	         sqlDb.so.run_batch(batch, function(resp){  
						  sqlDb.so.empty_batch(batch);    
					
						 if(callback){
						   callback.call(scope || window, this, resp);  
						 }
					});
				}catch(e){}
			},      
			  
			/** Deletes row(s) from the table
			@param {Array of Objects} rows : array of rows to drop, each row represented by an object with key/value pairs for the WHERE clause   (i.e. [{id='2'},{key2='3'}].
							 Each clause will be AND'd together.   
							
			
			*/
			deleteRows : function(rows, callback, scope){

				if(rows.length === 0){return;}
				
				var batch = 'delete' + new Date().getTime();  
				 
				for(var i=0,len=rows.length; i<len; i++){
					var row = rows[i], wheres=[]; 
					
					for(var k in row){ 
						wheres.push(k + "='" + row[k].replace(/'/g, "\'") + "'") 
					}
					
          //add to batch 
        	 sqlDb.so.delete_row({
						 table:table,
						 where : '(' + wheres.join(' AND ') +')'
					}, batch );
        }
        
				//run batch 
				try{
	         sqlDb.so.run_batch(batch, function(resp){  
	
						  sqlDb.so.empty_batch(batch);    
					
						 if(callback){
						   callback.call(scope || window, this, resp);  
						 }
					});
				}catch(e){}      
			},
			
			/** Batch update table rows.  This function assumes each row to be updated have the same where column(s), and that all WHERE clauses are AND'd together.
			
			@param {Array} set : array of objects of columnName:setValue pairs  ex. [{name='Fred'},{name='Ted'}]
			@param {Array} where : array of objects to use in the where clause. Should be same length as set param  ex: [{id='2'},{key2='3'}] 
			
			@param {function} callback : optional callback function. Function will be called with the following params:  
					@cbparam : {sqlTable} this sqlTable
					@cbparam : {Object} raw JSON response from server
					
			@param {Object} scope : scope of callback function (defaults to global scope)
			*/
		 	updateRows : function(set, wheres, callback, scope){
				if(set.length === 0){return;}  

				var batch = 'update' + new Date().getTime();

				for(var i=0,len=set.length; i<len; i++){
					var values = set[i], valueparam =[], whereparam=[]; 
					
					//SETVALUES
					for(var col in values){ 
						var safeVal = values[col].replace(/'/g, "\'");
						
						valueparam.push(col + "='" + safeVal + "'");   
					}  
					
					 //WHERE 
					var wherecols = wheres[i]; 

						for(var k in wherecols){ 
							whereparam.push(k + "='" + wherecols[k].replace(/'/g, "\'") + "'") 
						}  
					
          //add to batch 
        	 sqlDb.so.update_row({
						 table:table,
						 setvalues : valueparam.join(','),
						 where : whereparam.join(' AND ')
					}, batch );
        }
        
				//run batch
        try{
	 					sqlDb.so.run_batch(batch, function(resp){  
	
						  sqlDb.so.empty_batch(batch);    
					
						 if(callback){
						   callback.call(scope || window, this, resp);  
						 }
					});
				}catch(e){}    
      },

 
		 /** 
			Queries for this table's primary keys
			
			@param {function} callback : optional callback function. Function will be called with the following params:  
					@cbparam : {sqlTable} this sqlTable
					@cbparam : {Object} raw JSON response from server
					@cbparam : {Array} array of primary keys
					
			@param {Object} scope : scope of callback function (defaults to global scope)
		 */ 
			queryPrimaryKeys : function(callback, scope){
				this.sqlDb.run('get_primary_keys', {table:table}, function(resp){
					 var rows = resp.data[0].rows, keys=[];
					
					 for(var i=0; i<rows.length; i++){
						 keys[i] = rows[i].COLUMN_NAME;
					 }            
					
					//store it for later maybe
					 this.pkeyColumns = keys;
					 
					 if(callback){ 
					    callback.call(scope || window, this, resp, keys);  
					 }
				});
			},
     
  		/** 
			Queries for the total number of records in the table that meet an optional condition
			@param cfg : configuration for this query.  Options are:
					@cfg {string} pkeys : optional.  For large tables, it is recommended that the table's primary key(s) be passed in as a comma delimited string
					@cfg {String/Object} where : optional. String of column/value pairs or Object of column/value pairs to use in the where clause i.e. {color='red',size='large'}             
					
			@param {function} callback : optional callback function. Function will be called with the following params:  
					@cbparam : {sqlTable} this sqlTable
					@cbparam : {Object} raw JSON response from server
					@cbparam : {int} Total count of rows

			@param {Object} scope : scope of callback function (defaults to global scope)       
			*/
      queryTotalRows : function(cfg, callback, scope){ 
	      cfg = cfg || {};
				var where = cfg.where || {}, whereparam=[];
				
				if( typeof(where) === 'string'){
					whereparam = 'WHERE ' + where;
				}
				else{ 
					for(var w in where){  
						whereparam.push(k + "='" + where[w].replace(/'/g, "\'") + "'")     
					}
					whereparam = whereparam.length === 0 ? '' : 'WHERE ' + whereparam.join('AND')
				} 
				
	      this.sqlDb.run('get_count',{
						table:table,
						columns: cfg.pkeys || '*',
						where : whereparam
					},     
					//callback
					function(resp){  
            
						if(resp.data){       
							var total = resp.data[0].rows[0][1];
							      
							if(callback){ 
							    callback.call(scope || window, this, resp, total);  
							 }
	          }
	
						
				});
				  
			}, 
			

			                          
			/** util - copies all properties of one object to another, with optional overwrite
			@param {Object} dest : destination object that contains properties to be modified
			@param {Object} src : source object that contains properties to be copied       
			@param {bool} overwrite : true to overwrite dest properties if they already exist. 
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

		
		
		return new _sqlTable();
	}
	
}();