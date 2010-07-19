// DB Relay is an HTTP module built on the NGiNX webserver platform which
// communicates with a variety of database servers and returns JSON formatted
// data.
// 
// Copyright (C) 2008-2010 Getco LLC
// 
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version. In addition, redistributions in source code and in binary
// form must include the above copyright notices, and each of the following
// disclaimers.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT OWNERS AND CONTRIBUTORS “AS IS”
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL ANY COPYRIGHT OWNERS OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

(function(){
	var param_re = /{{{([""'']?\w+)}}}/g;
	var divid_re = /({{{[\'\"]?)|(}}})/g;
	/**
	@class DbRelay
	The DbRelay core JavaScript API provides a simple interface to send SQL queries to DbRelay.  Cross-domain support is also included.<br/><br/>
	
	Requires:
	<ul><li>JQuery 1.3.2</li></ul>
	
	Example Usage:
<pre>
&lt;script src="/dbrelay/js/jquery/jquery-1.4.2.min.js" type="text/javascript">&lt;/script>

&lt;!-- DbRelay Javascript Core API -->
&lt;script src="/dbrelay/js/dbrelay-core-min.js" type="text/javascript">&lt;/script>

&lt;script>

var connection = {
	sql_server:'99.99.99.1',
	sql_database:'EMPLOYEES',
	sql_user:'joe',
	sql_password:'joepass',
	//optional param for cross-domain access
	dbrelay_host:'http://dbrelayservername:1433'
};

function success(response){
	alert('Success! ' + response.data);
}
function error(response){
	alert('Error: ' + response.log.error);
}


//Query something using {@link #query}
DbRelay.query(connection,'select * from people', success, failure);

&lt;/script>
</pre>
	
	
	@singleton
	*/
	DbRelay = {
		adapters : {},
		/** global var to hold default DBRelay host (default to "" for same domain).  This can be overridden by individual queries   */
		DBRELAY_HOST : null,

		/**
		 Send a SQL query through DbRelay, calling the passed callbacks with the response.
		@param {Object} connection Dbrelay connection object.  Example parameters:
		<ul class="mdetail-params">
		     <li><b>sql_server</b> : String<div class="sub-desc">Hostname on which the SQL server is running. </div></li>
				<li><b>sql_database</b> : String<div class="sub-desc">Optional name of the primary database for the connection. User's default database is used, if not specified.</div></li>
				<li><b>sql_user</b> : String<div class="sub-desc">Username string recognised by the SQL server.   </div></li>
				<li><b>sql_password</b> : String<div class="sub-desc">password for the sql_user. </div></li>
				<li><b>connection_name</b> : String<div class="sub-desc">Optional (HIGHLY RECOMMENDED) name to persist this connection under.</div></li>
				<li><b>dbrelay_host</b> : String<div class="sub-desc">Optional parameter for xss scripting.  Leave out for same-domain scripts</div></li>
		     <li><b>sql_port</b> : String/Number<div class="sub-desc">Optional port number, on which the SQL server is listening. 1433 is the default.</div></li>
		 </ul>
		
@param {String} sql SQL query
@param {Function} success callback function on a successful query.  One arguments is passed:<ul class="mdetail-params">
     <li><b>response</b> : Object<div class="sub-desc">DbRelay JSON response object</div></li>
 </ul>

@param {Function} error error callback function
@param {Object} scope Optional scope for the success & error callbacks
@param {String} query_tag Optional query_tag that will be returned in the results.  Useful for determining which query results are from.
		*/
		query : function(connection, sql, callback, error, scope, query_tag){
			//copy connection info into params
			var params = {};

			for(var k in connection){
				if(k !== 'dbrelay_host'){
					params[k] = connection[k];       
				}
			}
			//override sql
			params.sql = sql;
			params.query_tag = query_tag || null;
			if(!params.connection_name){
				params.connection_name = 'dbrquery_'+new Date().getTime();
			}

			var dbrHost = connection.dbrelay_host || DbRelay.DBRELAY_HOST;
			
			if(dbrHost){        
				jQuery.getJSON( dbrHost + '/sql?js_callback=?', params , function(response){
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
		Query for connection status.  Cross-domain compatible dbrelay status call.
		@param callback {function} REQUIRED callback function that will be called with the following parameters:<ul class="mdetail-params">
		     <li><b>response</b> : Object<div class="sub-desc">DbRelay JSON response object</div></li>
		 </ul>
		@param {Object} scope Optional scope for the callback
		@param {string} dbrhost optional dbrelay host (xss) in format "http(s)://hostname"
*/
		queryStatus : function(callback, scope, dbrhost) {
			var params = {
				status: 1
			};
			
			dbrhost = dbrhost || DbRelay.DBRELAY_HOST;
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
		@param {String} sockpath socket path value of the connection to kill.  Use {@link #queryStatus DbRelay.queryStatus} to find the sockpath.
		@param {function} callback callback function that will be called with the following parameters:<ul class="mdetail-params">
		     <li><b>response</b> : Object<div class="sub-desc">DbRelay JSON response object</div></li>
		 </ul>
		@param {Object} scope Optional scope for the callback
		@param {string} dbrhost optional dbrelay host (xss) in format "http(s)://hostname"
		*/
		kill : function(sockpath, callback, scope, dbrhost) {
			var params = {
				cmd: 'kill',
				param1 : sockpath
			};
			
			var dbrhost = dbrhost || DbRelay.DBRELAY_HOST;
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
		Utility String function that replaces all single quotes (') in a string with two single quotes ('')
		@param {string} text the source string
		@return {string} the return string
		*/
		quoteSingles : function( text ) { 
			text += '';
			return text.replace(/'/g,"''");
		},

		/**
		Utility String function that replaces all double quotes (") in a string with two double quotes ("")
		@param {string} text the source string
		@return {string} the return string
		*/
	  quoteDoubles : function( text ) {
			text += '';
			return text.replace(/"/g,'""');
		},

		/**
				A simple HTML template parser
				@param {String} string template string, with {{{param_name}}} 
				@param {Object} params An object of values for the template, keyed by param name
				@return {String} A parsed string where all instances of {{{param_name}}} in the template are replaced by associated values in the params parameter
		*/
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
	
	//private
		get_params : function( query ){
	    var matches = query.match(param_re);
	    for (var m in matches){ 
				if(typeof(matches[m]) !== 'string'){ continue};

	      matches[m] = matches[m].replace(divid_re, '');
	    };
	    return matches;
	  }
	
	};

	/** 
	@class DbRelay.adapters.BaseAdapter
	Abstract base class for different database types.  This class should not be used directly.
	*/
	DbRelay.adapters.BaseAdapter = function(name, queries){
		this.name = name;
		this.queries = queries;
		
		return this;
	};
	DbRelay.adapters.BaseAdapter.prototype = {
		//private
		get : function(name, params){
			if(!this.queries[name]){
			  //alert('"'+name+'" is not supported for Adapter ' + this.name); 
				return null;
			}
			return DbRelay.cook( this.queries[name], params || {} );
			
		}
	};
	
	/** 
	@class DbRelay.adapters.SqlServer
	@extends DbRelay.adapters.BaseAdapter
	@singleton
	Query Adapter class for Sql Server. Contains SQL Server specific query syntax required for the DBRelay UI
	*/
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
			get_columncounts:"SELECT TABLE_NAME,TABLE_SCHEMA, COUNT(COLUMN_NAME) as 'columns' FROM INFORMATION_SCHEMA.COLUMNS GROUP BY TABLE_NAME,TABLE_SCHEMA ",
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
	
	
	/** @ignore
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



