
DbRelay.QueryHelper = function(connection){
	this.log = [];
	
	var cn = connection.connection_name;
	connection.connection_name = (cn && cn !== '') ? cn : '';   
	connection.flags = connection.flags || '';

	//set the adapter
	var adapterName = connection.sql_type || "SqlServer";
	this.adapter = DbRelay.adapters[adapterName];

//	this.sql_type = adapterName;
	
	this.batches = new DbRelay.BatchManager();
	delete connection.sql_type;
	
	this.connection = connection;
	return this;
};

DbRelay.QueryHelper.prototype = {
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
		var cookedQuery = this.adapter.get(verb, cfg || {});
		
		if(!cookedQuery){
		  alert('"'+verb+'" is not supported for ' + this.adapter); 
			return;
		}
		this.executeSql(cookedQuery, [], success, error, this);
	},
	
	getLog : function(){   return this.log;}, 
	
	clearLog : function(){this.log = [];},
	
	throwError : function( name, message, body, hard ) {
    if (console && console.dir) {
      console.dir({ "name": name, "message": message, "body":  body });
    };
    if (hard) {
      throw { "name": name, "message": message, "body":  body };
    };
  },

	/* Batches */

  run_batch: function( batch_name, success, error, scope ){
		this.executeSql( this.batches.get( batch_name ), [], success, error, this);
    this.batches.empty( batch_name );      
  },
                  
	/** returns string of statements in a batch */
	getBatch : function(batch){
		return this.batches.get( batch );
	},     
	
	emptyBatch : function(batch){
		 this.batches.empty( batch );
	},
	
	addToBatch : function(verb, params, batch){
		this.batches.push(batch, this.adapter.get(verb, params || {}) );
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
	Wrapper for commitTransaction, except with a batch name 
	*/
	commitBatchTransaction : function(batch, callback, scope){
		this.commitTransaction( this.getBatch(batch), callback, scope );
	},  
	
	
	/** Retrieve list of databases */
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
	@param {string} statements : statements to run
	
	@param {function} callback : optional callback function.
			@cbparam {sqlDbAccess} this
			@cbparam {Object} raw json response from server
	@param {Object} scope of callback
	*/
	commitTransaction : function(statements, callback, scope){  

    this.run('commit_transaction',{statements: statements}, function(qh, resp){  

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
				this.run('get_columncounts',{}, function(qh, colresp){  
						var rows = colresp.data[0].rows, cellCounts = {};  

						for(var i=0; i<rows.length; i++){  
							var row = rows[i];

						 	cellCounts[row.TABLE_NAME] = rowcounts[row.TABLE_NAME] * row.columns;
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
			function(qh, resp){
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