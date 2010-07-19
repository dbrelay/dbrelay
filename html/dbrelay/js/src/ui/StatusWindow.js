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
dbrui.StatusWindow = Ext.extend(Ext.Window,{
	layout:'fit',
	title:'DBRelay Connection Status',
	width:700,
	height:450,
	modal:false,
	defaults:{border:false},
	
	
	initComponent : function(){
	  var _idpfx = Ext.id(); //ensure unique ids

    this.tbar = [
			{
				text:'Refresh',
				iconCls:'icon-refresh',
				handler:function(){
					this.refresh();
				},
				scope:this
			},
			'-',
			{
				text:'Kill',
				iconCls:'icon-disconnect',
				handler:function(){
					this.killSelectedConnections();
				},
				scope:this
			}
				
		];
		
		this.buttons = [
			{
				text:'Close',
				iconCls:'icon-minus',
				handler:function(){
					this.hide();
				},
				scope:this
			}
		];
		
		//custom cell renderer
		function _inuse(value, metaData, record, rowIndex, colIndex, store){
      if(record.get('in_use') === 0){
          return '<span style="color:green;">' + val + '</span>';
      }
      return val;
    }
		
		var sm = new Ext.grid.CheckboxSelectionModel();
		
		this.items = {
				xtype:'grid',
				id:'grid' + _idpfx,
        store: new Ext.data.JsonStore({
					autoDestroy: true,
					root: 'connections',
	        fields: [
	           {name: 'slot', type: 'int'},
	           {name: 'pid', type: 'int'},
	           {name: 'name'},
	           {name: 'tm_created', type: 'date', dateFormat: 'Y-m-d H:i:s'},
	           {name: 'tm_accessed', type: 'date', dateFormat: 'Y-m-d H:i:s'},
						 {name: 'connection_timeout', type: 'int'},
						 {name: 'in_use', type: 'int'},
						 {name: 'sock_path'},
						 {name: 'helper_pid', type: 'int'},
						 {name: 'sql_server'},
						 {name: 'sql_database'},
						 {name: 'sql_user'},
						{name: 'sql_port'}
	        ]
		    }),
        columns: [
					sm,
					{header: "Slot", id:'slot', width: 30, sortable: true, dataIndex: 'slot'},
          {header: "PID", width: 50, sortable: true, dataIndex: 'pid'},

          {header: "Name", width: 150, sortable: true, dataIndex: 'name'},
          {header: "Created", width: 85, sortable: true, renderer: Ext.util.Format.dateRenderer('m/d/Y g:ia'), dataIndex: 'tm_created'},
          {header: "Last Accessed", width: 85, sortable: true, renderer: Ext.util.Format.dateRenderer('m/d/Y g:ia'), dataIndex: 'tm_accessed'},

					{header: "SQL Server", width: 85, sortable: true, hidden:true, dataIndex: 'sql_server'},
					{header: "SQL Database", width: 85, sortable: true, hidden:true, dataIndex: 'sql_database'},
					{header: "SQL User", width: 85, sortable: true, hidden:true, dataIndex: 'sql_user'},
					{header: "SQL Port", width: 85, sortable: true, hidden:true, dataIndex: 'sql_port'},

          {header: "Timeout", width: 50, sortable: true, dataIndex: 'connection_timeout'},
					{header: "In Use", width: 50, sortable: true, dataIndex: 'in_use'},
          {header: "Socket", width: 100, sortable: true, dataIndex: 'sock_path'},

					{header: "Helper PID", width: 50, sortable: true, hidden:true, dataIndex: 'helper_pid'}
        ],
    		sm:sm,
				viewConfig:{
					forceFit:true
				},
        stripeRows: true,
        autoExpandColumn: 'name',
				listeners:{
					'render':{
						fn:function(g){
							this.refresh();
						},
						scope:this
					}
				}
    };
		this.statusData = [];
		
		dbrui.StatusWindow.superclass.initComponent.call(this);
		this.idpfx = _idpfx;
		
		this.grid = this.findById('grid' + _idpfx);
		
	},
	
	refresh : function(){
		var data = [];
		
		//request status from server
		var grid = this.grid;
		 dbrelayStatus(function(json){
				grid.getStore().loadData(json.status);
		 });

		
	},
	
	killSelectedConnections: function(){
		//array of selected records
		var t=this, rows = this.grid.getSelectionModel().getSelections();
		
		for(var i=0, len=rows.length; i< len; i++){
			var rec = rows[i];

			dbrelayKillConnection( rec.get('sock_path'), function(json){
				var status = json.cmd.status;
					t.refresh();
			 });
		}
		
	}
	
	
});


