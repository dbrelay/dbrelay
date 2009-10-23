                                   /**
Grid for the SQL Result Panel
*/
Ext.namespace('dbrui');
dbrui.SqlSelectGrid = Ext.extend( Ext.grid.GridPanel,{
	viewConfig:{
		forceFit:true,
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
					this.openChartWindow('line');
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
				handler:function(){ 
					this.showPage(1); 
				},
				scope:this
			}, 
			{ 
				iconCls:'icon-back',
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
				handler:function(){ 
					var page = this.pageNumberField.getValue(); 
					this.showPage(page === this.totalPages ? page : page + 1);
				},
				scope:this
			},
			{ 
				iconCls:'icon-last',
				handler:function(){
					this.showPage( this.totalPages); 
				},
				scope:this
			}
		];
		
		this.store = this.store || new Ext.data.Store();
		this.cm = this.cm || new Ext.grid.ColumnModel([]);
		
		dbrui.SqlSelectGrid.superclass.initComponent.call(this);  
		
		this.colors = ['#4572A7','#AA4643','#89A54E','#71588F','#4198AF','#DB843D','#93A9CF','#D19392','#B9CD96','#A99BBD'];
		
		this.idpfx = idpfx;
	},
	
	
	nextColorIndex : 0,
	getColor : function(){
		var idx = this.nextColorIndex++;
		
		if(idx === this.colors.length){
			var color = dbrui.Util.randomColor();
			this.colors.push(color);
		}
		return this.colors[idx];
		
	},
	
	openChartWindow: function(active){
		var keys = this.store.fields.keys;

		if(keys.length < 2){
			Ext.Msg.alert('Problem','You need at least 2 numeric columns to create a chart');
			return;
		}
		
		if(!this.chartWindow){
			var lineSeries = [], columnSeries=[];
			
			for(var k=1; k<keys.length; k++){
				var color = this.getColor();
				
				lineSeries.push({
	        type:'line',
	        displayName: keys[k],
	        yField: keys[k],
	        style: {
	            color: color
	        }
	      });
	
				columnSeries.push({
	        type:'column',
	        displayName: keys[k],
	        yField: keys[k],
	        style: {
	            color: color
	        }
	      });
			}

		 	this.chartWindow = new Ext.Window({
				title: this.sqlTitle + ' Charts',
				closable:true,
				closeAction:'hide',
				maximizable:true,
				width:600,
				height:500,
				layout:'fit',
				items:{
					xtype:'tabpanel',
					layoutOnTabChange:true,
					deferredRender:false,
					items:[
						{
							title:'Line Chart',
							id:'line' + this.idpfx,
							layout:'fit',
							items:{
								xtype: 'linechart',
								store: this.store,
								xField: keys[0],
								series: lineSeries
						  },
							xAxis: new Ext.chart.CategoryAxis({
	            	title: keys[0]
	            })
						
						},
						//column
						{
							title:'Bar Chart',
							id:'column' + this.idpfx,
							layout:'fit',
							items:{
								xtype: 'columnchart',
								store: this.store,
								xField: keys[0],
								series: columnSeries
						  },
							xAxis: new Ext.chart.CategoryAxis({
	            	title: keys[0]
	            })
						},
						//pie
						{
							title:'Pie Chart',
	            store: this.store,
	            xtype: 'piechart',
	            dataField: keys[1],
	            categoryField: keys[0],
							//extra styles get applied to the chart defaults
	            extraStyle:{
                legend:{
                   display: 'bottom'
                }
	            }
	
	        	}
						
					]
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
		this.chartWindow.tabs.setActiveTab(active + this.idpfx);
		
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

		
		this.tableData = rows;
		this.totalRows = data.count || '0';  

		Ext.get('total'+this.idpfx).update(this.totalRows);  
    
    this.pageNumberField = Ext.getCmp('page'+this.idpfx);
		this.pageSizeField = Ext.getCmp('pagesize'+this.idpfx);   
		
	  this.pageNumberField.setValue(this.pageNumber);    
	  this.pageSizeField.setValue(this.pageSize);
		
		  
		this.updatePageView();    
		this.dataSet = data;
 
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
		 
		this.totalPages = Math.floor((this.totalRows / this.pageSize) + 1);
    Ext.get('totalPages'+this.idpfx).update(this.totalPages);
		
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



