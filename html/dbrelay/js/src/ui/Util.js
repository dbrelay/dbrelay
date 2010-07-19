// DB Relay is an HTTP module built on the NGiNX webserver platform which
// communicates with a variety of database servers and returns JSON formatted
// data.
// 
// Copyright (C) 2008-2010 Getco LLC
// 
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version. In addition, redistributions in source code and in binary
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