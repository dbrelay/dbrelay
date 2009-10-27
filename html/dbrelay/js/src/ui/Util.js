Ext.namespace('dbrui');

dbrui.Util = function(){
	return {

		loadFile: function(file, success, error, scope){
			Ext.Ajax.request({
	        url: file,
	        method: 'GET',
	        success: function(response, options) {
				      var head = document.getElementsByTagName("head")[0];
							var url = options.url;
							if(url.indexOf('.js') === url.length - 3){
				      	var js = document.createElement('script');
				       	js.setAttribute("type", "text/javascript");
				       	js.text = response.responseText;
				       	if (!document.all) {
				           js.innerHTML = response.responseText;
				       	}
				       	head.appendChild(js);
							}
							else if(url.indexOf('.css') === url.length - 4){
								Ext.util.CSS.createStyleSheet( response.responseText );
							}

				      if(success){
				         success.defer(50, scope || window,[ response, options]);
				      }
				  },
				
	        failure: function(response, options){
						if(error){
							error.call( scope || window);
						}
					},
	        disableCaching : false
	    });
		},
		
		
		
		randomColor : function(){
			return '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6);
		}
		
	}
}();