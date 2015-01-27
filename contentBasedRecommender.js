var _ = require('underscore'),
    db = require('./db'),
    COUNT_RECOMMENDED_TRACKS = 20,
    COUNT_TAGS_PER_TRACK = 6,
    COUNT_TAGS_PER_ARTIST = 3;

exports.getRecommendations = function (userInfo, options, callback) {
    db.getTagsForArtists(userInfo.artists, function (err, taggedArtists) {
        if(err) {
            callback(err, []);
        } else {
            var tags = [],
                userDocument = {},
                artistsNames = _.map(userInfo.artists, function (artist) {
                    return artist.name;
                }), userProfile = getUserProfile(userInfo, taggedArtists);


            db.getTracksForTags(userProfile.tags, function (err, tracks) {
                _.each(tracks, function (track) {
                    var tags = _.first(track.tags, COUNT_TAGS_PER_TRACK),
                        trackProfile = getTrackProfile(tags),
                        nominator = 0,
                        userDenominator = 0,
                        trackDenominator = 0;

                    _.each(userProfile.scores, function (value, key) {
                        if(trackProfile[key]) {
                            nominator += value * trackProfile[key];
                        }
                        userDenominator += value * value;
                    });

                    _.each(trackProfile, function (value, key) {
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
                }), COUNT_RECOMMENDED_TRACKS);

                callback(false, recommendedTracks);
            });
        }
    });
}

function getUserProfile(userInfo, userArtists) {
    var userProfile = {},
        tags = [];

    _.each(userArtists, function (artist) {
        var artistTags = _.first(artist.tags, COUNT_TAGS_PER_ARTIST),
            scoredArtist = _.findWhere(userInfo.artists, { name: artist.name }),
            artistScore = parseInt(scoredArtist.score, 10);

        _.each(artistTags, function (tag) {
            userProfile[tag.name] = userProfile[tag.name] || 0;
            userProfile[tag.name] += artistScore;
        });

        tags = _.union(tags, artistTags);
    });

    return {
        scores: userProfile,
        tags: tags
    };
}

function getTrackProfile(trackTags) {
    var trackProfile = {};
    _.each(trackTags, function (tag) {
        var count = parseInt(tag.count, 10);
        trackProfile[tag.name] = trackProfile[tag.name] || 0;
        trackProfile[tag.name] += count;
    });
    return trackProfile;
}
