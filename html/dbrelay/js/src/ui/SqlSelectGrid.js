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

/**
Grid for the SQL Result Panel
*/
Ext.namespace('dbrui');
dbrui.SqlSelectGrid = Ext.extend( Ext.grid.GridPanel,{
	viewConfig:{
	//	forceFit:true,
		autoFill:true,
		emptyText:'Empty result set',
		deferEmptyText:false
	},              
	border:false,
	/** client side paging */
	pageSize: 50,   
	pageNumber:1,
 	totalPages:1,

	initComponent : function(){  
		var idpfx = Ext.id();

		this.tbar = [
			'<span id="name'+idpfx+'" style="font-weight:bold;color:green">Viewing '+(this.resultName || '') +'</span>',
			{
				xtype:'tbfill',
			},
			{
				text:'Charts',
				iconCls:'icon-chart',
				id:'chart_item'+idpfx,
				handler:function(){
					this.openChartWindow(this.store);
				},
				scope:this
		},
		'-',
			{
				text:'Export',
				iconCls:'icon-tableexport',
				menu:[
					{
						text:'All rows as HTML',
						iconCls:'icon-html',
						handler:function(){this.exportHtml(true);},
						scope:this
					},
					{
						text:'Selected rows as HTML',   
						iconCls:'icon-html', 
						handler:function(){this.exportHtml(false)},
						scope:this
					}, 
					'-',
					{
						text:'All rows as CSV',
						iconCls:'icon-excel',
						handler:function(){this.exportCSV(true);},
						scope:this
					},
					{
						text:'Selected rows as CSV',
						iconCls:'icon-excel',
						handler:function(){this.exportCSV(false);},
						scope:this
					}
				]
			},                   
			'-',
			'<span id="total'+idpfx+'"></span> total',               
			'-',
			{
				xtype:'numberfield',
				id:'pagesize'+idpfx,
				width:30,
				enableKeyEvents:true,
				selectOnFocus:true,
				listeners:{ 
					'blur':{
						fn:this.updatePageView,
						scope:this
					},
					'keyup':{
						fn:function(b,e){
							if(e.keyCode === e.ENTER){
								this.updatePageView();
							}
						},
						scope:this
					}
				}
			}, 
			'/page',
			'-',
			{ 
				iconCls:'icon-first',
				id:'pagefirst' + idpfx,
				handler:function(){ 
					this.showPage(1); 
				},
				scope:this
			}, 
			{ 
				iconCls:'icon-back',
				id:'pageback' + idpfx,
				handler:function(){
					var page = this.pageNumberField.getValue();
					this.showPage(page === 1 ? 1 : page-1); 
				},
				scope:this
			},
			'Page',  
			{
				xtype:'numberfield',
				id:'page'+idpfx,
				width:30,   
				enableKeyEvents:true,
				selectOnFocus:true,
				listeners:{ 
					'blur':{
						fn:this.updatePageView,
						scope:this
					},
					'keyup':{
						fn:function(b,e){
							if(e.keyCode === e.ENTER){
								this.updatePageView();
							}
						},
						scope:this
					}
				}
			},
			'of <span id="totalPages'+idpfx+'"></span>',
			{ 
				iconCls:'icon-next',
				id:'pagenext' + idpfx,
				handler:function(){ 
					var page = this.pageNumberField.getValue(); 
					this.showPage(page === this.totalPages ? page : page + 1);
				},
				scope:this
			},
			{ 
				iconCls:'icon-last',
				id:'pagelast' + idpfx,
				handler:function(){
					this.showPage( this.totalPages); 
				},
				scope:this
			}
		];
		
		this.store = this.store || new Ext.data.Store();
		this.cm = this.cm || new Ext.grid.ColumnModel([]);
		
		dbrui.SqlSelectGrid.superclass.initComponent.call(this);  

		this.idpfx = idpfx;
	},
	

	openChartWindow: function(store){
		var keys = store.fields.keys;

		if(keys.length < 2){
			Ext.Msg.alert('Problem','You need at least 2 numeric columns to create a chart');
			return;
		}
		
		if(!this.chartWindow){


		 	this.chartWindow = new Ext.Window({
				title: this.sqlTitle + ' Charts (BETA)',
				closable:true,
				closeAction:'hide',
				maximizable:true,
				width:600,
				height:500,
				layout:'fit',
				tbar:[
					{
						text:'<div style="font-weight:bold;color:red;font-size:14px">Help</div>',
						iconCls:'icon-help',
						handler:function(){
							Ext.Msg.alert('Charts Help','Charts are currently in BETA mode.  Currently only one result set can be charted at a time.<br/>'
								+ '<table width="100%" border="1"><tr><td>&nbsp;</td><td><b>Line/Bar Chart</b></td><td><b>Pie Chart</b></td></tr>'
								+ '<tr><td><b>x</b></td><td>first column</td><td>categories are first column</td></tr>'
								+ '<tr><td><b>y</b></td><td>each numeric column after the 1st column</td><td>2nd column</td></tr>'
								+ '</table><br/><br/>'
								+ 'OPEN ISSUES:<br/>'
								+ '- Time Series chart currently does not refresh its data.  To chart a different time series, open a new SQL query tab.<br/>'
							);
						}
					}
				],
				items:{
					xtype:'tabpanel',
					activeTab:0,
					layoutOnTabChange:true,
					deferredRender:true,
					forceLayout:true,
					
					items:[
						{
							title:'Line',
							id:'line' + this.idpfx,
							iconCls:'icon-linechart',
							xtype:'dbrui.LineChart'
						},
						{
							title:'Bar',
							id:'bar' + this.idpfx,
							iconCls:'icon-barchart',
							xtype:'dbrui.BarChart'
						},
						{
							title:'Pie',
							id:'pie' + this.idpfx,
							iconCls:'icon-piechart',
							xtype:'dbrui.PieChart'
						}
					],
					
					listeners:{
						'tabchange':{
							fn: function(tp, t){
								if(t.refreshChart){
									t.refreshChart(this.store);
								}
							},
							scope:this
						}
					}
				},
				listeners:{
					'render':{
						fn: function(win){
							win.tabs = win.getComponent(0);
							this.fireEvent('createchartwindow', this,this.chartWindow);
						},
						scope:this
					}
				}
			});
			
			
		}
		
		this.chartWindow.show();
		this.chartWindow.getComponent(0).activate(0);
	//	this.chartWindow.getComponent(0).getComponent(0).refresh(store);
		
		
	},
	
	
	getDbrData : function(){
		return this.dataSet;
	},
	/**
		refreshes the grid with new data, columns, & store. Should only be called after grid is rendered.
		@param {Object} data from server
	*/
	refresh : function(data){ 
		var cols = data.fields, rows = data.rows;

		var cmData = [], storeFields = [];

		for(var i=0,len=cols.length; i<len; i++){
			var col = cols[i], name = col.name;

			//EXT column model definition 
			cmData[i] = {
				header: name,
				sortable:true,
				id: name, 
				dataIndex:name
			};

			//EXT store fields
			storeFields[i] = {
				name: name
			};
		}

    
    //create a new store
		var store = new Ext.data.JsonStore({
		    autoDestroy: true,
		    data: {
				   rows: rows
				},
		    root: 'rows',
		    fields: storeFields
		});
		
		//create a new column model 
		var cm = new Ext.grid.ColumnModel(cmData);
		
		 //reconfigure the grid with the new query results
	  this.reconfigure(store, cm);      
		if(this.chartWindow && !this.chartWindow.hidden){
			this.chartWindow.hide();
			this.openChartWindow(store);
		}
		
		this.tableData = rows;
		this.totalRows = (data.count || rows.length) || '0';  


		Ext.get('total'+this.idpfx).update(this.totalRows);  
    
    this.pageNumberField = Ext.getCmp('page'+this.idpfx);
		this.pageSizeField = Ext.getCmp('pagesize'+this.idpfx);   
		
	  this.pageNumberField.setValue(this.pageNumber);    
	  this.pageSizeField.setValue(this.pageSize);
		  
		this.updatePageView();    
		this.dataSet = data;
 
	},
	     
	/** set the next page result arrow by a boolean 
	@param {boolean} disabled true to set disabled
	*/
	nextPageSetDisabled : function(disabled){
		Ext.getCmp('pagenext' + this.idpfx).setDisabled(disabled);
		Ext.getCmp('pagelast' + this.idpfx).setDisabled(disabled);
	},
	
	/** set the previous page result arrow by a boolean 
	@param {boolean} disabled true to set disabled
	*/
	prevPageSetDisabled : function(disabled){
		Ext.getCmp('pageback' + this.idpfx).setDisabled(disabled);
		Ext.getCmp('pagefirst' + this.idpfx).setDisabled(disabled);
	},
	
	showPage : function(page){  
		this.pageNumberField.suspendEvents();
		this.pageNumberField.setValue(page);
		this.pageNumberField.resumeEvents();
		       
		this.updatePageView();
	},
	
	/**
	Update grid items in view (client-side), based on current state of UI
	*/
	updatePageView : function(){
		var pageNumber = this.pageNumberField.getValue();  
		if(pageNumber > this.totalPages){  
			 this.pageNumberField.suspendEvents();
			 this.pageNumberField.setValue(this.totalPages);
			 this.pageNumberField.resumeEvents();
		}
		var pageSize = this.pageSizeField.getValue(); 
		
		 
		var start =  (pageNumber-1) * pageSize;
	  
		this.store.loadData({'rows':this.tableData.slice(start , start+pageSize )});  
                             
		

		this.pageNumber = pageNumber;
		this.pageSize = pageSize;	   
		this.totalPages = Math.ceil(this.totalRows / this.pageSize);
    Ext.get('totalPages'+this.idpfx).update(this.totalPages);
		this.nextPageSetDisabled(this.totalPages === 1);
		this.prevPageSetDisabled(pageNumber === 1);

			
		
	},
	
	setResultName: function(s){ 
		Ext.get('name'+this.idpfx).update(s);  
		this.resultName = s; 
	},
	
	exportHtml : function(allRows){
		var rows = allRows ? this.tableData : this.getSelectionModel().getSelections(), html='', cols=[];   
		
		html = '<table>';     
		
		var cm = this.getColumnModel();   
		var numCols = cm.getColumnCount(); 
    
		html+= '<thead><tr>';
		for(var c=0; c<numCols; c++){
			if(!cm.isHidden(c)){    
				var cname = cm.getDataIndex(c);
				cols.push(cname);
				html += '<th>'+cname+'</th>';
			}
		}       
		html+= '</tr></thead><tbody>';  
		
		//entire data set
		for(var i=0, len=rows.length; i<len; i++){
			html+= '<tr>';          
			var row = rows[i];
			
			for(var c=0; c<cols.length; c++){  
				 var v = allRows ? row[cols[c]] : row.data[cols[c]];
				 
				 html += '<td>'+ (v===null ? "" : v) +'</td>';
			}
			
			html+='</tr>';
		}
		html += '</tbody></table>';
		
		var win = window.open('','',
		  'width=600,height=500'
		   +',menubar=0'
		   +',toolbar=1'
		   +',status=0'
		   +',scrollbars=1'
		   +',resizable=1');
		
		
		win.document.writeln('<html><head><style>');    
		win.document.writeln('table{width:100%;border-collapse:collapse;padding:0;margin:0;font-family:Arial, Helvetica, "sans serif"}');
		win.document.writeln('td,th{font-size:11px;text-align:left;border:1px solid black;}');
		win.document.writeln('</style></head><body>');     
		win.document.writeln(html); 
    win.document.writeln('</body></html>');   
		win.document.close();
		
	},
	
	exportCSV : function(allRows){
		var rows = allRows ? this.tableData : this.getSelectionModel().getSelections(), csv='', cols=[], temp = [];   

		var cm = this.getColumnModel();   
		var numCols = cm.getColumnCount();    
		
		function _csv(v){    
			v += "";
			v =  v.replace(/"/g, '"""');  
			return '"' + v + '"';	
		}
    
 
		for(var c=0; c<numCols; c++){        
			//only export the visible columns
			if(!cm.isHidden(c)){    
				var cname = cm.getDataIndex(c);
				cols.push(cname);  
				temp.push( _csv(cname) );
			}                          
		}                            
		csv += temp.join(',') + '\n';
		      

		//entire data set
		//console.dir(rows);
		for(var i=0, len=rows.length; i<len; i++){
			temp = [];          
			var row = rows[i];
			
			for(var c=0; c<cols.length; c++){     
				var v = allRows ? row[cols[c]] : row.data[cols[c]];  
				temp.push( _csv(  (v===null ? "" : v) ) ); 
			}
			
			csv += temp.join(',') + '\n'; 
		}

		
		var win = window.open('','',
		  'width=600,height=500'
		   +',menubar=0'
		   +',toolbar=1'
		   +',status=0'
		   +',scrollbars=1'
		   +',resizable=1');
		
		
   /*	win.document.writeln('<html><head><style>');    
		win.document.writeln('pre{padding:0;margin:0;font-family:Arial, Helvetica, "sans serif";font-size:11px;}');
		win.document.writeln('</style></head><body><pre>');       */
		win.document.writeln('<pre>' + csv + '</pre>'); 
	 /* win.document.writeln('</pre></body></html>');     */
		win.document.close(); 
		
	//	Ext.Msg.alert('CSV Generated in Popup Window','Save popup window as .csv file');  
		
	}


});


/*Ext.extend( Ext.chart.Chart, {
	

});*/


