var _ = require('underscore'),
    db = require('./db'),
    recommenderUtil = require('./recommenderUtil'),
    COUNT_TAGS_PER_TRACK = 6,
    COUNT_TAGS_PER_ARTIST = 3;

exports.getRecommendations = function (userInfo, previousRecommendations, options, callback) {
    db.getTagsForArtists(userInfo.artists, function (err, taggedArtists) {
        if(err) {
            callback(err, []);
        } else {
            var tags = [],
                userDocument = {},
                userProfile = getUserProfile(userInfo, taggedArtists);

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

                    track.score = nominator / (userDenominator * trackDenominator);
                });

                callback(false, recommenderUtil.getRecommendationsFromPredictions(tracks, previousRecommendations));
            });
        }
    });
}

function getUserProfile(userInfo, userArtists) {
    var userProfile = {},
        tags = [],
        scoredArtists = _.indexBy(userInfo.artists, 'name');

    _.each(userArtists, function (artist) {
        var artistTags = _.first(artist.tags, COUNT_TAGS_PER_ARTIST),
            scoredArtist = scoredArtists[artist.name],
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
