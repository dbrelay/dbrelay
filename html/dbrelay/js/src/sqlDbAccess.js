/**
    Abstraction of sqlObject.  
*/

sqlDbAccess = function(){
	
	
	return function(connection){
		var _log = [];
		
		var _sqlDbAccess = function(){
			var cn = connection.connection_name;
			connection.connection_name = (cn && cn !== '') ? cn : '';   
			connection.flags = connection.flags || '';


			//Create the sqlObject
			this.so =sqlObject( connection , {
				list_databases:[
					"USE MASTER;SELECT NAME FROM sys.sysdatabases ORDER BY NAME ASC",
					this._onVerb
				],
				
				/* Db actions */
				create_table :[
					"create table {{{table}}} {{{columns}}}",
					this._onVerb
				],
				
				drop_table : [
					"drop table {{{table}}}",
					this._onVerb
				],
				
				commit_transaction : [
						"BEGIN TRANSACTION "
						+"BEGIN TRY "
						+" {{{statements}}} "
						+"    COMMIT TRANSACTION "
						+"END TRY "
						+"BEGIN CATCH "
						+"   ROLLBACK TRANSACTION "
						+"END CATCH", 
					this._onVerb
				],  
				
				get_rowcounts:[
					"SELECT t.name, sum(p.rows) as [rows] "
						+"FROM   sys.tables t "
						+"JOIN   sys.indexes i "
						+"ON     t.object_id = i.object_id "
						+"JOIN   sys.partitions p "
						+"ON     i.object_id = p.object_id "
						+"AND    i.index_id = p.index_id "
						+"WHERE  i.index_id in (0,1) "
						+"group by t.name "
						+"ORDER BY SUM(P.ROWS) DESC",
						this._onVerb
				],  
				
				get_columncounts:[
					"SELECT TABLE_NAME, COUNT(COLUMN_NAME) as 'columns' FROM INFORMATION_SCHEMA.COLUMNS GROUP BY TABLE_NAME ",
					this._onVerb
				],
				
				/* generic Table specific actions */
				
				
			  fetch_all_rows: [
		       "select * from {{{table}}}",
		       this._onVerb
				],   
				
				fetch_rows: [
		       "select {{{columns}}} from {{{table}}}\n {{{where}}} \n{{{orderBy}}}",
		       this._onVerb
				],
				
				
				get_count:[
					"SELECT COUNT({{{columns}}}) FROM {{{table}}} \n{{{where}}}",
					this._onVerb
				],

				row_add: [
				  "INSERT INTO {{{table}}} {{{columns}}} VALUES {{{values}}}",
					this._onVerb
				],     
				
				delete_row: [
					"DELETE FROM {{{table}}} WHERE \n{{{where}}}",
					this._onVerb  
				],
				
				fetch_paged_rows: [             
					"select * from ("
					+" Select ROW_NUMBER () OVER(Order By \n{{{orderBy}}}) \nas dbrelayRowNum, *"
					+"  From (SELECT * FROM {{{table}}} \n{{{where}}}) \ndbrelayInnerp1"
					+" ) dbrelayInnerp2"
					+" WHERE dbrelayRowNum BETWEEN {{{minRow}}} and {{{maxRow}}}",
					this._onVerb
				],
				
			 	update_row :[
					 "UPDATE {{{table}}} SET {{{setvalues}}} WHERE \n{{{where}}}",
					 this._onVerb
				]
				
			});

		
		}
		
		
		_sqlDbAccess.prototype = {             
			/** {Object string=>mixed} connection config object for sqlObject */
			connection: connection,
			
			/**
			 function wrapper for raw verb calls    
			
			 @param {string} verb: sqlObject verb to call
			 @param {Object} cfg : name/value pairs for template vars
			 @param {function} callback: optional sqlObject callback function, will override default callback
			  	 @cbparam {sqlDbAccess} this
					 @cbparam {Object} raw json response from server  
					 @cbparam {bool} true if call succeeded w/o errors.
			 @param {Object} scope: scope of callback (defaults to global)
	 
			*/
			run : function(verb, cfg, success, error, scope){
				if(!this.so[verb]){
				  alert('"'+verb+'" is not a valid action.'); 
					return;
				}
				
				this.so[verb].call(window, cfg || {}, function(results){
					if(results.data){
						//call success with defined scope
						if(success){                          
							success.call(scope || window, results);
						}
						_log.push('<p style="color:blue">'+results.log.sql + '</p>');
					}
					else{
						//call error with defined scope
						if(error){                          
							error.call(scope || window, results, results.log.error );
						}
						_log.push('<p style="color:red">FAIL: ('+ (results.log.error || 'Unknown Reason') +')' + results.log.sql + '</p>');  
					}
					
				});
			},
			
			
			getLog : function(){   
				return _log;
				//return _log.join('<hr/>');
			}, 
			
			clearLog : function(){
				_log = [];
			},
			    
			/** Retrieve list of databases */
			getDatabases :function(success, error, scope){
				this.run('list_databases', {}, 
				//success
				function(resp){
					//should be 2 sets of data, one for use master & other for actual data
					if(resp.data.length === 2){
						var dbs = [], rows = resp.data[1].rows;
						
						for(var i=0,len=rows.length; i<len; i++){
							dbs.push(rows[i].NAME);
						}
						//console.dir(dbs);
						if (success) {
		        	success.call(scope || window, this, dbs);
		        }
					}
					else{
						if (error) {
		        	error.call(scope || window, this, resp, "sqlDbAccess.getDatabases > Data was missing");
		        }
					}
					
	        
				},
				//error
				function(resp, err){
					if (error) {
	        	error.call(scope || window, this, resp, err);
	        }
				},
				scope);
			},
			/**
				Tests the db connection by running a rows count on all tables
				@param {function} callback :  callback function.
						@cbparam {sqlDbAccess} this
						@cbparam {bool} true if succeeded, false if failed    
						
				@param {Object} scope of callback
			*/ 
			testConnection : function(callback, scope){      
				this.executeSql('select 1 as one',[],
				 function(){
				 	if(callback){
					    callback.call(scope || window, this, true);  
					 }
				 },
					//error
         function(dba, resp){ 
						 if(callback){
						    callback.call(scope || window, this, false);  
						 } 
				}, this);
			},      
			
			/**
			Sets a value for a flag.  Current flags are:
			  pp  - pretty print json
			  echosql - echo SQL 
			
			@param flag {string} flag name
			@param on {bool} true to turn it on, false to turn it off
			*/
			setFlag : function( flag, on ){
				var flags = this.connection.flags + ',', isInFlags = flags.indexOf(flag + ',') !== -1;
				
				if(on){ 
					//not in flags, and want to turn it on 
					if(!isInFlags){    
						this.connection.flags +=  ',' + flag;
					}
				} 
				
				//turn off       
				else{     
					if(isInFlags){                 
						this.connection.flags = flags.replace( flag + ',' ,'');
					}
				}

			},
			
			setDbrelayHost: function(dbrhost){
				this.connection.dbrelay_host = dbrhost;
			},
			/**
				Executes arbitrary sql code
				@param {string} sql : code to execute
				@param {array} flags : additional one-time flags to append to existing flags (optional)
				@param {function} callback : optional callback function.
						@cbparam {sqlDbAccess} this
						@cbparam {Object} raw json response from server
				@param {Object} scope of callback
			*/
			executeSql: function(sql, flags, success, error, scope, queryTag){
					var params = {};
					//create copy of connection obj
					for(var x in this.connection){
						params[x] = this.connection[x];
					}
					
					if(flags){
							params.flags = params.flags || '';
							
						for(var i=0;i<flags.length;i++){
							params.flags += ',' + flags[i];
						}
					}

			  	dbrelayQuery( params, sql, function(resp){ 
						if(resp.data){
							_log.push('<p style="color:blue">'+resp.log.sql + '</p>');
							if (success) {
			        	success.call(scope || window, this, resp);
			        }
						}
						else{
							_log.push('<p style="color:red">FAIL: ('+ (resp.log.error || 'Unknown Reason') +')' + resp.log.sql + '</p>');   
							if (error) {
			        	error.call(scope || window, this, resp, resp.log.error);
			        }
						}
						
		             
	      },queryTag);
			},   
			
			/**
			Wrapper for commitTransaction, except with a batch name 
			*/
			commitBatchTransaction : function(batch, callback, scope){
				this.commitTransaction( this.getBatch(batch), callback, scope );
			},  
			
			
			getBatch : function(batch){
				return this.so.get_batch(batch);
			},     
			
			emptyBatch : function(batch){
				this.so.empty_batch(batch);
			},
			  
			/**  Commit a batch transaction, rolling back on any errors
			@param {string} statements : statements to run
			
			@param {function} callback : optional callback function.
					@cbparam {sqlDbAccess} this
					@cbparam {Object} raw json response from server
			@param {Object} scope of callback
			*/
			commitTransaction : function(statements, callback, scope){  

        this.run('commit_transaction',{statements: statements}, function(resp){  
	
						 if(callback){
						   callback.call(scope || window, this, resp);  
						 }
				 },null,  this);
				
			},    
		 
		/** Query for all tables and number of rows
		   
		@param {function} callback : optional success callback function.
				@cbparam {sqlDbAccess} this
				@cbparam {Object} raw json response from server 
				@cbparam {Object} object of key/value pairs (table => number of rows)   
	 @param {function} errorfn : optional error callback function
			@cbparam {sqlDbAccess} this
			@cbparam {Object} raw json response from server      
		@param {Object} scope of callback
		*/        
		 getAllRowCounts : function(callback, errorfn, scope){  
				this.run('get_rowcounts',{}, function(resp){  
					if(resp.data){
						var rows = resp.data[0].rows, countObj = {};  
						
						for(var i=0; i<rows.length; i++){  
							var row = rows[i];
							
						 	countObj[row.name] = row.rows;
					 	}
						
					 	if(callback){
					   	callback.call(scope || window, this, resp, countObj );  
					 	}
				  }
					else{
						if(errorfn){
						   errorfn.call(scope || window, this, resp);  
						 }
					}
				 }, null, this);
			
		 },    
		                                                     
		/** Query for all tables and number of cells (rows * columns)   
		@param {function} callback : optional success callback function.
				@cbparam {sqlDbAccess} this
				@cbparam {Object} raw json response from server 
				@cbparam {Object} object of key/value pairs (table => number of cells)   
	 @param {function} errorfn : optional error callback function
			@cbparam {sqlDbAccess} this
			@cbparam {Object} raw json response from server      
		@param {Object} scope of callback
		*/
		 getAllCellCounts : function(callback, errorfn, scope){   
			//first get row counts     
			this.getAllRowCounts(
				//success
				function(sqld, resp, rowcounts){     
					  //get column counts
						this.run('get_columncounts',{}, function(colresp){  
							if(resp.data){
								var rows = colresp.data[0].rows, cellCounts = {};  

								for(var i=0; i<rows.length; i++){  
									var row = rows[i];

								 	cellCounts[row.TABLE_NAME] = rowcounts[row.TABLE_NAME] * row.columns;
							 	}
                //final success
							 	if(callback){
							   	callback.call(scope || window, this, resp, cellCounts );  
							 	}
						  }
							else{
								if(errorfn){
								   errorfn.call(scope || window, this, resp);  
								 }
							}
						 }, null, this);
				},                    
				
				//error
				function(sqld, resp){
					if(errorfn){
					   errorfn.call(scope || window, this, resp);  
					 }
				},
				this);
		 },
		/**
		Executes an admin query (i.e. list tables)
		@param params {Object} object of additional parameters from the connection info
		*/ 
			adminQuery : function(params, success, error, scope){   
				//copy connection info into params
				for(var k in this.connection){
					if(k !== 'dbrelay_host' && k!=='sql'){
						params[k] = this.connection[k];       
					}
				}
				
				//xss consideration
				var dbrhost = this.connection.dbrelay_host;
				
				if(dbrhost){           
					jQuery.getJSON( dbrhost + '/sql?js_callback=?', params , function(data){
							if (success) {
		        		success.call(scope || window, data);
		        	}
					});   
				} 
				else{
					$.post( '/sql', params, function(data){
							if (success) {
		        		success.call(scope || window, data);
		        	}
					}, "json" );    
				}
			},
		 
			/**
				Queries for a list of tables in this database.
				
				@param {function} callback : optional callback function.
						@cbparam {sqlDbAccess} this
						@cbparam {Object} raw json response from server 
						@cbparam {Array} array of table names
						
				@param {Object} scope of callback
			*/ 
			getTables : function(callback, scope){
				 this.adminQuery({cmd:'tables'}, function(resp){  
					  var rows = resp.data[0].rows, tableNames =[]; 

					 	for(var i=0; i<rows.length; i++){
						 	tableNames[i] = rows[i].TABLE_NAME;
					 	}
					
					 	if (callback) {
	        		callback.call(scope || window, this, resp, tableNames);
	        	}
				 }, this);

			},
			

			/**
				Creates a new table on this database
				
				@param {String} table : name of table to create
				@param {string} columns : raw column string definition
				@param {function} callback : optional callback function.
						@cbparam {sqlDbAccess} this
						@cbparam {Object} raw json response from server 
						@cbparam {Array} array of table names
						
				@param {Object} scope of callback
			*/ 
			createTable: function(table, columns, callback, scope){
				 this.run('create_table',{
						table:table,
						columns:'('+columns+')'
					},
					function(resp){
				 		if(callback){
							callback.call(scope || window, resp);
						}
				},null, this);
			},
			
	 /**
	 		Drops a table from the database
			
			@param {String} table : name of table to drop
			@param {function} callback : optional callback function.
					@cbparam {sqlDbAccess} this
					@cbparam {Object} raw json response from server 
					@cbparam {Array} array of table names
					
			@param {Object} scope of callback
		*/ 
			dropTable: function(table, callback, scope){
				 this.run('drop_table',{table:table},callback, null,scope);
			},
			
			
			
			/* private - default verb handler */
			_onVerb : function(results){
				
				
			}
			
			
			
			
			
			
		}
		
		
		return new _sqlDbAccess();
	}
	
}();









