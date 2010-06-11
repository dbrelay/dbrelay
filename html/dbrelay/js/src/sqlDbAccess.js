/**
@class DbRelay.QueryHelper
Previously known as sqlDbAccess, this class provides an API for querying a single database.
Usage:
<pre>
var qh = new DbRelay.QueryHelper({   
	sql_server : '99.99.99.99.99', 
	sql_port : '',  
	sql_database : 'mydatabase', 
	sql_user : 'myuser',                 
	sql_password : 'mypass',              
	connection_name : 'example2'
});
</pre>
*/

/**
@constructor
@param {Object} connection Connection parameters:<br/>
<ul class="mdetail-params">
     <li><b>sql_server</b> : String<div class="sub-desc">Hostname on which the SQL server is running. </div></li>
		<li><b>sql_database</b> : String<div class="sub-desc">Optional name of the primary database for the connection. User's default database is used, if not specified.</div></li>
		<li><b>sql_user</b> : String<div class="sub-desc">Username string recognised by the SQL server.   </div></li>
		<li><b>sql_password</b> : String<div class="sub-desc">password for the sql_user. </div></li>
		<li><b>connection_name</b> : String<div class="sub-desc">Optional (HIGHLY RECOMMENDED) name to persist this connection under.</div></li>
		<li><b>dbrelay_host</b> : String<div class="sub-desc">Optional parameter for xss scripting.  Leave out for same-domain scripts</div></li>
     <li><b>sql_port</b> : String/Number<div class="sub-desc">Optional port number, on which the SQL server is listening. 1433 is the default.</div></li>
 </ul>
*/
DbRelay.QueryHelper = function(connection){
	/**
   * Read-only array of all queries that have been run by this QueryHelper
   * @type {Array}
   */
	this.log = [];
	
	var cn = connection.connection_name;
	connection.connection_name = (cn && cn !== '') ? cn : '';   
	connection.flags = connection.flags || '';

	//set the adapter
	var adapterName = connection.sql_type || "SqlServer";
	
	/**
   * SQL type adapter that is bound to this QueryHelper.  Read-only, defaults to SqlServer
   * @type {DbRelay.adapter.BaseAdapter}
   */	
	this.adapter = DbRelay.adapters[adapterName];


	this.batches = new DbRelay.BatchManager();
	delete connection.sql_type;
	
	/**
   * Stored connection config object
   * @type {Object}
   */
	this.connection = connection;
	return this;
};

DbRelay.QueryHelper.prototype = {
	/**
	 Run a named query defined in the DbRelay.adapter.
	
	 @param {string} queryName {@link DbRelay.adapter.BaseAdapter} query name
	 @param {Object} cfg name/value pairs for query template vars
	 @param {function} success function that will be called if the query succeeds. For function parameters, see {@link #executeSql}
	 @param {function} error function that will be called if the query fails. For function parameters, see {@link #executeSql}
	 @param {Object} scope Optional scope for the callbacks.  Defaults to window/global
	*/
	run : function(verb, cfg, success, error, scope){
		var cookedQuery = this.adapter.get(verb, cfg || {});
		
		if(!cookedQuery){
		  alert('"'+verb+'" is not supported for ' + this.adapter); 
			return;
		}
		this.executeSql(cookedQuery, [], success, error, this);
	},
	
	/** 
	Return the SQL log
	@return {Array} array of SQL queries that were run
	*/
	getLog : function(){   return this.log;}, 
/**
Clears/resets the query log
*/	
	clearLog : function(){this.log = [];},
	
//private	
	throwError : function( name, message, body, hard ) {
    if (console && console.dir) {
      console.dir({ "name": name, "message": message, "body":  body });
    };
    if (hard) {
      throw { "name": name, "message": message, "body":  body };
    };
  },

	/**
	Run a query batch by name
	@param {String} batch_name name of the batch to run
	 @param {function} success function that will be called if the query succeeds. For function parameters, see {@link #executeSql}
	 @param {function} error function that will be called if the query fails. For function parameters, see {@link #executeSql}
	 @param {Object} scope Optional scope for the callbacks.  Defaults to window/global
	 */
  run_batch: function( batch_name, success, error, scope ){
		this.executeSql( this.batches.get( batch_name ), [], success, error, this);
    this.batches.empty( batch_name );      
  },
                  
	/** returns string of statements in a batch 
	@param {string} batch_name name of the batch to retrieve
	@return {Object} batch
	*/
	getBatch : function(batch){
		return this.batches.get( batch );
	},     
	
	/**
	Clears a query batch
	@param {String} batch_name Name of the batch to clear/empty
	*/
	emptyBatch : function(batch){
		 this.batches.empty( batch );
	},
	
	/**
	Add an adapter query to a batch
	@param {string} query_name {@link DbRelay.adapter.BaseAdapter} query name
	 @param {Object} params values to 'cook' with the query
	@param {string} batch_name Name of the batch to add to
	*/
	addToBatch : function(verb, params, batch){
		this.batches.push(batch, this.adapter.get(verb, params || {}) );
	},
	
	/**
		Tests the db connection by running a rows count on all tables
		@param {function} callback callback function.  Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>success</b> : Boolean<div class="sub-desc">true/false if succeeded/failed</div></li>
			 </ul>
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
	Sets a value for a flag.  Current flags are:<br/>
	  pp  - pretty print json</br>
	  echosql - echo SQL 
	
	@param flag {string} flag name
	@param on {boolean} true to turn it on, false to turn it off
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
	
	/**
	For cross site scripting, sets the dbrelay host name
	@param {string} dbrhost dbrelay hostname in format "http(s)://hostname"
	*/

	setDbrelayHost: function(dbrhost){
		this.connection.dbrelay_host = dbrhost;
	},
	
	
	/**
	Commits a query batch as a single transaction
	@param {string} batch_name Name of the query batch to commit
	@param {Function} callback callback function. See {@link #commitTransaction} for function parameters.
	@param {Object} scope Optional scope for the callback.  Defaults to window/global
	*/
	commitBatchTransaction : function(batch, callback, scope){
		this.commitTransaction( this.getBatch(batch), callback, scope );
	},  
	
	
	/** Retrieve list of databases - NOTE: Only works for SqlServer adapter 
	
	 @param {function} success function that will be called if the query succeeds. Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
		     <li><b>dbs</b> : Array<div class="sub-desc">Array of database names</div></li>
		 </ul>
	 @param {function} error function that will be called if the query fails. 	Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			     <li><b>msg</b> : String<div class="sub-desc">Error message</div></li>
			 </ul>
	 @param {Object} scope Optional scope for the callbacks.  Defaults to window/global
		*/
	getDatabases :function(success, error, scope){
		this.run('list_databases', {}, 
		//success
		function(qh, resp){
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
		function(qh, resp, err){
			if (error) {
      	error.call(scope || window, this, resp, err);
      }
		},
		scope);
	},
	 
	
	
	  
	/**  Commit a batch transaction, rolling back on any errors
	@param {string} statements statements to run
	
	@param {function} callback Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
		     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>
		
	@param {Object} scope Optional scope of callback.  Defaults to window/global.
	*/
	commitTransaction : function(statements, callback, scope){  

    this.run('commit_transaction',{statements: statements}, function(qh, resp){  

				 if(callback){
				   callback.call(scope || window, this, resp);  
				 }
		 },null,  this);
		
	},    
 
	/** Query for all tables and number of rows - NOTE: ONLY WORKS FOR SQL SERVER ADAPTER
   
	@param {function} success Success function called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
		     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		     <li><b>counts</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">object of key/value pairs (table => number of rows) </div></li>
		 </ul>
		
	@param {function} error optional error callback function.  	Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			 </ul>
   
	@param {Object} scope Optional scope of callback.  Defaults to window/global.
	*/        
	 getAllRowCounts : function(callback, errorfn, scope){  
		this.run('get_rowcounts',{}, function(qh, resp){  
				var rows = resp.data[0].rows, countObj = {};  
				
				for(var i=0; i<rows.length; i++){  
					var row = rows[i];
					
				 	countObj[row.name] = row.rows;
			 	}
				
			 	if(callback){
			   	callback.call(scope || window, this, resp, countObj );  
			 	}
		 }, errorfn, this);
	
 },    
                                                     
/** Query for all tables and number of cells (rows * columns) - NOTE: ONLY WORKS FOR SQL SERVER ADAPTER

@param {function} success Success function called with the following parameters:<ul class="mdetail-params">
	     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
	     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
	     <li><b>counts</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">object of key/value pairs (table => number of cells) </div></li>
	 </ul>
	
@param {function} error optional error callback function.  	Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
		     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>
@param {Object} scope Optional scope of callback.  Defaults to window/global.
*/
 getAllCellCounts : function(callback, errorfn, scope){   
	//first get row counts     
	this.getAllRowCounts(
		//success
		function(sqld, resp, rowcounts){     
			  //get column counts
				this.run('get_columncounts',{}, function(qh, colresp){  
						var rows = colresp.data[0].rows, cellCounts = {};  

						for(var i=0; i<rows.length; i++){  
							var row = rows[i];
						 	cellCounts[row.TABLE_SCHEMA + '.' + row.TABLE_NAME] = rowcounts[row.TABLE_NAME] * row.columns;
					 	}
            //final success
					 	if(callback){
					   	callback.call(scope || window, this, resp, cellCounts );  
					 	}
				 }, errorfn, this);
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
@param {Object} params object of additional parameters from the connection info

@param {function} success Success function called with the following parameters:<ul class="mdetail-params">
	     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
	     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
	 </ul>
	
@param {function} error optional error callback function.  	Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
		     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>
		
@param {Object} scope Optional scope of callback.  Defaults to window/global.
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
		Queries for a list of tables in this database.  Wrapper for 'tables' admin command.
		
		@param {function} callback Callback function called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			     <li><b>tableNames</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">Array of table names in this database</div></li>
			 </ul>
				
		@param {Object} scope Optional scope of callback.  Defaults to window/global.
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
		
		@param {String} table name of table to create
		@param {string} columns raw column string definition (i.e. "name varchar(30), address varchar(30)" )
		@param {function} callback Optional callback function called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			 </ul>
				
		@param {Object} scope Optional scope of callback.  Defaults to window/global.

	*/ 
	createTable: function(table, columns, callback, scope){
		 this.run('create_table',{
				table:table,
				columns:'('+columns+')'
			},
			function(qh, resp){
		 		if(callback){
					callback.call(scope || window, resp);
				}
		},null, this);
	},
	
/**
	Drops a table from the database
	
	@param {String} table name of table to drop
	@param {function} callback optional callback function. Called with the following parameters:<ul class="mdetail-params">
		     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
		     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
		 </ul>
			
	@param {Object} scope Optional scope of callback.  Defaults to window/global.
*/ 
	dropTable: function(table, callback, scope){
		 this.run('drop_table',{table:table},callback, null,scope);
	},
	

	/**
		Executes arbitrary sql code
		@param {string} sql code to execute
		@param {Array} flags. Additional one-time flags to append to existing flags. Provide an empty Array if no flags.
		@param {function} success Success callback function called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			 </ul>
			
	@param {function} error optional error callback function.  	Called with the following parameters:<ul class="mdetail-params">
			     <li><b>this</b> : {@link DbRelay.QueryHelper}<div class="sub-desc">the DbRelay.QueryHelper object</div></li>
			     <li><b>response</b> : Object<div class="sub-desc">the raw DbRelay response object</div></li>
			     <li><b>msg</b> : Object<div class="sub-desc">DbRelay error message</div></li>
			 </ul>

		@param {Object} scope Optional scope of callback.  Defaults to window/global.
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

	  	DbRelay.query( params, sql, function(resp){ 
				this.log.push('<p style="color:blue">'+resp.log.sql + '</p>');
					if (success) {
	        	success.call(scope || window, this, resp);
	        }
			},
			//error
			 function(resp){ 
					this.log.push('<p style="color:red">FAIL: ('+ (resp.log.error || 'Unknown Reason') +')' + resp.log.sql + '</p>');   
					if (error) {
	        	error.call(scope || window, this, resp, resp.log.error);
	        }
			},
			this,   
    	queryTag);
	}
	
};


sqlDbAccess = function(connection){
	return new DbRelay.QueryHelper(connection);
};