/**
  Connection window, where user edits connection information

*/
va.CreateTableWindow = Ext.extend(Ext.Window,{
	layout:'form',
	title:'Create Table',
	width:400,
	height:300,
	modal:true,
	defaults:{border:false}, 
  
 	initComponent : function(){
	  var idpfx = Ext.id(); //ensure unique ids
	
		this.items = [
			{
				fieldLabel:'Table Name',
				id:'name'+idpfx,
				xtype:'textfield', 
				anchor:'98%',
				allowBlank:false
			},  
			//editable grid for columns
			{
				fieldLabel:'Columns',
				id:'columns'+idpfx,
				xtype:'textarea',   
				anchor:'98% 90%',
				allowBlank:false,   
				selectOnFocus:true,
				value:"id INT PRIMARY KEY, name varchar(50), description varchar(100), days INT"
			}
		];
		
		this.buttons = [
			{
				text:'OK',
				iconCls:'vaicon-tick', 
				id:'okbtn'+idpfx,
				handler: this.onOK,
				scope:this
			},
			{
				text:'Cancel',
				iconCls:'vaicon-minus',
				handler:function(){this.hide()},
				scope:this
			}

		];
		
		va.CreateTableWindow.superclass.initComponent.call(this);
		                            
		this.fields = {    
			table : this.findById('name'+ idpfx),  
			columns : this.findById('columns'+ idpfx)
		};
		
		this.addEvents({    
			/** Fired when response is received from server */
			'ok' : true
		}); 
		

	},
	
	/* private handler */
	onOK : function(){
	  var fail = false;
	
		for(var f in this.fields){
			if(!this.fields[f].validate()){
				fail = true;
			}
		}
		 
		if(!fail){
                   
	    this.fireEvent('ok', this, this.fields['table'].getValue(), this.fields['columns'].getValue());  
			this.hide();
	
			
			   
		}  
	}  

});