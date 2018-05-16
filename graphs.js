queue()
    .defer(d3.csv, "data/estimated_crimes_final.csv")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, projectsJson, statesJson) {
	
	//Clean projectsJson data
	var crimes = projectsJson;
	var dateFormat = d3.time.format("%Y");
	crimes.forEach(function(d) {
		d["year"] = dateFormat.parse(d["year"]);
		d["year"].setDate(1);
		
	});

	//Create a Crossfilter instance
	var ndx = crossfilter(crimes);

	//Define Dimensions
	var dateDim = ndx.dimension(function(d) { return d["year"]; });
	var crimeTypeDim = ndx.dimension(function(d) { return d["crime_type"]; });
	var stateDim = ndx.dimension(function(d) { return d["state"]; });
	var totalDonationsDim  = ndx.dimension(function(d) { return d["total"]; });


	//Calculate metrics
	var numProjectsByDate = dateDim.group().reduceSum(function(d) {
		return d["total"];	
	});
	var numProjectsBycrimeType = crimeTypeDim.group().reduceSum(function(d) {
		return d["total"];	
	});
	var totalCrimesByState = stateDim.group().reduceSum(function(d) {
		return d["total"];	
	});
	var all = ndx.groupAll();
	var totalDonations = ndx.groupAll().reduceSum(function(d) {return d["total"];});

	var max_state = totalCrimesByState.top(1)[0].value;
	
	var mincrimesState = crimeTypeDim.bottom(1)[0].value;
	var maxcrimesState = crimeTypeDim.top(1)[0].value;
	
	//Define values (to be used in charts)
	var minDate = dateDim.bottom(1)[0]["year"];
	var maxDate = dateDim.top(1)[0]["year"];

    //Charts
	var timeChart = dc.barChart("#time-chart");
	var resourceTypeChart = dc.rowChart("#resource-type-row-chart");
	var crimesTypePie = dc.pieChart("#resource-crime-pie");
	var usChart = dc.geoChoroplethChart("#us-chart");
	var totalCrimesND = dc.numberDisplay("#total-crimes-nd");

	
	totalCrimesND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(totalDonations)
		.formatNumber(d3.format(".3s"))
		

	timeChart
		.width(600)
		.height(160)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.dimension(dateDim)
		.group(numProjectsByDate)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.elasticY(true)
		.xAxisLabel("Year")
		.yAxis()
		.tickFormat(d3.format('.3s'))
		.ticks(4)
		
	crimesTypePie
		.width(150)
        .height(250)
        .innerRadius(30)
        .renderLabel(false)
        .legend(dc.legend().x(180).y(100).itemHeight(13).gap(5))
        .dimension(crimeTypeDim)
        .group(numProjectsBycrimeType)
     
	
	resourceTypeChart
        .width(300)
        .height(250)
        .dimension(crimeTypeDim)
        .group(numProjectsBycrimeType)
        .transitionDuration(500)
		.x(d3.time.scale().domain([mincrimesState, maxcrimesState]))
		.elasticX(true)
        .xAxis()
        .tickFormat(d3.format('.3s'))
        .ticks(4);


	usChart.width(1000)
		.height(330)
		.dimension(stateDim)
		.group(totalCrimesByState)
		.colors(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"])
		.colorDomain([0, max_state])
		.overlayGeoJson(statesJson["features"], "state", function (d) {
			return d.properties.name;
		})
		.projection(d3.geo.albersUsa()
    				.scale(600)
    				.translate([340, 150]))
		.title(function (p) {
			return "State: " + p["key"]
					+ "\n"
					+ "Total Crimes: " + Math.round(p["value"]);
		})

    dc.renderAll();

};