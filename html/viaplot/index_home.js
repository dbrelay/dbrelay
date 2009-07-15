$(function () {

	$("#viaplot_form").submit(function() {
	
		var options = {};
		
		options.url = $("base").attr("href") + "ex" + $("#result_num").val() + ".json";
	
		$(this).find("input[type='text']").each(function () {
		
			options[$(this).attr("id").replace("viaplot_", "")] = $(this).val();
		
		});
	
		$("#viaplot_target").viaplot(options);
			
		return false;
	
	});
});