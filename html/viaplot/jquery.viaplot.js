/*
	jQuery viaPlot plugin
	by Peter Snyder (snyderp@gmail.com)
	Chart results from a Viaduct install
	Options:
		height and width: define the size of the box
		size: accepts either max or min.  Defines whether the passed sizes are the max or min sizes for the image
	
*/
(function () {

	jQuery.fn.viaplot = function (options) {
		
		$("body").append("<div id='viaplot_tooltip' style='display: none;'>Test Text</div>");

		jQuery.fn.viaplot.tooltip = $("#viaplot_tooltip");
		jQuery.fn.viaplot.tooltip.css("position", "absolute").css("opacity", .8);
		
		var opts = jQuery.extend({}, jQuery.fn.viaplot.defaults, options);

		// If the series were passed as a string instead of an array, parse them into an array now
		if (opts.series && typeof opts.series == "string") {
		
			opts.series = opts.series.split(",");

			opts.series = jQuery.map(opts.series, function (n) {
						
				return jQuery.trim(n);
							
			});
		}
			
		// Fields types that should be interepreted as dates and not strings or numbers	
		var date_fields = ["smalldatetime", "date", "timestamp", "datetime"];
	
		// Fields that are not of this type will be removed from the chart
		var valid_datatypes = ["bit", "int", "smallint", "tinyint", "decimal", "numeric", "money", "smallmoney", "float", "real", "smalldatetime", "date", "timestamp", "datetime"];
	
		var viaplot_elms = this;
		
		jQuery.post(opts.url,
		{sql: opts.sql},
		function (json) {
				
			if (json) {
			
				var i, j; // reuse some indexes for loops
				var datasets = []; // Container that will hold the sets of date for Flot to graph
				var local_dataset;
				var date_results = []; // Names of the fields that should be interpreted as dates
				var series_to_graph = []; // Names of the fields we should graph against the x-axis
				var x_labels_mapping = []; // Mapping of x_labels to integers.
				
				// Save a couple of checks later on by seeing if we have a valid x_labels setting
				var x_labels_set = (opts.x_labels && typeof opts.x_labels == "string"); 

				// determine which results we should plot
				// If the series option is set, we're done, just use that
				if (opts.series && typeof opts.series == "object") {
				
					series_to_graph = opts.series;
										
				} else {
				
					// If no series are specified, go do default behavior,
					// which is to use all fields returned in the first result set					
					for (i = 0; i < json.data[0].fields.length; i++) {
					
						series_to_graph.push(json.data[0].fields[i].name);
					
					}

					var x_axis_index;

					// If a field is specified as being used for the x-axis's labels,
					// remove it from the set of series
					if (x_labels_set) {

						x_axis_index = jQuery.inArray(opts.x_labels, series_to_graph);
						
						if (x_axis_index > -1) {
						
							series_to_graph.splice(x_axis_index, 1);
						
						}
					}
				}

				// Remove any items from the "series_to_graph" array that are not valid field types				
				var temp_series_to_graph = [];

				// Iterate through all possible series to graph				
				for (i = 0; i < series_to_graph.length; i++) {
					
					var found = false;
				
					// We need to find the SQL type for each field, so iterate through all fields 
					// until we find the series we're testing
					for (j = 0; j < json.data[0].fields.length && !found; j++) {

						// we've found the series we're testing
						if (json.data[0].fields[j].name === series_to_graph[i]) {

							// Make sure that the SQL type for this field is a valid_datatypes 
							if (jQuery.inArray(json.data[0].fields[j].sql_type, valid_datatypes) !== -1) {
							
								// If so, add it to our temporary list of valid series_to_graph
								// which we'll end up dumping back into the actual series_to_graph
								// we're using
								temp_series_to_graph.push(series_to_graph[i]);
							
							}
							
							// We can stop looking for this field, so set found to true to stop iterating 
							// through the field data
							found = true;
						} 
					}
				}
				
				series_to_graph = temp_series_to_graph;
				
				var time_field_index;
				
				// look to see if any of our data needs to be converted to timestamps
				// Do this by first iterating through the fields
				for (i = 0; i < json.data[0].fields.length; i++) {
				
					time_field_index = jQuery.inArray(json.data[0].fields[i].sql_type, date_fields);
				
					if (time_field_index > -1) {
					
						date_results.push(json.data[0].fields[i].name);
					
					}				
				}
				
				// If there is no x_label setting, we know that all x values will be integers
				// and we can skip this step
				if (x_labels_set) {

					var x_label_is_date_test;

					// If the x_labels data is not numeric or date, map it against integers
					for (i = 0; i < json.data[0].rows.length; i++) {

						x_label_is_date_test = (jQuery.inArray(opts.x_labels, date_results) !== -1)

						x_labels_mapping[i] = (x_label_is_date_test) 
							? Date.fromString(json.data[0].rows[i][opts.x_labels]).getTime()
							: json.data[0].rows[i][opts.x_labels];
					}
				}
				
				var placeholder_y; // Value of the item we're plotting on the y axis

				// build the datasets.  Begin by iterating through each field we need to graph
				for (j = 0; j < series_to_graph.length; j++) {
				
					local_dataset = {};
					local_dataset.label = series_to_graph[j];
					local_dataset.data = [];
					
					// And now iterate through each resulting row
					for (i = 0; i < json.data[0].rows.length; i++) {

						// See if this item is a date, and if so, convert to time stamp
						placeholder_y = (jQuery.inArray(series_to_graph[j], date_results) === -1)
							? json.data[0].rows[i][series_to_graph[j]]
							: Date.fromString(json.data[0].rows[i][series_to_graph[j]]).getTime();

						// If an x-label column is specified, use that for the x value
						if (x_labels_set) {
						
							// If the x-label column is a date, make that conversion too
							if (jQuery.inArray(opts.x_labels, date_results) === -1) {
																		
								if (isNaN(json.data[0].rows[i][opts.x_labels] * 1)) {
							
									local_dataset.data.push([i, placeholder_y]);		
																				
								} else {

									local_dataset.data.push([json.data[0].rows[i][opts.x_labels], placeholder_y]);
								
								}							
							
							} else {
							
								local_dataset.data.push([Date.fromString(json.data[0].rows[i][opts.x_labels]), placeholder_y]);		

							}
						
						// Otherwise, just use the result's location in the result set
						} else { 
						
							local_dataset.data.push([i, placeholder_y]);
						
						}					
					}
					
					datasets.push(local_dataset);
				}
								
				viaplot_elms.each(function () {
				
					if (opts.height) {
					
						$(this).css("height", opts.height);
					
					}
					
					if (opts.width) {

						$(this).css("width", opts.width);
					
					}
					
					var options = {
						grid: {
							hoverable: true
						}	
					};
					
					if (x_labels_set) {

						options.xaxis = {}
					
						// If the x-axis is a date, set the x-axis accordingly
						if (jQuery.inArray(opts.x_labels, date_results) !== -1) {
					
							options.xaxis.mode = "time";
						
						// Otherwise, map the x-axis values against integers, create
						// the ticks array (array of array) and set the xaxis accordingly
						} else {
							
							var ticks = [];
												
							for (i = 0; i < x_labels_mapping.length; i++) {
							
								ticks.push([i, x_labels_mapping[i]]);
							
							}
						
							options.xaxis.ticks = ticks;
						
						}
					}
					
					$.plot($(this), datasets, options);
					
					$(this).bind("plothover", function (event, pos, item) {
					
						if (item) {

							jQuery.fn.viaplot.popup_at_point(item);
						
						} else {
						
							jQuery.fn.viaplot.hide_popup();
						
						}
					});
				
				});	
			}
		},
		"json");
	}
	
	jQuery.fn.viaplot.popup_offset = {
		x: 10,
		y: 20
	};
	
	jQuery.fn.viaplot.hide_popup = function () {
	
		jQuery.fn.viaplot.tooltip.hide();
	
	};
	
	jQuery.fn.viaplot.popup_at_point = function (item) {
	
		jQuery.fn.viaplot.tooltip.css("top",(item.pageY - jQuery.fn.viaplot.popup_offset.x) + "px")
								.css("left",(item.pageX + jQuery.fn.viaplot.popup_offset.y) + "px")
								.text("[" + item.datapoint[0] + ", " + item.datapoint[1] + "]")
								.show();
	};		
	
	jQuery.fn.viaplot.defaults = {
		url: "/viaduct/sql",
		sql: false,
		x_labels: false,
		series: false,
		height: false,
		width: 	false,
		size:	"max"
	};


})(jQuery);