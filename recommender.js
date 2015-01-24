var _ = require('underscore'),
    db = require('./db'),
    MIN_COMMON_USERS = 5,
    MIN_RECOMMENDED_ITEMS_PER_USER = 2,
    ALGORITHM_TYPE_COLLABORATIVE_FILTERING = 'collaborativeFiltering',
    collaborativeRecommender = require('./collaborativeRecommender'),
    EPS = 0.001;

exports.getRecommendationsFor = function (artists, algorithmType, neighboursCount, recommendedItemsCount, callback) {
    if(algorithmType === ALGORITHM_TYPE_COLLABORATIVE_FILTERING) {
        collaborativeRecommender.getRecommendations(artists, neighboursCount, recommendedItemsCount, callback);
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

