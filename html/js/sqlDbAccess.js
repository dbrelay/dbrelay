/** SQL Paging Example        

select * from (
 select top 50 id,last_name,first_name from (
    select top 80 id,last_name,first_name
    from people
   order by id asc
 ) as newtbl order by id desc
) as newtbl2 order by id asc   

returns records 30 - 80          
      recordStart: 30
			pagingSize: 50
*/



/**
    Abstraction of sqlObject.
*/

sqlDbAccess = function(){
	
	
	return function(connection){
		var _log = [];
		
		var _sqlDbAccess = function(){
			var cn = connection.connection_name;
			connection.connection_name = (cn && cn !== '') ? cn : 'replace_with_random_name';

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
				
				list_tables : [
					"select * from INFORMATION_SCHEMA.tables where TABLE_TYPE='BASE TABLE'",
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
				 +"select top {{{pagingSize}}} {{{columns}}} from ( "
				 +"    select top {{{absMax}}} {{{columns}}} "
				 +"     from {{{table}}} {{{where}}}"
				 +"    order by {{{orderBy}}} asc "
				 +"  ) as newtbl {{{where}}} order by {{{orderBy}}} desc "
				 +" ) as newtbl2 order by {{{orderBy}}} asc",
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
				this.run('list_tables',{}, function(resp){

					 if(callback){
					    callback.call(scope || window, this, resp.data ? true : false);  
					 }

				}, this);
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
			  	viaductQuery( this.connection, sql, function(resp){
		        if (callback) {
		        	callback.call(scope || window, this, resp);
		        }      
	      });
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
				this.run('list_tables', {}, function(resp){
					 var rows = resp.data[0].rows, tableNames =[]; 

					 for(var i=0; i<rows.length; i++){
						 tableNames[i] = rows[i].TABLE_NAME;
					 }
					
					 if(callback){
					    callback.call(scope || window, this, resp, tableNames);  
					 }
				}, this);
			}, 
			
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









