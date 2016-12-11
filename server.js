var unirest = require('unirest');
var express = require('express');
var events = require('events');
var app = express();

app.use(express.static('public'));

/*  Spotify API */

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};


/*    Server setup    */

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        unirest.get('https://api.spotify.com/v1/artists/' + artist.id + '/related-artists')
               .end(function(response){
                    if (response.ok){
                        artist.related = response.body.artists;

                        var allTracks = artist.related.length;
                        var completed = 0;

                        var allArtists = function() {
                            if (completed === allTracks) {
                                res.json(artist);
                            }
                        };

                        artist.related.forEach(function(artist){
                            unirest.get('https://api.spotify.com/v1/artists/' + artist.id + "/top-tracks?country=SE")
                                    .end(function(response){
                                        if (response.ok){
                                            artist.tracks = response.body.tracks;
                                            completed += 1;
                                            allArtists();
                                        } else {
                                            console.log('error with top-tracks')
                                        }
                                    });
                        });

                    } else {
                        res.sendStatus(404);
                    };
               });

    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(process.env.PORT || 8080);