Ext.namespace('dbrui');

dbrui.Chart = Ext.extend(Ext.Panel,{
	nextColorIndex : 0,
	layout:'fit',
	
	initComponent: function(){

		this.items = {
			html:'sdf'
		};
		
		dbrui.Chart.superclass.initComponent.call(this); 
		this.colors = ['#4572A7','#AA4643','#89A54E','#71588F','#4198AF','#DB843D','#93A9CF','#D19392','#B9CD96','#A99BBD'];
		/*if(this.data ){
			this.on('afterlayout', function(p){
				this.refreshChart( this.data );
			}, this,{single:true});
		}*/
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
		var cols = data.fields, rows = data.rows;

		var storeFields = [];

		for(var i=0,len=cols.length; i<len; i++){
			storeFields[i] = {
				name: cols[i].name
			};
		}
    
    //create a new store
		return new Ext.data.JsonStore({
		    autoDestroy: false,
		    data: {
				   rows: rows
				},
		    root: 'rows',
		    fields: storeFields
		});

	},
	
	_getNewChart : Ext.emptyFn,

	refreshChart : function(data){
		if(!data || data === this.data){return false;} //return if data is null or same store
		
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
		this.chart = this._getNewChart();
		this.add( this.chart );
		this.doLayout();

	}
});



/**
Line Chart
*/
dbrui.LineChart = Ext.extend(dbrui.Chart, {
	
	initComponent: function(){
		dbrui.LineChart.superclass.initComponent.call(this); 
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
		
		return new Ext.chart.LineChart({
			store: this.store,
			xField: keys[0],
			xAxis: new Ext.chart.CategoryAxis({
       	displayName: keys[0]
       }),
			yAxis: new Ext.chart.NumericAxis({
				labelRenderer: Ext.util.Format.numberRenderer('0,000')
			}),
			extraStyle: {
				legend: {
					display: 'top',
					padding: 0,
        		font:{
          		size: 10
					}
				},
				xAxis: {
				labelRotation: -80
				}
			},
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

		return new Ext.chart.ColumnChart({
			store: store,
			xField: keys[0],
			xAxis: new Ext.chart.CategoryAxis({
       	displayName: keys[0]
       }),
			yAxis: new Ext.chart.NumericAxis({
				labelRenderer: Ext.util.Format.numberRenderer('0,000')
			}),
			extraStyle: {
				legend: {
					display: 'top',
					padding: 0,
        		font:{
          		size: 10
					}
				},
				xAxis: {
				labelRotation: -80
				}
			},
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