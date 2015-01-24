var _ = require('underscore'),
    natural = require('natural'),
    TfIdf = natural.TfIdf,
    db = require('./db'),
    MIN_COMMON_USERS = 5,
    MIN_RECOMMENDED_ITEMS_PER_USER = 2,
    ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    EPS = 0.001;

exports.getRecommendationsFor = function (artists, algorithmType, neighboursCount, recommendedItemsCount, callback) {
    if(algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        getCollaborativeRecommendation(artists, neighboursCount, recommendedItemsCount, callback);
    } else {
        getContentFilteringRecommendations(artists, callback);
    }
};

function getContentFilteringRecommendations(artists, callback) {
    db.getTagsForArtists(artists, function (err, taggedArtists) {
        if(err) {
            callback(err, []);
        } else {
            var tags = [],
                tfidf = new TfIdf(),
                userDocument = {},
                differentTags = {},
                artistsNames = _.map(artists, function (artist) {
                    return artist.name;
                });

            _.each(taggedArtists, function (artist) {
                var artistTags = _.first(artist.tags, 3),
                    scoredArtist = _.findWhere(artists, { name: artist.name }),
                    artistScore = parseInt(scoredArtist.score, 10);

                _.each(artistTags, function (tag) {
                    userDocument[tag.name] = userDocument[tag.name] || 0;
                    userDocument[tag.name] += artistScore;
                    differentTags[tag.name] = 1;
                });

                tags = _.union(tags, artistTags);
            });

            db.getTracksForTags(tags, function (err, tracks) {
                _.each(tracks, function (track) {
                    var tags = _.first(track.tags, 6),
                        trackDocument = {};

                    _.each(tags, function (tag) {
                        var count = parseInt(tag.count, 10);
                        trackDocument[tag.name] = trackDocument[tag.name] || 0;
                        trackDocument[tag.name] += count;
                        differentTags[tag.name] = 1;
                    });

                    var nominator = 0,
                        userDenominator = 0,
                        trackDenominator = 0;

                    _.each(userDocument, function (value, key) {
                        if(trackDocument[key]) {
                            nominator += value * trackDocument[key];       
                        }
                        userDenominator += value * value;
                    });

                    _.each(trackDocument, function (value, key) {
                        trackDenominator += value * value;
                    });

                    userDenominator = Math.sqrt(userDenominator);
                    trackDenominator = Math.sqrt(trackDenominator);

                    track.similarity = nominator / (userDenominator * trackDenominator);
                });

                var recommendedTracks = _.first(_.sortBy(_.filter(tracks, function (track) {
                    return !_.contains(artistsNames, track.artist.name);
                }), function (track) {
                    return -track.similarity;
                }), 20);

                callback(false, recommendedTracks);
            });
        }
    });
}

function getCollaborativeRecommendation(artists, neighboursCount, recommendedItemsCount, callback) {
    db.retrieveAllUsers(artists, function (err, users) {
        var recommendedTracks = [];

        if(err) {
            console.log('an error occurred');
            console.dir(err);
        } else {
            var artistNames = _.map(artists, function (artist) {
                return artist.name;
            });

            _.each(users, function (user) {
                user.similarity = getSimilarityForUser(user, artists);
            });

            users = _.first(_.sortBy(_.filter(users, function (user) {
                return user.similarity >= 0;
            }), function (user) {
                return -user.similarity;
            }), neighboursCount || MIN_COMMON_USERS);

            _.each(users, function (user) {
                user.tracks = _.reject(_.uniq(_.sortBy(user.tracks, function (track) {
                    return -track.playcount;
                }), function (track) {
                    return track.artist.name;
                }), function (track) {
                    return _.contains(artistNames, track.artist.name);
                });
            });

            recommendedTracks = _.map(users, function (user, index) {
                return _.first(user.tracks, (Math.min(users.length, neighboursCount || MIN_COMMON_USERS) - index) * (recommendedItemsCount || MIN_RECOMMENDED_ITEMS_PER_USER));
            });
        }

        callback(err, _.flatten(recommendedTracks));
    });
}

function getSimilarityForUser(user, artists) {
    var tracksPerArtist = _.groupBy(user.tracks, function (track) {
        return track.artist.name;
    }), playCountsPerArtist = {};
    
    _.each(tracksPerArtist, function (value, key) {
        playCountsPerArtist[key] = _.reduce(value, function (memo, track) {
            return memo + parseInt(track.playcount, 10);
        }, 0);
    });

    var userTotalScore = 0,
        userScoreCount = 0;

    _.each(playCountsPerArtist, function (value, key) {
        userTotalScore += value;
        ++userScoreCount;
    });

    var userAverageScore = userTotalScore / userScoreCount;
    var artistsTotalScore = _.reduce(artists, function (memo, artist) {
        return memo + parseInt(artist.score, 10);
    }, 0);
    var artistsAverageScore = artistsTotalScore / artists.length;

    var userArtistsNames = _.keys(playCountsPerArtist),
        artistsNames = _.map(artists, function (artist) {
        return artist.name;
    }), commonArtistsNames = _.intersection(artistsNames, userArtistsNames);


    var nominator = _.reduce(commonArtistsNames, function (memo, name) {
        var userScore = playCountsPerArtist[name] - userAverageScore,
            artistScore = _.findWhere(artists, { name: name }).score - artistsAverageScore;

        return memo + userScore * artistScore + EPS;
    }, 0);

    var userDenominator = Math.sqrt(_.reduce(commonArtistsNames, function (memo, name) {
        var userScore = playCountsPerArtist[name] - userAverageScore;
        return memo + userScore * userScore + EPS;
    }, 0));

    var artistsDenominator = Math.sqrt(_.reduce(commonArtistsNames, function (memo, name) {
        var artistScore = _.findWhere(artists, { name: name }).score - artistsAverageScore;
        return memo + artistScore * artistScore + EPS;
    }, 0));

    var denominator = userDenominator * artistsDenominator;

    return nominator / denominator;
}
