var _ = require('underscore'),
    db = require('./db'),
    recommenderUtil = require('./recommenderUtil'),
    COUNT_TAGS_PER_TRACK = 10,
    COUNT_TAGS_PER_ARTIST = 10;

exports.getRecommendations = function (user, previousRecommendations, options, callback) {
    db.getTagsForArtists(user.artists, function (err, taggedArtists) {
        if(err) {
            callback(err, []);
        } else {
            var userProfile = getUserProfile(user, taggedArtists);

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

                    track.score = nominator / Math.sqrt(userDenominator * trackDenominator);
                });

                callback(false, recommenderUtil.getRecommendationsFromPredictions(tracks, previousRecommendations));
            });
        }
    });
}

function getUserProfile(user, taggedArtists) {
    var userProfile = {},
        tags = [],
        scoredArtists = _.indexBy(user.artists, 'name');

    _.each(taggedArtists, function (artist) {
        var artistTags = _.first(artist.tags, COUNT_TAGS_PER_ARTIST),
            scoredArtist = scoredArtists[artist.name],
            artistScore = parseInt(scoredArtist.score, 10);

        _.each(artistTags, function (tag) {
            userProfile[tag.name] = userProfile[tag.name] || 0;
            userProfile[tag.name] += artistScore;
        });

        tags = _.union(tags, _.pluck(artistTags, 'name'));
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
