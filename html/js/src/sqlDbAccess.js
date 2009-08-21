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
				
				/* Db actions */
				create_table :[
					"create table {{{table}}} {{{columns}}}",
					this._onVerb
				],
				
				drop_table : [
					"drop table {{{table}}}",
					this._onVerb
				],
				
				/* generic Table specific actions */
				
				
			  fetch_all_rows: [
		       "select * from {{{table}}}",
		       this._onVerb
				],   
				
				fetch_rows: [
		       "select {{{columns}}} from {{{table}}} {{{where}}} {{{orderBy}}}",
		       this._onVerb
				],
				
				get_columns:[     
					"SELECT COLUMN_NAME,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{{{table}}}'",
	      	this._onVerb
				], 
				
				get_count:[
					"SELECT COUNT({{{columns}}}) FROM {{{table}}} {{{where}}}",
					this._onVerb
				],


				row_add: [
				  "INSERT INTO {{{table}}} {{{columns}}} VALUES {{{values}}}",
					this._onVerb
				],     
				
				delete_row: [
					"DELETE FROM {{{table}}} WHERE {{{where}}}",
					this._onVerb  
				],
				
				fetch_paged_rows: [             
					"select * from ("
					+" Select ROW_NUMBER () OVER(Order By {{{orderBy}}}) as dbrelayRowNum, *"
					+"  From (SELECT * FROM {{{table}}} {{{where}}}) dbrelayInnerp1"
					+" ) dbrelayInnerp2"
					+" WHERE dbrelayRowNum BETWEEN {{{minRow}}} and {{{maxRow}}}",
					this._onVerb
				],
				
				get_primary_keys :[
					"select 	c.COLUMN_NAME " 
						+"from 	INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk , "
						+"INFORMATION_SCHEMA.KEY_COLUMN_USAGE c "
						+"where pk.TABLE_NAME = '{{{table}}}' "
						+"and	CONSTRAINT_TYPE = 'PRIMARY KEY' "
						+"and	c.TABLE_NAME = pk.TABLE_NAME "
						+"and	c.CONSTRAINT_NAME = pk.CONSTRAINT_NAME",
						this._onVerb   
			 	],
			
			 	update_row :[
					 "UPDATE {{{table}}} SET {{{setvalues}}} WHERE {{{where}}}",
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
			run : function(verb, cfg, callback, scope){
				if(!this.so[verb]){
				  alert('"'+verb+'" is not a valid action.'); 
					return;
				}
				
				this.so[verb].call(window, cfg || {}, function(results){
					if(results.data){
						_log.push('<p style="color:blue">'+results.log.sql + '</p>');
					}
					else{
						_log.push('<p style="color:red">FAIL: ('+ (results.log.error || 'Unknown Reason') +')' + results.log.sql + '</p>');   
					}
					//call callback with defined scope
					if(callback){
						callback.call(scope || window, results);
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
			    
			/**
				Tests the db connection
				@param {function} callback :  callback function.
						@cbparam {sqlDbAccess} this
						@cbparam {bool} true if succeeded, false if failed    
						
				@param {Object} scope of callback
			*/ 
			testConnection : function(callback, scope){ 
				this.getTables(function(resp){

					 if(callback){
					    callback.call(scope || window, this, resp.data ? true : false);  
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
				var flags = this.connection.flags + ';', isInFlags = flags.indexOf(flag + ';') !== -1;
				
				if(on){ 
					//not in flags, and want to turn it on 
					if(!isInFlags){    
						this.connection.flags +=  ';' + flag;
					}
				} 
				
				//turn off       
				else{     
					if(isInFlags){                 
						this.connection.flags = flags.replace( flag + ';' ,'');
					}
				}

			},
			
			
			/**
				Executes arbitrary sql code
				@param {string} sql : code to execute
				@param {function} callback : optional callback function.
						@cbparam {sqlDbAccess} this
						@cbparam {Object} raw json response from server
				@param {Object} scope of callback
			*/
			executeSql: function(sql, callback, scope){
			  	dbrelayQuery( this.connection, sql, function(resp){
		        if (callback) {
		        	callback.call(scope || window, this, resp);
		        }      
	      });
			},       
		 
		/**
		Executes an admin query (i.e. list tables)
		@param params {Object} object of additional parameters from the connection info
		*/ 
			adminQuery : function(params, callback, scope){   
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
							if (callback) {
		        		callback.call(scope || window, data);
		        	}
					});   
				} 
				else{
					$.post( '/sql', params, function(data){
							if (callback) {
		        		callback.call(scope || window, data);
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
				});
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
				 this.run('drop_table',{table:table},callback, scope);
			},
			
			
			/* private - default verb handler */
			_onVerb : function(results){
				
				
			}
			
			
			
			
			
			
		}
		
		
		return new _sqlDbAccess();
	}
	
}();









