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
  Create Table window, where user edits connection information

*/
dbrui.CreateTableWindow = Ext.extend(Ext.Window,{
	layout:'form',
	title:'Create Table',
	width:550,
	height:400,
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
		/*	{
				xtype:'panel',
				layout:'column',
				border:false, 
				autoHeight:true,
				height:'auto',
				anchor:'95%',  
				unstyled:true,
				items:[
					{
						columnWidth:.3,
						border:false,
						layout:'form',  
						labelAlign:'top', 
						unstyled:true, 
						items:[
							{
								xtype:'textfield',
								fieldLabel:'Name',
								id:'add_name'+idpfx,
								anchor:'99%'
							}
						] 
					},
					{
						columnWidth:.25,
						border:false,
						layout:'form',  
						labelAlign:'top',  
						unstyled:true, 
						items:[
							{
								xtype:'textfield',
								fieldLabel:'Data Type',
								id:'add_type'+idpfx,
								anchor:'99%'
							}
						] 
					},
					{
						columnWidth:.1,
						border:false,
						layout:'form',  
						labelAlign:'top',  
						unstyled:true, 
						items:[
							{
								xtype:'checkbox',
								fieldLabel:'Null?',
								id:'add_null'+idpfx,
								anchor:'99%'
							}
						] 
					},
					{
						columnWidth:.2,
						border:false,
						layout:'form',  
						labelAlign:'top', 
						unstyled:true, 
						items:[
							{
								xtype:'checkbox',
								fieldLabel:'Prmy Key?',
								id:'add_pkey'+idpfx,
								anchor:'99%'
							}
						] 
					},
					{
						columnWidth:.1,
						border:false,
						layout:'form',  
						labelAlign:'top',  
						unstyled:true, 
						items:[
							{
								xtype:'button',
								text:'Add Col',
								iconCls:'vaicon-plus',
								handler: function(){
								},
								scope:this
							}
						] 
					}
				]
			},    
			{
         xtype: 'multiselect',
         fieldLabel: 'Columns',
         width: 300,
         height: 200,
         allowBlank:false,
         store: [[123,'One Hundred Twenty Three'],
                 ['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['4', 'Four'], ['5', 'Five'],
                 ['6', 'Six'], ['7', 'Seven'], ['8', 'Eight'], ['9', 'Nine']],
         ddReorder: true 
      },   */
			
			//editable grid for columns
			{
				fieldLabel:'Columns',
				tooltip:'ex.  id INT PRIMARY KEY, name varchar(50)',
				id:'columns'+idpfx,
				xtype:'textarea',   
				anchor:'98% 90%',
				allowBlank:false,   
				selectOnFocus:true,
				value:'' //'id INT PRIMARY KEY,\nname varchar(50),\ndescription varchar(100),\ndays INT\n'
			}
		];
		
		this.buttons = [
			{
				text:'OK',
				iconCls:'icon-tick', 
				id:'okbtn'+idpfx,
				handler: this.onOK,
				scope:this
			},
			{
				text:'Cancel',
				iconCls:'icon-minus',
				handler:function(){this.hide()},
				scope:this
			}

		];
		
		dbrui.CreateTableWindow.superclass.initComponent.call(this);
		                            
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