(function ( $ ){

	var defaultKey		= 'lW0rsHCy0OVpLBwvuD0CcN6YovDzBtItCenRJYLkmf7m77Is', // Unique master Xively API key to be used as a default
		defaultFeeds	= ['972919931'], // Comma separated array of Xively Feed ID numbers
		applicationName	= '', // Replaces Xively logo in the header
		dataDuration	= '1week', // Default duration of data to be displayed // ref: https://xively.com/dev/docs/api/data/read/historical_data/
		dataInterval	= 900; // Default interval for data to be displayed (in seconds)

// Function Declarations

	// Graph Annotations
	function addAnnotation(force) {
		if (messages.length > 0 && (force || Math.random() >= 0.95)) {
			annotator.add(seriesData[2][seriesData[2].length-1].x, messages.shift());
		}
	}

	// Add One (1) Day to Date Object
	Date.prototype.addDays = function (d) {
		if (d) {
			var t = this.getTime();
			t = t + (d * 86400000);
			this.setTime(t);
		}
	};

	// Subtract One (1) Day to Date Object
	Date.prototype.subtractDays = function (d) {
		if (d) {
			var t = this.getTime();
			t = t - (d * 86400000);
			this.setTime(t);
		}
	};

	// Parse Xively ISO Date Format to Date Object
	Date.prototype.parseISO = function(iso){
		var stamp= Date.parse(iso);
		if(!stamp) throw iso +' Unknown date format';
		return new Date(stamp);
	}

	// Set xively API Key
	function setApiKey(key) {
		xively.setKey(key);
	}

	function updateFeeds(feedId, datastreamIds, duration, interval) {
		xively.feed.get(feedId, function(feedData) {
			if(feedData.datastreams) {
				if(datastreamIds == '' || !datastreamIds) {
					feedData.datastreams.forEach(function(datastream) {
						datastreamIds += datastream.id + " ";
					});
				}

				var palette = new Rickshaw.Color.Palette({ scheme: 'classic9' });
				feedData.datastreams.forEach(function(datastream) {
					var now = new Date();
					var then = new Date();
					var updated = new Date;
					updated = updated.parseISO(datastream.at);
					var diff = null;
					if(duration == '6hours') diff = 21600000;
					 if(duration == '1day') diff = 86400000;
					 if(duration == '1week') diff = 604800000;
					 if(duration == '1month') diff = 2628000000;
					 if(duration == '90days') diff = 7884000000;
					then.setTime(now.getTime() - diff);
					if(updated.getTime() > then.getTime()) {
						if(datastreamIds && datastreamIds != '' && datastreamIds.indexOf(datastream.id) >= 0) {
							xively.datastream.history(feedId, datastream.id, {duration: duration, interval: interval, limit: 1000}, function(datastreamData) {

								var series = [];
								var points = [];

								// Create Datastream UI
								$('.datastream-' + datastream.id).empty();
								$('.datastream-' + datastream.id).remove();
								$('#feed-' + feedId + ' .datastream.hidden').clone().appendTo('#feed-' + feedId + ' .datastreams').addClass('datastream-' + datastream.id).removeClass('hidden');

								// Check for Datastream Tags
								var tagsHtml = '';
								if(datastreamData.tags) {
									tagsHtml = '<div style="font-size: 14px;"><span class="radius secondary label">' + datastreamData.tags.join('</span> <span class="radius secondary label">') + '</span></div>';
								} else {
									tagsHtml = '';
								}

								// Fill Datastream UI with Data
								$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-name').html(datastream.id);
								$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value);

								// Include Datastream Unit (If Available)
								if(datastream.unit) {
									if(datastream.unit.symbol) {
										$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value + datastream.unit.symbol);
									} else {
										$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value);
									}
								} else {
									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .datastream-value').html(datastream.current_value);
								}
								$('.datastream-' + datastream.id).removeClass('hidden');

								// Historical Datapoints
								if(datastreamData.datapoints) {

									// Add Each Datapoint to Array
									datastreamData.datapoints.forEach(function(datapoint) {
										points.push({x: new Date(datapoint.at).getTime()/1000.0, y: parseFloat(datapoint.value)});
									});

									// Add Datapoints Array to Graph Series Array
									series.push({
										name: datastream.id,
										data: points,
										color: palette.color(datastream.id)
									});

									// Initialize Graph DOM Element
									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .graph').attr('id', 'graph-' + feedId + '-' + datastream.id);

						 			// Build Graph
									var graph = new Rickshaw.Graph( {
										element: document.querySelector('#graph-' + feedId + '-' + datastream.id),
										width: 600,
										height: 200,
										renderer: 'line',
										min: parseFloat(datastream.min_value) - .25*(parseFloat(datastream.max_value) - parseFloat(datastream.min_value)),
										max: parseFloat(datastream.max_value) + .25*(parseFloat(datastream.max_value) - parseFloat(datastream.min_value)),
										padding: {
											top: 0.02,
											right: 0.02,
											bottom: 0.02,
											left: 0.02
										},
										series: series
									});

									graph.render();

									var ticksTreatment = 'glow';

									// Define and Render X Axis (Time Values)
									var xAxis = new Rickshaw.Graph.Axis.Time( {
										graph: graph,
										ticksTreatment: ticksTreatment
									});
									xAxis.render();

									// Define and Render Y Axis (Datastream Values)
									var yAxis = new Rickshaw.Graph.Axis.Y( {
										graph: graph,
										tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
										ticksTreatment: ticksTreatment
									});
									yAxis.render();

									// Enable Datapoint Hover Values
									var hoverDetail = new Rickshaw.Graph.HoverDetail({
										graph: graph,
										formatter: function(series, x, y) {
											var date = '<span class="date">' + new Date(x * 1000).toLocaleString() + '</span>';
											var swatch = '<span class="detail_swatch" style="background-color: ' + series.color + ' padding: 4px;"></span>';
											var content = swatch + "&nbsp;&nbsp;" + parseFloat(y) + '&nbsp;&nbsp;<br>';
											return content;
										},
										xFormatter: function(x) {
											return new Date(x * 1000).toLocaleString();
										},
									});

									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .slider').prop('id', 'slider-' + feedId + '-' + datastream.id);
									var slider = new Rickshaw.Graph.RangeSlider({
	            	   					graph: graph,
	        	       					element: $('#slider-' + feedId + '-' + datastream.id)
	               					});
								} else {
									$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .graphWrapper').addClass('hidden');
								}
							});
						} else {
							console.log('Datastream not requested! (' + datastream.id + ')');
						}
					} else {
						$('#feed-' + feedId + ' .datastreams .datastream-' + datastream.id + ' .graphWrapper').html('<div class="alert alert-box no-info">Sorry, this datastream does not have any associated data.</div>');
					}
				});
			}
			//$('#loadingData').foundation('reveal', 'close');
		});
	}

	function setFeeds(feeds) {
		feeds.forEach(function(id) {

			var thisFeedId, thisFeedDatastreams;
			if(id.indexOf('!') > 0) {
				thisFeedId = id.substring(0, id.indexOf('!'));
				thisFeedDatastreams = id.substring(id.indexOf('!')+1).split('!');
			} else {
				thisFeedId = id;
			}
			id = thisFeedId;

			if($('#feed-' + id)) {
				$('#feed-' + id).remove();
			}
			xively.feed.history(id, {  duration: "6hours", interval: 30 }, function (data) {
				if(data.id == id) {
					// Duplicate Example to Build Feed UI
					$('#exampleFeed').clone().appendTo('#feeds').attr('id', 'feed-' + id).removeClass('hidden');

					$('#feed-' + data.id + ' .duration-hour').click(function() {
						//$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '6hours', 30);
						return false;
					});

					$('#feed-' + data.id + ' .duration-day').click(function() {
						//$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '1day', 60);
						return false;
					});

					$('#feed-' + data.id + ' .duration-week').click(function() {
						//$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '1week', 900);
						return false;
					});

					$('#feed-' + data.id + ' .duration-month').click(function() {
						//$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '1month', 1800);
						return false;
					});

					$('#feed-' + data.id + ' .duration-90').click(function() {
						//$('#loadingData').foundation('reveal', 'open');
						updateFeeds(data.id, thisFeedDatastreams, '90days', 10800);
						return false;
					});

					// Handle Datastreams
					if(dataDuration != '' && dataInterval != 0) {
						updateFeeds(data.id, thisFeedDatastreams, dataDuration, dataInterval);
					} else {
						updateFeeds(data.id, thisFeedDatastreams, '6hours', 30);
					}
				}
			});
		});
	}
// END Function Declarations

// BEGIN Initialization

	if(applicationName != '') {
		$('h2').html(applicationName).css('color', 'white');
		document.title = applicationName;
	}

	setApiKey(defaultKey);
	setFeeds(defaultFeeds);

// END Initialization

})( jQuery );
