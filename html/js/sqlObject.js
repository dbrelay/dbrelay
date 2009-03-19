// $(document).ajaxError(function(){
//     if (window.console && window.console.error) {
//         console.error(arguments);
//     }
// });


function viaductQuery( connection, sql, callback, query_tag) {
  connection[ "sql" ] = sql;
  if ( query_tag !== undefined ) connection[ "query_tag" ] = query_tag;
  $.post( '/sql', connection, callback, "json" );
};

sqlObject = function() { // Module pattern, called immediately

  function throwError( name, message, body, hard ) {
    if (window.console && window.console.error) {
      console.error({ "name": name, "message": message, "body":  body });
    };
    alert(message)
    if (hard) {
      throw { "name": name, "message": message, "body":  body };
    };
  };

  var param_re = /{{{([""'']?\w+)}}}/g;
  var divid_re = /({{{[\'\"]?)|(}}})/g;
  
  var batches = {
    queries: {},
    push: function( name, query ){
      if ( this.queries[ name ] ) {
        this.queries[ name ] += ";\n" + query;
      } else {
        this.queries[ name ] = query;
      };
    },
    
    empty: function( name ) {
      if( this.queries[ name ] ) {
        delete( this.queries[ name ] );
      };
    },
    
    get: function( name ){
      if ( this.queries[ name ] ){
        return this.queries[ name ];
      } else {
        throwError( "Non-existent batch", "Non-existent batch " + name, null, true );
      };
    }
  };
  
  function quoteSingles( text ) { return text.replace(/'/g,"''"); };
  function quoteDoubles( text ) { return text.replace(/"/g,'""'); };
  
  function cook( string, params ) {
    return string.replace( param_re, function( match, word ) {
      var quoteFunc = undefined;
      if ( word.charAt(0) == "'" ) { word = word.slice(1); quoteFunc = quoteSingles; };
      if ( word.charAt(0) == '"' ) { word = word.slice(1); quoteFunc = quoteDoubles; };
      if ( params[word] ) {
        return ( quoteFunc ? quoteFunc( params[word] ) : params[word] );
      } else {
        return '';
      };
    });
  };
  
  function get_params( query ){
    var matches = query.match(param_re);
    for (m in matches){
      matches[m] = matches[m].replace(divid_re, '');
    };
    return matches;
  };
  
  return function ( connection, sql_queries ) {  

    function exec( query, callback, tag ) {
      viaductQuery( connection, query, function(response){
        if (response.log.error) {
          throwError( "sqlError", response.log.error, {
            request: response.request,
            log:     response.log
          });
        };
        if (callback) {
          callback( response );
        }
      }, tag);
    };

    var sqlObjectConstructor = function() {
      for ( action in sql_queries ) {
        var action_body = sql_queries[action];
        if ( typeof(action_body) == "string" ) {
          this.add_query(action, action_body);
        } else if (
          Object.prototype.toString.apply( action_body ) == "[object Array]" &&
          action_body.length == 2 &&
          typeof(action_body[0]) == 'string' &&
          typeof(action_body[1]) == 'function'
        ) {
          this.add_query(action, action_body[0], action_body[1]);
        } else {
          var err = new Error();
          err.name = "ArgumentError";
          err.message = "Wrong paramaters. Expected either a string or an array of a string and a callback.";
          throw err;
        };
      };
    };

    sqlObjectConstructor.prototype = {
      empty_batch: function( name ) { batches.empty( name ); },

      verbs: function(){
        var verbs = {};
        for ( action in this ) {
          if (this.hasOwnProperty(action)) {
            verbs[action] = this[action];
          };
        };
        return verbs;
      },

      add_query: function( action_name, action_body, default_callback ){
        var that = this;
        this[ action_name ] = function( act_name, act_query ) {

          return function (params, callback_or_batch, tag) {
            if ( params && typeof( params ) == "object" ) {
              query = cook( act_query, params );
            } else {
              query = act_query;
              callback_or_batch = params;
              params = null;
            };
            if (callback_or_batch) {
              if (typeof( callback_or_batch ) == "function" ) {
                exec( query, callback_or_batch, that );
              } else {
                batches.push( callback_or_batch, query );
              };
            } else {
              exec( query, that[ act_name ].callback, tag );
            };
          };

        }( action_name, action_body );

        this[ action_name ].parameters = get_params( action_body );

        if ( typeof(default_callback) == 'function' ) {
          this[ action_name ].callback = default_callback;
        };
      },

      run_batch: function( batch_name, callback ){
        exec( batches.get( batch_name ), callback, this);
        batches.empty( batch_name );
      }
    };

    return (new sqlObjectConstructor());
  };

}();