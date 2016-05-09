var currentPosition;

$(document).on('deviceready', onDeviceReady);

function onDeviceReady(){
    document.addEventListener("backbutton", function(){}, false);

    refreshCurrentPosition(function(){
        loadTags();
        loadVenues();
    });
}

$(document).ready(function(){
    loadTags();
    loadVenues();

    $('#btnNextDetails').on('tap', loadNextDetails);
    $('#btnSearch').on('tap', loadVenues);

    $('#menu .tags').on('click', '.ui-checkbox', updateTagsSettings);

    $('#restaurantlist').on('tap', 'a', function(el){
        var rel = $(this).data('rel');
        var next = $('a', $(this).parent().next()).data('rel');
        showDetails({ id: rel, next: next }, "slide");
    });

    $('#lnkPanelMenu').on('tap', function(){
        $('#menu').panel('open');
    });
});

function buildVenuesUris(settings){
    var uriResults = [];
    var uri = 'https://api.eet.nu/venues';

    console.log(settings);

    if (!settings.id) {
        //sort by ALWAYS works
        uri += '?sort_by=' + window.localStorage.getItem("sortby");
    }

    var qm = function(){
        if(uri.indexOf('?') < 0) { 
            uri += '?'; 
        }
        else{ 
            uri += '&'; 
        }
    };

    if(settings){
        if(settings.id){ uri += '/' + settings.id; sort = false; }
        if(settings.subCollection) { uri += '/' + settings.subCollection; }

        if(settings.query) { qm(); uri += 'query=' + settings.query; }

        if(settings.distance) { qm(); uri += 'max_distance=' + settings.distance; }

        if(settings.currentPage) { qm(); uri += 'current_page=' + settings.currentPage; }
        else{ qm(); uri += 'current_page=' + 1; }

        if(settings.perPage) { qm(); uri += 'perPage=' + settings.perPage; }
        else{ qm(); uri += 'perPage=' + 50; }

        if(settings.lat && settings.long){ 
            qm();
            uri += 'geolocation=' + settings.lat + ',' + settings.long;
        }

        if(settings.tags) { 
            qm(); 
            settings.tags.forEach(function(tag){
                uriResults.push(uri + 'tags=' + tag);
            });

            return uriResults;
        } else {
            return [uri];
        }
    }

    return uri;
}

$(document).on('pageinit', '#settings', function(){
    $('#save').on('tap', function(){
        save();
    });

    var distance = window.localStorage.getItem("distance");
    if(distance > 0) {
        $('#distance').val(distance).slider("refresh");
    }

    var sortby = window.localStorage.getItem("sortby");
    if(sortby != null) {
        $('#sortby').val(sortby).selectmenu("refresh");
    }

    var filterOnRating = window.localStorage.getItem("filterOnRating");
    if(filterOnRating != null) {
        $('#filterOnRating').val(filterOnRating).selectmenu("refresh");
    }
});

function save() {
    var refreshRestaurants = false;
    
    var distance = $('#distance').val();
    if(distance !== window.localStorage.getItem("distance")){
        window.localStorage.setItem("distance", distance);
        refreshRestaurants = true;
    }
    
    var sortby = $('#sortby').val();
    if(sortby !== window.localStorage.getItem("sortby")){
        window.localStorage.setItem("sortby", sortby);
        refreshRestaurants = true;
    }

    var filterOnRating = $('#filterOnRating').val();
    if(filterOnRating !== window.localStorage.getItem("filterOnRating")){
        window.localStorage.setItem("filterOnRating", filterOnRating);
        refreshRestaurants = true;
    }

    if(refreshRestaurants === true){
        loadVenues();
    }
}

function updateTagsSettings(){
    console.log('update tags');
    var tagElem = $('input[type="checkbox"]', $(this));

    var selectedTags = JSON.parse(window.localStorage.getItem('tags'));
    if(!selectedTags){ selectedTags = []; }

    // Item was nog niet gechecked en wordt het nu wel.
    if(!tagElem.is(':checked')){
        selectedTags.push(tagElem.attr('id'));
    } else {
        selectedTags.splice(selectedTags.indexOf(tagElem.attr('id')), 1);
    }

    window.localStorage.setItem('tags', JSON.stringify(selectedTags));
}

$(document).on('pageinit', '#home', function(){
    $(document).on('swipeleft swiperight', '#home', function(e) {
        if(e.type === "swiperight") {
            $('#menu').panel("open");
        } else if (e.type === "swipeleft") {
            $('#menu').panel("close");
        }
    });
});

function refreshCurrentPosition(callback){
    navigator.geolocation.getCurrentPosition(function(position){
        currentPosition = position;
        if(callback){
            callback();
        }
    });
}

function loadTags(){
    var selectedTags = window.localStorage.getItem('tags');
    if(!selectedTags){ selectedTags = []; }

    var uri = 'https://api.eet.nu/tags';
    $.getJSON(uri, function(json){
        $('#menu .tags').html('');
        json.results.forEach(function(tag){
            if(tag.context = 'Kitchen'){
                var isChecked = '';
                if(selectedTags.indexOf(tag.name) >= 0){
                    isChecked = 'checked="checked"';
                }

                $('#menu .tags').append('<input type="checkbox" name="' + tag.name + '" id="' + tag.name + '" ' + isChecked + '><label for="' + tag.name + '">' + tag.name + '</label>');
            }
        });

        $('#menu .tags input[type="checkbox"]').checkboxradio();
    });
}

function loadVenues(){
    var settings = { query: $('#txtSearch').val() };
    var resultList = [];

    if(currentPosition){
        settings.lat = currentPosition.coords.latitude;
        settings.long = currentPosition.coords.longitude;
    }

    var selectedTags = JSON.parse(window.localStorage.getItem('tags')) || [];
    if(selectedTags.length){
        settings.tags = selectedTags;
    }

    console.log(selectedTags);

    var list = $('#restaurantlist');
    list.html('');

    var filterOnRating = window.localStorage.getItem('filterOnRating') == 'true';

    var uris = buildVenuesUris(settings);
    console.log(uris);
    uris.forEach(function(uri){
        $.getJSON(uri, function(json){
            json.results.forEach(function(item){
                if(!filterOnRating || item.rating){
                    list.append(
                        '<li><a href="#detail" data-transition="slide" data-rel="' + item.id + '">'
                        + item.name + 
                        '</a></li>');
                }
                resultList.push(item);
            });

            console.log(resultList);
            if (resultList.length === 0) {
                list.append('<li>Er zijn geen resultaten gevonden</li>')
            }
            list.listview('refresh');
        });
    });
}

function loadNextDetails(){
    var nextId = $('#id_next').val();
    var nextNextId = $('a', $('#restaurantlist a[data-rel=' + nextId + ']').parent().next()).data('rel');

    var settings = { id: nextId, next: nextNextId };
    showDetails(settings, 'slide');
}

function showDetails(json, slide_direction) {
    var uri = buildVenuesUris({ id: json.id });
    console.log(uri);
    $.getJSON(uri, function(data) {
        // Title and Navigation
        $('#name').text(data.name);
        $('#id_next').val(json.next);

        $('#images').html('');
        data.images.original.forEach(function(image){
            $('#images').append('<img src="' + image + '" />');
        });

        if(data.description){ $('#description p').text(data.description); }
        else{ $('#description p').text(''); }

        // Beoordeling
        var urlReview = buildVenuesUris({ id: json.id, subCollection: 'reviews' });
        $.getJSON(urlReview, function(reviewData) {
            if(reviewData.results.length == 0) {
                $('#ratings').hide();
            } else {
                var rating = '';
                if(data.rating !== null) {
                    rating = data.rating.toString();
                    rating = rating.charAt(0)+','+rating.charAt(1);
                    $('#eetnu').text(rating);
                    $('#eetnuRating').show();
                } else {
                    $('#eetnuRating').hide();
                }
                var reviews = 0;
                var ratings = {"rating": 0, "ambiance": 0, "food": 0, "service": 0, "value": 0};
                $('#reviewList').html('');

                reviewData.results.forEach(function(review) {
                    if(review.rating != null) {
                        reviews++;
                        ratings["rating"] = ratings["rating"] + review.scores.ambiance;;
                        ratings["ambiance"] = ratings["ambiance"] + review.scores.ambiance;
                        ratings["food"] = ratings["food"] + review.scores.food;
                        ratings["service"] = ratings["service"] + review.scores.service;
                        ratings["value"] = ratings["value"] + review.scores.value;
                    }

                    $('#reviewList').append('<li><div><p>' + review.body + '</p><strong>' + review.author.name + '</strong><i>' + review.created_at + '</i></div></li>');
                });

                $('#reviewList').listview('refresh');

                $.each(ratings, function(i, j) {
                    ratings[i] = Math.round(j / reviews);
                    ratings[i] = ratings[i].toString();
                    if(ratings[i] != "NaN") {
                        ratings[i] = ratings[i].substr(0, 1) + ratings[i].substr(1);
                    } else {
                        ratings[i] = 0;
                    }
                    if(ratings[i] == 100) {
                        $('#' + i).text(ratings[i].charAt(0) + ratings[i].charAt(1));
                    }
                    else {

                        $('#' + i).text(ratings[i].charAt(0) +','+ ratings[i].charAt(1));
                    }
                });
                $('#ratings').show();
            }
        });

        // Adres
        $('#street').text(data.address.street);
        $('#zipcode_place').text(data.address.zipcode + " " + data.address.city);
        $('#country').text(data.address.country);

        // Contact
        $('#telephone').text("Bel nu: "+data.telephone);
        $('#telephone').attr("onclick", "window.open('tel:" + data.telephone + "', '_system');");
        $('#own_url').attr("onclick", "window.open('" + data.website_url + "', '_blank', 'location=no');");
        $('#own_url').text(data.name);
        $('#eetnu_url').attr("onclick", "navigator.app.loadUrl('" + data.url + "', { openExternal:true });");

        // Openingstijden
        showOpeningHours(data.opening_hours);

        $.mobile.changePage("#detail", { transition: slide_direction });
    });
}

function showOpeningHours(openingHours){
    for (var i = 0; i < 7; i++) {
        $('#day_' + i).text("");
        var iconSpan = $('#day_' + i).parent().find('.ui-btn-icon-notext');
        iconSpan.removeClass('ui-icon-checked');
        iconSpan.removeClass('ui-icon-delete');
    }
    
    $.each(openingHours, function(k, v) { // k = key, v = value.
        var iconSpan = $('#day_' + v.day).parent().find('.ui-btn-icon-notext');

        if(v.closed == true) {
            $('#day_' + v.day).text("Closed");
            //iconSpan.addClass('ui-icon-delete');
        } else {
            var start = "", end = "";
            if(v.lunch_from == null) { start = v.dinner_from; } else { start = v.lunch_from; }
            if(v.dinner_till == null){ end = v.lunch_till;    } else { end = v.dinner_till;  }
            if(start == null) { start = "?"  }
            if(end == null)   { end = "?"    }
            
            $('#day_' + v.day).text(start + " - " + end);

            var now = new Date();
            
            var openFrom = new Date()
            openFrom.setHours(start.substring(0,start.indexOf(':')));
            openFrom.setMinutes(start.substring(start.indexOf(':') + 1, start.indexOf(':') + 3));
            
            var closedFrom = new Date();
            closedFrom.setHours(end.substring(0,end.indexOf(':')));
            closedFrom.setMinutes(end.substring(end.indexOf(':') + 1, end.indexOf(':') + 3));

            if((now.getDay() == 0 && v.day != 7) // Zondag
                || now.getDay() - 1 != v.day
               ) {
                //iconSpan.addClass('ui-icon-delete');
            }
            else { 
                iconSpan.addClass('ui-icon-arrow-r');
            }
        }
    });
}