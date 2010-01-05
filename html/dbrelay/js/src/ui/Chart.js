Ext.namespace('dbrui');

dbrui.Chart = Ext.extend(Ext.Panel,{
	nextColorIndex : 0,
	layout:'fit',
	
	initComponent: function(){

		this.items = {
			html:''
		};

		dbrui.Chart.superclass.initComponent.call(this); 
		this.colors = ['#4572A7','#AA4643','#89A54E','#71588F','#4198AF','#DB843D','#93A9CF','#D19392','#B9CD96','#A99BBD'];
		

		//store
		if(this.store){
			this.on('render', function(p){
				p.refreshChart( p.store );
			});
		}
		//dbrelay response.data
		else if(this.data){
			this.on('render', function(p){
				p.refreshChart( p.data );
			});
		}
		//query
		else if(this.dbrelay){
			this.dbrelay.connection_name = this.dbrelay.connection_name || ('dbruiChart' + new Date().getTime());
			this.on('render', function(){
				this.query(this.dbrelay.sql);
			} , this);
		}
	},
	
	getChart : function(){
		return this.chart || null;
	},
	
	mask : function(show){
		if(!this.body){return;}

		if(!this._mask){
			this._mask = new Ext.LoadMask(this.body, {msg:'Loading'});
		}
		if(show){
			this._mask.show();
		}
		else{
			this._mask.hide();
		}
	},
	
	query: function(sql, connection){
		var conn = connection || this.dbrelay;
		if(!conn){return;}
		
		this.mask(true);
		//run query
		DbRelay.query(conn, sql,
			//success
			function(response){
				//process last data set
				var data = response.data[response.data.length-1];
			
				this.refreshChart(data);
			},
			//error
			function(response){
				this.mask(false);
				Ext.Msg.alert('Error running query', response.log.error || "An unknown error occured when running the query");
			},
			//scope
		this);
		
		//store it
		this.sql = sql;
		this.dbrelay = conn;
	},
	
	
	getColor : function(){
		var idx = this.nextColorIndex++;
		
		if(idx === this.colors.length){
			var color = dbrui.Util.randomColor();
			this.colors.push(color);
		}
		return this.colors[idx];
		
	},
	
	//dbrData - dbrelay json response.data
	data2Store : function(dbrData){
		var cols = dbrData.fields, rows = dbrData.rows;

		var storeFields = [];

		for(var i=0,len=cols.length; i<len; i++){
			storeFields[i] = {
				name: cols[i].name
			};
		}
    
    //create a new store
		return new Ext.data.JsonStore({
		    autoDestroy: true,
		    data: {
				   rows: rows
				},
		    root: 'rows',
		    fields: storeFields
		});

	},
	
	_getNewChart : Ext.emptyFn,

	refreshChart : function(data){
		if(!data || data === this.store){return false;} //return if data is null or same store
		
	  this.store = data.recordType ? data : this.data2Store( data );

		this.keys = this.store.fields.keys;
		
		this.nextColorIndex = 0;
		
		if(this.keys.length < 2){return;}
		
		//need to recreate the chart each time since there is a bug in Ext 3.0.0
		try{
			this.remove( this.getComponent(0), true );
		}catch(e){
			this.remove( this.getComponent(0), false );
		}
		if(this.chart){
			delete(this.chart);
		}
		
		this.chart = this._getNewChart();
		this.add( this.chart );
		this.doLayout();
		this.mask(false);
		this.fireEvent('chartdraw', this);

	}
});

dbrui.Chart.SqlDateRenderer = function(v){
	var jsDate = Date.parseDate( v, 'M j Y h:i:s:uA') || Date.parseDate( v, 'M  j Y h:i:s:uA');
	return jsDate ? jsDate.format('M d, Y') : v;
}

/**
Line Chart
*/
dbrui.LineChart = Ext.extend(dbrui.Chart, {	
	initComponent: function(){
		
		dbrui.LineChart.superclass.initComponent.call(this); 
		
		this.extraStyle = this.extraStyle || {
			legend: {
				display: 'top',
				padding: 0,
	    		font:{
	      		size: 10
				}
			},
			xAxis: {
				labelRotation: 0
			}
		};
		
	},
	
	_createSeries : function(){
		var store = this.store, keys = this.keys,lines = [];
		
		for(var k=1; k<keys.length; k++){
			lines.push({
        type:'line',
        displayName: keys[k],
        yField: keys[k],
        style: {
          color: this.getColor(),
					lineSize:1,
					size:5
        }
      });
		}
		
		return lines;
	},
	
	_getNewChart : function(){
		var keys = this.keys;
		
		var xLabelFn = this.xAxisLabelFn;
		
		var yAxisCfg = Ext.apply({
			labelRenderer: this.yAxisLabelFn || Ext.util.Format.numberRenderer('0,000')
		}, this.yAxisCfg);

		return new Ext.chart.LineChart({
			store: this.store,
			xField: keys[0],
			xAxis: new Ext.chart.CategoryAxis({
       	displayName: keys[0],
				hideOverlappingLabels : false,
				labelRenderer: function(v){
					if(xLabelFn){
						return xLabelFn.call(this, v);
					}
					return v;
				}
       }),
			yAxis: new Ext.chart.NumericAxis(yAxisCfg),
			extraStyle: this.extraStyle,
			series: this._createSeries()
		});
	}
	
});
Ext.reg('dbrui_linechart', dbrui.LineChart);


/**
Bar Chart
*/

dbrui.BarChart = Ext.extend(dbrui.Chart, {
	
	initComponent: function(){
		dbrui.BarChart.superclass.initComponent.call(this); 
		
		this.extraStyle = this.extraStyle || {
			legend: {
				display: 'top',
				padding: 0,
      		font:{
        		size: 10
				}
			},
			xAxis: {
			labelRotation: 0
			}
		};
		
	},
	
	_createSeries : function(){
		var store = this.store, keys = this.keys,lines = [];
		
		for(var k=1; k<keys.length; k++){
			lines.push({
        type:'column',
        displayName: keys[k],
        yField: keys[k],
        style: {
            color: this.getColor()
        }
      });
		}
		
		return lines;
	},
	
	_getNewChart : function(){
		var store = this.store, keys = this.keys;
		
		var xLabelFn = this.xAxisLabelFn;
		var yAxisCfg = Ext.apply({
			labelRenderer: this.yAxisLabelFn || Ext.util.Format.numberRenderer('0,000')
		}, this.yAxisCfg);
		
		return new Ext.chart.ColumnChart({
			store: store,
			xField: keys[0],
			xAxis: new Ext.chart.CategoryAxis({
       	displayName: keys[0],
				hideOverlappingLabels : false,
				labelRenderer: function(v){
					if(xLabelFn){
						return xLabelFn.call(this, v);
					}
					return v;
				}
       }),
			yAxis: new Ext.chart.NumericAxis(yAxisCfg),
			extraStyle: this.extraStyle,
			series: this._createSeries()
		});
		
	}
	
});
Ext.reg('dbrui_barchart', dbrui.BarChart);


/**
Pie Chart
*/
dbrui.PieChart = Ext.extend(dbrui.Chart, {
	
	initComponent: function(){
		dbrui.PieChart.superclass.initComponent.call(this); 
	},
	

	_getNewChart : function(){
		var store = this.store, keys = this.keys;
		
		return new Ext.chart.PieChart({
			store: store,
			dataField: keys[1],
      categoryField: keys[0],
			extraStyle: {
				legend: {
					display: 'top',
					padding: 0,
       		font:{
         		size: 10
					}
				}
			}
		});
		
	}
	
});
Ext.reg('dbrui_piechart', dbrui.PieChart);