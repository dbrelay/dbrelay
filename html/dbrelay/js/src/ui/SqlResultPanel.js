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

/**
  Panel that allows user to enter SQL and display results as read-only

  Config options (*required):
		sql  :  {string} SQL code
		sqlDb*   :  {sqlDbAccess} sqlDb instance to use
*/

Ext.namespace('dbrui');

dbrui.SqlResultPanel = Ext.extend(Ext.Panel,{
  cls:'dbr-sqlresultpanel',
	//iconCls:'icon-sql',
  layout:'border',  
	closable:true, 
	
	/** true to generate direct URL links */
	directLink: true,
	/** autoRun can be set to true to automatically run the query when this panel is rendered.  defaulted to false. */
	autoRun:false,

	initComponent : function(){
	 var idpfx = Ext.id(); //ensure unique ids   
	
		//blank for now, these will change based on db queries
		this.cm = new Ext.grid.ColumnModel([]);
		this.store = new Ext.data.Store();   
		//used to hold multiple result sets
		this.grids = [];
		
		this.tbar = [ 
			{
				text:'Hide Query',
				iconCls:'icon-app',
				enableToggle:true,  
				pressed:true,
				handler: function(b,e){  
					var hidden = this.northRegion.hidden;
					                
					b.setText(hidden ? 'Hide Query' : 'Show Query'); 
					b.setIconClass(hidden ? 'icon-app' : 'icon-app-split');
					this.northRegion.setVisible(hidden);    
					this.doLayout();
				},
				scope:this
			}, 
			'-',
			 {
				text:'Run (CTRL + Enter)',
				iconCls:'icon-tick',  
				id:'run' + idpfx,          
				tooltip:'Execute SQL [CTRL + Enter]',
				handler: this.execSql,
				scope:this
			},
			{
				xtype:'tbfill',
			},
			{
				iconCls:'icon-minus', 
				text:'Clear',
				handler:function(){
					this.fldSqlCode.setValue('');
					this.fldUrl.setValue('');  
					this.showMsgPanel('Enter query to execute.');
				},
				scope:this
			}    
		];
		
		this.items = [
			{
				region:'north',
				height:140,
				split:true,
				collapsible:true,
				layout:'form',
				unstyled:true,  
				labelWidth:80,
				id: 'north' + idpfx,
				items:[
					{
						fieldLabel:'SQL',
						xtype:'textarea',
						id: 'sqlcode' + idpfx, 
						anchor:'98%',
						allowBlank:false,
						enableKeyEvents:true, 
						selectOnFocus:true, 
						value: this.defaultSql || '',
						listeners:{
							'keyup':{
								fn:function(fld, e){
									if(e.ctrlKey && e.keyCode === e.ENTER){
										 this.execSql();
									}
								},
								scope:this
							}
						}
					},
					{
						xtype:'checkbox',
						boxLabel:'Execute as a single Transaction',
						id: 'xact' + idpfx
					},
					{
						xtype:'displayfield',
						fieldLabel:'',
						id:'url'+idpfx,
						style:'font-size:10px;'
					}
				], 
				
				listeners:{
					'resize':{
						fn: function(p,aw,ah){ 
							var offset = this.directLink ? 60 : 30;
							 this.fldSqlCode.setHeight(ah - offset);
						},
						scope:this
					},
					'expand':{
						fn:function(p){
							p.doLayout();
						}
					}
				} 
			},
			//grid will be added to center after query is run
			{
				region:'center',
				id:'resultsRegion'+idpfx,
				border:false,
			 // unstyled:true,
				layout:'card',
				activeItem:0,
				items:{
					id:'msg'+idpfx,
					unstyled:true
				},
				tbar:[
					{
						text:''
					}
				]
				
			}
		];
		

		dbrui.SqlResultPanel.superclass.initComponent.call(this);
	   
		this.fldSqlCode = this.findById('sqlcode'+ idpfx); 
		this.msgPanel = this.findById('msg'+idpfx);  
		this.fldUrl = this.findById('url'+idpfx);      
		this.fldXact = this.findById('xact'+idpfx);
					
		this.northRegion = Ext.getCmp('north'+idpfx);
		this.centerRegion = Ext.getCmp('resultsRegion'+idpfx);    
          
		//save postfix, to be accessed externally later if needed
		this.idpfx = idpfx;
		
		//should we auto run the query on render?
		if(this.autoRun){

			this.on('afterlayout', function(){

				this.execSql();
			}, this, {single:true});
		}
	}, 


	loadMask : function(on){
		var runBtn = Ext.getCmp('run'+this.idpfx);
		
		if(on){
			this.centerRegion.body.mask('Running Query...Please wait...');
			if(runBtn){
		  	runBtn.setIconClass('icon-loading');
			}
		}
		else{
			if(runBtn){
				runBtn.setIconClass('icon-tick');
			}
			this.centerRegion.body.unmask();
		}
	},
	
	
	/** Runs the SQL code and displays results in the grid
	*/
	execSql : function(){
		
		if(!this.fldSqlCode.validate()){return;}

		this.loadMask(true);
		
		//set transaction flag
	  this.sqlDb.executeSql(this.fldSqlCode.getValue(), (this.fldXact.getValue() ? ['xact'] : null),
			//success
			function(sqld, resp){        
				//show results
				if(resp.log.error || !resp.data){
					this.showMsgPanel('<p style="color:red">Error:</p><pre style="color:red">'+resp.log.error+'</pre>');      
					this.loadMask(false);
				}
	
				else{
					
					//are there any data sets to gridify?
					var gridify = false, datasets = resp.data;
					for(var i=0; i<datasets.length; i++){
						if(datasets[i].rows.length > 0 && datasets[i].fields.length > 0){
							gridify = true;
							break;
						}
					}

					if(gridify){
						this.showResultGrids(resp.data);
					}
					else{
						var msg = (datasets[0] && datasets[0].rows && datasets[0].rows.length === 0) ? '<p style="color:blue">No results returned</p>' : '<p style="color:green">Success</p>';
						this.showMsgPanel(msg);     
						this.loadMask(false);
					}
				
					this.setUrlLink( this.getDirectUrl() );
				}
			
			},
			//error
			function(sqld, resp, err){
				Ext.Msg.alert('Error', err);
				this.loadMask(false);
			}
			,this);
	},
	
	
	getDirectUrl: function(){
		//update URL field
		var conn = Ext.apply({},this.sqlDb.connection);
		conn.sql =  this.fldSqlCode.getValue(); 
		conn.query_tag = null;        
		//don't pass password     
		conn.sql_password = null;
		//set transaction flag
		if(this.fldXact.getValue()){
			conn.flags += ',xact';
		}

		return window.location.protocol + '//' + window.location.host + window.location.pathname + '?'
        + Ext.urlEncode(conn) + '&' + window.location.hash;
	},
	
              
  setUrlLink : function(url){    
		if(this.directLink){
			var title = '', cls='';
			var host = window.location.protocol + '//' + window.location.host + window.location.pathname;
			
			if((url.length - host.length) > 2083){
				title = 'URL is over the 2083 character limit for IE GET requests, and may not run correctly in IE as a result';
				cls ='dbr-directlink-warning';
			}
			this.fldUrl.setValue('<a title="'+title+'" href="'+url+'" target="_blank" class="'+cls+'">' + url + '</a>'); 
		}
	},
	
 	showMsgPanel : function(msg){
		this.centerRegion.getLayout().setActiveItem(this.msgPanel);  
		this.msgPanel.body.update(msg);
	},
	
	/** 
	Displays SQL results in a grid    
	@param {Array} dataSets : response.data array from server
	*/
  showResultGrids : function(dataSets){      
	
		var tb = this.centerRegion.getTopToolbar(), numResults = dataSets.length, count=0; 
		tb.removeAll();                   

    for (var i=0; i<numResults; i++){   
			var data = dataSets[i];           
			
			if(!(data.rows && data.rows.length > 0)){continue;}

			var name ='Result Set ' + (count+1);

			//grid
		  if(!this.grids[count]){ 
			
			//create the grid if it doesn't exist yet 

				var grid = new dbrui.SqlSelectGrid({
					resultName:'Viewing ' + name, 
					dataSet:data,
					plugins: this.gridplugins,
					sqlTitle: this.title || '',
					listeners:{
						'afterrender':{
							fn:function(g){    
								this.doLayout();
								 
								g.refresh(g.dataSet);    
							},
							scope:this
						}
					}
				 }); 
			 	//add to layout
				this.centerRegion.add(grid);      
				
				this.grids[count] = grid;                
				
			}
			
			//use existing grid
			else{    
				var grid = this.grids[count];
				grid.refresh(data);
				grid.setResultName(name);
			}
		

		  //add grid button to result toolbar
			tb.add({ 
				text: name,    
				gridIndex : count, 
				id:'showgrid-' + count + this.idpfx,
				iconCls:'icon-sql',    
				enableToggle:true,
				enableDepress:false, 
				toggleGroup:'grids' + this.idpfx,
				toggleHandler:function(b, st){        
					if(st){     
					 this.centerRegion.getLayout().setActiveItem(this.grids[b.gridIndex]);   
					 this.centerRegion.doLayout(); 
				  } 
				},
				scope:this
			});
			tb.addText('&nbsp;&nbsp;');
			count++;     
		} 
		
	 	tb.el.removeClass('x-toolbar');
		this.doLayout();
		tb.findById('showgrid-' + (count-1) + this.idpfx).toggle(true);    
		tb.addText('&nbsp;&nbsp;'+ count +' result set'+(count > 1 ? 's' : '')+' returned.');             
		this.loadMask(false);   
	}
		
	

}); 

Ext.reg('dbrui.SqlResultPanel', dbrui.SqlResultPanel);

