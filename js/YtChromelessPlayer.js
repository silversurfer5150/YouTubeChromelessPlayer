/*
* Youtube Chromeless Video Plugin
* http://www.alightdigital.co.uk/
*
* Copyright (c) 2012 Will Edwards
* Dual licensed under the MIT and GPL licenses.
* Uses the same license as jQuery, see:
* http://jquery.org/license
*
* @version 1.0
*/

(function( $ ){
  
  $.fn.YtChromelessPlayer = function(options, callback) {
  
              		
	//Default Options
	var defaults = {
	player_div_id : 'myytplayer',
	width : '640', 
	height : '360',
	autostart: false,
	skin : "iStyle",
        skin_switcher: true,
        hyperlink: "http://www.youtube.com",
        all_skins: [ "Dark", "Light", "iStyle", "odStyle", "Custom"],
	params : {
	allowScriptAccess: 'always',
	wmode: 'opaque'
	}  
	};
	
	
	var Options    = $.extend(defaults, options);  // get defaults and merge with user defined options
	defaults.custom_image = "css/images/" + Options.skin + ".png";
	this.each(function(i) {  // Loop through every instance of the chosen selector (every embedded Youtube iframe)
	
		var ytplayer; // create master player object for each api player on page
		var Player;  // create master player object for each player container on page	
		var src = $(this).attr("src");  // get src tag from each iframe 
		var video_id = src.substr(24, 11); // get video id from each src tag
		console.log(video_id);
		var player_id = Options.player_div_id + i;  // each player will be myytplayer0, 1 .....and so on
		
		// Replace iframe with unique div and id so that swf object can put the player there
		
		$(this).replaceWith("<div class='player_container" + i + "' style='display:none;position:relative;margin:0 auto;width:" + Options.width + "px;height:" + Options.height + "px' id='" + video_id +"'><div id='" + player_id + "'></div></div>");
		
		// select new element with jquery and assign it to master container object ready to return for chaining
		Player =  $(".player_container" + i + ""); 
			 
                Options.autostart === true ? Player.start_flag = true : Player.start_flag = false;  // tells the app when the player has begun playing video
                Player.end_flag = false;  // tells the app when the video has ended
                Player.current_skin = Options.skin;
                Player.last_volume = 100;
                
                
                // Bind Public Functions Upfront for access outside the plugin
                
		 Player.bind({
		
		  // playing, pausing, muting etc
		  'PlayPause' : function(){ Player.PlayPause(); },
		  'SetVolume' : function(){ Player.SetVolume(); },
		  'MuteUnmute' : function() { Player.MuteUnmute(); },
		  'Update' : function(){ Player.Update(); },
		  'Seek' : function() { Player.Seek(); },
		  'GetQuality' : function() { Player.GetQuality(); },
		  'ChangeQuality' : function() { Player.ChangeQuality(); },
		  'GetSkin' : function() { Player.GetSkin(); },
		  'ChangeSkin' : function() { Player.ChangeSkin(); }
		});
		   
           
		// Public Functions For Player Control From Outside Of Plugin
		
		Player.PlayPause = function() {
		    if(ytplayer && ytplayer.getDuration)
		   {  
		           if(Player.has("img.thumbnail"))
		           {
		                Player.find('.thumbnail, .big_play').hide();
		           }
		           if(!Player.hasClass("playing")) 
		           {
				Player.play.tooltip({content : "pause"});
				ytplayer.playVideo();
				Player.addClass("playing");
				Player.interval = setInterval(Player.Update,200);
		           }
		           else
		           {
				Player.play.tooltip({content : "play"});
				ytplayer.pauseVideo();
				Player.removeClass("playing");
				clearInterval(Player.interval);
		           }
		      }
		      else
		      {
		            alert("error; video not loaded from YouTube, please refresh page and try again.");
		      }
		}; 
		
		
		Player.MuteUnmute = function() {
			
			if(ytplayer && !Player.mute.hasClass("muted"))
			{
		        	Player.last_volume = ytplayer.getVolume();
		        			        				
				Player.mute.tooltip( "option", "content", "muted");
				Player.mute.addClass('muted');
				ytplayer.mute();
				Player.volume.slider({'value' : 0,'disabled' : true});
			}
			else
			{
				Player.mute.tooltip( "option", "content", "volume");
				Player.mute.removeClass('muted');
				ytplayer.unMute();
				ytplayer.setVolume(Player.last_volume);
				Player.volume.slider({'value' : Player.last_volume,'disabled' : false});		
			}
		};
		
		Player.SetVolume = function() {
			if(ytplayer)
			{	 			       		    	 					
				ytplayer.setVolume(Player.volume.slider('value'));	
			}
		};
		
		Player.Update = function() {	
				if( ytplayer) {						
				Player.seek_bar.slider( "option", { disabled: false} );
				var loaded = Math.round(Math.min(ytplayer.getVideoLoadedFraction(), 1) * 100);
				var duration = ytplayer.getDuration();
				Player.progress.progressbar({ max: 100, value: loaded });
				Player.seek_bar.slider({ max: duration, value: ytplayer.getCurrentTime()});
				var current_time = format_time(ytplayer.getCurrentTime());
				Player.timer.text(current_time);
				Player.duration.text(format_time(duration));
				var state = ytplayer.getPlayerState();
				switch(state)
				{
				case 0:
				        if(Player.end_flag === false)
				        {
					Player.seek_bar.slider({ value: 0});
					Player.timer.text( "00:00:00");
					Player.play.tooltip({content : "play"});
				        clearInterval(Player.interval);
					Player.removeClass("playing");	
					$('.thumbnail, .big_play',Player).show(); 					
					}
					Player.end_flag = true;    // tell the player it is ended so that it can't re-enter the above expression whilst the api is reloading
					break;				
				case 1:
                                        Player.end_flag = false;  // playback is resumed so now the player must have the flag reset so that it can recognize the end of a video
				break;
				}
			} 
		};
		
		
		Player.Seek = function()
		{      
			if(ytplayer)
			{
				var new_pos = Player.seek_bar.slider('value');
				Player.seek_bar.slider({ value: new_pos});        
				ytplayer.seekTo(new_pos, true); 
				Player.trigger("PlayPause"); // call pause to retrigger the update function
				
				if(!Player.hasClass("playing"))  // if player is paused before you seek you need to trigger play again here
				{  
					Player.trigger("PlayPause");
				} 
			}    
		};
		
		
		Player.GetQuality = function()
		{   	 
		       // the expression below ensures that
		       // 1. No quality menu can be added to the player until it is ready and the quality levels are returned from the API 		          
		       // 2. The quality function cannot be called after a video finishes until replay to prevent it loaded from last known position 
		       
		       	Player.quality.tooltip("disable");
			if (ytplayer && ytplayer.getPlayerState() !== -1 && ytplayer.getPlayerState() !== 0)
			{
               	         var levels = ytplayer.getAvailableQualityLevels();
				var list = $("<ul>");
				var current = ytplayer.getPlaybackQuality();
					$.each(levels, function(index, value) {
					switch(value)
					{
						case "small":
						value = value + " " + "240p";
						break;
						case "medium":
						value = value + " " + "360p";
						break;
						case "large":
						value = value + " " + "480p";
						break;
						case "hd720":
						value = value + " " + "720p";
						break;
						case "hd1080":
						value = value + " " + "1080p";
						break;
						case "hires":
						value = value + " " + "> 1080p";
						break;
					}
					var link_value = value.split(" ");
					list.append("<li><a href='#' onClick='return false;'><span class='" + link_value[0] + "'>" + value + "</span></a></li>");
					});
					list.append("<li><a href='#' onClick='return false;'>auto</a></li>");
					Player.quality_menu = list.menu({
					 select: function(event,ui){
					 Player.ChangeQuality(ui.item.text());		  
					}
					}).css({width:'100px', position: 'absolute', bottom: '20px', left: '0', textAlign: "left"}).appendTo(Player.quality); 	
					 $(".quality ul li a span." + current + "").addClass("active");	 
			}
			
			if(Player.skin_menu)  // hide the other menu (skin) if showing
			{
				Player.skin_menu.hide()
				Player.change_skin.tooltip("enable");
			}	
			
			Player.quality_menu.show();    // show menu, must hide onclick and on hover out
			
			Player.quality_menu.click(function(){			
			$(this).remove();
			$(this).parent().tooltip("enable");			
			Player.quality.css({backgroundColor: "transparent"}).tooltip("enable");	
			});	       
			
			Player.quality_menu.hoverIntent(function(){
			// ui menu widget takes care of hover in
			},function(){
			$(this).remove();
			Player.quality.tooltip("enable");				
			});
			
		}; 
		
		
		Player.ChangeQuality = function(quality)
		{      
		        var quality = quality.split(" ");  // remove 360, 720p etc just need yt friendly variables
		        if(quality[0] === "auto")
		        {
		       	        quality[0] = "default";
		        }
			if(ytplayer)
			{   
				ytplayer.setPlaybackQuality(quality[0]);	
			}			
		};
		
		
		Player.GetSkin = function()
		{      	       
				if(Player.quality_menu && Player.quality_menu.length > 0)  
				{
				Player.quality_menu.hide();    // hide the other menu
				Player.quality.tooltip("enable");
				}		        
				Player.skin_menu.show();  // unlike quality, we know all skins so the menu is already there just needs hide/show
				        		      					
				Player.skin_menu.click(function(){
				$(this).hide();
				Player.change_skin.tooltip("enable");	
				});	
				Player.skin_menu.hoverIntent(function() {
				$(this).show();
				},
				function() {
				$(this).hide();
				Player.change_skin.tooltip("enable");	
				}
				);
		};
		
		
		Player.ChangeSkin = function(skin)
		{      
		     // Remove previous skin , store new skin in the player options for next time, add the new skin
		     var identifier = Player.attr("id"); // need to apply this only to the ui-menu on current player
		     
                     Player.control_bar.removeClass(Player.current_skin); 
                     $("#" + identifier + " .big_play").removeClass(Player.current_skin);
                     $("#" + identifier + " .change_skin ul li a span." + Player.current_skin + "").removeClass("active");
                     Player.current_skin = skin;
		     $("#" + identifier + " .change_skin ul li a span." + skin + "").addClass("active");  
		       $("#" + identifier + " .big_play").addClass(Player.current_skin);
		     var src = "css/images/" + skin + ".png";
		     $("#" + identifier + " img.featured").attr("src" ,src);
		     // explode control bar and show new control bar  
		     Player.control_bar.hide("explode", { pieces: 16 }, function() { Player.control_bar.addClass(skin).show(); } );
		     	 $(".play_pause, .mute, .volume, .change_skin, .quality", "#" + identifier).tooltip({
			item: "span",
		        tooltipClass: skin + '_tooltip',
			position: {
			my: "center bottom-40",
			at: "center top",
			using: function( position, feedback ) {
			$( this ).css( position );
			$( "<div>" )
			.addClass( "arrow" )
			.addClass( feedback.vertical )
			.addClass( feedback.horizontal )
			.appendTo( this );
			}
			}
			});
		};
		
	
	  
	  // Private Functions For Player Initialization and add controls and event handlers to those controls
	  
		Player.SkinPlayer = function()
		{
		
			// Add the player Skin container and the corresponding user defined/default skin , background and text color
			Player.control_bar  = $("<div class='player_chrome " + Options.skin + "'></div>").appendTo( Player );			
			
			// Show | Hide Player Chrome
			Player.hover(function(){
				Player.control_bar.stop(false, true).fadeIn("fast");
			},
			function(){
			// Hide skin menu on player mouseout
			
			Player.skin_menu.hide();
			Player.change_skin.tooltip("enable");
			
			// Hide quality menu on player mouseout
			
			if(Player.quality_menu) { Player.quality_menu.remove(); }
			Player.quality.tooltip("enable");
			
			// Only fade out control bar when hovered out whilst playing
			if(Player.hasClass("playing"))
		        {
				Player.control_bar.fadeOut("fast");
			}
			});
						
			
                       Player.delegate('.big_play', 'click', function() {  // big play click handler added later so uses delegate
                       Player.PlayPause();
                       });
                       
			// Play and pause button
			
			Player.play = $('<span>', {
			'class': 'play_pause',
			title: 'play',
			click: function() {
			Player.trigger('PlayPause');
			}		
			}).appendTo( Player.control_bar );  
			
			// holds the controls and seek bars (all left floated elements)
			
			Player.left =  $("<div class='player_left'></div>").appendTo( Player.control_bar );
			
			// holds the custom - right floated logo
			
			Player.right =  $("<div class='player_right'></div>").appendTo( Player.control_bar );
			
			// add custom image to player right div and hyperlink it to url of the user's choice (if override applied)
			
			Player.right.html("<a href='" +  Options.hyperlink  + "' target='_blank'><img class='featured' src='" + Options.custom_image + "' alt='" + Options.skin + "' style='border:none' />");
			
			// holds the mute button and the volume slider
			
			Player.volume_container =  $("<div class='volume_container'></div>").appendTo( Player.left );
			
			Player.volume_container.hoverIntent(function(){
				Player.volume.stop().show("slide", 250);
			},
			function(){
				Player.volume.hide();
				Player.volume.tooltip( "close");
			});
			
			// Mute button
			
			Player.mute = $('<span>', {
			'class': 'mute',
			title: 'volume',
			click: function() {
			Player.trigger('MuteUnmute');
			}
			}).appendTo( Player.volume_container);  
			
			// Volume slider control 
			
			Player.volume = $('<div>', {
			'class': 'volume',
			title: '10',
			width: '50%',
			height: '7px',
			}).slider({
			max: 100,
			value: 100,
			step: 10,
			range: "min",
			animate: true,
			change: function(event, ui) {
			var vol = Math.round(ui.value/10).toString(); // gets the slider volume value for tooltip applied below
			$(this).tooltip( "option", "content", vol);
			Player.trigger('SetVolume');  // calls set volume while sliding
			},
			stop: function(event, ui) {
			if(ui.value === 0)
				{
					Player.trigger("MuteUnmute");
					Player.mute.tooltip( "option", "content", "muted");
				}
				else
				{
					Player.mute.removeClass('muted');
					Player.mute.tooltip( "option", "content", "volume");
				}
			}						
			}).appendTo( Player.volume_container ).hide();  
			
			// Player Quality switcher
			
			Player.quality = $('<span>', { 
			'class': 'quality',
			title : 'settings',
			click: function(e) {
			if(e.target === this)
			{
			Player.trigger('GetQuality');
			}
			}
			}).appendTo( Player.left );
			
			if(Options.skin_switcher === true)
			{		
			
			Player.change_skin = $('<span>', {  
			'class': 'change_skin',
			title : 'change skin',
			click: function(e) {
			$(this).tooltip("disable");	
			if(e.target === this){Player.trigger('GetSkin');}
			}
			}).appendTo( Player.left );
			
			// get skins from array object and create the skin list
			
			var skins = Options.all_skins;
	                var list = $("<ul>");  
			$.each(skins, function(index, value) {
			list.append("<li><a href='#' onClick='return false;'><span class='" + value + "'>" + value + "</span></a></li>");
			});
			$(".change_skin ul li a span." + Options.skin + "").addClass("active"); // show current skin as selected
			
			 // initialize ui menu and set the default/options skin as active in the list
			
			Player.skin_menu = list.menu({
			select: function(event,ui){
			Player.ChangeSkin(ui.item.text(), ui); 			  
			}
			}).css({width:'70px', position: 'absolute', bottom: '20px', left: '0'}).appendTo(Player.change_skin).hide();
			  $(" .change_skin ul li a span." + Options.skin + "").addClass("active");
			}
			
			//Player Clock
			
			Player.timer = $('<span>', {
			'class': 'timer',
			text: '00:00:00',
			}).appendTo( Player.left ); 
			
		
			// Buffered video progress  - generic ui progress widget whose value is set by Update() 
			
			Player.progress = $('<div>', {   
			'class': 'progress',
			width: '75%',
			height: '2px'
			}).appendTo( Player.left );  
			
			// Player Seek Bar
			
			Player.seek_bar = $('<div>', { 
			'class': 'seek',
			width: '75%',
			height: '6px'
			}).slider({
			disabled: true,
			range: "min",
			animate: true,
			start: function(event, ui) {	// on slide start Update() is stalled by clearing timer, resumed on slide stop		
			clearInterval(Player.interval); 
			},
			stop: function(event, ui) {
			Player.trigger('Seek');
			}
			}).appendTo( Player.left );
			
			//Track Duration
			
			Player.duration = $('<span>', {
			'class': 'duration',
			text: '00:00:00',
			}).appendTo( Player.left ); 
			
			// add tooltips to all of the below titled elements - arrow style with space to prevent menu overlap resulting hover issues
			
			$(".play_pause, .mute, .volume, .change_skin, .quality").tooltip({
			item: "span",
		        tooltipClass: Options.skin + '_tooltip',
			position: {
			my: "center bottom-40",
			at: "center top",
			using: function( position, feedback ) {
			$( this ).css( position );
			$( "<div>" )
			.addClass( "arrow" )
			.addClass( feedback.vertical )
			.addClass( feedback.horizontal )
			.appendTo( this );
			}
			}
			});
		
		}; // end SkinPlayer()
           
           
               // Function to format video time into hrs:mins:secs
               
		format_time = function (secs) {
			var hr = Math.floor(secs / 3600);
			var min = Math.floor((secs - (hr * 3600))/60);
			var sec = Math.floor(secs - (hr * 3600) - (min * 60));   
			if (hr < 10) {hr = "0" + hr; }
			if (min < 10) {min = "0" + min;}
			if (sec < 10) {sec = "0" + sec;}
			return hr + ':' + min + ':' + sec;
		};
           
           
               // StartUp Function responsible for embedding players and creating the controls       
	  
		Player.Initialize = function() {
			swfobject.embedSWF("http://www.youtube.com/apiplayer?enablejsapi=1&version=3&playerapiid=" + player_id, 
			player_id, Options.width, Options.height, "8", null, null, Options.params,{ id: player_id },             
			function(){
			ytplayer = document.getElementById( player_id );  // this gets the object to bind each player to the control functions			
			});
			//call skinplayer
			Player.SkinPlayer();   
		}; 
	  
         
                //call initialize
         
	        Player.Initialize();   
	        	        
	       // Callback function to manipulate the new player container 
	       
        	  if (typeof callback == 'function') { // make sure the callback is a function	     
                 callback.apply(this, [Player]); // brings the player object scope to the callback
               } 
             	
             	onytplayerStateChange = function(newState) {
		ytplayer.state = newState; 

		        if(newState == 2 && Player.start_flag == true)   // if autostart is true play the video on start up after paused then set flag to prevent re-occurence
			{
				if(ytplayer)
				{
					$("#myytplayer0").trigger("PlayPause");  // auto start just the first player on page 
					Player.start_flag = false;
				}
			}
		};                         
	
	 });  // end $this.each
	 
	 
	// YouTube's default function - fired when a player api fully loads
	 
	onYouTubePlayerReady = function( player_id ) {
	
		ytplayer = document.getElementById(  player_id );                    // get player object again to cue the video (it is done outside of the control functions so need access to the instance
		var parent =  $(ytplayer).parent();
		var video_id = parent.attr("id");   // get the youtube video id from the parent  
		var width = parent.width();
		var height = parent.height();
		ytplayer.loadVideoById(video_id, 0);    

		 $.getJSON('http://gdata.youtube.com/feeds/api/videos/' + video_id + '?alt=json&callback=?', function(json) { //get information about the user usejquery from Google YouTube api
		        var img = json.entry.media$group.media$thumbnail[0];
		        $("<img class= 'thumbnail' src='" + json.entry.media$group.media$thumbnail[0].url + "' width='" + width + "' height='" + height + "' style='position:absolute;left:0;' /><div class='big_play " + Options.skin + "' style='z-index:5;'></div>").prependTo(parent);
	       });  
	       
	       ytplayer.pauseVideo();
	       ytplayer.addEventListener("onStateChange", "onytplayerStateChange");	
	}; 
 
  }; // end plugin

})( jQuery ); //// end IIFE
