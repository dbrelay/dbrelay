(function(){
	var param_re = /{{{([""'']?\w+)}}}/g;
	var divid_re = /({{{[\'\"]?)|(}}})/g;
	
	/* global var to hold DBRelay host (default to "" for same domain) */
	DbRelay = {
		adapters : {},

		query : function(connection, sql, callback, error, scope, query_tag){
			//copy connection info into params
			var params = {
				sql: sql,
				query_tag: query_tag || null
			};

			for(var k in connection){
				if(k !== 'dbrelay_host'){
					params[k] = connection[k];       
				}
			}

			if(connection.dbrelay_host){        
				jQuery.getJSON( connection.dbrelay_host + '/sql?js_callback=?', params , function(response){
					if(response && response.data){
						callback.call( scope || window, response);
					}
					else{
						if(error){
							error.call( scope || window, response);
						}
					}
					
				});   
			} 
			else{
				$.post( '/sql', params, function(response){
					if(response && response.data){
						callback.call( scope || window, response);
					}
					else{
						if(error){
							error.call( scope || window, response);
						}
					}
				}, "json" );    
			}
		},
	
		/**
		Cross-domain compatible dbrelay status call
		@param callback {function} callback function
		@param dbrhost {string} optional dbrelay host (xss) in format "http(s)://hostname"
*/
		queryStatus : function(callback, scope, dbrhost) {
			var params = {
				status: 1
			};

			if(dbrhost){           
				jQuery.getJSON( dbrhost + '/sql?js_callback=?', params , function(response){
					callback.call( scope || window, response);
				});   
			} 
			else{
				$.post( '/sql', params, function(response){
					callback.call( scope || window, response);
				}, "json" );    
			}  
		},
	
		/**
		Cross-domain compatible dbrelay kill connection
		@param callback {function} callback function
		@param dbrhost {string} optional dbrelay host (xss) in format "http(s)://hostname"
		*/
		kill : function(sockpath, callback, scope, dbrhost) {
			var params = {
				cmd: 'kill',
				param1 : sockpath
			};

			if(dbrhost){           
				jQuery.getJSON( dbrhost + '/sql?js_callback=?', params , function(response){
					callback.call( scope || window, response);
				});   
			} 
			else{
				$.post( '/sql', params, function(response){
					callback.call( scope || window, response);
				}, "json" );    
			}  
		},
	
	
		quoteSingles : function( text ) { return text.replace(/'/g,"''"); },

	  quoteDoubles : function( text ) { return text.replace(/"/g,'""'); },

		cook : function( string, params ) {
	    return string.replace( param_re, function( match, word ) {
	      var quoteFunc = undefined;
	      if ( word.charAt(0) == "'" ) { word = word.slice(1); quoteFunc = Dbrelay.Util.quoteSingles; };
	      if ( word.charAt(0) == '"' ) { word = word.slice(1); quoteFunc = Dbrelay.Util.quoteDoubles; };
	      if ( params[word] ) {
	        return ( quoteFunc ? quoteFunc( params[word] ) : params[word] );
	      } else {
	        return '';
	      };
	    });
	  },
	
		get_params : function( query ){
	    var matches = query.match(param_re);
	    for (var m in matches){ 
				if(typeof(matches[m]) !== 'string'){ continue};

	      matches[m] = matches[m].replace(divid_re, '');
	    };
	    return matches;
	  }
	
	};

	/** SQLServer Adapter */
	DbRelay.adapters.BaseAdapter = function(name, queries){
		this.name = name;
		this.queries = queries;
		
		return this;
	};
	DbRelay.adapters.BaseAdapter.prototype = {
		get : function(name, params){
			if(!this.queries[name]){
			  //alert('"'+name+'" is not supported for Adapter ' + this.name); 
				return null;
			}
			return DbRelay.cook( this.queries[name], params || {} );
			
		}
	};
	
	//Singleton
	DbRelay.adapters.SqlServer = new DbRelay.adapters.BaseAdapter('SqlServer', {
			list_databases:"USE MASTER;SELECT NAME FROM sys.sysdatabases ORDER BY NAME ASC",
			/* Db actions */
			create_table :"create table {{{table}}} {{{columns}}}",
			drop_table :"drop table {{{table}}}",
			commit_transaction : "BEGIN TRANSACTION "
					+"BEGIN TRY "
					+" {{{statements}}} "
					+"    COMMIT TRANSACTION "
					+"END TRY "
					+"BEGIN CATCH "
					+"   ROLLBACK TRANSACTION "
					+"END CATCH",  
			get_rowcounts:"SELECT t.name, sum(p.rows) as [rows] "
					+"FROM   sys.tables t "
					+"JOIN   sys.indexes i "
					+"ON     t.object_id = i.object_id "
					+"JOIN   sys.partitions p "
					+"ON     i.object_id = p.object_id "
					+"AND    i.index_id = p.index_id "
					+"WHERE  i.index_id in (0,1) "
					+"group by t.name "
					+"ORDER BY SUM(P.ROWS) DESC",
			get_columncounts:"SELECT TABLE_NAME, COUNT(COLUMN_NAME) as 'columns' FROM INFORMATION_SCHEMA.COLUMNS GROUP BY TABLE_NAME ",
			/* generic Table specific actions */
		  fetch_all_rows: "select * from {{{table}}}",
			fetch_rows: "select {{{columns}}} from {{{table}}}\n {{{where}}} \n{{{orderBy}}}",
			get_count:	"SELECT COUNT({{{columns}}}) FROM {{{table}}} \n{{{where}}}",
			row_add:"INSERT INTO {{{table}}} {{{columns}}} VALUES {{{values}}}",  
			delete_row: "DELETE FROM {{{table}}} WHERE \n{{{where}}}",
			fetch_paged_rows: "select * from ("
				+" Select ROW_NUMBER () OVER(Order By \n{{{orderBy}}}) \nas dbrelayRowNum, *"
				+"  From (SELECT * FROM {{{table}}} \n{{{where}}}) \ndbrelayInnerp1"
				+" ) dbrelayInnerp2"
				+" WHERE dbrelayRowNum BETWEEN {{{minRow}}} and {{{maxRow}}}",
		 	update_row :"UPDATE {{{table}}} SET {{{setvalues}}} WHERE \n{{{where}}}"
	});
	
	
	/**
	DbRelay.BatchManager
	*/
	DbRelay.BatchManager = function(){
		//keyed by batch name
		this.queries = {};
	};
	
	DbRelay.BatchManager.prototype = {
		push: function( name, query ){
      if ( this.queries[ name ] ) {
        this.queries[ name ] += ";\n" + query;
      } else {
        this.queries[ name ] = query;
      };
    },
    
    empty: function( name ) {
      try{
        delete( this.queries[ name ] );
      }
			catch(e){}
    },
    
		//non-existent batch returns null
    get: function( name ){
			return this.queries[ name ] || null;
    }

		
	};
	


})();


/* Legacy */

dbrelayQuery = function( connection, sql, callback, query_tag) {
  DbRelay.query(connection, sql, callback, null, window, query_tag);
}; 

dbrelayStatus = function(callback, dbrhost) {
	DbRelay.queryStatus(callback, window, dbrhost); 
};
    
dbrelayKillConnection = function(sockpath, callback, dbrhost) {
	DbRelay.kill(sockpath, callback, window, dbrhost);
};

sqlObject = function(connection, sql_queries) {
	connection.sql_type = connection.sql_type || 'sqlserver';
	return new DbRelay.QueryHelper(connection);
};



