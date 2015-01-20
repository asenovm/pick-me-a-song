'use strict';

angular.module('pickMeASong')
    .service('recommendationsService', ['$http', '$q', 'localStorageService', function ($http, $q, $localStorage) {

    var SCORE_ARTIST_DEFAULT = 10;
    var KEY_RECOMMENDED_ITEMS = "recommendedItems";
    var KEY_USER_ID = "userId";
    var KEY_TRACKS_TO_RATE = "tracksToRate";
    var recommendations = $localStorage.get(KEY_RECOMMENDED_ITEMS) || [];
    var userId = $localStorage.get(KEY_USER_ID) || 1;
    var tracksToRate = $localStorage.get(KEY_TRACKS_TO_RATE) || [];

    this.getRecommendations = function () {
        return recommendations;
    };

    this.saveRecommendations = function (items) {
        recommendations = items || recommendations;
        $localStorage.set(KEY_RECOMMENDED_ITEMS, recommendations);
    };

    this.fetchRecommendations = function (artists) {
        var deferred = $q.defer(),
            that = this;

        $http({
            url: '/recommendations',
            method: 'GET',
            params: { artists: JSON.stringify(artists) }
        }).success(function (data, status, headers, config) {
            userId = data.id;
            $localStorage.set(KEY_USER_ID, userId);
            if(_.isEmpty(data.recommendedTracks)) {
                that.fetchDefaultRecommendations(function () {
                    deferred.resolve(recommendations);
                });
            } else {
                that.saveRecommendations(data.recommendedTracks);
                deferred.resolve(recommendations);
            }
        }).error(function (data, status, headers, config) {
            that.fetchDefaultRecommendations(function () {
                deferred.reject(recommendations);
            });
        });

        return deferred.promise;
    };

    this.likeTrack = function (likedTracks, recommendedTracks) {
        var likedTracksPositions = _.map(likedTracks, function (track) {
            return _.indexOf(recommendedTracks, track);
        });

        $http({
            url: '/like',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: {
                likedTracksPositions: likedTracksPositions,
                recommendedTracksCount: recommendedTracks.length,
                userId: userId
            }
        });
    };

    this.onFacebookLogin = function (loginSuccessfulCallback, recommendationsFetchedCallback) {
        var that = this;
        return function (response) {
            if(response.status === "connected") {
                loginSuccessfulCallback();
                userId = response.authResponse.userID;
                that.fetchInfoFromFacebook(recommendationsFetchedCallback);
            }
        };
    };

    this.fetchInfoFromFacebook = function (recommendationsFetchedCallback) {
        var that = this;
        FB.api('/me/music', function (response) {
            var likes = _.map(response.data, function (artist) {
                return {
                    name: artist.name,
                    score: SCORE_ARTIST_DEFAULT
                };
            });
            console.log('likes are ', likes);
            that.fetchRecommendations(likes).finally(recommendationsFetchedCallback);
        });
    };

    this.fetchInfoFromLastFm = function (user, recommendationsFetchedCallback) {
        var that = this;
        lastFm.user.getTopArtists({ user: user}, {
            success: function (data) {
                var artists = _.map(data.topartists.artist, function (artist) {
                    return {
                        name: artist.name,
                        score: artist.playcount
                    };
                });
                that.fetchRecommendations(artists).finally(recommendationsFetchedCallback);
            }, error: function (code, message) {
                that.fetchRecommendations([]).finally(recommendationsFetchedCallback);
            }
        });
    };

    this.fetchDefaultRecommendations = function (callback) {
        var that = this;
        this.fetchTracksToRate(function (tracks) {
            that.saveRecommendations(tracks);
            callback();
        });
    };

    this.onFacebookConnected = function (authInfo) {
        userId = authInfo.userID;
    };

    this.fetchTracksToRate = function (callback) {
        $http({
            url: '/tracksToRate',
            method: 'GET'
        }).success(function (data, status, headers, config) {
            callback(data);
            tracksToRate = data;
            $localStorage.set(KEY_TRACKS_TO_RATE, tracksToRate);
        }).error(function (data, status, headers, config) {
            callback([]);
        });
    };

    this.getTracksToRate = function () {
        return tracksToRate;
    };

}]);
